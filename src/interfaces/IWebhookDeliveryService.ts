import type {
  WebhookDelivery,
  WebhookDeliveryStats,
} from '@/models/webhook-delivery';

/**
 * Interface para el servicio de tracking de entregas de webhooks
 */
export interface IWebhookDeliveryService {
  /**
   * Registra una entrega de webhook exitosa
   */
  recordDelivery(
    delivery: Omit<WebhookDelivery, 'id' | 'timestamp'>
  ): Promise<void>;

  /**
   * Obtiene el historial de entregas para un evento específico
   */
  getDeliveriesByEvent(
    event: string,
    limit?: number
  ): Promise<WebhookDelivery[]>;

  /**
   * Obtiene el historial de entregas para una URL específica
   */
  getDeliveriesByUrl(url: string, limit?: number): Promise<WebhookDelivery[]>;

  /**
   * Obtiene las últimas N entregas
   */
  getRecentDeliveries(limit?: number): Promise<WebhookDelivery[]>;

  /**
   * Obtiene estadísticas de entregas
   */
  getDeliveryStats(since?: Date): Promise<WebhookDeliveryStats>;

  /**
   * Obtiene estadísticas por evento
   */
  getDeliveryStatsByEvent(
    event: string,
    since?: Date
  ): Promise<WebhookDeliveryStats>;

  /**
   * Verifica si un webhook fue entregado exitosamente en las últimas N horas
   */
  wasRecentlyDelivered(event: string, hoursAgo: number): Promise<boolean>;
}
