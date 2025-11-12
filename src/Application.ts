import 'reflect-metadata';
import express from 'express';
import http from 'http';
import path from 'path';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { Container } from 'inversify';
import { createContainer } from '@/config/inversify.config';
import { config } from '@/config';
import { isUsingSecrets } from '@/config/secrets';
import { apiKeyAuth } from '@/middleware/auth.middleware';
import { createRoutes } from '@/utils/routes';
import { TYPES } from '@/config/types';
import log from '@/utils/logger';
import { swaggerOptions } from '@/config/swagger.config';

// Interfaces
import { ICacheService } from '@/services/cache.interface';
import { ISchedulerService } from '@/interfaces/ISchedulerService';
import { IWebSocketService } from '@/interfaces/IWebSocketService';
import { IBCVService } from '@/interfaces/IBCVService';
import { IMetricsService } from '@/interfaces/IMetricsService';

// Controllers
import { HealthController } from '@/controllers/health.controller';
import { MetricsController } from '@/controllers/metrics.controller';

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
  private schedulerService: ISchedulerService;
  private webSocketService: IWebSocketService;
  private bcvService: IBCVService;
  private metricsService: IMetricsService;

  constructor() {
    // Inicializar Express y HTTP Server
    this.app = express();
    this.server = http.createServer(this.app);

    // Crear contenedor IoC
    this.container = createContainer(this.server);

    // Resolver servicios del contenedor
    this.cacheService = this.container.get<ICacheService>(TYPES.CacheService);
    this.schedulerService = this.container.get<ISchedulerService>(TYPES.SchedulerService);
    this.webSocketService = this.container.get<IWebSocketService>(TYPES.WebSocketService);
    this.bcvService = this.container.get<IBCVService>(TYPES.BCVService);
    this.metricsService = this.container.get<IMetricsService>(TYPES.MetricsService);

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
        error: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde.',
        retryAfter: '15 minutos'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => !req.path.startsWith('/api')
    });

    this.app.use('/api/', apiLimiter);

    // API Key authentication
    this.app.use('/api/', apiKeyAuth);

    // Metrics endpoint (sin autenticación ni rate limiting, para Prometheus)
    const metricsController = this.container.get<MetricsController>(TYPES.MetricsController);
    this.app.use(metricsController.router);

    // Health check routes (sin autenticación ni rate limiting)
    const healthController = this.container.get<HealthController>(TYPES.HealthController);
    this.app.use(healthController.router);

    // Swagger API Documentation (sin autenticación ni rate limiting)
    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'BCV Service API Docs'
    }));
    log.info('Swagger UI disponible en /api-docs');

    // Rutas de API (con autenticación y rate limiting)
    this.app.use(createRoutes(this.cacheService));

    // Ruta principal
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Microservicio BCV Tasa de Cambio',
        status: 'running',
        connectedClients: this.webSocketService.getConnectedClientsCount(),
        architecture: 'SOLID with Inversify DI',
        documentation: '/api-docs'
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
      } catch (error: any) {
        log.error('Error conectando a MongoDB', {
          error: error.message,
          stack: error.stack
        });
      }
    } else {
      log.info('Modo consola: No se inicializa conexión a MongoDB (SAVE_TO_DATABASE=false)');
    }

    // Configurar manejo de errores del servidor
    this.server.on('error', this.handleServerError.bind(this));

    // Iniciar el servidor
    await new Promise<void>((resolve) => {
      this.server.listen(port, () => {
        log.info('Servidor BCV iniciado', {
          port,
          schedule: config.cronSchedule,
          environment: config.nodeEnv,
          architecture: 'SOLID with Inversify'
        });
        resolve();
      });
    });

    // Iniciar el scheduler
    this.schedulerService.start();

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
        commands: [`lsof -i :${config.port}`, 'kill -9 <PID>']
      });
    } else {
      log.error('Error del servidor', {
        error: err.message,
        code: err.code,
        stack: err.stack
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

      // Detener el scheduler
      this.schedulerService.stop();

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
}
