import https from 'node:https';
import { TYPES } from '@/config/types';
import type { IBCVService } from '@/interfaces/IBCVService';
import type { INotificationStateService } from '@/interfaces/INotificationStateService';
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
}

/**
 * Helper function para obtener la tasa de una moneda específica
 */
export function getCurrencyRate(
  rateData: BCVRateData | null,
  currency = 'USD'
): number {
  if (!rateData) return 0;
  return rateData.rates.find((r) => r.currency === currency)?.rate || 0;
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
    private readonly webSocketService: IWebSocketService,
    @inject(TYPES.NotificationStateService)
    private readonly notificationStateService: INotificationStateService
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
          // Verificar si hay cambio significativo usando el estado persistente
          const hasSignificantChange =
            await this.notificationStateService.hasSignificantChangeAndNotify(
              rateData
            );

          if (hasSignificantChange) {
            log.info('Detectado cambio significativo en las tasas de cambio', {
              currentRate: getCurrencyRate(rateData, 'USD'),
              timestamp: new Date().toISOString(),
            });

            // Obtener la tasa anterior desde el estado persistente
            const lastState =
              await this.notificationStateService.getLastNotificationState();
            const previousRate = lastState?.lastNotifiedRate || null;

            // Enviar notificación a Discord
            try {
              await this.discordService.sendRateUpdateNotification(
                rateData,
                previousRate
              );
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
                  previousRate
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
                rates: rateData.rates,
                change: this.calculateChange(previousRate, rateData),
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

          // Actualizar la tasa anterior (solo con fines de cálculo local, ya no se usa para comparación)
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
      // Crear agente HTTPS que ignora verificación de certificados
      // Necesario porque el sitio del BCV tiene problemas con la cadena de certificados
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
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
            }
          }
        }
      }

      if (rates.length > 0) {
        const rateData: BCVRateData = {
          date: dateString,
          rates: rates,
        };

        // Log exitoso de obtención de tasas
        log.info('Tasas del BCV obtenidas exitosamente', {
          date: dateString,
          dollarRate: getCurrencyRate(rateData, 'USD'),
          totalCurrencies: rates.length,
          currencies: rates.map((r) => `${r.currency}: ${r.rate}`).join(', '),
        });

        return rateData;
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

  private calculateChange(
    previous: BCVRateData | null,
    current: BCVRateData
  ): number {
    if (!previous) {
      return 0;
    }

    const currentUsdRate = getCurrencyRate(current, 'USD');
    const previousUsdRate = getCurrencyRate(previous, 'USD');
    const change = currentUsdRate - previousUsdRate;
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
