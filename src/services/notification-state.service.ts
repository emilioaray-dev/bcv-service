import { TYPES } from '@/config/types';
import type {
  INotificationStateService,
  NotificationState,
} from '@/interfaces/INotificationStateService';
import type { IRedisService } from '@/interfaces/IRedisService';
import type { BCVRateData, CurrencyRate } from '@/services/bcv.service';
import { getCurrencyRate } from '@/services/bcv.service';
import type { ICacheService } from '@/services/cache.interface';
import log from '@/utils/logger';
import { inject, injectable } from 'inversify';

@injectable()
export class NotificationStateService implements INotificationStateService {
  private readonly COLLECTION_NAME = 'notification_states';
  private readonly STATE_ID = 'last_notification';
  private readonly REDIS_KEY = 'notification_state:last_notification';

  constructor(
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.RedisService) private redisService: IRedisService
  ) {}

  async getLastNotificationState(): Promise<NotificationState | null> {
    try {
      // Primero intentar obtener de Redis (más rápido)
      let state = await this.redisService.get<NotificationState>(
        this.REDIS_KEY
      );

      if (state) {
        return state;
      }

      // Si no está en Redis, obtener de MongoDB
      state = await this.cacheService.getNotificationState(this.STATE_ID);

      // Si lo encontramos en MongoDB, guardarlo en Redis para futuras lecturas
      if (state) {
        try {
          await this.redisService.set(this.REDIS_KEY, state);
        } catch (redisError) {
          log.warn('No se pudo guardar en Redis, usando solo MongoDB', {
            error: (redisError as Error).message,
          });
        }
      }

      return state;
    } catch (error) {
      log.error('Error obteniendo estado de última notificación', {
        error: (error as Error).message,
      });
      return null;
    }
  }

  async updateNotificationState(
    rateData: BCVRateData
  ): Promise<NotificationState> {
    try {
      const now = new Date();
      const state: NotificationState = {
        lastNotifiedRate: rateData,
        lastNotificationDate: now,
        createdAt: now,
        updatedAt: now,
      };

      // Actualizar en MongoDB (persistencia)
      await this.cacheService.saveNotificationState(this.STATE_ID, state);

      // Actualizar en Redis (caché rápida)
      try {
        await this.redisService.set(this.REDIS_KEY, state);
      } catch (redisError) {
        log.warn(
          'No se pudo actualizar Redis, estado solo guardado en MongoDB',
          {
            error: (redisError as Error).message,
          }
        );
      }

      log.info('Estado de notificación actualizado', {
        date: rateData.date,
        usdRate: getCurrencyRate(rateData, 'USD'),
      });

      return state;
    } catch (error) {
      log.error('Error actualizando estado de notificación', {
        error: (error as Error).message,
        date: rateData.date,
      });
      throw error;
    }
  }

  async hasSignificantChangeAndNotify(
    currentRate: BCVRateData,
    threshold = 0.01
  ): Promise<boolean> {
    try {
      const lastState = await this.getLastNotificationState();

      // Si no hay estado anterior, no notificamos (previene notificaciones al inicio)
      if (!lastState) {
        log.debug('No hay estado anterior de notificación', {
          currentUsdRate: getCurrencyRate(currentRate, 'USD'),
        });
        return false;
      }

      const previousRate = lastState.lastNotifiedRate;

      // Verificar si hay cambios en CUALQUIER moneda
      if (
        Array.isArray(currentRate.rates) &&
        Array.isArray(previousRate.rates)
      ) {
        for (const currentRateItem of currentRate.rates) {
          const previousRateItem = previousRate.rates.find(
            (r: CurrencyRate) => r.currency === currentRateItem.currency
          );

          if (!previousRateItem) {
            // Nueva moneda añadida
            log.info('Detectada nueva moneda en notificación persistente', {
              currency: currentRateItem.currency,
              rate: currentRateItem.rate,
            });
            await this.updateNotificationState(currentRate);
            return true;
          }

          // Calcular diferencia absoluta (no porcentaje)
          const absoluteChange = Math.abs(
            (currentRateItem.rate || 0) - (previousRateItem.rate || 0)
          );

          // Consideramos cambio si la diferencia absoluta es >= threshold
          if (absoluteChange >= threshold) {
            const percentChange =
              ((currentRateItem.rate - previousRateItem.rate) /
                previousRateItem.rate) *
              100;

            log.info(
              'Detectado cambio significativo en notificación persistente',
              {
                currency: currentRateItem.currency,
                previousRate: previousRateItem.rate,
                currentRate: currentRateItem.rate,
                absoluteChange: absoluteChange.toFixed(4),
                percentChange: percentChange.toFixed(4),
              }
            );

            await this.updateNotificationState(currentRate);
            return true;
          }
        }
      }

      // Si llegamos aquí, no hubo cambios significativos
      log.debug(
        'No se detectaron cambios significativos en notificación persistente',
        {
          usdChange: Math.abs(
            getCurrencyRate(currentRate, 'USD') -
              getCurrencyRate(previousRate, 'USD')
          ).toFixed(4),
        }
      );

      return false;
    } catch (error) {
      log.error('Error verificando cambios en notificación persistente', {
        error: (error as Error).message,
      });
      // En caso de error, no notificamos para evitar spam
      return false;
    }
  }
}
