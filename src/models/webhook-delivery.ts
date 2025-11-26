/**
 * Modelo para tracking de entregas de webhooks
 */
export interface WebhookDelivery {
  id: string; // UUID
  event: string; // 'rate.changed', 'service.healthy', etc.
  url: string; // URL del webhook (puede ser masked)
  payload: unknown; // El payload enviado
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
  duration: number; // ms
  timestamp: Date;
  metadata?: {
    previousStatus?: string;
    rateChange?: number;
    [key: string]: unknown;
  };
}

export interface WebhookDeliveryStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number; // percentage
  averageDuration: number; // ms
  lastDelivery?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
}
