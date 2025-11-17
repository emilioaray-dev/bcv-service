import https from 'node:https';
import { TYPES } from '@/config/types';
import type { IBCVService } from '@/interfaces/IBCVService';
import type { IWebSocketService } from '@/interfaces/IWebSocketService';
import type { IWebhookService } from '@/interfaces/IWebhookService';
import log from '@/utils/logger';
import { parseVenezuelanNumber } from '@/utils/number-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { inject, injectable } from 'inversify';
import type { IDiscordService } from './discord.service';

export interface CurrencyRate {
  currency: string;
  rate: number;
  name: string;
}

export interface BCVRateData {
  date: string;
  rates: CurrencyRate[];
  // Propiedades individuales para compatibilidad hacia atrás
  rate: number; // Tasa del dólar (para compatibilidad)
}

export interface BCVConfig {
  bcvUrl: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * BCVService - Servicio para obtener tasas de cambio del BCV
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Obtener y parsear tasas del BCV
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Depende de abstracciones (IBCVService) no de concreciones
 */
@injectable()
export class BCVService implements IBCVService {
  private readonly bcvUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private lastRate: BCVRateData | null = null;

  constructor(
    @inject(TYPES.Config) config: { bcvWebsiteUrl: string },
    @inject(TYPES.DiscordService)
    private readonly discordService: IDiscordService,
    @inject(TYPES.WebhookService)
    private readonly webhookService: IWebhookService,
    @inject(TYPES.WebSocketService)
    private readonly webSocketService: IWebSocketService
  ) {
    this.bcvUrl = config.bcvWebsiteUrl || 'https://www.bcv.org.ve/';
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  async getCurrentRate(): Promise<BCVRateData | null> {
    let lastError: Error | null = null;

    // Intentar con reintentos
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          log.info('Reintentando obtener tasa del BCV', {
            attempt,
            maxRetries: this.maxRetries - 1,
            retryDelay: this.retryDelay,
          });
          await this.sleep(this.retryDelay);
        }

        const rateData = await this.fetchRateData();
        if (rateData) {
          // Verificar si hay cambio en las tasas
          const hasChange = this.hasRateChanged(this.lastRate, rateData);

          if (hasChange) {
            log.info('Detectado cambio en las tasas de cambio', {
              previousRate: this.lastRate?.rate,
              currentRate: rateData.rate,
              timestamp: new Date().toISOString(),
            });

            // Enviar notificación a Discord
            try {
              await this.discordService.sendRateUpdateNotification(rateData);
              log.info('Notificación de cambio de tasa enviada a Discord');
            } catch (notificationError) {
              log.error('Error enviando notificación a Discord', {
                error: (notificationError as Error).message,
              });
            }

            // Enviar notificación a través de Webhook
            try {
              const webhookResult =
                await this.webhookService.sendRateUpdateNotification(
                  rateData,
                  this.lastRate
                );

              if (webhookResult.success) {
                log.info('Notificación de cambio de tasa enviada por Webhook', {
                  statusCode: webhookResult.statusCode,
                  attempt: webhookResult.attempt,
                  duration: webhookResult.duration,
                });
              }
            } catch (webhookError) {
              log.error('Error enviando notificación por Webhook', {
                error: (webhookError as Error).message,
              });
            }

            // Enviar notificación a través de WebSocket
            try {
              const rateUpdateEvent = {
                timestamp: new Date().toISOString(),
                rate: rateData.rate,
                rates: rateData.rates,
                change: this.calculateChange(this.lastRate, rateData),
                eventType: 'rate-update' as const,
              };

              this.webSocketService.broadcastRateUpdate(rateUpdateEvent);
              log.info('Notificación de cambio de tasa enviada por WebSocket');
            } catch (wsError) {
              log.error('Error enviando notificación por WebSocket', {
                error: (wsError as Error).message,
              });
            }
          }

          // Actualizar la tasa anterior
          this.lastRate = rateData;

          return rateData;
        }
      } catch (error) {
        lastError = error as Error;
        log.error('Intento de obtener tasa del BCV falló', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          error: this.getErrorMessage(error),
        });
      }
    }

    log.error('Falló obtener tasa del BCV después de todos los intentos', {
      maxRetries: this.maxRetries,
      lastError: lastError?.message,
      stack: lastError?.stack,
    });
    return null;
  }

  private async fetchRateData(): Promise<BCVRateData | null> {
    try {
      // Crear agente HTTPS que ignora verificación de certificados solo en desarrollo
      const httpsAgent = new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      });

      // Hacer scraping del sitio oficial del BCV
      const response = await axios.get(this.bcvUrl, {
        timeout: 15000, // 15 segundos de timeout
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        httpsAgent,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Definir los IDs de monedas en el orden especificado: euro, yuan, lira, rublo, dolar
      const currencySelectors = [
        { id: 'euro', currency: 'EUR', name: 'Euro' },
        { id: 'yuan', currency: 'CNY', name: 'Yuan' },
        { id: 'lira', currency: 'TRY', name: 'Lira Turca' },
        { id: 'rublo', currency: 'RUB', name: 'Rublo Ruso' },
        { id: 'dolar', currency: 'USD', name: 'Dólar' },
      ];

      const rates: CurrencyRate[] = [];
      let dollarRate = 0; // Valor por defecto para compatibilidad hacia atrás

      // Extraer la fecha del elemento span con clase 'date-display-single'
      let dateString = '';
      const dateElement = $('span.date-display-single');
      if (dateElement.length > 0) {
        dateString = dateElement.text().trim();
        // Convertir la fecha de formato español a formato ISO
        dateString = this.parseSpanishDate(dateString);
      } else {
        // Si no se encuentra la fecha, usar la fecha actual
        dateString = new Date().toISOString().split('T')[0];
      }

      // Recorrer cada selector de moneda
      for (const selector of currencySelectors) {
        const currencyDiv = $(`#${selector.id}`);
        if (currencyDiv.length > 0) {
          // Extraer la tasa de cambio del div de la moneda
          const tasaElement = currencyDiv.find('.centrado strong');
          if (tasaElement.length > 0) {
            let rateText = tasaElement.text().trim();
            // Limpiar el texto de la tasa (eliminar espacios y saltos de línea)
            rateText = rateText.replace(/[\s\n\r]+/g, '');

            // Parsear usando formato venezolano (punto=miles, coma=decimal)
            const rate = parseVenezuelanNumber(rateText);

            if (!Number.isNaN(rate) && rate > 0) {
              rates.push({
                currency: selector.currency,
                rate,
                name: selector.name,
              });

              // Guardar la tasa del dólar para compatibilidad hacia atrás
              if (selector.currency === 'USD') {
                dollarRate = rate;
              }
            }
          }
        }
      }

      if (rates.length > 0) {
        return {
          date: dateString,
          rates: rates,
          // Mantener 'rate' para compatibilidad hacia atrás (seleccionando la tasa del dólar)
          rate:
            dollarRate > 0
              ? dollarRate
              : rates.find((r) => r.currency === 'USD')?.rate || rates[0].rate,
        };
      }

      // Si no se encontraron tasas en el formato esperado, intentar otros métodos
      // Buscar posibles patrones alternativos en la página
      const possiblePatterns = [
        /Tasa de Cambio[^0-9]*([0-9]+[.,][0-9]+)/i,
        /([0-9]+[.,][0-9]+)[^0-9]*dólar/i,
        /USD[^0-9]*([0-9]+[.,][0-9]+)/i,
      ];

      for (const pattern of possiblePatterns) {
        const matches = html.match(pattern);
        if (matches?.[1]) {
          // Parsear usando formato venezolano (punto=miles, coma=decimal)
          const rate = parseVenezuelanNumber(matches[1]);
          if (!Number.isNaN(rate) && rate > 0) {
            return {
              date: new Date().toISOString().split('T')[0],
              rates: [{ currency: 'USD', rate, name: 'Dólar' }], // Tasa genérica
              rate,
            };
          }
        }
      }

      return null;
    } catch (error) {
      // Registrar el error para seguimiento y propagarlo
      log.error('Error al obtener datos del BCV', {
        error: (error as Error).message,
      });
      throw error; // Propagar el error para que el retry lo maneje
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private hasRateChanged(
    previous: BCVRateData | null,
    current: BCVRateData
  ): boolean {
    // Si no hay tasa anterior, consideramos que hay un cambio
    if (!previous) {
      return true;
    }

    // Comparar porcentaje de cambio para la tasa principal (dólar)
    const rateChange =
      Math.abs(
        ((current.rate || 0) - (previous.rate || 0)) / (previous.rate || 1)
      ) * 100;

    // Consideramos cambio si la diferencia es mayor al 0.1% o si las tasas son diferentes
    if (rateChange > 0.1) {
      return true;
    }

    // Verificar si hay cambios en tasas múltiples (e.g., EUR, CNY, etc.)
    if (Array.isArray(current.rates) && Array.isArray(previous.rates)) {
      // Comparar cada moneda individualmente
      for (const currentRate of current.rates) {
        const previousRate = previous.rates.find(
          (r) => r.currency === currentRate.currency
        );
        if (!previousRate) {
          // Nueva moneda añadida
          return true;
        }

        const currencyChange =
          Math.abs(
            ((currentRate.rate || 0) - (previousRate.rate || 0)) /
              (previousRate.rate || 1)
          ) * 100;
        if (currencyChange > 0.1) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateChange(
    previous: BCVRateData | null,
    current: BCVRateData
  ): number {
    if (!previous) {
      return 0;
    }

    const change = current.rate - previous.rate;
    return change;
  }

  private parseSpanishDate(spanishDate: string): string {
    // Convierte una fecha en español a formato ISO
    // Ejemplo: "Miércoles, 12 Noviembre 2025" -> "2025-11-12"
    const months: { [key: string]: number } = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    };

    // Limpiar la cadena de fecha y dividirla
    const cleanDate = spanishDate.trim().toLowerCase();
    const parts = cleanDate.split(/[,\s]+/).filter((part) => part.length > 0);

    if (parts.length >= 3) {
      // Buscar día, mes y año en las partes
      let day = '';
      let month = '';
      let year = '';

      for (const part of parts) {
        const num = Number.parseInt(part, 10);
        if (!Number.isNaN(num)) {
          if (num > 1900) {
            // Es probablemente el año
            year = num.toString();
          } else if (num <= 31 && day === '') {
            // Es probablemente el día
            day = num.toString().padStart(2, '0');
          }
        } else if (months[part]) {
          // Es un mes en español
          month = months[part].toString().padStart(2, '0');
        }
      }

      if (day && month && year) {
        return `${year}-${month}-${day}`;
      }
    }

    // Si no se puede parsear, devolver la fecha actual
    return new Date().toISOString().split('T')[0];
  }
}
