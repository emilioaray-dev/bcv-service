import { Request, Response, NextFunction } from 'express';

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
}
