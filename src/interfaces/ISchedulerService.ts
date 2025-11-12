/**
 * Interface for Scheduler service
 *
 * Siguiendo el principio de Single Responsibility (SRP),
 * esta interfaz separa la lógica de programación de tareas
 * del resto de la aplicación.
 */
export interface ISchedulerService {
  /**
   * Inicia la ejecución de tareas programadas
   */
  start(): void;

  /**
   * Detiene la ejecución de tareas programadas
   */
  stop(): void;

  /**
   * Ejecuta manualmente una actualización inmediata
   */
  executeImmediately(): Promise<void>;
}
