import { config } from '@/config';
import { TYPES } from '@/config/types';
import type { IBCVService } from '@/interfaces/IBCVService';
import type {
  HealthCheck,
  HealthCheckResult,
  IHealthCheckService,
} from '@/interfaces/IHealthCheckService';
import type { IRedisService } from '@/interfaces/IRedisService';
import type { ISchedulerService } from '@/interfaces/ISchedulerService';
import type { IWebSocketService } from '@/interfaces/IWebSocketService';
import type { IWebhookService } from '@/interfaces/IWebhookService';
import { getCurrencyRate } from '@/services/bcv.service';
import type { ICacheService } from '@/services/cache.interface';
import log from '@/utils/logger';
import { inject, injectable } from 'inversify';

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

  private previousOverallStatus?: string;

  constructor(
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.RedisService) private redisService: IRedisService,
    @inject(TYPES.SchedulerService) private schedulerService: ISchedulerService,
    @inject(TYPES.BCVService) private bcvService: IBCVService,
    @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService,
    @inject(TYPES.WebhookService) private webhookService: IWebhookService
  ) {
    this.startTime = Date.now();
  }

  /**
   * Readiness check - Verifica si el servicio puede recibir tráfico
   * Solo hace pings rápidos, NO hace I/O pesado
   * Debe completarse en < 500ms
   */
  async checkReadiness(): Promise<boolean> {
    try {
      // Solo pings a dependencias críticas (MongoDB)
      // Redis no es crítico, el servicio funciona sin cache
      const [mongoOk] = await Promise.all([this.pingMongoDB()]);

      return mongoOk;
    } catch (error) {
      log.error('Readiness check failed', { error });
      return false;
    }
  }

  /**
   * Full health check - Verifica el estado completo del servicio
   * Incluye checks detallados que pueden ser lentos
   * NO incluye BCV scraping (se hace solo bajo demanda en /health/bcv)
   */
  async checkFullHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Ejecutar checks en paralelo
    // IMPORTANTE: NO incluimos checkBCV() aquí porque hace web scraping
    const [mongoCheck, redisCheck, schedulerCheck, websocketCheck] =
      await Promise.all([
        this.checkMongoDB(),
        this.checkRedis(),
        this.checkScheduler(),
        this.checkWebSocket(),
      ]);

    // Determinar el estado general
    const checks = {
      mongodb: mongoCheck,
      redis: redisCheck,
      scheduler: schedulerCheck,
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
    // WebSocket o Redis degradados/unhealthy = servicio degradado
    // (Redis no es crítico ya que el servicio puede funcionar sin cache)
    else if (
      websocketCheck.status === 'degraded' ||
      redisCheck.status === 'degraded' ||
      websocketCheck.status === 'unhealthy' ||
      redisCheck.status === 'unhealthy'
    ) {
      overallStatus = 'degraded';
    }

    // Verificar si hubo cambio en el estado general y enviar notificación
    if (
      this.previousOverallStatus &&
      this.previousOverallStatus !== overallStatus
    ) {
      try {
        // Determinar el evento correspondiente según el nuevo estado
        let eventType:
          | 'service.healthy'
          | 'service.unhealthy'
          | 'service.degraded';
        if (overallStatus === 'healthy') {
          eventType = 'service.healthy';
        } else if (overallStatus === 'unhealthy') {
          eventType = 'service.unhealthy';
        } else {
          eventType = 'service.degraded';
        }

        await this.webhookService.sendServiceStatusNotification(
          eventType,
          {
            status: overallStatus,
            timestamp,
            uptime,
            checks,
          },
          this.previousOverallStatus
        );
      } catch (error) {
        log.error('Error sending service status notification', { error });
      }
    }

    // Actualizar el estado anterior
    this.previousOverallStatus = overallStatus;

    return {
      status: overallStatus,
      timestamp,
      uptime,
      checks,
    };
  }

  /**
   * Ping rápido a MongoDB (< 100ms)
   * Solo verifica conectividad, NO hace queries
   */
  async pingMongoDB(): Promise<boolean> {
    try {
      // Verificar que la conexión existe y está activa
      // Usamos un query muy simple que solo verifica la conexión
      await this.cacheService.ping();
      return true;
    } catch (error) {
      log.error('MongoDB ping failed', { error });
      return false;
    }
  }

  /**
   * Verifica la conectividad a MongoDB (check detallado)
   * Usa ping rápido en lugar de query completa
   */
  async checkMongoDB(): Promise<HealthCheck> {
    try {
      const isConnected = await this.pingMongoDB();

      if (isConnected) {
        return {
          status: 'healthy',
          message: 'MongoDB connection is healthy',
        };
      }

      return {
        status: 'unhealthy',
        message: 'MongoDB connection failed',
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
            lastRate: getCurrencyRate(rate, 'USD'),
            date: rate.date,
            currencies: rate.rates?.length || 0,
          },
        };
      }
      return {
        status: 'degraded',
        message: 'BCV service returned no data',
      };
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

  /**
   * Verifica el estado del servicio Redis
   * Usa solo ping, sin operaciones de escritura/lectura
   */
  async checkRedis(): Promise<HealthCheck> {
    // Si Redis está deshabilitado, no es un error
    if (!config.redis.enabled) {
      return {
        status: 'healthy',
        message: 'Redis cache is disabled',
        details: {
          enabled: false,
        },
      };
    }

    try {
      // Solo ping, sin write/read/delete para hacer el check más rápido
      const isConnected = await this.redisService.ping();

      if (!isConnected) {
        return {
          status: 'unhealthy',
          message: 'Redis connection failed',
          details: {
            enabled: true,
            connected: false,
          },
        };
      }

      return {
        status: 'healthy',
        message: 'Redis is operational',
        details: {
          enabled: true,
          connected: true,
        },
      };
    } catch (error) {
      log.error('Redis health check failed', { error });
      return {
        status: 'unhealthy',
        message: 'Redis error',
        details: {
          enabled: true,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
