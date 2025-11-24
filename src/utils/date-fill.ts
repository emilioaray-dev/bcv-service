import type { Rate } from '@/models/rate';

/**
 * Rate with gap-filling metadata
 */
export interface FilledRate extends Rate {
  isFilled?: boolean;
  filledFrom?: string;
}

/**
 * Fills missing dates in a rate array using forward fill strategy
 *
 * Forward fill is a standard financial data practice where missing values
 * are filled with the last known value. This is useful for weekends and
 * holidays when BCV doesn't publish new rates.
 *
 * @param rates - Array of rates from database (sorted by date ascending)
 * @param startDate - Start date of the range (YYYY-MM-DD)
 * @param endDate - End date of the range (YYYY-MM-DD)
 * @returns Array of rates with gaps filled
 *
 * @example
 * const rates = [
 *   { date: '2020-01-03', rates: [...] }, // Friday
 *   { date: '2020-01-06', rates: [...] }, // Monday
 * ];
 *
 * const filled = fillDateGaps(rates, '2020-01-03', '2020-01-06');
 * // Returns:
 * // [
 * //   { date: '2020-01-03', rates: [...], isFilled: false },
 * //   { date: '2020-01-04', rates: [...], isFilled: true, filledFrom: '2020-01-03' },
 * //   { date: '2020-01-05', rates: [...], isFilled: true, filledFrom: '2020-01-03' },
 * //   { date: '2020-01-06', rates: [...], isFilled: false },
 * // ]
 */
export function fillDateGaps(
  rates: Rate[],
  startDate: string,
  endDate: string
): FilledRate[] {
  if (rates.length === 0) {
    return [];
  }

  // Create a map for quick lookup
  const rateMap = new Map<string, Rate>();
  for (const rate of rates) {
    rateMap.set(rate.date, rate);
  }

  const result: FilledRate[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let lastKnownRate: Rate | null = null;
  let currentDate = new Date(start);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];

    if (rateMap.has(dateStr)) {
      // Real data exists for this date
      const rate = rateMap.get(dateStr)!;
      lastKnownRate = rate;
      result.push({
        ...rate,
        isFilled: false,
      });
    } else if (lastKnownRate) {
      // No data for this date - use forward fill
      result.push({
        ...lastKnownRate,
        date: dateStr,
        id: `${dateStr}-${lastKnownRate.source}`,
        isFilled: true,
        filledFrom: lastKnownRate.date,
      });
    }
    // If no lastKnownRate exists yet, skip this date (beginning of range with no data)

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

/**
 * Generates all dates between start and end (inclusive)
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of date strings
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
