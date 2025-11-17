import { config } from '@/config';
import { TYPES } from '@/config/types';
import type { IRedisService } from '@/interfaces/IRedisService';
import { CacheKeys } from '@/interfaces/IRedisService';
import { validateDateParam, validateHistoryQuery } from '@/middleware/validation.middleware';
import type { ICacheService } from '@/services/cache.interface';
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
    this.router.get('/rate/latest', this.getLatestRate.bind(this));
    this.router.get('/rate/history', validateHistoryQuery, this.getRateHistory.bind(this));
    this.router.get('/rate/:date', validateDateParam, this.getRateByDate.bind(this));
  }

  private async getLatestRate(_req: Request, res: Response): Promise<void> {
    try {
      if (!config.saveToDatabase) {
        // En modo consola, indicar que no hay acceso a base de datos
        res.status(405).json({
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
          res.json(cached);
          return;
        }
        log.debug('Cache miss: latest_rate');
      }

      // Cache miss o Redis deshabilitado - consultar MongoDB
      const rate = await this.cacheService.getLatestRate();
      if (!rate) {
        res.status(404).json({ error: 'No se encontró ninguna tasa de cambio' });
        return;
      }

      // Guardar en cache para próximas consultas
      if (config.redis.enabled) {
        await this.redisService.set(CacheKeys.LATEST_RATE, rate, config.cacheTTL.latest);
      }

      res.json(rate);
    } catch (error) {
      log.error('Error obteniendo tasa más reciente', { error });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  private async getRateHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!config.saveToDatabase) {
        // En modo consola, indicar que no hay acceso a base de datos
        res.status(405).json({
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
      res.json(rates);
    } catch (error) {
      log.error('Error obteniendo historial de tasas', { error });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  private async getRateByDate(req: Request, res: Response): Promise<void> {
    try {
      if (!config.saveToDatabase) {
        // En modo consola, indicar que no hay acceso a base de datos
        res.status(405).json({
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
          res.json(cached);
          return;
        }
        log.debug('Cache miss: history by date', { date });
      }

      // Cache miss o Redis deshabilitado - consultar MongoDB
      const rate = await this.cacheService.getRateByDate(date);
      if (!rate) {
        res.status(404).json({ error: `No se encontró tasa para la fecha ${date}` });
        return;
      }

      // Guardar en cache para próximas consultas
      if (config.redis.enabled) {
        const cacheKey = CacheKeys.HISTORY_BY_DATE(date);
        await this.redisService.set(cacheKey, rate, config.cacheTTL.history);
      }

      res.json(rate);
    } catch (error) {
      log.error('Error obteniendo tasa por fecha', { error });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
