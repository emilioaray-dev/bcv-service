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

// Manejo de señales para apagado gracioso
process.on('SIGTERM', async () => {
  log.info('SIGTERM recibida. Iniciando apagado gracioso...');
  try {
    await application.close();
    log.info('Aplicación cerrada correctamente');
  } catch (error) {
    log.error('Error durante el apagado', { error });
  } finally {
    process.exit(0);
  }
});

process.on('SIGINT', async () => {
  log.info('SIGINT recibida. Iniciando apagado gracioso...');
  try {
    await application.close();
    log.info('Aplicación cerrada correctamente');
  } catch (error) {
    log.error('Error durante el apagado', { error });
  } finally {
    process.exit(0);
  }
});

// Exportar para testing
export const app = application.getExpressApp();
export const server = application.getServer();
