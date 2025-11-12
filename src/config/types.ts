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
  WebSocketService: Symbol.for('WebSocketService'),
  SchedulerService: Symbol.for('SchedulerService'),
  LoggerService: Symbol.for('LoggerService'),

  // Controllers
  RateController: Symbol.for('RateController'),

  // Infrastructure
  HttpServer: Symbol.for('HttpServer'),
  ExpressApp: Symbol.for('ExpressApp'),

  // Configuration
  Config: Symbol.for('Config'),
  DatabaseConfig: Symbol.for('DatabaseConfig'),
  AppConfig: Symbol.for('AppConfig'),
};
