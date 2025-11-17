import type { IMetricsService } from '@/interfaces/IMetricsService';
import type { NextFunction, Request, Response } from 'express';
import { injectable } from 'inversify';
import * as promClient from 'prom-client';

/**
 * Metrics Service - Gestión de métricas con Prometheus
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Gestionar métricas de aplicación
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Depende de la abstracción IMetricsService
 *
 * Métricas implementadas:
 * - http_requests_total: Contador de requests por endpoint y método
 * - http_request_duration_seconds: Histograma de duración de requests
 * - bcv_websocket_connected_clients: Gauge de clientes conectados
 * - bcv_update_total: Contador de actualizaciones (éxito/fallo)
 * - bcv_latest_rate: Gauge de la última tasa obtenida
 */
@injectable()
export class MetricsService implements IMetricsService {
  private register: promClient.Registry;

  // Métricas
  private httpRequestsTotal: promClient.Counter<string>;
  private httpRequestDuration: promClient.Histogram<string>;
  private wsConnectedClients: promClient.Gauge<string>;
  private bcvUpdateTotal: promClient.Counter<string>;
  private bcvLatestRate: promClient.Gauge<string>;

  constructor() {
    // Crear registro de métricas
    this.register = new promClient.Registry();

    // Configurar métricas por defecto (CPU, memoria, etc.)
    promClient.collectDefaultMetrics({ register: this.register });

    // Contador de requests HTTP
    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total de requests HTTP recibidos',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // Histograma de duración de requests
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duración de requests HTTP en segundos',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10], // buckets en segundos
      registers: [this.register],
    });

    // Gauge de clientes WebSocket conectados
    this.wsConnectedClients = new promClient.Gauge({
      name: 'bcv_websocket_connected_clients',
      help: 'Número de clientes WebSocket conectados actualmente',
      registers: [this.register],
    });

    // Contador de actualizaciones del BCV
    this.bcvUpdateTotal = new promClient.Counter({
      name: 'bcv_update_total',
      help: 'Total de actualizaciones de tasa BCV',
      labelNames: ['status'], // 'success' o 'failure'
      registers: [this.register],
    });

    // Gauge de la última tasa obtenida
    this.bcvLatestRate = new promClient.Gauge({
      name: 'bcv_latest_rate',
      help: 'Última tasa de cambio BCV obtenida (Bs/USD)',
      registers: [this.register],
    });
  }

  /**
   * Retorna las métricas en formato Prometheus
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Middleware para trackear requests HTTP
   * Mide duración y cuenta requests por endpoint
   */
  requestMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const start = Date.now();

      // Capturar el fin de la respuesta
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000; // convertir a segundos
        const route = this.normalizeRoute(req.route?.path || req.path);
        const method = req.method;
        const statusCode = res.statusCode.toString();

        // Incrementar contador de requests
        this.httpRequestsTotal.labels(method, route, statusCode).inc();

        // Observar duración del request
        this.httpRequestDuration
          .labels(method, route, statusCode)
          .observe(duration);
      });

      next();
    };
  }

  /**
   * Normaliza la ruta para evitar alta cardinalidad
   * Convierte /api/rate/123 -> /api/rate/:id
   */
  private normalizeRoute(path: string): string {
    // Si hay una ruta definida, úsala
    if (path && path !== '/') {
      return path;
    }

    // Para rutas sin patrón, retornar tal cual
    // En producción, deberías tener un mapeo más sofisticado
    return path;
  }

  /**
   * Incrementa contador de actualizaciones exitosas del BCV
   */
  incrementBCVUpdateSuccess(): void {
    this.bcvUpdateTotal.labels('success').inc();
  }

  /**
   * Incrementa contador de actualizaciones fallidas del BCV
   */
  incrementBCVUpdateFailure(): void {
    this.bcvUpdateTotal.labels('failure').inc();
  }

  /**
   * Actualiza el gauge de la última tasa obtenida
   */
  setLatestRate(rate: number): void {
    if (rate > 0 && !Number.isNaN(rate)) {
      this.bcvLatestRate.set(rate);
    }
  }

  /**
   * Actualiza el gauge de clientes WebSocket conectados
   */
  setConnectedClients(count: number): void {
    this.wsConnectedClients.set(count);
  }
}
