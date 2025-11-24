import { describe, expect, it } from 'vitest';
import { fillDateGaps, generateDateRange } from '@/utils/date-fill';
import type { Rate } from '@/models/rate';

describe('Date Fill Utilities', () => {
  describe('generateDateRange', () => {
    it('should generate all dates between start and end (inclusive)', () => {
      const dates = generateDateRange('2020-01-03', '2020-01-06');
      expect(dates).toEqual([
        '2020-01-03',
        '2020-01-04',
        '2020-01-05',
        '2020-01-06',
      ]);
    });

    it('should generate single date when start equals end', () => {
      const dates = generateDateRange('2020-01-01', '2020-01-01');
      expect(dates).toEqual(['2020-01-01']);
    });

    it('should handle month boundaries', () => {
      const dates = generateDateRange('2020-01-30', '2020-02-02');
      expect(dates).toEqual([
        '2020-01-30',
        '2020-01-31',
        '2020-02-01',
        '2020-02-02',
      ]);
    });

    it('should handle year boundaries', () => {
      const dates = generateDateRange('2020-12-30', '2021-01-02');
      expect(dates).toEqual([
        '2020-12-30',
        '2020-12-31',
        '2021-01-01',
        '2021-01-02',
      ]);
    });
  });

  describe('fillDateGaps', () => {
    const mockRate1: Rate = {
      id: '2020-01-03-bcv',
      date: '2020-01-03',
      rates: [
        {
          currency: 'USD',
          rate: 100000,
          name: 'Dólar',
        },
      ],
      source: 'bcv',
      createdAt: '2020-01-03T00:00:00.000Z',
    };

    const mockRate2: Rate = {
      id: '2020-01-06-bcv',
      date: '2020-01-06',
      rates: [
        {
          currency: 'USD',
          rate: 105000,
          name: 'Dólar',
        },
      ],
      source: 'bcv',
      createdAt: '2020-01-06T00:00:00.000Z',
    };

    it('should return empty array when no rates provided', () => {
      const result = fillDateGaps([], '2020-01-01', '2020-01-10');
      expect(result).toEqual([]);
    });

    it('should fill weekend gaps with forward fill', () => {
      const result = fillDateGaps(
        [mockRate1, mockRate2],
        '2020-01-03',
        '2020-01-06'
      );

      expect(result).toHaveLength(4);

      // First day - real data
      expect(result[0]).toMatchObject({
        date: '2020-01-03',
        isFilled: false,
      });

      // Saturday - filled from Friday
      expect(result[1]).toMatchObject({
        date: '2020-01-04',
        isFilled: true,
        filledFrom: '2020-01-03',
      });
      expect(result[1].rates[0].rate).toBe(100000); // Same rate as Jan 3

      // Sunday - filled from Friday
      expect(result[2]).toMatchObject({
        date: '2020-01-05',
        isFilled: true,
        filledFrom: '2020-01-03',
      });
      expect(result[2].rates[0].rate).toBe(100000); // Same rate as Jan 3

      // Monday - real data
      expect(result[3]).toMatchObject({
        date: '2020-01-06',
        isFilled: false,
      });
      expect(result[3].rates[0].rate).toBe(105000); // New rate
    });

    it('should handle gaps at the beginning of range (no previous data)', () => {
      const result = fillDateGaps([mockRate2], '2020-01-01', '2020-01-06');

      // Should only have data from Jan 6 onwards
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: '2020-01-06',
        isFilled: false,
      });
    });

    it('should preserve historical data fields when filling', () => {
      const historicalRate: Rate = {
        id: '2020-01-03-bcv',
        date: '2020-01-03',
        rates: [
          {
            currency: 'USD',
            rate: 100000,
            name: 'Dólar',
            normalized_bs: 0.1,
          },
        ],
        source: 'bcv',
        createdAt: '2020-01-03T00:00:00.000Z',
        denomination: {
          code: 'BS_S',
          name: 'Bolívar Soberano',
          note: 'Moneda vigente desde 20-ago-2018 hasta 30-sep-2021',
        },
      };

      const result = fillDateGaps(
        [historicalRate],
        '2020-01-03',
        '2020-01-05'
      );

      expect(result).toHaveLength(3);

      // Original data
      expect(result[0].denomination).toBeDefined();
      expect(result[0].rates[0].normalized_bs).toBe(0.1);

      // Filled data should preserve historical fields
      expect(result[1].denomination).toBeDefined();
      expect(result[1].denomination?.code).toBe('BS_S');
      expect(result[1].rates[0].normalized_bs).toBe(0.1);
      expect(result[1].isFilled).toBe(true);
      expect(result[1].filledFrom).toBe('2020-01-03');
    });

    it('should update id field for filled dates', () => {
      const result = fillDateGaps([mockRate1], '2020-01-03', '2020-01-05');

      expect(result[0].id).toBe('2020-01-03-bcv');
      expect(result[1].id).toBe('2020-01-04-bcv'); // Updated id
      expect(result[2].id).toBe('2020-01-05-bcv'); // Updated id
    });

    it('should handle continuous data without gaps', () => {
      const rate1: Rate = {
        id: '2020-01-06-bcv',
        date: '2020-01-06',
        rates: [{ currency: 'USD', rate: 100, name: 'Dólar' }],
        source: 'bcv',
        createdAt: '2020-01-06T00:00:00.000Z',
      };

      const rate2: Rate = {
        id: '2020-01-07-bcv',
        date: '2020-01-07',
        rates: [{ currency: 'USD', rate: 101, name: 'Dólar' }],
        source: 'bcv',
        createdAt: '2020-01-07T00:00:00.000Z',
      };

      const result = fillDateGaps([rate1, rate2], '2020-01-06', '2020-01-07');

      expect(result).toHaveLength(2);
      expect(result[0].isFilled).toBe(false);
      expect(result[1].isFilled).toBe(false);
    });

    it('should handle large gaps (multiple days)', () => {
      const result = fillDateGaps([mockRate1], '2020-01-03', '2020-01-10');

      expect(result).toHaveLength(8); // 8 days total
      expect(result[0].isFilled).toBe(false); // Jan 3 - real
      expect(result[1].isFilled).toBe(true); // Jan 4 - filled
      expect(result[2].isFilled).toBe(true); // Jan 5 - filled
      expect(result[3].isFilled).toBe(true); // Jan 6 - filled
      expect(result[4].isFilled).toBe(true); // Jan 7 - filled
      expect(result[5].isFilled).toBe(true); // Jan 8 - filled
      expect(result[6].isFilled).toBe(true); // Jan 9 - filled
      expect(result[7].isFilled).toBe(true); // Jan 10 - filled

      // All filled dates should reference the original
      expect(result[7].filledFrom).toBe('2020-01-03');
    });
  });
});
