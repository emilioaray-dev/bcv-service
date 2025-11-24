import { config } from '@/config';
import { TYPES } from '@/config/types';
import { RATE_ROUTES } from '@/constants/routes';
import type { IRedisService } from '@/interfaces/IRedisService';
import { CacheKeys } from '@/interfaces/IRedisService';
import {
  validateDateParam,
  validateHistoryQuery,
  validateDateRangeQuery,
} from '@/middleware/validation.middleware';
import type { ICacheService } from '@/services/cache.interface';
import { fillDateGaps } from '@/utils/date-fill';
import log from '@/utils/logger';
import { type Request, type Response, Router } from 'express';
import { inject, injectable } from 'inversify';

/**
 * RateController - Controlador REST para endpoints de tasas
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Manejar requests HTTP para tasas de cambio
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Depende de ICacheService (abstracción) no de MongoService (concreción)
 */
@injectable()
export class RateController {
  public router: Router;
  private cacheService: ICacheService;
  private redisService: IRedisService;

  constructor(
    @inject(TYPES.CacheService) cacheService: ICacheService,
    @inject(TYPES.RedisService) redisService: IRedisService
  ) {
    this.cacheService = cacheService;
    this.redisService = redisService;
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get(RATE_ROUTES.LATEST, this.getLatestRate.bind(this));
    this.router.get(
      RATE_ROUTES.HISTORY,
      validateHistoryQuery,
      this.getRateHistory.bind(this)
    );
    this.router.get(
      RATE_ROUTES.BY_DATE,
      validateDateParam,
      this.getRateByDate.bind(this)
    );
    this.router.get(
      `${RATE_ROUTES.HISTORY}/range`,
      validateDateRangeQuery,
      this.getRatesByDateRange.bind(this)
    );
  }

  private async getLatestRate(_req: Request, res: Response): Promise<void> {
    try {
      if (!config.saveToDatabase) {
        // En modo consola, indicar que no hay acceso a base de datos
        res.status(405).json({
          success: false,
          error: 'Modo consola activado: No hay acceso a la base de datos',
          message: 'SAVE_TO_DATABASE está configurado como false',
        });
        return;
      }

      // Cache-Aside Pattern: Intentar leer del cache Redis primero
      if (config.redis.enabled) {
        const cached = await this.redisService.get(CacheKeys.LATEST_RATE);
        if (cached) {
          log.debug('Cache hit: latest_rate');
          res.json({
            success: true,
            data: cached,
          });
          return;
        }
        log.debug('Cache miss: latest_rate');
      }

      // Cache miss o Redis deshabilitado - consultar MongoDB
      const rate = await this.cacheService.getLatestRate();
      if (!rate) {
        res.status(404).json({
          success: false,
          error: 'No se encontró ninguna tasa de cambio',
        });
        return;
      }

      // Guardar en cache para próximas consultas
      if (config.redis.enabled) {
        await this.redisService.set(
          CacheKeys.LATEST_RATE,
          rate,
          config.cacheTTL.latest
        );
      }

      res.json({
        success: true,
        data: rate,
      });
    } catch (error) {
      log.error('Error obteniendo tasa más reciente', { error });
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  private async getRateHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!config.saveToDatabase) {
        // En modo consola, indicar que no hay acceso a base de datos
        res.status(405).json({
          success: false,
          error: 'Modo consola activado: No hay acceso a la base de datos',
          message: 'SAVE_TO_DATABASE está configurado como false',
        });
        return;
      }

      // Obtener el límite de registros desde los parámetros de consulta
      const limit = Number.parseInt(req.query.limit as string) || 30;
      const maxLimit = 100; // Límite máximo para prevenir sobrecarga

      const safeLimit = Math.min(limit, maxLimit);

      const rates = await this.cacheService.getRateHistory(safeLimit);
      res.json({
        success: true,
        data: rates,
        count: rates.length,
      });
    } catch (error) {
      log.error('Error obteniendo historial de tasas', { error });
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  private async getRateByDate(req: Request, res: Response): Promise<void> {
    try {
      if (!config.saveToDatabase) {
        // En modo consola, indicar que no hay acceso a base de datos
        res.status(405).json({
          success: false,
          error: 'Modo consola activado: No hay acceso a la base de datos',
          message: 'SAVE_TO_DATABASE está configurado como false',
        });
        return;
      }

      const { date } = req.params;
      // La validación de formato se hace en el middleware validateDateParam

      // Cache-Aside Pattern: Intentar leer del cache Redis primero
      if (config.redis.enabled) {
        const cacheKey = CacheKeys.HISTORY_BY_DATE(date);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
          log.debug('Cache hit: history by date', { date });
          res.json({
            success: true,
            data: cached,
          });
          return;
        }
        log.debug('Cache miss: history by date', { date });
      }

      // Cache miss o Redis deshabilitado - consultar MongoDB
      const rate = await this.cacheService.getRateByDate(date);
      if (!rate) {
        res.status(404).json({
          success: false,
          error: `No se encontró tasa para la fecha ${date}`,
        });
        return;
      }

      // Guardar en cache para próximas consultas
      if (config.redis.enabled) {
        const cacheKey = CacheKeys.HISTORY_BY_DATE(date);
        await this.redisService.set(cacheKey, rate, config.cacheTTL.history);
      }

      res.json({
        success: true,
        data: rate,
      });
    } catch (error) {
      log.error('Error obteniendo tasa por fecha', { error });
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  private async getRatesByDateRange(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!config.saveToDatabase) {
        // En modo consola, indicar que no hay acceso a base de datos
        res.status(405).json({
          success: false,
          error: 'Modo consola activado: No hay acceso a la base de datos',
          message: 'SAVE_TO_DATABASE está configurado como false',
        });
        return;
      }

      const { startDate, endDate, fillGaps } = req.query;
      const limit = Number.parseInt(req.query.limit as string) || 100;
      const shouldFillGaps = Boolean(fillGaps);

      log.info('Fetching rates by date range', {
        startDate,
        endDate,
        limit,
        fillGaps: shouldFillGaps,
        requestId: req.get('x-request-id'),
      });

      // La validación de formato y lógica se hace en el middleware validateDateRangeQuery

      // Generar clave de cache basada en los parámetros de la consulta
      const cacheKey = `history:range:${startDate}:${endDate}:${limit}:${shouldFillGaps}`;

      // Cache-Aside Pattern: Intentar leer del cache Redis primero
      if (config.redis.enabled) {
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
          const duration = Date.now() - startTime;
          log.info('Cache hit: history by date range', {
            startDate,
            endDate,
            limit,
            fillGaps: shouldFillGaps,
            count: Array.isArray(cached) ? cached.length : 0,
            durationMs: duration,
            source: 'redis',
          });
          res.json({
            success: true,
            data: cached,
            count: Array.isArray(cached) ? cached.length : 0,
            range: {
              start: startDate,
              end: endDate,
              limit,
              fillGaps: shouldFillGaps,
            },
          });
          return;
        }
        log.debug('Cache miss: history by date range', { startDate, endDate, limit, fillGaps: shouldFillGaps });
      }

      // Cache miss o Redis deshabilitado - consultar MongoDB
      const rates = await this.cacheService.getRatesByDateRange(
        startDate as string,
        endDate as string,
        limit
      );

      if (!rates || rates.length === 0) {
        res.status(404).json({
          success: false,
          error: `No se encontraron tasas para el rango ${startDate} - ${endDate}`,
        });
        return;
      }

      // Apply gap filling if requested
      const finalRates = shouldFillGaps
        ? fillDateGaps(rates, startDate as string, endDate as string)
        : rates.map(rate => ({ ...rate, isFilled: false }));

      // Guardar en cache para próximas consultas
      if (config.redis.enabled) {
        await this.redisService.set(cacheKey, finalRates, config.cacheTTL.history);
      }

      const duration = Date.now() - startTime;
      log.info('Successfully fetched rates by date range', {
        startDate,
        endDate,
        limit,
        fillGaps: shouldFillGaps,
        count: finalRates.length,
        originalCount: rates.length,
        filledCount: shouldFillGaps ? finalRates.length - rates.length : 0,
        durationMs: duration,
        source: 'mongodb',
        cached: config.redis.enabled,
      });

      res.json({
        success: true,
        data: finalRates,
        count: finalRates.length,
        range: {
          start: startDate,
          end: endDate,
          limit,
          fillGaps: shouldFillGaps,
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Error obteniendo tasas por rango de fechas', {
        error,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit,
        fillGaps: req.query.fillGaps,
        durationMs: duration,
      });
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}
