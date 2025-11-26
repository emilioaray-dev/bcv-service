import axios from 'axios';
import { inject, injectable } from 'inversify';
import { config } from '../config';
import { logger } from '../utils/logger';

import { TYPES } from '@/config/types';
import type { IDiscordStatusService } from '@/interfaces/IDiscordStatusService';
import type { HealthCheckResult } from '@/interfaces/IHealthCheckService';
import type { IWebhookQueueService } from '@/interfaces/IWebhookQueueService';

/**
 * DiscordStatusService - Servicio para enviar notificaciones de estado del servicio a Discord
 *
 * Implementa el formato de embeds de Discord para mostrar el estado del servicio
 * de manera visual y organizada.
 *
 * Features:
 * - Reintentos automáticos con backoff exponencial
 * - Cola persistente para notificaciones fallidas
 * - Sobrevive a reinicios del servidor
 */
@injectable()
export class DiscordStatusService implements IDiscordStatusService {
  private readonly webhookUrl: string;
  private readonly enabled: boolean;
  private readonly maxRetries = 3;

  constructor(
    @inject(TYPES.WebhookQueueService)
    private readonly queueService: IWebhookQueueService
  ) {
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
    event: 'service.healthy' | 'service.unhealthy' | 'service.degraded',
    status: HealthCheckResult,
    previousStatus?: string
  ): Promise<void> {
    if (!this.enabled) {
      logger.debug(
        'Notificación de estado por Discord ignorada - webhook no configurado'
      );
      return;
    }

    const message = this.buildDiscordMessage(status, previousStatus);
    let lastError: Error | null = null;

    // Intentar enviar con reintentos
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Backoff exponencial para reintentos
        if (attempt > 1) {
          const delay = 2 ** (attempt - 2) * 1000; // 1s, 2s, 4s
          logger.info('Reintentando notificación Discord', {
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

        logger.info('Notificación de estado enviada a Discord', {
          webhookUrl: '***HIDDEN***',
          status: status.status,
          previousStatus,
          attempt,
        });
        return; // Éxito, salir
      } catch (error: unknown) {
        lastError = error as Error;

        logger.error('Intento de notificación Discord falló', {
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
    logger.warn('Notificación Discord falló después de todos los intentos', {
      maxRetries: this.maxRetries,
      lastError: lastError?.message,
    });

    try {
      const queueId = await this.queueService.enqueue(
        event,
        this.webhookUrl,
        message,
        {
          maxAttempts: 5,
          priority: event === 'service.unhealthy' ? 'high' : 'normal',
          delaySeconds: 300, // Esperar 5 minutos antes del primer retry
        }
      );

      logger.info('Notificación Discord encolada para retry', {
        queueId,
        event,
        status: status.status,
      });
    } catch (queueError) {
      logger.error('Error encolando notificación Discord', {
        error: queueError,
        event,
      });
      throw lastError; // Lanzar el error original
    }
  }

  private buildDiscordMessage(
    status: HealthCheckResult,
    previousStatus?: string
  ): Record<string, unknown> {
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

    return {
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
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
