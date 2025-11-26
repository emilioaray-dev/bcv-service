import type {
  WebhookQueueItem,
  WebhookQueueStats,
} from '@/models/webhook-queue';

/**
 * Interface para el servicio de cola de webhooks
 */
export interface IWebhookQueueService {
  /**
   * Agrega un webhook a la cola
   */
  enqueue(
    event: string,
    url: string,
    payload: unknown,
    options?: {
      maxAttempts?: number;
      priority?: 'high' | 'normal' | 'low';
      delaySeconds?: number;
    }
  ): Promise<string>; // Returns queue item ID

  /**
   * Procesa webhooks pendientes en la cola
   */
  processQueue(): Promise<void>;

  /**
   * Marca un webhook como completado
   */
  markAsCompleted(id: string): Promise<void>;

  /**
   * Marca un webhook como fallido e incrementa attempts
   */
  markAsFailed(id: string, error: string): Promise<void>;

  /**
   * Obtiene webhooks pendientes listos para procesar
   */
  getPendingWebhooks(limit?: number): Promise<WebhookQueueItem[]>;

  /**
   * Obtiene estadísticas de la cola
   */
  getQueueStats(): Promise<WebhookQueueStats>;

  /**
   * Limpia webhooks completados antiguos
   */
  cleanOldWebhooks(olderThanDays: number): Promise<number>;

  /**
   * Inicia el worker que procesa la cola periódicamente
   */
  startWorker(intervalSeconds: number): void;

  /**
   * Detiene el worker
   */
  stopWorker(): void;
}
