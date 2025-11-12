import { injectable, inject } from 'inversify';
import { Router, Request, Response } from 'express';
import { IHealthCheckService } from '@/interfaces/IHealthCheckService';
import { TYPES } from '@/config/types';
import log from '@/utils/logger';

/**
 * HealthController - Controlador para endpoints de health checks
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Manejar requests HTTP para health checks
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Depende de IHealthCheckService (abstracción) no de HealthCheckService (concreción)
 */
@injectable()
export class HealthController {
  public router: Router;
  private healthCheckService: IHealthCheckService;

  constructor(
    @inject(TYPES.HealthCheckService) healthCheckService: IHealthCheckService
  ) {
    this.healthCheckService = healthCheckService;
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Health check completo
    this.router.get('/health', this.getHealth.bind(this));

    // Health checks individuales
    this.router.get('/health/mongodb', this.getMongoHealth.bind(this));
    this.router.get('/health/scheduler', this.getSchedulerHealth.bind(this));
    this.router.get('/health/bcv', this.getBCVHealth.bind(this));
    this.router.get('/health/websocket', this.getWebSocketHealth.bind(this));

    // Alias para Kubernetes
    this.router.get('/healthz', this.getHealth.bind(this));
    this.router.get('/readyz', this.getHealth.bind(this));
  }

  /**
   * GET /health - Health check completo
   * También disponible en /healthz y /readyz para Kubernetes
   */
  private async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthResult = await this.healthCheckService.checkHealth();

      // HTTP status code basado en el estado
      const statusCode = healthResult.status === 'healthy' ? 200 :
                        healthResult.status === 'degraded' ? 200 : // 200 pero con estado degraded
                        503; // Service Unavailable

      res.status(statusCode).json(healthResult);
    } catch (error) {
      log.error('Health check endpoint failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * GET /health/mongodb - Health check de MongoDB
   */
  private async getMongoHealth(req: Request, res: Response): Promise<void> {
    try {
      const mongoCheck = await this.healthCheckService.checkMongoDB();
      const statusCode = mongoCheck.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(mongoCheck);
    } catch (error) {
      log.error('MongoDB health check endpoint failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        message: 'MongoDB health check failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * GET /health/scheduler - Health check del scheduler
   */
  private async getSchedulerHealth(req: Request, res: Response): Promise<void> {
    try {
      const schedulerCheck = await this.healthCheckService.checkScheduler();
      const statusCode = schedulerCheck.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(schedulerCheck);
    } catch (error) {
      log.error('Scheduler health check endpoint failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        message: 'Scheduler health check failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * GET /health/bcv - Health check del servicio BCV
   */
  private async getBCVHealth(req: Request, res: Response): Promise<void> {
    try {
      const bcvCheck = await this.healthCheckService.checkBCV();
      const statusCode = bcvCheck.status === 'healthy' ? 200 :
                        bcvCheck.status === 'degraded' ? 200 :
                        503;
      res.status(statusCode).json(bcvCheck);
    } catch (error) {
      log.error('BCV health check endpoint failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        message: 'BCV health check failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * GET /health/websocket - Health check del servicio WebSocket
   */
  private async getWebSocketHealth(req: Request, res: Response): Promise<void> {
    try {
      const websocketCheck = await this.healthCheckService.checkWebSocket();
      const statusCode = websocketCheck.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(websocketCheck);
    } catch (error) {
      log.error('WebSocket health check endpoint failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        message: 'WebSocket health check failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
