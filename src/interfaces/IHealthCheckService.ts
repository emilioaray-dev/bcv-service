/**
 * Interface for Health Check Service
 *
 * Siguiendo el principio de Interface Segregation (ISP),
 * esta interfaz define el contrato para verificar el estado
 * de salud del servicio y sus dependencias.
 */

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, any>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: {
    mongodb?: HealthCheck;
    scheduler?: HealthCheck;
    bcv?: HealthCheck;
    websocket?: HealthCheck;
  };
}

export interface IHealthCheckService {
  /**
   * Verifica el estado de salud completo del servicio
   * @returns Promise con el resultado del health check
   */
  checkHealth(): Promise<HealthCheckResult>;

  /**
   * Verifica solo la conectividad a MongoDB
   * @returns Promise con el resultado del check de MongoDB
   */
  checkMongoDB(): Promise<HealthCheck>;

  /**
   * Verifica el estado del scheduler (cron job)
   * @returns Promise con el resultado del check del scheduler
   */
  checkScheduler(): Promise<HealthCheck>;

  /**
   * Verifica el estado del servicio BCV
   * @returns Promise con el resultado del check del BCV
   */
  checkBCV(): Promise<HealthCheck>;

  /**
   * Verifica el estado del servicio WebSocket
   * @returns Promise con el resultado del check del WebSocket
   */
  checkWebSocket(): Promise<HealthCheck>;
}
