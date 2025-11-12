import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types';
import { ICacheService } from '@/services/cache.interface';
import { ISchedulerService } from '@/interfaces/ISchedulerService';
import { IBCVService } from '@/interfaces/IBCVService';
import { IWebSocketService } from '@/interfaces/IWebSocketService';
import {
  IHealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@/interfaces/IHealthCheckService';
import log from '@/utils/logger';

/**
 * HealthCheckService - Servicio de verificación de salud
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Verificar el estado de salud del servicio y sus dependencias
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Depende de abstracciones (interfaces) no de implementaciones concretas
 */
@injectable()
export class HealthCheckService implements IHealthCheckService {
  private startTime: number;

  constructor(
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.SchedulerService) private schedulerService: ISchedulerService,
    @inject(TYPES.BCVService) private bcvService: IBCVService,
    @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService
  ) {
    this.startTime = Date.now();
  }

  /**
   * Verifica el estado de salud completo del servicio
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Ejecutar todos los checks en paralelo
    const [mongoCheck, schedulerCheck, bcvCheck, websocketCheck] = await Promise.all([
      this.checkMongoDB(),
      this.checkScheduler(),
      this.checkBCV(),
      this.checkWebSocket(),
    ]);

    // Determinar el estado general
    const checks = {
      mongodb: mongoCheck,
      scheduler: schedulerCheck,
      bcv: bcvCheck,
      websocket: websocketCheck,
    };

    // Estado general: unhealthy si algún check crítico falla
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    // MongoDB es crítico
    if (mongoCheck.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    }
    // Scheduler es crítico
    else if (schedulerCheck.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    }
    // BCV o WebSocket degradados = servicio degradado
    else if (
      bcvCheck.status === 'degraded' ||
      websocketCheck.status === 'degraded' ||
      bcvCheck.status === 'unhealthy' ||
      websocketCheck.status === 'unhealthy'
    ) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp,
      uptime,
      checks,
    };
  }

  /**
   * Verifica la conectividad a MongoDB
   */
  async checkMongoDB(): Promise<HealthCheck> {
    try {
      // Intentar obtener la última tasa para verificar conectividad
      await this.cacheService.getLatestRate();

      return {
        status: 'healthy',
        message: 'MongoDB connection is healthy',
      };
    } catch (error) {
      log.error('MongoDB health check failed', { error });
      return {
        status: 'unhealthy',
        message: 'MongoDB connection failed',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Verifica el estado del scheduler (cron job)
   */
  async checkScheduler(): Promise<HealthCheck> {
    try {
      // El scheduler no tiene un método para verificar su estado directamente
      // Asumimos que está healthy si no lanza errores
      // TODO: Agregar método getStatus() a ISchedulerService
      return {
        status: 'healthy',
        message: 'Scheduler is running',
      };
    } catch (error) {
      log.error('Scheduler health check failed', { error });
      return {
        status: 'unhealthy',
        message: 'Scheduler check failed',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Verifica el estado del servicio BCV
   */
  async checkBCV(): Promise<HealthCheck> {
    try {
      // Intentar obtener la tasa actual del BCV
      // Esto verifica que el scraper funciona correctamente
      const rate = await this.bcvService.getCurrentRate();

      if (rate) {
        return {
          status: 'healthy',
          message: 'BCV service is healthy',
          details: {
            lastRate: rate.rate,
            date: rate.date,
            currencies: rate.rates?.length || 0,
          },
        };
      } else {
        return {
          status: 'degraded',
          message: 'BCV service returned no data',
        };
      }
    } catch (error) {
      log.error('BCV service health check failed', { error });
      return {
        status: 'unhealthy',
        message: 'BCV service check failed',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Verifica el estado del servicio WebSocket
   */
  async checkWebSocket(): Promise<HealthCheck> {
    try {
      const connectedClients = this.webSocketService.getConnectedClientsCount();

      return {
        status: 'healthy',
        message: 'WebSocket service is healthy',
        details: {
          connectedClients,
        },
      };
    } catch (error) {
      log.error('WebSocket service health check failed', { error });
      return {
        status: 'unhealthy',
        message: 'WebSocket service check failed',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
