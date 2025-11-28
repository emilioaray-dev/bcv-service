import 'reflect-metadata';
import http from 'node:http';
import path from 'node:path';
import { config } from '@/config';
import { createContainer } from '@/config/inversify.config';
import { isUsingSecrets } from '@/config/secrets';
import { swaggerOptions } from '@/config/swagger.config';
import { TYPES } from '@/config/types';
import { ROUTES } from '@/constants/routes';
import { apiKeyAuth } from '@/middleware/auth.middleware';
import log from '@/utils/logger';
import { createRoutes } from '@/utils/routes';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Container } from 'inversify';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import packageJson from '../package.json';

import type { IBCVService } from '@/interfaces/IBCVService';
import type { IMetricsService } from '@/interfaces/IMetricsService';
import type { IRedisService } from '@/interfaces/IRedisService';
import type { ISchedulerService } from '@/interfaces/ISchedulerService';
import type { IWebSocketService } from '@/interfaces/IWebSocketService';
import type { IWebhookQueueService } from '@/interfaces/IWebhookQueueService';
import type { IWebhookService } from '@/interfaces/IWebhookService';
// Interfaces
import type { ICacheService } from '@/services/cache.interface';
import type { LifecycleNotifierService } from '@/services/lifecycle-notifier.service';

// Controllers
import type { HealthController } from '@/controllers/health.controller';
import type { MetricsController } from '@/controllers/metrics.controller';

/**
 * Application Class - Bootstrap de la aplicación
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Inicializar y configurar la aplicación
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Usa el contenedor IoC para resolver dependencias
 * - No instancia servicios directamente
 *
 * Implementa el principio de Open/Closed (OCP):
 * - Abierto a extensión (agregar nuevos servicios)
 * - Cerrado a modificación (no requiere cambios para nuevos servicios)
 */
export class Application {
  private app: express.Application;
  private server: http.Server;
  private container: Container;
  private cacheService: ICacheService;
  private redisService: IRedisService;
  private schedulerService: ISchedulerService;
  private webSocketService: IWebSocketService;
  private bcvService: IBCVService;
  private metricsService: IMetricsService;
  private webhookService: IWebhookService;
  private webhookQueueService!: IWebhookQueueService;
  private lifecycleNotifierService!: LifecycleNotifierService;

  constructor() {
    // Inicializar Express y HTTP Server
    this.app = express();
    this.server = http.createServer(this.app);

    // Crear contenedor IoC
    this.container = createContainer(this.server);

    // Resolver servicios del contenedor
    this.cacheService = this.container.get<ICacheService>(TYPES.CacheService);
    this.redisService = this.container.get<IRedisService>(TYPES.RedisService);
    this.schedulerService = this.container.get<ISchedulerService>(
      TYPES.SchedulerService
    );
    this.webSocketService = this.container.get<IWebSocketService>(
      TYPES.WebSocketService
    );
    this.bcvService = this.container.get<IBCVService>(TYPES.BCVService);
    this.metricsService = this.container.get<IMetricsService>(
      TYPES.MetricsService
    );
    this.webhookService = this.container.get<IWebhookService>(
      TYPES.WebhookService
    );
    this.webhookQueueService = this.container.get<IWebhookQueueService>(
      TYPES.WebhookQueueService
    );
    this.lifecycleNotifierService =
      this.container.get<LifecycleNotifierService>(
        TYPES.LifecycleNotifierService
      );

    // Configurar la aplicación
    this.configure();
  }

  /**
   * Configura middleware y rutas de la aplicación
   */
  private configure(): void {
    // Log de configuración inicial
    if (isUsingSecrets()) {
      log.info('Modo: Docker Secrets activado');
    } else {
      log.info('Modo: Variables de entorno estándar');
    }

    // Security headers with Helmet
    this.app.use((req, res, next) => {
      // Disable CSP for Swagger UI to allow inline scripts
      if (req.path.startsWith(ROUTES.DOCS)) {
        return next();
      }

      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            fontSrc: ["'self'", 'https:', 'data:'],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https:'],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
        referrerPolicy: {
          policy: 'no-referrer',
        },
        xFrameOptions: {
          action: 'sameorigin',
        },
        xPoweredBy: false, // Remove X-Powered-By header
      })(req, res, next);
    });

    // CORS configuration
    // Note: API key authentication still applies after CORS preflight
    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        // In production, only allow configured origins
        // In development, allow localhost origins for React Native/Expo
        const allowedOrigins = [
          ...(config.nodeEnv === 'development'
            ? [
                'http://localhost:8081', // React Native default development server
                'http://localhost:19006', // Expo default development server
              ]
            : []),
          ...(config.corsOrigin
            ? config.corsOrigin.split(',').map((o) => o.trim())
            : []),
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          log.warn('CORS blocked', { origin, allowedOrigins });
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Requested-With',
        'Accept',
        'Origin',
      ],
    };

    this.app.use(cors(corsOptions));

    // Compression middleware for performance
    this.app.use(
      compression({
        level: 6, // Compression level (0-9, where 6 is default)
        threshold: 1024, // Only compress responses larger than 1KB
        filter: (req, res) => {
          // Only compress if the response is likely to benefit from compression
          if (req.headers['x-no-compression']) {
            // Don't compress responses with this request header
            return false;
          }

          // Use the default filter function
          return compression.filter(req, res);
        },
      })
    );

    // Middleware básico
    this.app.use(express.json());

    // Servir archivos estáticos desde la carpeta public
    this.app.use(express.static(path.join(__dirname, '..', 'public')));

    // Metrics middleware (debe estar antes de otros middlewares para trackear todo)
    this.app.use(this.metricsService.requestMiddleware());

    // Rate limiting middleware
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por ventana
      message: {
        error:
          'Demasiadas solicitudes desde esta IP, por favor intente más tarde.',
        retryAfter: '15 minutos',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => !req.path.startsWith(ROUTES.API),
    });

    this.app.use(`${ROUTES.API}/`, apiLimiter);

    // API Key authentication
    this.app.use(`${ROUTES.API}/`, apiKeyAuth);

    // Metrics endpoint (sin autenticación ni rate limiting, para Prometheus)
    const metricsController = this.container.get<MetricsController>(
      TYPES.MetricsController
    );
    this.app.use(metricsController.router);

    // Health check routes (sin autenticación ni rate limiting)
    const healthController = this.container.get<HealthController>(
      TYPES.HealthController
    );
    this.app.use(healthController.router);

    // Swagger API Documentation (sin autenticación ni rate limiting)
    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    this.app.use(
      ROUTES.DOCS,
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'BCV Service API Docs',
      })
    );
    log.info(`Swagger UI disponible en ${ROUTES.DOCS}`);

    // Rutas de API (con autenticación y rate limiting)
    this.app.use(createRoutes(this.cacheService, this.redisService));

    // Ruta principal
    this.app.get(ROUTES.ROOT, (_req, res) => {
      res.json({
        message: 'Microservicio BCV Tasa de Cambio',
        status: 'running',
        connectedClients: this.webSocketService.getConnectedClientsCount(),
        architecture: 'SOLID with Inversify DI',
        documentation: ROUTES.DOCS,
      });
    });
  }

  /**
   * Inicia la aplicación
   */
  async start(): Promise<void> {
    const port = config.port;

    // Conectar a la base de datos si está configurada
    if (config.saveToDatabase) {
      try {
        await this.cacheService.connect();
      } catch (error: unknown) {
        log.error('Error conectando a MongoDB', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    } else {
      log.info(
        'Modo consola: No se inicializa conexión a MongoDB (SAVE_TO_DATABASE=false)'
      );
    }

    // Conectar a Redis si el cache está habilitado
    if (config.redis.enabled) {
      try {
        await this.redisService.connect();
        log.info('Redis cache habilitado y conectado');
      } catch (error: unknown) {
        log.error('Error conectando a Redis', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    } else {
      log.info('Redis cache deshabilitado (CACHE_ENABLED=false)');
    }

    // Configurar manejo de errores del servidor
    this.server.on('error', this.handleServerError.bind(this));

    // Iniciar el servidor
    await new Promise<void>((resolve) => {
      this.server.listen(port, async () => {
        log.info('Servidor BCV iniciado', {
          port,
          schedule: config.cronSchedule,
          environment: config.nodeEnv,
          architecture: 'SOLID with Inversify',
        });

        // Enviar notificación de despliegue exitoso
        try {
          await this.webhookService.sendDeploymentNotification(
            'deployment.success',
            {
              environment: config.nodeEnv,
              version: packageJson.version,
              deploymentId: `start-${Date.now()}`,
              message: `Servidor BCV iniciado en el puerto ${port}`,
            }
          );
          log.info('Notificación de despliegue exitoso enviada');
        } catch (error) {
          log.error('Error enviando notificación de despliegue', { error });
        }

        resolve();
      });
    });

    // Iniciar el scheduler
    this.schedulerService.start();

    // Iniciar worker de cola de webhooks (procesa cada 60 segundos)
    this.webhookQueueService.startWorker(60);
    log.info('Webhook queue worker started', { intervalSeconds: 60 });

    // Enviar notificación de ciclo de vida (startup)
    try {
      await this.lifecycleNotifierService.notifyServerStarted();
      log.info('Lifecycle notification (startup) sent');
    } catch (error) {
      log.error('Error sending lifecycle notification (startup)', { error });
    }

    // Ejecutar una consulta inmediata al iniciar
    setTimeout(async () => {
      await this.schedulerService.executeImmediately();
    }, 2000);

    // Configurar manejo de señales de cierre
    this.setupGracefulShutdown();
  }

  /**
   * Maneja errores del servidor
   */
  private handleServerError(err: NodeJS.ErrnoException): void {
    if (err.code === 'EADDRINUSE') {
      log.error(`Error: El puerto ${config.port} ya está en uso`, {
        port: config.port,
        solution: 'Termina el proceso usando el puerto o cambia PORT',
        commands: [`lsof -i :${config.port}`, 'kill -9 <PID>'],
      });
    } else {
      log.error('Error del servidor', {
        error: err.message,
        code: err.code,
        stack: err.stack,
      });
    }
    process.exit(1);
  }

  /**
   * Configura el cierre graceful de la aplicación
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async () => {
      log.info('Iniciando cierre graceful de la aplicación...');

      // Enviar notificación de ciclo de vida (shutdown)
      try {
        await this.lifecycleNotifierService.notifyServerShutdown(
          'Aplicación cerrándose gracefulmente'
        );
        log.info('Lifecycle notification (shutdown) sent');
      } catch (error) {
        log.error('Error sending lifecycle notification (shutdown)', { error });
      }

      // Enviar notificación de cierre del servicio via webhook
      try {
        await this.webhookService.sendDeploymentNotification(
          'deployment.failure', // O podríamos usar un evento especializado
          {
            environment: config.nodeEnv,
            version: packageJson.version,
            deploymentId: `shutdown-${Date.now()}`,
            message: 'Aplicación BCV Service cerrándose gracefulmente',
          }
        );
        log.info('Notificación de cierre de aplicación enviada');
      } catch (error) {
        log.error('Error enviando notificación de cierre', { error });
      }

      // Detener el worker de cola de webhooks
      this.webhookQueueService.stopWorker();
      log.info('Webhook queue worker stopped');

      // Detener el scheduler
      this.schedulerService.stop();

      // Desconectar de Redis
      if (config.redis.enabled) {
        log.info('Cerrando conexión a Redis...');
        await this.redisService.disconnect();
      }

      // Desconectar de la base de datos
      if (config.saveToDatabase) {
        log.info('Cerrando conexión a MongoDB...');
        await this.cacheService.disconnect();
      }

      log.info('Aplicación cerrada correctamente');
      process.exit(0);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  }

  /**
   * Obtiene el contenedor IoC (útil para testing)
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Obtiene la instancia de Express (útil para testing)
   */
  getExpressApp(): express.Application {
    return this.app;
  }

  /**
   * Obtiene la instancia del servidor HTTP (útil para testing)
   */
  getServer(): http.Server {
    return this.server;
  }

  /**
   * Cierra la aplicación de forma graciosa
   */
  async close(): Promise<void> {
    log.info('Iniciando cierre graceful de la aplicación...');

    // Detener el scheduler
    this.schedulerService.stop();

    // Desconectar de Redis
    if (config.redis.enabled) {
      log.info('Cerrando conexión a Redis...');
      await this.redisService.disconnect();
    }

    // Desconectar de la base de datos
    if (config.saveToDatabase) {
      log.info('Cerrando conexión a MongoDB...');
      await this.cacheService.disconnect();
    }

    // Cerrar el servidor HTTP
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          log.error('Error cerrando el servidor HTTP', { error: err });
          reject(err);
        } else {
          log.info('Servidor HTTP cerrado correctamente');
          resolve();
        }
      });
    });
  }
}
