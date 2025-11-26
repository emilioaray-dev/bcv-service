/**
 * Modelo para cola de webhooks pendientes/fallidos
 */
export interface WebhookQueueItem {
  id: string; // UUID
  event: string; // 'rate.changed', 'service.healthy', etc.
  url: string;
  payload: unknown; // El payload a enviar
  status: 'pending' | 'processing' | 'failed' | 'completed';
  attempts: number; // Número de intentos realizados
  maxAttempts: number; // Máximo de intentos permitidos
  lastAttemptAt?: Date;
  nextAttemptAt: Date; // Cuándo intentar de nuevo
  error?: string; // Último error
  createdAt: Date;
  completedAt?: Date;
  metadata?: {
    priority?: 'high' | 'normal' | 'low';
    [key: string]: unknown;
  };
}

export interface WebhookQueueStats {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  total: number;
}
