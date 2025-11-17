// Este archivo ya está incluido en app.ts, pero podemos crear un archivo de rutas
// para mantener la estructura más organizada

import { RateController } from '@/controllers/rate.controller';
import type { IRedisService } from '@/interfaces/IRedisService';
import type { ICacheService } from '@/services/cache.interface';
import express from 'express';

export const createRoutes = (
  cacheService: ICacheService,
  redisService: IRedisService
): express.Router => {
  const router = express.Router();
  const rateController = new RateController(cacheService, redisService);

  router.use('/api', rateController.router);

  // Ruta principal
  router.get('/', (_req: express.Request, res: express.Response) => {
    res.json({
      message: 'Microservicio BCV Tasa de Cambio - API',
      status: 'running',
    });
  });

  return router;
};
