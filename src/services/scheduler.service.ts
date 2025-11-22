import { TYPES } from '@/config/types';
import type { IBCVService } from '@/interfaces/IBCVService';
import type { IMetricsService } from '@/interfaces/IMetricsService';
import type { ISchedulerService } from '@/interfaces/ISchedulerService';
import type { IWebSocketService } from '@/interfaces/IWebSocketService';
import { getCurrencyRate } from '@/services/bcv.service';
import type { ICacheService } from '@/services/cache.interface';
import log from '@/utils/logger';
import { inject, injectable } from 'inversify';
import cron from 'node-cron';

/**
 * SchedulerService - Servicio de programación de tareas
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Gestionar la programación y ejecución de actualizaciones periódicas
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Depende de abstracciones (interfaces) no de concreciones
 *
 * Implementa el principio de Open/Closed (OCP):
 * - Abierto a extensión (se pueden agregar más tareas programadas)
 * - Cerrado a modificación (no requiere cambios para nuevas tareas)
 */
@injectable()
export class SchedulerService implements ISchedulerService {
  private cronJob: cron.ScheduledTask | null = null;
  private readonly cronSchedule: string;
  private readonly saveToDatabase: boolean;

  constructor(
    @inject(TYPES.BCVService) private bcvService: IBCVService,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService,
    @inject(TYPES.MetricsService) private metricsService: IMetricsService,
    @inject(TYPES.Config) config: {
      cronSchedule: string;
      saveToDatabase: boolean;
    }
  ) {
    this.cronSchedule = config.cronSchedule;
    this.saveToDatabase = config.saveToDatabase;
  }

  /**
   * Inicia la ejecución de tareas programadas
   */
  start(): void {
    log.info('Tarea programada configurada', { schedule: this.cronSchedule });

    this.cronJob = cron.schedule(this.cronSchedule, async () => {
      await this.updateRate();
    });
  }

  /**
   * Detiene la ejecución de tareas programadas
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      log.info('Tarea programada detenida');
    }
  }

  /**
   * Ejecuta manualmente una actualización inmediata
   */
  async executeImmediately(): Promise<void> {
    await this.updateRate();
  }

  /**
   * Lógica interna de actualización de tasas
   * Encapsula toda la lógica de obtención, comparación y guardado
   */
  private async updateRate(): Promise<void> {
    log.info('Ejecutando tarea programada para actualizar tasa de cambio');

    try {
      const currentData = await this.bcvService.getCurrentRate();

      if (!currentData) {
        log.error('No se pudo obtener la tasa de cambio del BCV');
        this.metricsService.incrementBCVUpdateFailure();
        return;
      }

      // Actualizar métrica de última tasa obtenida
      this.metricsService.setLatestRate(getCurrencyRate(currentData, 'USD'));

      // Obtener la tasa almacenada previamente
      const previousRate = await this.cacheService.getLatestRate();

      // Solo guardar si hay un cambio significativo o si es la primera vez
      const currentUsdRate = getCurrencyRate(currentData, 'USD');
      const previousUsdRate = getCurrencyRate(previousRate, 'USD');
      const hasSignificantChange =
        !previousRate ||
        Math.abs(previousUsdRate - currentUsdRate) > 0.0001 ||
        (currentData.rates &&
          previousRate?.rates &&
          JSON.stringify(currentData.rates) !==
            JSON.stringify(previousRate.rates));

      if (hasSignificantChange) {
        if (this.saveToDatabase) {
          const newRate = await this.cacheService.saveRate({
            rates: currentData.rates,
            date: currentData.date,
            source: 'bcv',
          });

          log.info('Tasa actualizada', {
            usdRate: getCurrencyRate(newRate, 'USD'),
            date: newRate.date,
            detailedRates: newRate.rates,
          });

          // Notificar a los clientes WebSocket
          const newUsdRate = getCurrencyRate(newRate, 'USD');
          const change = previousRate ? newUsdRate - previousUsdRate : 0;
          this.webSocketService.broadcastRateUpdate({
            timestamp: new Date().toISOString(),
            rates: newRate.rates,
            change,
            eventType: 'rate-update',
          });

          // Métrica de actualización exitosa
          this.metricsService.incrementBCVUpdateSuccess();
        } else {
          log.info('Modo consola: Tasa cambiada - NO se almacenó en DB', {
            usdRate: currentUsdRate,
            date: currentData.date,
            detailedRates: currentData.rates,
          });

          // Métrica de actualización exitosa (incluso en modo consola)
          this.metricsService.incrementBCVUpdateSuccess();
        }
      } else {
        log.debug('Tasa sin cambios, no se almacenó', {
          usdRate: currentUsdRate,
        });
      }
    } catch (error: unknown) {
      log.error('Error en la tarea programada', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
