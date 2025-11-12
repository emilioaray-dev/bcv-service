import express from 'express';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { isUsingSecrets } from './config/secrets';
import { MongoService } from './services/mongo.service';
import { WebSocketService } from './services/websocket.service';
import { BCVService, BCVRateData } from './services/bcv.service';
import { RateController } from './controllers/rate.controller';
import { createRoutes } from './utils/routes';
import { Rate } from './models/rate';
import { apiKeyAuth } from './middleware/auth.middleware';
import log from './utils/logger';
import cron from 'node-cron';

const app: express.Application = express();
const server = http.createServer(app);

// Log de configuración inicial
if (isUsingSecrets()) {
  log.info('Modo: Docker Secrets activado');
} else {
  log.info('Modo: Variables de entorno estándar');
}

// Middleware
app.use(express.json());

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    error: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Retornar info de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilitar headers `X-RateLimit-*`
  // Solo aplicar a rutas /api
  skip: (req) => !req.path.startsWith('/api')
});

// Aplicar rate limiting a todas las rutas /api
app.use('/api/', apiLimiter);

// API Key authentication
// Si no hay API keys configuradas, el middleware permite el acceso (modo desarrollo)
// En producción, debe configurarse al menos una API key para proteger los endpoints
app.use('/api/', apiKeyAuth);

// Inicializar servicios
const bcvService = new BCVService(config.bcvWebsiteUrl || 'https://www.bcv.org.ve/');
const webSocketService = new WebSocketService(server);

// Inicializar cacheService solo si se va a guardar en la base de datos
let cacheService;
if (config.saveToDatabase) {
  cacheService = new MongoService(config.mongoUri);
  // Conectar a MongoDB solo si se va a usar
  cacheService.connect().catch(error => {
    log.error('Error conectando a MongoDB', { error: error.message, stack: error.stack });
  });
} else {
  log.info('Modo consola: No se inicializa conexión a MongoDB (SAVE_TO_DATABASE=false)');
  // Creamos un mock de cacheService para evitar errores cuando no se usa la base de datos
  cacheService = {
    connect: async () => {},
    disconnect: async () => {},
    saveRate: async (rate: Omit<Rate, 'id' | 'createdAt'>) => {
      // En modo consola, solo devolvemos un objeto simulado
      return {
        id: `${rate.date}-${rate.source}`,
        rate: rate.rate,
        rates: rate.rates || [], // Incluir también las tasas detalladas
        date: rate.date,
        source: rate.source,
        createdAt: new Date().toISOString()
      };
    },
    getLatestRate: async () => null,
    getRateByDate: async (date: string) => null,
    getRateHistory: async (limit?: number) => [],
    getAllRates: async () => []
  };
}

// Inicializar controladores
const rateController = new RateController(cacheService);

// Rutas
app.use(createRoutes(cacheService));

// Ruta principal
app.get('/', async (req, res) => {
  res.json({ 
    message: 'Microservicio BCV Tasa de Cambio', 
    status: 'running',
    connectedClients: webSocketService.getConnectedClientsCount()
  });
});

// Inicializar la tarea programada
const scheduleTask = () => {
  log.info('Tarea programada configurada', { schedule: config.cronSchedule });

  cron.schedule(config.cronSchedule, async () => {
    log.info('Ejecutando tarea programada para actualizar tasa de cambio');

    try {
      const currentData = await bcvService.getCurrentRate();

      if (!currentData) {
        log.error('No se pudo obtener la tasa de cambio del BCV');
        return;
      }

      // Obtener la tasa almacenada previamente
      const previousRate = await cacheService.getLatestRate();
      
      // Solo guardar si hay un cambio significativo o si es la primera vez
      // Verificamos cambios en la tasa base (dólar) o en alguna de las tasas detalladas
      const hasSignificantChange = !previousRate || 
        Math.abs((previousRate.rate || 0) - currentData.rate) > 0.0001 ||
        // Verificar si hay diferencias en las tasas detalladas
        (currentData.rates && previousRate?.rates && 
         JSON.stringify(currentData.rates) !== JSON.stringify(previousRate.rates));

      if (hasSignificantChange) {
        if (config.saveToDatabase) {
          const newRate = await cacheService.saveRate({
            rate: currentData.rate,
            rates: currentData.rates || [], // Incluir todas las tasas detalladas
            date: currentData.date,
            source: 'bcv'
          });

          log.info('Tasa actualizada', {
            rate: newRate.rate,
            date: newRate.date,
            detailedRates: newRate.rates
          });

          // Notificar a los clientes WebSocket con las tasas detalladas
          const change = previousRate ? newRate.rate - previousRate.rate : 0;
          webSocketService.broadcastRateUpdate({
            timestamp: new Date().toISOString(),
            rate: newRate.rate,
            rates: newRate.rates,  // Enviar todas las tasas en la notificación
            change,
            eventType: 'rate-update'
          });
        } else {
          log.info('Modo consola: Tasa cambiada - NO se almacenó en DB', {
            rate: currentData.rate,
            date: currentData.date,
            detailedRates: currentData.rates
          });
        }
      } else {
        log.debug('Tasa sin cambios, no se almacenó', { rate: currentData.rate });
      }
    } catch (error) {
      log.error('Error en la tarea programada', {
        error: error.message,
        stack: error.stack
      });
    }
  });
};

// Iniciar la tarea programada
scheduleTask();

// Iniciar el servidor
const port = config.port;

// Manejar errores del servidor
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    log.error(`Error: El puerto ${port} ya está en uso`, {
      port,
      solution: 'Termina el proceso usando el puerto o cambia PORT',
      commands: [`lsof -i :${port}`, 'kill -9 <PID>']
    });
  } else {
    log.error('Error del servidor', {
      error: err.message,
      code: err.code,
      stack: err.stack
    });
  }
  process.exit(1);
});

server.listen(port, () => {
  log.info('Servidor BCV iniciado', {
    port,
    schedule: config.cronSchedule,
    environment: config.nodeEnv
  });

  // Ejecutar una consulta inmediata al iniciar
  setTimeout(async () => {
    try {
      const currentData = await bcvService.getCurrentRate();
      if (currentData) {
        log.info('Tasa inicial obtenida', {
          rate: currentData.rate,
          date: currentData.date,
          detailedRates: currentData.rates
        });
      } else {
        log.warn('No se pudo obtener la tasa inicial del BCV');
      }
    } catch (error) {
      log.error('Error obteniendo tasa inicial', {
        error: error.message,
        stack: error.stack
      });
    }
  }, 2000); // Esperar 2 segundos antes de la consulta inicial
});

// Manejar cierre del servidor
process.on('SIGINT', async () => {
  if (config.saveToDatabase) {
    log.info('Cerrando conexión a MongoDB...');
    await cacheService.disconnect();
  } else {
    log.info('Modo consola: Cerrando servidor (sin conexión a MongoDB)');
  }
  process.exit(0);
});

export { app, server };