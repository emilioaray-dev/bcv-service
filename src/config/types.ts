/**
 * Symbols for Dependency Injection with Inversify
 *
 * Este archivo define los identificadores únicos (Symbols) que Inversify
 * utiliza para resolver las dependencias en el contenedor IoC.
 */

export const TYPES = {
  // Services
  BCVService: Symbol.for('BCVService'),
  CacheService: Symbol.for('CacheService'),
  RedisService: Symbol.for('RedisService'),
  WebSocketService: Symbol.for('WebSocketService'),
  SchedulerService: Symbol.for('SchedulerService'),
  HealthCheckService: Symbol.for('HealthCheckService'),
  MetricsService: Symbol.for('MetricsService'),
  LoggerService: Symbol.for('LoggerService'),
  DiscordService: Symbol.for('DiscordService'),
  DiscordStatusService: Symbol.for('DiscordStatusService'),
  DiscordDeploymentService: Symbol.for('DiscordDeploymentService'),
  WebhookService: Symbol.for('WebhookService'),
  NotificationStateService: Symbol.for('NotificationStateService'),
  WebhookDeliveryService: Symbol.for('WebhookDeliveryService'),
  WebhookQueueService: Symbol.for('WebhookQueueService'),
  LifecycleNotifierService: Symbol.for('LifecycleNotifierService'),

  // Controllers
  RateController: Symbol.for('RateController'),
  HealthController: Symbol.for('HealthController'),
  MetricsController: Symbol.for('MetricsController'),

  // Infrastructure
  HttpServer: Symbol.for('HttpServer'),
  ExpressApp: Symbol.for('ExpressApp'),

  // Configuration
  Config: Symbol.for('Config'),
  DatabaseConfig: Symbol.for('DatabaseConfig'),
  AppConfig: Symbol.for('AppConfig'),
};
