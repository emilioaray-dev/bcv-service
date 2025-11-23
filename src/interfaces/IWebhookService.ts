import type { BCVRateData } from '@/services/bcv.service';
import type { HealthCheckResult } from './IHealthCheckService';

/**
 * Webhook payload structure sent to subscribed endpoints
 */
export interface WebhookPayload {
  event:
    | 'rate.updated'
    | 'rate.changed'
    | 'service.healthy'
    | 'service.unhealthy'
    | 'service.degraded'
    | 'deployment.started'
    | 'deployment.success'
    | 'deployment.failure';
  timestamp: string;
  data: {
    date?: string;
    rates?: Array<{
      currency: string;
      rate: number;
      name: string;
    }>;
    change?: {
      previousRate: number;
      currentRate: number;
      percentageChange: number;
    };
    status?: string;
    uptime?: number;
    checks?: {
      [key: string]: {
        status: string;
        message?: string;
        details?: Record<string, unknown>;
      };
    };
    previousStatus?: string;
    deploymentId?: string;
    environment?: string;
    duration?: number;
    message?: string;
    version?: string;
  };
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  success: boolean;
  url: string;
  statusCode?: number;
  error?: string;
  attempt: number;
  duration: number;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string;
  secret: string;
  enabled: boolean;
  timeout: number;
  maxRetries: number;
}

/**
 * Deployment information for webhook notifications
 */
export interface DeploymentInfo {
  deploymentId?: string;
  environment?: string;
  version?: string;
  duration?: number;
  message?: string;
}

/**
 * IWebhookService - Interface for sending webhook notifications
 *
 * Follows Dependency Inversion Principle (DIP):
 * - BCVService depends on this abstraction, not on concrete implementation
 */
export interface IWebhookService {
  /**
   * Send rate update notification to configured webhook endpoint
   * @param rate - Current BCV rate data
   * @param previousRate - Previous rate data for change calculation
   * @returns Promise with delivery result
   */
  sendRateUpdateNotification(
    rate: BCVRateData,
    previousRate?: BCVRateData | null
  ): Promise<WebhookDeliveryResult>;

  /**
   * Send service status notification to configured webhook endpoint
   * @param event - The specific event type
   * @param status - The current health status
   * @param previousStatus - The previous health status
   * @returns Promise with delivery result
   */
  sendServiceStatusNotification(
    event: 'service.healthy' | 'service.unhealthy' | 'service.degraded',
    status: HealthCheckResult,
    previousStatus?: string
  ): Promise<WebhookDeliveryResult>;

  /**
   * Send deployment notification to configured webhook endpoint
   * @param event - The deployment event type
   * @param deploymentInfo - Information about the deployment
   * @returns Promise with delivery result
   */
  sendDeploymentNotification(
    event: 'deployment.started' | 'deployment.success' | 'deployment.failure',
    deploymentInfo: DeploymentInfo
  ): Promise<WebhookDeliveryResult>;

  /**
   * Check if webhook service is enabled and configured
   * @returns true if webhook is ready to send notifications
   */
  isEnabled(): boolean;
}
