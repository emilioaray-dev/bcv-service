import type { NextFunction, Request, Response } from 'express';

/**
 * Metrics Service Interface
 *
 * Implementa el principio de Interface Segregation (ISP):
 * - Define solo los métodos necesarios para gestionar métricas
 *
 * Responsabilidades:
 * - Gestionar métricas de Prometheus
 * - Proporcionar middleware para tracking automático
 * - Exponer métricas para scraping
 */
export interface IMetricsService {
  /**
   * Retorna las métricas en formato Prometheus
   */
  getMetrics(): Promise<string>;

  /**
   * Middleware para trackear requests HTTP
   */
  requestMiddleware(): (req: Request, res: Response, next: NextFunction) => void;

  /**
   * Incrementa contador de actualizaciones exitosas del BCV
   */
  incrementBCVUpdateSuccess(): void;

  /**
   * Incrementa contador de actualizaciones fallidas del BCV
   */
  incrementBCVUpdateFailure(): void;

  /**
   * Actualiza el gauge de la última tasa obtenida
   */
  setLatestRate(rate: number): void;

  /**
   * Actualiza el gauge de clientes WebSocket conectados
   */
  setConnectedClients(count: number): void;

  /**
   * Registra una entrega de webhook exitosa
   * @param event - Tipo de evento ('rate.updated' | 'rate.changed')
   * @param duration - Duración de la entrega en milisegundos
   */
  recordWebhookSuccess(event: string, duration: number): void;

  /**
   * Registra una entrega de webhook fallida
   * @param event - Tipo de evento ('rate.updated' | 'rate.changed')
   * @param duration - Duración del intento en milisegundos
   */
  recordWebhookFailure(event: string, duration: number): void;

  /**
   * Registra un cache hit
   * @param keyPattern - Patrón de la key cacheada (e.g., 'latest_rate', 'history_by_date')
   */
  recordCacheHit(keyPattern: string): void;

  /**
   * Registra un cache miss
   * @param keyPattern - Patrón de la key que no estaba en cache
   */
  recordCacheMiss(keyPattern: string): void;

  /**
   * Registra la duración de una operación de cache
   * @param operation - Tipo de operación ('get', 'set', 'del')
   * @param status - Estado de la operación ('success', 'failure')
   * @param duration - Duración de la operación en milisegundos
   */
  recordCacheOperation(operation: string, status: 'success' | 'failure', duration: number): void;

  /**
   * Actualiza el estado de conexión de Redis
   * @param connected - True si está conectado, false si no
   */
  setRedisConnected(connected: boolean): void;
}
