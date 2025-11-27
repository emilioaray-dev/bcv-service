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
 * - Encola todas las notificaciones de deployment en la cola persistente
 * - Evita bloquear el startup del servidor con intentos síncronos
 * - Reintentos automáticos con backoff exponencial via la cola
 * - Sobrevive a reinicios del servidor
 */
@injectable()
export class DiscordDeploymentService implements IDiscordDeploymentService {
  private readonly webhookUrl: string;
  private readonly enabled: boolean;

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

    // Encolar directamente sin intentos inmediatos
    // Esto evita bloquear el startup del servidor y asegura entrega persistente
    try {
      const queueId = await this.queueService.enqueue(
        event,
        this.webhookUrl,
        message,
        {
          maxAttempts: 5,
          priority: event === 'deployment.failure' ? 'high' : 'normal',
          delaySeconds: 0, // Enviar inmediatamente cuando el worker procese
        }
      );

      logger.info('Notificación Discord deployment encolada', {
        queueId,
        event,
        deploymentId: deploymentInfo.deploymentId,
        version: deploymentInfo.version,
      });
    } catch (queueError) {
      logger.error('Error encolando notificación Discord deployment', {
        error: queueError,
        event,
        deploymentId: deploymentInfo.deploymentId,
      });
      // No lanzar error - las notificaciones son nice-to-have
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
}
