import 'reflect-metadata';
import { Container } from 'inversify';
import { Server as HttpServer } from 'http';
import { TYPES } from '@/config/types';
import { config } from '@/config';

// Services
import { BCVService } from '@/services/bcv.service';
import { MongoService } from '@/services/mongo.service';
import { WebSocketService } from '@/services/websocket.service';
import { SchedulerService } from '@/services/scheduler.service';

// Interfaces
import { IBCVService } from '@/interfaces/IBCVService';
import { ICacheService } from '@/services/cache.interface';
import { IWebSocketService } from '@/interfaces/IWebSocketService';
import { ISchedulerService } from '@/interfaces/ISchedulerService';

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
  container.bind<IBCVService>(TYPES.BCVService).to(BCVService).inSingletonScope();

  // CacheService: usar MongoService si saveToDatabase está activado
  if (config.saveToDatabase) {
    container.bind<ICacheService>(TYPES.CacheService).to(MongoService).inSingletonScope();
  } else {
    // Mock implementation para modo consola
    container.bind<ICacheService>(TYPES.CacheService).toConstantValue({
      connect: async () => {},
      disconnect: async () => {},
      saveRate: async (rate) => ({
        id: `${rate.date}-${rate.source}`,
        rate: rate.rate,
        rates: rate.rates || [],
        date: rate.date,
        source: rate.source,
        createdAt: new Date().toISOString()
      }),
      getLatestRate: async () => null,
      getRateByDate: async () => null,
      getRateHistory: async () => [],
      getAllRates: async () => []
    });
  }

  container.bind<IWebSocketService>(TYPES.WebSocketService).to(WebSocketService).inSingletonScope();
  container.bind<ISchedulerService>(TYPES.SchedulerService).to(SchedulerService).inSingletonScope();

  // Bind Controllers
  container.bind<RateController>(TYPES.RateController).to(RateController).inSingletonScope();

  return container;
}
