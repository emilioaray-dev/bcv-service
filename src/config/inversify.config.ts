import 'reflect-metadata';
import type { Server as HttpServer } from 'node:http';
import { config } from '@/config';
import { TYPES } from '@/config/types';
import { Container } from 'inversify';

// Services
import { BCVService } from '@/services/bcv.service';
import { DiscordService } from '@/services/discord.service';
import { HealthCheckService } from '@/services/health-check.service';
import { MetricsService } from '@/services/metrics.service';
import { MongoService } from '@/services/mongo.service';
import { RedisService } from '@/services/redis.service';
import { SchedulerService } from '@/services/scheduler.service';
import { WebhookService } from '@/services/webhook.service';
import { WebSocketService } from '@/services/websocket.service';

// Interfaces
import type { IBCVService } from '@/interfaces/IBCVService';
import type { IHealthCheckService } from '@/interfaces/IHealthCheckService';
import type { IMetricsService } from '@/interfaces/IMetricsService';
import type { IRedisService } from '@/interfaces/IRedisService';
import type { ISchedulerService } from '@/interfaces/ISchedulerService';
import type { IWebSocketService } from '@/interfaces/IWebSocketService';
import type { IWebhookService } from '@/interfaces/IWebhookService';
import type { ICacheService } from '@/services/cache.interface';
import type { IDiscordService } from '@/services/discord.service';

import { HealthController } from '@/controllers/health.controller';
import { MetricsController } from '@/controllers/metrics.controller';
// Controllers
import { RateController } from '@/controllers/rate.controller';

/**
 * Inversify IoC Container Configuration
 *
 * Este contenedor configura todas las dependencias de la aplicación
 * siguiendo el principio de Dependency Inversion (DIP).
 *
 * Beneficios:
 * - Desacoplamiento: Los componentes no conocen las implementaciones concretas
 * - Testabilidad: Fácil reemplazo de implementaciones en tests
 * - Mantenibilidad: Cambios en una implementación no afectan a otras
 * - Extensibilidad: Agregar nuevas implementaciones sin modificar código existente
 */

/**
 * Crea y configura el contenedor de Inversify
 * @param server - Servidor HTTP para inyectar en servicios que lo necesiten
 * @returns Contenedor configurado
 */
export function createContainer(server: HttpServer): Container {
  const container = new Container();

  // Bind Configuration
  container.bind(TYPES.Config).toConstantValue(config);

  // Bind HttpServer
  container.bind<HttpServer>(TYPES.HttpServer).toConstantValue(server);

  // Bind Services
  container
    .bind<IBCVService>(TYPES.BCVService)
    .to(BCVService)
    .inSingletonScope();
  container
    .bind<IDiscordService>(TYPES.DiscordService)
    .to(DiscordService)
    .inSingletonScope();
  container
    .bind<IWebhookService>(TYPES.WebhookService)
    .to(WebhookService)
    .inSingletonScope();
  container
    .bind<IRedisService>(TYPES.RedisService)
    .to(RedisService)
    .inSingletonScope();

  // CacheService: usar MongoService si saveToDatabase está activado
  if (config.saveToDatabase) {
    container
      .bind<ICacheService>(TYPES.CacheService)
      .to(MongoService)
      .inSingletonScope();
  } else {
    // Mock implementation para modo consola
    container.bind<ICacheService>(TYPES.CacheService).toConstantValue({
      connect: async () => {},
      disconnect: async () => {},
      ping: async () => {},
      saveRate: async (rate) => ({
        id: `${rate.date}-${rate.source}`,
        rates: rate.rates,
        date: rate.date,
        source: rate.source,
        createdAt: new Date().toISOString(),
      }),
      getLatestRate: async () => null,
      getRateByDate: async () => null,
      getRateHistory: async () => [],
      getAllRates: async () => [],
    });
  }

  container
    .bind<IWebSocketService>(TYPES.WebSocketService)
    .to(WebSocketService)
    .inSingletonScope();
  container
    .bind<ISchedulerService>(TYPES.SchedulerService)
    .to(SchedulerService)
    .inSingletonScope();
  container
    .bind<IHealthCheckService>(TYPES.HealthCheckService)
    .to(HealthCheckService)
    .inSingletonScope();
  container
    .bind<IMetricsService>(TYPES.MetricsService)
    .to(MetricsService)
    .inSingletonScope();

  // Bind Controllers
  container
    .bind<RateController>(TYPES.RateController)
    .to(RateController)
    .inSingletonScope();
  container
    .bind<HealthController>(TYPES.HealthController)
    .to(HealthController)
    .inSingletonScope();
  container
    .bind<MetricsController>(TYPES.MetricsController)
    .to(MetricsController)
    .inSingletonScope();

  return container;
}
