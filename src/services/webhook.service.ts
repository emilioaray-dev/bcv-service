import crypto from 'node:crypto';
import { TYPES } from '@/config/types';
import axios, { type AxiosError } from 'axios';
import { inject, injectable } from 'inversify';
import { config } from '../config';
import { logger } from '../utils/logger';

import type { HealthCheckResult } from '@/interfaces/IHealthCheckService';
import type { IMetricsService } from '@/interfaces/IMetricsService';
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

  constructor(
    @inject(TYPES.MetricsService)
    private readonly metricsService: IMetricsService
  ) {
    this.webhookConfig = {
      url: config.webhookUrl || '',
      secret: config.webhookSecret || '',
      enabled: !!config.webhookUrl,
      timeout: config.webhookTimeout || 5000,
      maxRetries: config.webhookMaxRetries || 3,
    };

    if (!this.webhookConfig.enabled) {
      logger.warn(
        'Webhook URL not configured - Webhook notifications disabled'
      );
    } else {
      logger.info('Webhook service configured and enabled', {
        url: this.maskUrl(this.webhookConfig.url),
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
    if (!this.isEnabled()) {
      logger.debug('Service status notification skipped - service not enabled');
      return {
        success: false,
        url: 'N/A',
        error: 'Webhook service not enabled',
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

    return await this.sendWithRetry(payload);
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
    if (!this.isEnabled()) {
      logger.debug('Deployment notification skipped - service not enabled');
      return {
        success: false,
        url: 'N/A',
        error: 'Webhook service not enabled',
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

    return await this.sendWithRetry(payload);
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
    payload: WebhookPayload
  ): Promise<WebhookDeliveryResult> {
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

        const result = await this.sendWebhook(payload, attempt);
        const duration = Date.now() - startTime;

        logger.info('Webhook delivered successfully', {
          url: this.maskUrl(this.webhookConfig.url),
          statusCode: result.statusCode,
          attempt,
          durationMs: duration,
          event: payload.event,
        });

        // Record success metrics
        this.metricsService.recordWebhookSuccess(payload.event, duration);

        return {
          ...result,
          duration,
        };
      } catch (error) {
        lastError = error as Error;

        logger.error('Webhook delivery attempt failed', {
          attempt,
          maxRetries: this.webhookConfig.maxRetries,
          url: this.maskUrl(this.webhookConfig.url),
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
      url: this.maskUrl(this.webhookConfig.url),
      lastError: lastError?.message,
      totalDurationMs: duration,
      event: payload.event,
    });

    // Record failure metrics
    this.metricsService.recordWebhookFailure(payload.event, duration);

    return {
      success: false,
      url: this.webhookConfig.url,
      error: lastError?.message || 'Unknown error',
      attempt: this.webhookConfig.maxRetries,
      duration,
    };
  }

  /**
   * Send single webhook HTTP request
   */
  private async sendWebhook(
    payload: WebhookPayload,
    attempt: number
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
      const response = await axios.post(this.webhookConfig.url, payload, {
        headers,
        timeout: this.webhookConfig.timeout,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      return {
        success: true,
        url: this.webhookConfig.url,
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
