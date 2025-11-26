import crypto from 'node:crypto';
import { TYPES } from '@/config/types';
import axios, { type AxiosError } from 'axios';
import { inject, injectable } from 'inversify';
import { config } from '../config';
import { logger } from '../utils/logger';

import type { HealthCheckResult } from '@/interfaces/IHealthCheckService';
import type { IMetricsService } from '@/interfaces/IMetricsService';
import type { IWebhookDeliveryService } from '@/interfaces/IWebhookDeliveryService';
import type { IWebhookQueueService } from '@/interfaces/IWebhookQueueService';
import type {
  IWebhookService,
  WebhookConfig,
  WebhookDeliveryResult,
  WebhookPayload,
} from '@/interfaces/IWebhookService';
import type { BCVRateData } from '@/services/bcv.service';
import { getCurrencyRate } from '@/services/bcv.service';

/**
 * WebhookService - Service for sending HTTP webhook notifications
 *
 * Implements Single Responsibility Principle (SRP):
 * - Responsible only for webhook delivery and retry logic
 *
 * Features:
 * - HMAC-SHA256 signature for security
 * - Exponential backoff retry strategy
 * - Configurable timeout and retry attempts
 * - Detailed logging and error handling
 */
@injectable()
export class WebhookService implements IWebhookService {
  private readonly webhookConfig: WebhookConfig;
  private readonly serviceStatusWebhookUrl: string;
  private readonly deploymentWebhookUrl: string;

  constructor(
    @inject(TYPES.MetricsService)
    private readonly metricsService: IMetricsService,
    @inject(TYPES.WebhookDeliveryService)
    private readonly deliveryService: IWebhookDeliveryService,
    @inject(TYPES.WebhookQueueService)
    private readonly queueService: IWebhookQueueService
  ) {
    this.webhookConfig = {
      url: config.webhookUrl || '',
      secret: config.webhookSecret || '',
      enabled: !!config.webhookUrl,
      timeout: config.webhookTimeout || 5000,
      maxRetries: config.webhookMaxRetries || 3,
    };

    // Specific webhook URLs for different notification types
    // If not configured, fall back to the generic webhook URL
    this.serviceStatusWebhookUrl =
      config.serviceStatusWebhookUrl || config.webhookUrl || '';
    this.deploymentWebhookUrl =
      config.deploymentWebhookUrl || config.webhookUrl || '';

    if (!this.webhookConfig.enabled) {
      logger.warn(
        'Webhook URL not configured - Webhook notifications disabled'
      );
    } else {
      logger.info('Webhook service configured and enabled', {
        url: this.maskUrl(this.webhookConfig.url),
        serviceStatusUrl: this.maskUrl(this.serviceStatusWebhookUrl),
        deploymentUrl: this.maskUrl(this.deploymentWebhookUrl),
        timeout: this.webhookConfig.timeout,
        maxRetries: this.webhookConfig.maxRetries,
      });
    }

    if (this.webhookConfig.enabled && !this.webhookConfig.secret) {
      logger.warn(
        'Webhook secret not configured - Signatures will not be generated. This is not recommended for production.'
      );
    }
  }

  isEnabled(): boolean {
    return this.webhookConfig.enabled;
  }

  async sendRateUpdateNotification(
    rate: BCVRateData,
    previousRate?: BCVRateData | null
  ): Promise<WebhookDeliveryResult> {
    if (!this.isEnabled()) {
      logger.debug('Webhook notification skipped - service not enabled');
      return {
        success: false,
        url: 'N/A',
        error: 'Webhook service not enabled',
        attempt: 0,
        duration: 0,
      };
    }

    const payload = this.buildPayload(rate, previousRate);
    return await this.sendWithRetry(payload);
  }

  async sendServiceStatusNotification(
    event: 'service.healthy' | 'service.unhealthy' | 'service.degraded',
    status: HealthCheckResult,
    previousStatus?: string
  ): Promise<WebhookDeliveryResult> {
    if (!this.serviceStatusWebhookUrl) {
      logger.debug('Service status notification skipped - URL not configured');
      return {
        success: false,
        url: 'N/A',
        error: 'Service status webhook URL not configured',
        attempt: 0,
        duration: 0,
      };
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: {
        status: status.status,
        uptime: status.uptime,
        checks: status.checks,
        previousStatus,
      },
    };

    return await this.sendWithRetry(payload, this.serviceStatusWebhookUrl);
  }

  async sendDeploymentNotification(
    event: 'deployment.started' | 'deployment.success' | 'deployment.failure',
    deploymentInfo: {
      deploymentId?: string;
      environment?: string;
      version?: string;
      duration?: number;
      message?: string;
    }
  ): Promise<WebhookDeliveryResult> {
    if (!this.deploymentWebhookUrl) {
      logger.debug('Deployment notification skipped - URL not configured');
      return {
        success: false,
        url: 'N/A',
        error: 'Deployment webhook URL not configured',
        attempt: 0,
        duration: 0,
      };
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: {
        deploymentId: deploymentInfo.deploymentId,
        environment: deploymentInfo.environment,
        version: deploymentInfo.version,
        duration: deploymentInfo.duration,
        message: deploymentInfo.message,
      },
    };

    return await this.sendWithRetry(payload, this.deploymentWebhookUrl);
  }

  /**
   * Build webhook payload from rate data
   */
  private buildPayload(
    rate: BCVRateData,
    previousRate?: BCVRateData | null
  ): WebhookPayload {
    const payload: WebhookPayload = {
      event: previousRate ? 'rate.changed' : 'rate.updated',
      timestamp: new Date().toISOString(),
      data: {
        date: rate.date,
        rates: rate.rates.map((r) => ({
          currency: r.currency,
          rate: r.rate,
          name: r.name,
        })),
      },
    };

    // Add change information if previous rate exists
    const currentUsdRate = getCurrencyRate(rate, 'USD');
    const previousUsdRate = getCurrencyRate(previousRate || null, 'USD');

    if (previousRate && previousUsdRate > 0) {
      const percentageChange =
        ((currentUsdRate - previousUsdRate) / previousUsdRate) * 100;

      payload.data.change = {
        previousRate: previousUsdRate,
        currentRate: currentUsdRate,
        percentageChange: Number(percentageChange.toFixed(4)),
      };
    }

    return payload;
  }

  /**
   * Send webhook with exponential backoff retry strategy
   */
  private async sendWithRetry(
    payload: WebhookPayload,
    targetUrl?: string
  ): Promise<WebhookDeliveryResult> {
    // Use the provided URL or fall back to the default webhook URL
    const webhookUrl = targetUrl || this.webhookConfig.url;

    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.webhookConfig.maxRetries; attempt++) {
      try {
        // Calculate delay for retry (exponential backoff: 1s, 2s, 4s, 8s...)
        if (attempt > 1) {
          const delay = 2 ** (attempt - 2) * 1000; // 2^(n-2) seconds
          logger.info('Retrying webhook delivery', {
            attempt,
            maxRetries: this.webhookConfig.maxRetries,
            delayMs: delay,
          });
          await this.sleep(delay);
        }

        const result = await this.sendWebhook(payload, attempt, webhookUrl);
        const duration = Date.now() - startTime;

        logger.info('Webhook delivered successfully', {
          url: this.maskUrl(webhookUrl),
          statusCode: result.statusCode,
          attempt,
          durationMs: duration,
          event: payload.event,
        });

        // Record success metrics
        this.metricsService.recordWebhookSuccess(payload.event, duration);

        // Record delivery in database
        await this.deliveryService.recordDelivery({
          event: payload.event,
          url: this.maskUrl(webhookUrl),
          payload,
          success: true,
          statusCode: result.statusCode,
          attempts: attempt,
          duration,
        });

        return {
          ...result,
          duration,
        };
      } catch (error) {
        lastError = error as Error;

        logger.error('Webhook delivery attempt failed', {
          attempt,
          maxRetries: this.webhookConfig.maxRetries,
          url: this.maskUrl(webhookUrl),
          error: this.getErrorMessage(error),
          event: payload.event,
        });

        // If this is the last attempt, don't retry
        if (attempt === this.webhookConfig.maxRetries) {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;

    logger.error('Webhook delivery failed after all retries', {
      maxRetries: this.webhookConfig.maxRetries,
      url: this.maskUrl(webhookUrl),
      lastError: lastError?.message,
      totalDurationMs: duration,
      event: payload.event,
    });

    // Record failure metrics
    this.metricsService.recordWebhookFailure(payload.event, duration);

    // Record delivery in database
    await this.deliveryService.recordDelivery({
      event: payload.event,
      url: this.maskUrl(webhookUrl),
      payload,
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: this.webhookConfig.maxRetries,
      duration,
    });

    // Add to queue for later retry
    try {
      const queueId = await this.queueService.enqueue(
        payload.event,
        webhookUrl,
        payload,
        {
          maxAttempts: 5,
          priority: this.getEventPriority(payload.event),
          delaySeconds: 300, // Wait 5 minutes before first retry
        }
      );

      logger.warn('Webhook queued for retry after immediate failures', {
        queueId,
        event: payload.event,
        url: this.maskUrl(webhookUrl),
      });
    } catch (queueError) {
      logger.error('Failed to queue webhook for retry', {
        error: queueError,
        event: payload.event,
      });
    }

    return {
      success: false,
      url: webhookUrl,
      error: lastError?.message || 'Unknown error',
      attempt: this.webhookConfig.maxRetries,
      duration,
    };
  }

  /**
   * Determine event priority for queue
   */
  private getEventPriority(event: string): 'high' | 'normal' | 'low' {
    // Critical events have high priority
    if (event === 'service.unhealthy' || event === 'deployment.failure') {
      return 'high';
    }

    // Deployment events have normal priority
    if (event.startsWith('deployment.')) {
      return 'normal';
    }

    // Rate changes are low priority (not critical)
    return 'low';
  }

  /**
   * Send single webhook HTTP request
   */
  private async sendWebhook(
    payload: WebhookPayload,
    attempt: number,
    webhookUrl: string
  ): Promise<WebhookDeliveryResult> {
    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'BCV-Service-Webhook/1.0',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp,
      'X-Webhook-Attempt': attempt.toString(),
    };

    // Add signature header if secret is configured
    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers,
        timeout: this.webhookConfig.timeout,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      return {
        success: true,
        url: webhookUrl,
        statusCode: response.status,
        attempt,
        duration: 0, // Will be calculated by caller
      };
    } catch (error) {
      const axiosError = error as AxiosError;

      // Throw error to trigger retry
      throw new Error(
        `Webhook request failed: ${axiosError.message} (Status: ${axiosError.response?.status || 'N/A'})`
      );
    }
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * Format: sha256=<hex-encoded-signature>
   */
  private generateSignature(payload: string): string | null {
    if (!this.webhookConfig.secret) {
      return null;
    }

    const hmac = crypto.createHmac('sha256', this.webhookConfig.secret);
    hmac.update(payload, 'utf8');
    const signature = hmac.digest('hex');

    return `sha256=${signature}`;
  }

  /**
   * Verify webhook signature (for testing purposes)
   */
  public verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookConfig.secret) {
      return false;
    }

    const expectedSignature = this.generateSignature(payload);
    if (!expectedSignature) {
      return false;
    }

    // Check if lengths match first (timingSafeEqual requires same length)
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    try {
      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      // If comparison fails for any reason, return false
      return false;
    }
  }

  /**
   * Mask URL for logging (hide sensitive parts)
   */
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return '***MASKED***';
    }
  }

  /**
   * Extract error message from unknown error type
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
