import type { BCVRateData } from '@/services/bcv.service';

/**
 * Webhook payload structure sent to subscribed endpoints
 */
export interface WebhookPayload {
  event: 'rate.updated' | 'rate.changed';
  timestamp: string;
  data: {
    date: string;
    rates: Array<{
      currency: string;
      rate: number;
      name: string;
    }>;
    change?: {
      previousRate: number;
      currentRate: number;
      percentageChange: number;
    };
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
   * Check if webhook service is enabled and configured
   * @returns true if webhook is ready to send notifications
   */
  isEnabled(): boolean;
}
