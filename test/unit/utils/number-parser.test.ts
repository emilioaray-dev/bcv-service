import { describe, it, expect } from 'vitest';
import {
  parseVenezuelanNumber,
  parseVenezuelanNumberSafe,
  formatToVenezuelanNumber
} from '@/utils/number-parser';

describe('number-parser', () => {
  describe('parseVenezuelanNumber', () => {
    describe('formato con coma decimal solamente', () => {
      it('debe parsear "36,50" correctamente', () => {
        expect(parseVenezuelanNumber('36,50')).toBe(36.50);
      });

      it('debe parsear "0,50" correctamente', () => {
        expect(parseVenezuelanNumber('0,50')).toBe(0.50);
      });

      it('debe parsear "1,00" correctamente', () => {
        expect(parseVenezuelanNumber('1,00')).toBe(1.00);
      });

      it('debe parsear "999,99" correctamente', () => {
        expect(parseVenezuelanNumber('999,99')).toBe(999.99);
      });
    });

    describe('formato con punto de miles y coma decimal', () => {
      it('debe parsear "1.234,56" correctamente', () => {
        expect(parseVenezuelanNumber('1.234,56')).toBe(1234.56);
      });

      it('debe parsear "36.500,00" correctamente', () => {
        expect(parseVenezuelanNumber('36.500,00')).toBe(36500.00);
      });

      it('debe parsear "1.234.567,89" correctamente', () => {
        expect(parseVenezuelanNumber('1.234.567,89')).toBe(1234567.89);
      });

      it('debe parsear "10.000,50" correctamente', () => {
        expect(parseVenezuelanNumber('10.000,50')).toBe(10000.50);
      });
    });

    describe('formato sin decimales', () => {
      it('debe parsear "1234" correctamente', () => {
        expect(parseVenezuelanNumber('1234')).toBe(1234);
      });

      it('debe parsear "36500" correctamente', () => {
        expect(parseVenezuelanNumber('36500')).toBe(36500);
      });

      it('debe parsear "0" correctamente', () => {
        expect(parseVenezuelanNumber('0')).toBe(0);
      });
    });

    describe('formato con punto de miles sin decimales', () => {
      it('debe parsear "1.234" correctamente (asumiendo formato miles)', () => {
        expect(parseVenezuelanNumber('1.234')).toBe(1234);
      });

      it('debe parsear "36.500" correctamente', () => {
        expect(parseVenezuelanNumber('36.500')).toBe(36500);
      });

      it('debe parsear "1.234.567" correctamente', () => {
        expect(parseVenezuelanNumber('1.234.567')).toBe(1234567);
      });
    });

    describe('formato con espacios', () => {
      it('debe parsear "  36,50  " correctamente', () => {
        expect(parseVenezuelanNumber('  36,50  ')).toBe(36.50);
      });

      it('debe parsear "1 234,56" correctamente (con espacios)', () => {
        expect(parseVenezuelanNumber('1 234,56')).toBe(1234.56);
      });

      it('debe parsear "36 500,00" correctamente', () => {
        expect(parseVenezuelanNumber('36 500,00')).toBe(36500.00);
      });
    });

    describe('casos edge y valores inválidos', () => {
      it('debe retornar NaN para string vacío', () => {
        expect(parseVenezuelanNumber('')).toBeNaN();
      });

      it('debe retornar NaN para string solo con espacios', () => {
        expect(parseVenezuelanNumber('   ')).toBeNaN();
      });

      it('debe retornar NaN para string inválido', () => {
        expect(parseVenezuelanNumber('abc')).toBeNaN();
      });

      it('debe retornar NaN para null convertido a string', () => {
        expect(parseVenezuelanNumber('null')).toBeNaN();
      });

      it('debe retornar NaN para undefined convertido a string', () => {
        expect(parseVenezuelanNumber('undefined')).toBeNaN();
      });
    });

    describe('formato con caracteres especiales', () => {
      it('debe parsear "Bs. 36,50" correctamente', () => {
        expect(parseVenezuelanNumber('Bs. 36,50')).toBe(36.50);
      });

      it('debe parsear "$ 1.234,56" correctamente', () => {
        expect(parseVenezuelanNumber('$ 1.234,56')).toBe(1234.56);
      });

      it('debe parsear "36,50 USD" correctamente', () => {
        expect(parseVenezuelanNumber('36,50 USD')).toBe(36.50);
      });
    });

    describe('casos reales del BCV', () => {
      it('debe parsear tasa típica del BCV "36,50"', () => {
        expect(parseVenezuelanNumber('36,50')).toBe(36.50);
      });

      it('debe parsear tasa con miles "36.789,25"', () => {
        expect(parseVenezuelanNumber('36.789,25')).toBe(36789.25);
      });

      it('debe parsear tasa muy alta "1.234.567,89"', () => {
        expect(parseVenezuelanNumber('1.234.567,89')).toBe(1234567.89);
      });

      it('debe parsear tasa sin decimales "37"', () => {
        expect(parseVenezuelanNumber('37')).toBe(37);
      });
    });
  });

  describe('parseVenezuelanNumberSafe', () => {
    it('debe retornar el valor parseado si es válido', () => {
      expect(parseVenezuelanNumberSafe('36,50')).toBe(36.50);
    });

    it('debe retornar el valor por defecto (0) para string inválido', () => {
      expect(parseVenezuelanNumberSafe('abc')).toBe(0);
    });

    it('debe retornar el valor por defecto personalizado para string inválido', () => {
      expect(parseVenezuelanNumberSafe('abc', 100)).toBe(100);
    });

    it('debe retornar el valor por defecto para string vacío', () => {
      expect(parseVenezuelanNumberSafe('', 50)).toBe(50);
    });

    it('debe parsear correctamente valores venezolanos válidos', () => {
      expect(parseVenezuelanNumberSafe('1.234,56', 0)).toBe(1234.56);
    });
  });

  describe('formatToVenezuelanNumber', () => {
    it('debe formatear 36.50 como "36,50"', () => {
      expect(formatToVenezuelanNumber(36.50)).toBe('36,50');
    });

    it('debe formatear 1234.56 como "1.234,56"', () => {
      expect(formatToVenezuelanNumber(1234.56)).toBe('1.234,56');
    });

    it('debe formatear 1234567.89 como "1.234.567,89"', () => {
      expect(formatToVenezuelanNumber(1234567.89)).toBe('1.234.567,89');
    });

    it('debe formatear 36500 como "36.500,00"', () => {
      expect(formatToVenezuelanNumber(36500)).toBe('36.500,00');
    });

    it('debe formatear 0 como "0,00"', () => {
      expect(formatToVenezuelanNumber(0)).toBe('0,00');
    });

    it('debe formatear con decimales personalizados', () => {
      expect(formatToVenezuelanNumber(36.5, 3)).toBe('36,500');
    });

    it('debe formatear NaN como "0,00"', () => {
      expect(formatToVenezuelanNumber(NaN)).toBe('0,00');
    });

    it('debe formatear números grandes correctamente', () => {
      expect(formatToVenezuelanNumber(123456789.12)).toBe('123.456.789,12');
    });
  });

  describe('integración con casos reales', () => {
    it('debe hacer round-trip correctamente', () => {
      const original = 1234.56;
      const formatted = formatToVenezuelanNumber(original);
      const parsed = parseVenezuelanNumber(formatted);
      expect(parsed).toBe(original);
    });

    it('debe parsear y formatear correctamente múltiples valores', () => {
      const testCases = [
        { input: '36,50', expected: 36.50 },
        { input: '1.234,56', expected: 1234.56 },
        { input: '36.789,25', expected: 36789.25 },
        { input: '100.000,00', expected: 100000.00 },
      ];

      testCases.forEach(({ input, expected }) => {
        const parsed = parseVenezuelanNumber(input);
        expect(parsed).toBe(expected);

        const formatted = formatToVenezuelanNumber(expected);
        const reparsed = parseVenezuelanNumber(formatted);
        expect(reparsed).toBe(expected);
      });
    });
  });
});
