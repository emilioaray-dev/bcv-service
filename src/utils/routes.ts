// Este archivo ya está incluido en app.ts, pero podemos crear un archivo de rutas
// para mantener la estructura más organizada

import express from 'express';
import { ICacheService } from '@/services/cache.interface';
import { RateController } from '@/controllers/rate.controller';

export const createRoutes = (cacheService: ICacheService): express.Router => {
  const router = express.Router();
  const rateController = new RateController(cacheService);

  router.use('/api', rateController.router);
  
  // Ruta principal
  router.get('/', (req: express.Request, res: express.Response) => {
    res.json({ 
      message: 'Microservicio BCV Tasa de Cambio - API', 
      status: 'running'
    });
  });

  return router;
};