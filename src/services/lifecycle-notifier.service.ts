import os from 'node:os';
import { inject, injectable } from 'inversify';

import { config } from '@/config';
import { TYPES } from '@/config/types';
import type { IDiscordDeploymentService } from '@/interfaces/IDiscordDeploymentService';
import type { IDiscordStatusService } from '@/interfaces/IDiscordStatusService';
import { logger as log } from '@/utils/logger';
import packageJson from '../../package.json';

/**
 * Servicio para notificar eventos del ciclo de vida del servidor
 *
 * Notifica cuando:
 * - El servidor inicia exitosamente
 * - El servidor se está apagando (graceful shutdown)
 * - Se detectan señales de terminación (SIGTERM, SIGINT)
 */
@injectable()
export class LifecycleNotifierService {
  private startTime: Date;
  private shutdownNotificationSent = false;

  constructor(
    @inject(TYPES.DiscordStatusService)
    private discordStatusService: IDiscordStatusService,
    @inject(TYPES.DiscordDeploymentService)
    private discordDeploymentService: IDiscordDeploymentService
  ) {
    this.startTime = new Date();
    this.setupGracefulShutdownHandlers();
  }

  /**
   * Notifica que el servidor ha iniciado exitosamente
   */
  async notifyServerStarted(): Promise<void> {
    try {
      const startupInfo = {
        hostname: os.hostname(),
        platform: os.platform(),
        nodeVersion: process.version,
        pid: process.pid,
        env: config.nodeEnv,
        uptime: 0,
      };

      log.info('Sending server startup notification', startupInfo);

      // Notificar via Discord Status Service
      await this.discordStatusService.sendStatusNotification(
        'service.healthy',
        {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 0,
          checks: {
            server: {
              status: 'healthy',
              message: '🚀 Servidor iniciado exitosamente',
              details: startupInfo,
            },
          },
        }
      );

      // También notificar como deployment
      await this.discordDeploymentService.sendDeploymentNotification(
        'deployment.started',
        {
          deploymentId: `startup-${Date.now()}`,
          environment: config.nodeEnv,
          version: packageJson.version,
          message: `Servidor iniciado en ${startupInfo.hostname}`,
        }
      );

      log.info('Server startup notification sent successfully');
    } catch (error) {
      log.error('Error sending server startup notification', { error });
      // No lanzar error - startup notification es nice-to-have
    }
  }

  /**
   * Notifica que el servidor se está apagando
   */
  async notifyServerShutdown(reason: string): Promise<void> {
    // Evitar enviar múltiples notificaciones de shutdown
    if (this.shutdownNotificationSent) {
      log.debug('Shutdown notification already sent, skipping');
      return;
    }

    this.shutdownNotificationSent = true;

    try {
      const uptime = Date.now() - this.startTime.getTime();

      const shutdownInfo = {
        hostname: os.hostname(),
        reason,
        uptime: Math.floor(uptime / 1000),
        timestamp: new Date().toISOString(),
      };

      log.warn('Sending server shutdown notification', shutdownInfo);

      // Notificar via Discord Status Service
      await this.discordStatusService.sendStatusNotification(
        'service.unhealthy',
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(uptime / 1000),
          checks: {
            server: {
              status: 'unhealthy',
              message: `🛑 Servidor apagándose: ${reason}`,
              details: shutdownInfo,
            },
          },
        },
        'healthy' // previous status
      );

      log.info('Server shutdown notification sent successfully');

      // Dar tiempo para que la notificación se envíe
      await this.sleep(2000);
    } catch (error) {
      log.error('Error sending server shutdown notification', { error });
      // Intentar al menos loguear el error
      console.error('CRITICAL: Failed to send shutdown notification:', error);
    }
  }

  /**
   * Configura handlers para graceful shutdown
   */
  private setupGracefulShutdownHandlers(): void {
    // SIGTERM - señal de terminación (Docker, Kubernetes)
    process.on('SIGTERM', () => {
      log.warn('SIGTERM signal received');
      this.notifyServerShutdown('SIGTERM signal received').catch((error) => {
        log.error('Error in SIGTERM handler', { error });
      });
    });

    // SIGINT - Ctrl+C
    process.on('SIGINT', () => {
      log.warn('SIGINT signal received (Ctrl+C)');
      this.notifyServerShutdown('SIGINT signal received (Ctrl+C)').catch(
        (error) => {
          log.error('Error in SIGINT handler', { error });
        }
      );
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      log.error('Uncaught exception', { error });
      this.notifyServerShutdown(`Uncaught exception: ${error.message}`).catch(
        () => {
          // Si falla la notificación, no hay mucho que hacer
        }
      );
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled promise rejection', { reason, promise });
      this.notifyServerShutdown(`Unhandled rejection: ${reason}`).catch(() => {
        // Si falla la notificación, no hay mucho que hacer
      });
    });

    log.info('Graceful shutdown handlers configured');
  }

  /**
   * Notifica estado del servidor periódicamente (heartbeat)
   */
  async sendHeartbeat(): Promise<void> {
    try {
      const uptime = Date.now() - this.startTime.getTime();

      log.debug('Sending server heartbeat');

      await this.discordStatusService.sendStatusNotification(
        'service.healthy',
        {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(uptime / 1000),
          checks: {
            server: {
              status: 'healthy',
              message: '💓 Heartbeat - Servidor funcionando correctamente',
              details: {
                hostname: os.hostname(),
                uptime: Math.floor(uptime / 1000),
                memory: process.memoryUsage(),
              },
            },
          },
        }
      );
    } catch (error) {
      log.error('Error sending heartbeat', { error });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
