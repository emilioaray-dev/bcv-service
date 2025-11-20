import axios from 'axios';
import { injectable } from 'inversify';
import { config } from '../config';
import { logger } from '../utils/logger';

import type { BCVRateData, CurrencyRate } from '@/services/bcv.service';
import { getCurrencyRate } from '@/services/bcv.service';

export interface IDiscordService {
  sendRateUpdateNotification(rate: BCVRateData): Promise<void>;
}

@injectable()
export class DiscordService implements IDiscordService {
  private readonly webhookUrl: string;
  private readonly enabled: boolean;

  constructor() {
    this.webhookUrl = config.discordWebhookUrl || '';
    this.enabled = !!this.webhookUrl;

    if (!this.enabled) {
      logger.warn(
        'Discord webhook no configurado - Notificaciones por Discord deshabilitadas'
      );
    } else {
      logger.info(
        'Discord webhook configurado - Notificaciones por Discord habilitadas'
      );
    }
  }

  async sendRateUpdateNotification(rate: BCVRateData): Promise<void> {
    if (!this.enabled) {
      logger.debug(
        'Notificación por Discord ignorada - webhook no configurado'
      );
      return;
    }

    try {
      const rateData = rate.rates;

      const message = {
        embeds: [
          {
            title: '🔄 Actualización de Tasas de Cambio',
            description:
              'Se ha detectado un cambio en las tasas de cambio del BCV',
            color: 0x00ff00, // Verde
            fields: rateData.map((r: CurrencyRate) => ({
              name: `${r.name || r.currency} (${r.currency})`,
              value: r.rate?.toLocaleString('es-VE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
              inline: false,
            })),
            timestamp: new Date().toISOString(),
            footer: {
              text: 'Servicio BCV - Notificaciones',
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

      logger.info('Notificación enviada a Discord', {
        webhookUrl: this.webhookUrl ? '***HIDDEN***' : 'No configurado',
        usdRate: getCurrencyRate(rate, 'USD'),
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      logger.error('Error enviando notificación a Discord', {
        error: error instanceof Error ? error.message : 'Unknown error',
        webhookUrl: this.webhookUrl ? '***HIDDEN***' : 'No configurado',
      });
      throw error;
    }
  }
}
