/**
 * Entry Point - Aplicación BCV Microservice
 *
 * Este archivo es el punto de entrada de la aplicación.
 * Toda la lógica de configuración está encapsulada en la clase Application.
 *
 * Refactorización SOLID:
 * - Single Responsibility: Este archivo solo arranca la aplicación
 * - Open/Closed: Extensible sin modificar este archivo
 * - Liskov Substitution: Application puede ser reemplazada por subclases
 * - Interface Segregation: Cada servicio tiene su interfaz específica
 * - Dependency Inversion: Todos los servicios usan inyección de dependencias
 */

import { Application } from '@/Application';
import log from '@/utils/logger';

// Crear e iniciar la aplicación
const application = new Application();

application.start().catch((error) => {
  log.error('Error fatal al iniciar la aplicación', { error });
  process.exit(1);
});

// Exportar para testing
export const app = application.getExpressApp();
export const server = application.getServer();