import { TYPES } from '@/config/types';
import type { IMetricsService } from '@/interfaces/IMetricsService';
import { type Request, type Response, Router } from 'express';
import { inject, injectable } from 'inversify';

/**
 * Metrics Controller - Expone endpoint de métricas
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Exponer métricas en formato Prometheus
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Depende de IMetricsService en lugar de implementación concreta
 */
@injectable()
export class MetricsController {
  public router: Router;

  constructor(
    @inject(TYPES.MetricsService) private metricsService: IMetricsService
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  /**
   * Inicializa las rutas del controller
   */
  private initializeRoutes(): void {
    this.router.get('/metrics', this.getMetrics.bind(this));
  }

  /**
   * GET /metrics
   * Retorna métricas en formato Prometheus
   */
  private async getMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getMetrics();

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error: unknown) {
      res.status(500).json({
        error: 'Error obteniendo métricas',
        message: error.message,
      });
    }
  }
}
