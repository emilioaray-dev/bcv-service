import { TYPES } from '@/config/types';
import { ROUTES } from '@/constants/routes';
import type { IHealthCheckService } from '@/interfaces/IHealthCheckService';
import log from '@/utils/logger';
import { type Request, type Response, Router } from 'express';
import { inject, injectable } from 'inversify';

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
    // Kubernetes-style health checks
    this.router.get(ROUTES.HEALTHZ, this.getLiveness.bind(this)); // Liveness probe
    this.router.get(ROUTES.READYZ, this.getReadiness.bind(this)); // Readiness probe
    this.router.get(ROUTES.HEALTH, this.getFullHealth.bind(this)); // Full health check

    // Health checks individuales
    this.router.get(ROUTES.HEALTH_MONGODB, this.getMongoHealth.bind(this));
    this.router.get(
      ROUTES.HEALTH_SCHEDULER,
      this.getSchedulerHealth.bind(this)
    );
    this.router.get(ROUTES.HEALTH_BCV, this.getBCVHealth.bind(this));
    this.router.get(
      ROUTES.HEALTH_WEBSOCKET,
      this.getWebSocketHealth.bind(this)
    );
    this.router.get(ROUTES.HEALTH_REDIS, this.getRedisHealth.bind(this));
  }

  /**
   * GET /healthz - Liveness probe (ultra-rápido, sin I/O)
   * Verifica que el proceso Node.js está vivo y puede procesar requests
   * Debe responder en < 50ms
   * Usado por Docker/Kubernetes para saber si reiniciar el contenedor
   */
  private getLiveness(_req: Request, res: Response): void {
    // Liveness check: solo verifica que el proceso está vivo
    // NO hace I/O, NO consulta DB, NO hace HTTP requests
    res.status(200).send('OK');
  }

  /**
   * GET /readyz - Readiness probe (rápido, solo pings)
   * Verifica que el servicio puede recibir tráfico
   * Debe responder en < 500ms
   * Usado por Docker/Kubernetes para saber si enviar tráfico
   */
  private async getReadiness(_req: Request, res: Response): Promise<void> {
    try {
      // Solo pings rápidos a dependencias críticas
      const isReady = await this.healthCheckService.checkReadiness();

      if (isReady) {
        res.status(200).send('READY');
      } else {
        res.status(503).send('NOT READY');
      }
    } catch (error) {
      log.error('Readiness check failed', { error });
      res.status(503).send('ERROR');
    }
  }

  /**
   * GET /health - Full health check (detallado, puede ser lento)
   * Incluye checks completos de todos los servicios
   * Usado por dashboards y monitoring humano
   * Puede tardar varios segundos
   */
  private async getFullHealth(_req: Request, res: Response): Promise<void> {
    try {
      const healthResult = await this.healthCheckService.checkFullHealth();

      // HTTP status code basado en el estado
      const statusCode =
        healthResult.status === 'healthy'
          ? 200
          : healthResult.status === 'degraded'
            ? 200
            : // 200 pero con estado degraded
              503; // Service Unavailable

      res.status(statusCode).json(healthResult);
    } catch (error) {
      log.error('Full health check endpoint failed', { error });
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
  private async getMongoHealth(_req: Request, res: Response): Promise<void> {
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
  private async getSchedulerHealth(
    _req: Request,
    res: Response
  ): Promise<void> {
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
  private async getBCVHealth(_req: Request, res: Response): Promise<void> {
    try {
      const bcvCheck = await this.healthCheckService.checkBCV();
      const statusCode =
        bcvCheck.status === 'healthy'
          ? 200
          : bcvCheck.status === 'degraded'
            ? 200
            : 503;
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
  private async getWebSocketHealth(
    _req: Request,
    res: Response
  ): Promise<void> {
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

  /**
   * GET /health/redis - Health check del servicio Redis
   */
  private async getRedisHealth(_req: Request, res: Response): Promise<void> {
    try {
      const redisCheck = await this.healthCheckService.checkRedis();
      const statusCode = redisCheck.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(redisCheck);
    } catch (error) {
      log.error('Redis health check endpoint failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        message: 'Redis health check failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
