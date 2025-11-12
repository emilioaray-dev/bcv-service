import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BCVService } from '@/services/bcv.service';
import axios from 'axios';
import type { AxiosResponse } from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock logger
vi.mock('@/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }
}));

describe('BCVService', () => {
  let bcvService: BCVService;
  const mockBcvUrl = 'https://www.bcv.org.ve';

  beforeEach(() => {
    bcvService = new BCVService({ bcvWebsiteUrl: mockBcvUrl });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('getCurrentRate', () => {
    it('should successfully fetch exchange rate data', async () => {
      // Mock HTML response con el formato esperado
      const mockHtml = `
        <html>
          <body>
            <span class="date-display-single">Miércoles, 12 Noviembre 2025</span>
            <div id="dolar">
              <div class="centrado">
                <strong>36,50</strong>
              </div>
            </div>
            <div id="euro">
              <div class="centrado">
                <strong>39,20</strong>
              </div>
            </div>
            <div id="yuan">
              <div class="centrado">
                <strong>5,10</strong>
              </div>
            </div>
            <div id="lira">
              <div class="centrado">
                <strong>1,15</strong>
              </div>
            </div>
            <div id="rublo">
              <div class="centrado">
                <strong>0,38</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as AxiosResponse);

      const result = await bcvService.getCurrentRate();

      expect(result).toBeDefined();
      expect(result?.date).toBe('2025-11-12');
      expect(result?.rates).toHaveLength(5);
      expect(result?.rate).toBe(36.50); // Dólar rate para compatibilidad

      // Verificar todas las monedas
      expect(result?.rates).toEqual(
        expect.arrayContaining([
          { currency: 'USD', rate: 36.50, name: 'Dólar' },
          { currency: 'EUR', rate: 39.20, name: 'Euro' },
          { currency: 'CNY', rate: 5.10, name: 'Yuan' },
          { currency: 'TRY', rate: 1.15, name: 'Lira Turca' },
          { currency: 'RUB', rate: 0.38, name: 'Rublo Ruso' },
        ])
      );
    });

    it('should handle partial currency data', async () => {
      // Mock HTML con solo algunas monedas
      const mockHtml = `
        <html>
          <body>
            <span class="date-display-single">Miércoles, 12 Noviembre 2025</span>
            <div id="dolar">
              <div class="centrado">
                <strong>36,50</strong>
              </div>
            </div>
            <div id="euro">
              <div class="centrado">
                <strong>39,20</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as AxiosResponse);

      const result = await bcvService.getCurrentRate();

      expect(result).toBeDefined();
      expect(result?.rates).toHaveLength(2);
      expect(result?.rates).toEqual(
        expect.arrayContaining([
          { currency: 'USD', rate: 36.50, name: 'Dólar' },
          { currency: 'EUR', rate: 39.20, name: 'Euro' },
        ])
      );
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockHtml = `
        <html>
          <body>
            <span class="date-display-single">Miércoles, 12 Noviembre 2025</span>
            <div id="dolar">
              <div class="centrado">
                <strong>36,50</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      // Primera llamada falla, segunda tiene éxito
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: mockHtml,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse);

      const result = await bcvService.getCurrentRate();

      expect(result).toBeDefined();
      expect(result?.rate).toBe(36.50);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should return null after all retries fail', async () => {
      // Todas las llamadas fallan
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await bcvService.getCurrentRate();

      expect(result).toBeNull();
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // maxRetries = 3
    });

    it('should handle missing date element', async () => {
      const mockHtml = `
        <html>
          <body>
            <div id="dolar">
              <div class="centrado">
                <strong>36,50</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as AxiosResponse);

      const result = await bcvService.getCurrentRate();

      expect(result).toBeDefined();
      // Should use current date when date element is missing
      const today = new Date().toISOString().split('T')[0];
      expect(result?.date).toBe(today);
    });

    it('should fallback to regex patterns when standard selectors fail', async () => {
      const mockHtml = `
        <html>
          <body>
            <p>La tasa del USD es: 36,50</p>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as AxiosResponse);

      const result = await bcvService.getCurrentRate();

      expect(result).toBeDefined();
      expect(result?.rate).toBe(36.50);
      expect(result?.rates).toHaveLength(1);
      expect(result?.rates[0]).toEqual({
        currency: 'USD',
        rate: 36.50,
        name: 'Dólar'
      });
    });

    it('should handle malformed rate values', async () => {
      const mockHtml = `
        <html>
          <body>
            <span class="date-display-single">Miércoles, 12 Noviembre 2025</span>
            <div id="dolar">
              <div class="centrado">
                <strong>invalid</strong>
              </div>
            </div>
            <div id="euro">
              <div class="centrado">
                <strong>39,20</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as AxiosResponse);

      const result = await bcvService.getCurrentRate();

      expect(result).toBeDefined();
      // Should only include valid rates
      expect(result?.rates).toHaveLength(1);
      expect(result?.rates[0]).toEqual({
        currency: 'EUR',
        rate: 39.20,
        name: 'Euro'
      });
    });
  });

  describe('Date parsing', () => {
    it('should parse Spanish date format correctly', async () => {
      const testCases = [
        { input: 'Miércoles, 12 Noviembre 2025', expected: '2025-11-12' },
        { input: 'Lunes, 1 Enero 2025', expected: '2025-01-01' },
        { input: 'Viernes, 31 Diciembre 2025', expected: '2025-12-31' },
      ];

      for (const testCase of testCases) {
        const mockHtml = `
          <html>
            <body>
              <span class="date-display-single">${testCase.input}</span>
              <div id="dolar">
                <div class="centrado">
                  <strong>36,50</strong>
                </div>
              </div>
            </body>
          </html>
        `;

        mockedAxios.get.mockResolvedValueOnce({
          data: mockHtml,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse);

        const result = await bcvService.getCurrentRate();
        expect(result?.date).toBe(testCase.expected);
      }
    });
  });

  describe('Rate extraction', () => {
    it('should extract multiple currency rates correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <span class="date-display-single">Miércoles, 12 Noviembre 2025</span>
            <div id="dolar">
              <div class="centrado">
                <strong>36,50</strong>
              </div>
            </div>
            <div id="euro">
              <div class="centrado">
                <strong>39,20</strong>
              </div>
            </div>
            <div id="yuan">
              <div class="centrado">
                <strong>5,10</strong>
              </div>
            </div>
            <div id="lira">
              <div class="centrado">
                <strong>1,15</strong>
              </div>
            </div>
            <div id="rublo">
              <div class="centrado">
                <strong>0,38</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as AxiosResponse);

      const result = await bcvService.getCurrentRate();

      expect(result?.rates).toHaveLength(5);

      // Verify each currency
      const usdRate = result?.rates.find(r => r.currency === 'USD');
      expect(usdRate).toBeDefined();
      expect(usdRate?.rate).toBe(36.50);
      expect(usdRate?.name).toBe('Dólar');

      const eurRate = result?.rates.find(r => r.currency === 'EUR');
      expect(eurRate).toBeDefined();
      expect(eurRate?.rate).toBe(39.20);
      expect(eurRate?.name).toBe('Euro');
    });

    it('should handle rates with spaces and formatting', async () => {
      const mockHtml = `
        <html>
          <body>
            <span class="date-display-single">Miércoles, 12 Noviembre 2025</span>
            <div id="dolar">
              <div class="centrado">
                <strong>  36,50  </strong>
              </div>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as AxiosResponse);

      const result = await bcvService.getCurrentRate();

      expect(result?.rate).toBe(36.50);
    });
  });

  describe('Error handling', () => {
    it('should handle network timeout', async () => {
      mockedAxios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 15000ms exceeded'
      });

      const result = await bcvService.getCurrentRate();

      expect(result).toBeNull();
    });

    it('should handle HTTP errors', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      });

      const result = await bcvService.getCurrentRate();

      expect(result).toBeNull();
    });

    it('should handle empty HTML response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: '',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as AxiosResponse);

      const result = await bcvService.getCurrentRate();

      expect(result).toBeNull();
    });
  });
});
