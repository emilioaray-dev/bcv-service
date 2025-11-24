import axios from 'axios';
import { injectable } from 'inversify';
import { config } from '../config';
import { logger } from '../utils/logger';

import type {
  DeploymentInfo,
  IDiscordDeploymentService,
} from '@/interfaces/IDiscordDeploymentService';

/**
 * DiscordDeploymentService - Servicio para enviar notificaciones de deployment a Discord
 *
 * Implementa el formato de embeds de Discord para mostrar el estado de los deployments
 * de manera visual y organizada.
 */
@injectable()
export class DiscordDeploymentService implements IDiscordDeploymentService {
  private readonly webhookUrl: string;
  private readonly enabled: boolean;

  constructor() {
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

    try {
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

      const message = {
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

      await axios.post(this.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      logger.info('Notificación de deployment enviada a Discord', {
        webhookUrl: this.webhookUrl ? '***HIDDEN***' : 'No configurado',
        event,
        deploymentId: deploymentInfo.deploymentId,
        environment: deploymentInfo.environment,
        version: deploymentInfo.version,
      });
    } catch (error: unknown) {
      logger.error('Error enviando notificación de deployment a Discord', {
        error: error instanceof Error ? error.message : 'Unknown error',
        webhookUrl: this.webhookUrl ? '***HIDDEN***' : 'No configurado',
      });
      throw error;
    }
  }
}
