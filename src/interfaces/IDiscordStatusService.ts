import type { HealthCheckResult } from './IHealthCheckService';

export interface IDiscordStatusService {
  sendStatusNotification(
    event: 'service.healthy' | 'service.unhealthy' | 'service.degraded',
    status: HealthCheckResult,
    previousStatus?: string
  ): Promise<void>;
}
