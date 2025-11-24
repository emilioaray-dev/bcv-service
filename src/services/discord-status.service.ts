import axios from 'axios';
import { injectable } from 'inversify';
import { config } from '../config';
import { logger } from '../utils/logger';

import type { IDiscordStatusService } from '@/interfaces/IDiscordStatusService';
import type { HealthCheckResult } from '@/interfaces/IHealthCheckService';

/**
 * DiscordStatusService - Servicio para enviar notificaciones de estado del servicio a Discord
 *
 * Implementa el formato de embeds de Discord para mostrar el estado del servicio
 * de manera visual y organizada.
 */
@injectable()
export class DiscordStatusService implements IDiscordStatusService {
  private readonly webhookUrl: string;
  private readonly enabled: boolean;

  constructor() {
    this.webhookUrl = config.serviceStatusWebhookUrl || '';
    this.enabled = !!this.webhookUrl;

    if (!this.enabled) {
      logger.warn(
        'Service status webhook no configurado - Notificaciones de estado por Discord deshabilitadas'
      );
    } else {
      logger.info(
        'Service status webhook configurado - Notificaciones de estado por Discord habilitadas'
      );
    }
  }

  async sendStatusNotification(
    _event: 'service.healthy' | 'service.unhealthy' | 'service.degraded',
    status: HealthCheckResult,
    previousStatus?: string
  ): Promise<void> {
    if (!this.enabled) {
      logger.debug(
        'Notificación de estado por Discord ignorada - webhook no configurado'
      );
      return;
    }

    try {
      // Determinar el color según el estado
      let color: number;
      let emoji: string;
      let title: string;

      switch (status.status) {
        case 'healthy':
          color = 0x00ff00; // Verde
          emoji = '✅';
          title = 'Servicio Recuperado - Estado Saludable';
          break;
        case 'degraded':
          color = 0xffaa00; // Naranja
          emoji = '⚠️';
          title = 'Servicio Degradado';
          break;
        case 'unhealthy':
          color = 0xff0000; // Rojo
          emoji = '❌';
          title = 'Servicio No Disponible';
          break;
        default:
          color = 0x808080; // Gris
          emoji = '❓';
          title = 'Estado del Servicio Desconocido';
      }

      // Construir campos para cada check
      const fields = Object.entries(status.checks).map(([name, check]) => {
        const statusEmoji =
          check.status === 'healthy'
            ? '✅'
            : check.status === 'degraded'
              ? '⚠️'
              : '❌';

        let value = `${statusEmoji} **${check.status.toUpperCase()}**\n${check.message}`;

        // Agregar detalles si existen
        if (check.details) {
          const detailsStr = Object.entries(check.details)
            .map(([key, val]) => `• ${key}: ${val}`)
            .join('\n');
          if (detailsStr) {
            value += `\n${detailsStr}`;
          }
        }

        return {
          name: name.toUpperCase(),
          value,
          inline: false,
        };
      });

      // Agregar información de uptime
      const uptimeHours = Math.floor(status.uptime / 3600);
      const uptimeMinutes = Math.floor((status.uptime % 3600) / 60);
      const uptimeField = {
        name: 'UPTIME',
        value: `⏱️ ${uptimeHours}h ${uptimeMinutes}m`,
        inline: true,
      };

      // Agregar información de cambio de estado
      if (previousStatus) {
        const changeField = {
          name: 'CAMBIO DE ESTADO',
          value: `${previousStatus.toUpperCase()} → ${status.status.toUpperCase()}`,
          inline: true,
        };
        fields.push(changeField);
      }

      fields.push(uptimeField);

      const message = {
        embeds: [
          {
            title: `${emoji} ${title}`,
            description: 'Cambio en el estado del servicio BCV',
            color,
            fields,
            timestamp: status.timestamp,
            footer: {
              text: 'BCV Service - Monitoreo de Estado',
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

      logger.info('Notificación de estado enviada a Discord', {
        webhookUrl: this.webhookUrl ? '***HIDDEN***' : 'No configurado',
        status: status.status,
        previousStatus,
        timestamp: status.timestamp,
      });
    } catch (error: unknown) {
      logger.error('Error enviando notificación de estado a Discord', {
        error: error instanceof Error ? error.message : 'Unknown error',
        webhookUrl: this.webhookUrl ? '***HIDDEN***' : 'No configurado',
      });
      throw error;
    }
  }
}
