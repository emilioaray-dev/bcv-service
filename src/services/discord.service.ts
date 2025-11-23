import axios from 'axios';
import { injectable } from 'inversify';
import { config } from '../config';
import { logger } from '../utils/logger';

import type { BCVRateData, CurrencyRate } from '@/services/bcv.service';
import { getCurrencyRate } from '@/services/bcv.service';

export interface IDiscordService {
  sendRateUpdateNotification(
    rate: BCVRateData,
    previousRate?: BCVRateData | null
  ): Promise<void>;
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

  async sendRateUpdateNotification(
    rate: BCVRateData,
    previousRate?: BCVRateData | null
  ): Promise<void> {
    if (!this.enabled) {
      logger.debug(
        'Notificación por Discord ignorada - webhook no configurado'
      );
      return;
    }

    try {
      const rateData = rate.rates;

      // Determinar la tendencia general basada en USD
      let mainTrend: 'up' | 'down' | 'neutral' = 'neutral';
      if (previousRate) {
        const currentUsd = getCurrencyRate(rate, 'USD');
        const previousUsd = getCurrencyRate(previousRate, 'USD');
        if (currentUsd > previousUsd) {
          mainTrend = 'up';
        } else if (currentUsd < previousUsd) {
          mainTrend = 'down';
        }
      }

      // Construir los campos con indicadores de cambio
      const fields = rateData.map((r: CurrencyRate) => {
        const formattedRate = r.rate?.toLocaleString('es-VE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        // Si hay tasa anterior, calcular cambio
        if (previousRate) {
          const prevRate = previousRate.rates.find(
            (pr) => pr.currency === r.currency
          );

          if (prevRate && prevRate.rate !== r.rate) {
            const percentChange =
              ((r.rate - prevRate.rate) / prevRate.rate) * 100;
            const sign = percentChange > 0 ? '+' : '';
            const trend = percentChange > 0 ? '↗️' : '↘️';

            return {
              name: `${r.name || r.currency} (${r.currency}) ${trend}  ${sign}${percentChange.toFixed(2)}%`,
              value: `${formattedRate} Bs`,
              inline: false,
            };
          }
        }

        // Sin cambio o sin tasa anterior
        return {
          name: `${r.name || r.currency} (${r.currency})`,
          value: `${formattedRate} Bs`,
          inline: false,
        };
      });

      const message = {
        embeds: [
          {
            title: '🔄 Actualización de Tasas de Cambio',
            description:
              'Se ha detectado un cambio en las tasas de cambio del BCV',
            color:
              mainTrend === 'up'
                ? 0x00ff00
                : mainTrend === 'down'
                  ? 0xff0000
                  : 0xffff00, // Verde/Rojo/Amarillo
            fields,
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
