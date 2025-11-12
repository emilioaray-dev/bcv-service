import { injectable, inject } from 'inversify';
import axios, { type AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import https from 'node:https';
import log from '@/utils/logger';
import { IBCVService } from '@/interfaces/IBCVService';
import { TYPES } from '@/config/types';
import { parseVenezuelanNumber } from '@/utils/number-parser';

export interface CurrencyRate {
  currency: string;
  rate: number;
  name: string;
}

export interface BCVRateData {
  date: string;
  rates: CurrencyRate[];
  // Propiedades individuales para compatibilidad hacia atrás
  rate: number;  // Tasa del dólar (para compatibilidad)
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

  constructor(
    @inject(TYPES.Config) config: { bcvWebsiteUrl: string }
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
            retryDelay: this.retryDelay
          });
          await this.sleep(this.retryDelay);
        }

        const rateData = await this.fetchRateData();
        if (rateData) {
          return rateData;
        }
      } catch (error) {
        lastError = error as Error;
        log.error('Intento de obtener tasa del BCV falló', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          error: this.getErrorMessage(error)
        });
      }
    }

    log.error('Falló obtener tasa del BCV después de todos los intentos', {
      maxRetries: this.maxRetries,
      lastError: lastError?.message,
      stack: lastError?.stack
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
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
        { id: 'dolar', currency: 'USD', name: 'Dólar' }
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

            if (!isNaN(rate) && rate > 0) {
              rates.push({
                currency: selector.currency,
                rate: rate,
                name: selector.name
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
          rate: dollarRate > 0 ? dollarRate : rates.find(r => r.currency === 'USD')?.rate || rates[0].rate
        };
      }

      // Si no se encontraron tasas en el formato esperado, intentar otros métodos
      // Buscar posibles patrones alternativos en la página
      const possiblePatterns = [
        /Tasa de Cambio[^0-9]*([0-9]+[.,][0-9]+)/i,
        /([0-9]+[.,][0-9]+)[^0-9]*dólar/i,
        /USD[^0-9]*([0-9]+[.,][0-9]+)/i
      ];

      for (const pattern of possiblePatterns) {
        const matches = html.match(pattern);
        if (matches && matches[1]) {
          // Parsear usando formato venezolano (punto=miles, coma=decimal)
          const rate = parseVenezuelanNumber(matches[1]);
          if (!isNaN(rate) && rate > 0) {
            return {
              date: new Date().toISOString().split('T')[0],
              rates: [{ currency: 'USD', rate: rate, name: 'Dólar' }], // Tasa genérica
              rate: rate
            };
          }
        }
      }

      return null;
    } catch (error) {
      throw error; // Propagar el error para que el retry lo maneje
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private parseSpanishDate(spanishDate: string): string {
    // Convierte una fecha en español a formato ISO
    // Ejemplo: "Miércoles, 12 Noviembre 2025" -> "2025-11-12"
    const months: { [key: string]: number } = {
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
      'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
      'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
    };

    // Limpiar la cadena de fecha y dividirla
    const cleanDate = spanishDate.trim().toLowerCase();
    const parts = cleanDate.split(/[,\s]+/).filter(part => part.length > 0);

    if (parts.length >= 3) {
      // Buscar día, mes y año en las partes
      let day = '';
      let month = '';
      let year = '';

      for (const part of parts) {
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
          if (num > 1900) { // Es probablemente el año
            year = num.toString();
          } else if (num <= 31 && day === '') { // Es probablemente el día
            day = num.toString().padStart(2, '0');
          }
        } else if (months[part]) { // Es un mes en español
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