import axios from 'axios';
import { inject, injectable } from 'inversify';
import { config } from '../config';
import { logger } from '../utils/logger';

import { TYPES } from '@/config/types';
import type {
  DeploymentInfo,
  IDiscordDeploymentService,
} from '@/interfaces/IDiscordDeploymentService';
import type { IWebhookQueueService } from '@/interfaces/IWebhookQueueService';

/**
 * DiscordDeploymentService - Servicio para enviar notificaciones de deployment a Discord
 *
 * Implementa el formato de embeds de Discord para mostrar el estado de los deployments
 * de manera visual y organizada.
 *
 * Features:
 * - Reintentos automáticos con backoff exponencial
 * - Cola persistente para notificaciones fallidas
 * - Sobrevive a reinicios del servidor
 */
@injectable()
export class DiscordDeploymentService implements IDiscordDeploymentService {
  private readonly webhookUrl: string;
  private readonly enabled: boolean;
  private readonly maxRetries = 3;

  constructor(
    @inject(TYPES.WebhookQueueService)
    private readonly queueService: IWebhookQueueService
  ) {
    this.webhookUrl = config.deploymentWebhookUrl || '';
    this.enabled = !!this.webhookUrl;

    if (!this.enabled) {
      logger.warn(
        'Deployment webhook no configurado - Notificaciones de deployment por Discord deshabilitadas'
      );
    } else {
      logger.info(
        'Deployment webhook configurado - Notificaciones de deployment por Discord habilitadas'
      );
    }
  }

  async sendDeploymentNotification(
    event: 'deployment.started' | 'deployment.success' | 'deployment.failure',
    deploymentInfo: DeploymentInfo
  ): Promise<void> {
    if (!this.enabled) {
      logger.debug(
        'Notificación de deployment por Discord ignorada - webhook no configurado'
      );
      return;
    }

    const message = this.buildDiscordMessage(event, deploymentInfo);
    let lastError: Error | null = null;

    // Intentar enviar con reintentos
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Backoff exponencial para reintentos
        if (attempt > 1) {
          const delay = 2 ** (attempt - 2) * 1000; // 1s, 2s, 4s
          logger.info('Reintentando notificación Discord deployment', {
            attempt,
            maxRetries: this.maxRetries,
            delayMs: delay,
          });
          await this.sleep(delay);
        }

        await axios.post(this.webhookUrl, message, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        });

        logger.info('Notificación de deployment enviada a Discord', {
          webhookUrl: '***HIDDEN***',
          event,
          deploymentId: deploymentInfo.deploymentId,
          attempt,
        });
        return; // Éxito, salir
      } catch (error: unknown) {
        lastError = error as Error;

        logger.error('Intento de notificación Discord deployment falló', {
          attempt,
          maxRetries: this.maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Si es el último intento, continuar al encolado
        if (attempt === this.maxRetries) {
          break;
        }
      }
    }

    // Todos los intentos fallaron - encolar para retry posterior
    logger.warn(
      'Notificación Discord deployment falló después de todos los intentos',
      {
        maxRetries: this.maxRetries,
        lastError: lastError?.message,
      }
    );

    try {
      const queueId = await this.queueService.enqueue(
        event,
        this.webhookUrl,
        message,
        {
          maxAttempts: 5,
          priority: event === 'deployment.failure' ? 'high' : 'normal',
          delaySeconds: 300, // Esperar 5 minutos antes del primer retry
        }
      );

      logger.info('Notificación Discord deployment encolada para retry', {
        queueId,
        event,
        deploymentId: deploymentInfo.deploymentId,
      });
    } catch (queueError) {
      logger.error('Error encolando notificación Discord deployment', {
        error: queueError,
        event,
      });
      throw lastError; // Lanzar el error original
    }
  }

  private buildDiscordMessage(
    event: 'deployment.started' | 'deployment.success' | 'deployment.failure',
    deploymentInfo: DeploymentInfo
  ): Record<string, unknown> {
    // Determinar el color según el evento
    let color: number;
    let emoji: string;
    let title: string;

    switch (event) {
      case 'deployment.started':
        color = 0xffaa00; // Naranja
        emoji = '🚀';
        title = 'Deployment Iniciado';
        break;
      case 'deployment.success':
        color = 0x00ff00; // Verde
        emoji = '✅';
        title = 'Deployment Exitoso';
        break;
      case 'deployment.failure':
        color = 0xff0000; // Rojo
        emoji = '❌';
        title = 'Deployment Fallido';
        break;
      default:
        color = 0x808080; // Gris
        emoji = '❓';
        title = 'Estado del Deployment Desconocido';
    }

    // Construir campos para la información del deployment
    const fields: Array<{
      name: string;
      value: string;
      inline: boolean;
    }> = [];

    if (deploymentInfo.deploymentId) {
      fields.push({
        name: 'DEPLOYMENT ID',
        value: `\`${deploymentInfo.deploymentId}\``,
        inline: false,
      });
    }

    if (deploymentInfo.environment) {
      fields.push({
        name: 'ENVIRONMENT',
        value: `🌍 **${deploymentInfo.environment.toUpperCase()}**`,
        inline: true,
      });
    }

    if (deploymentInfo.version) {
      fields.push({
        name: 'VERSION',
        value: `📦 \`${deploymentInfo.version}\``,
        inline: true,
      });
    }

    if (deploymentInfo.duration !== undefined) {
      const minutes = Math.floor(deploymentInfo.duration / 60000);
      const seconds = Math.floor((deploymentInfo.duration % 60000) / 1000);
      fields.push({
        name: 'DURACIÓN',
        value: `⏱️ ${minutes}m ${seconds}s`,
        inline: true,
      });
    }

    if (deploymentInfo.message) {
      fields.push({
        name: 'MENSAJE',
        value: deploymentInfo.message,
        inline: false,
      });
    }

    return {
      embeds: [
        {
          title: `${emoji} ${title}`,
          description: 'Actualización de deployment del servicio BCV',
          color,
          fields,
          timestamp: new Date().toISOString(),
          footer: {
            text: 'BCV Service - Deployment Monitor',
          },
        },
      ],
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
