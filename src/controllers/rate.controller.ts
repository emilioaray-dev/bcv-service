import { injectable, inject } from 'inversify';
import { Router, Request, Response } from 'express';
import { ICacheService } from '@/services/cache.interface';
import { config } from '@/config';
import { validateDateParam, validateHistoryQuery } from '@/middleware/validation.middleware';
import { TYPES } from '@/config/types';
import log from '@/utils/logger';

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

  constructor(
    @inject(TYPES.CacheService) cacheService: ICacheService
  ) {
    this.cacheService = cacheService;
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/rate/latest', this.getLatestRate.bind(this));
    this.router.get('/rate/history', validateHistoryQuery, this.getRateHistory.bind(this));
    this.router.get('/rate/:date', validateDateParam, this.getRateByDate.bind(this));
  }

  private async getLatestRate(req: Request, res: Response): Promise<void> {
    try {
      if (!config.saveToDatabase) {
        // En modo consola, indicar que no hay acceso a base de datos
        res.status(405).json({ 
          error: 'Modo consola activado: No hay acceso a la base de datos',
          message: 'SAVE_TO_DATABASE está configurado como false'
        });
        return;
      }
      
      const rate = await this.cacheService.getLatestRate();
      if (!rate) {
        res.status(404).json({ error: 'No se encontró ninguna tasa de cambio' });
        return;
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
          message: 'SAVE_TO_DATABASE está configurado como false'
        });
        return;
      }
      
      // Obtener el límite de registros desde los parámetros de consulta
      const limit = parseInt(req.query.limit as string) || 30;
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
          message: 'SAVE_TO_DATABASE está configurado como false'
        });
        return;
      }

      const { date } = req.params;
      // La validación de formato se hace en el middleware validateDateParam

      const rate = await this.cacheService.getRateByDate(date);
      if (!rate) {
        res.status(404).json({ error: `No se encontró tasa para la fecha ${date}` });
        return;
      }

      res.json(rate);
    } catch (error) {
      log.error('Error obteniendo tasa por fecha', { error });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}