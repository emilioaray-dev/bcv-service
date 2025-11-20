export interface CurrencyRate {
  currency: string;
  rate: number;
  name: string;
}

export interface Rate {
  id: string;
  rates: CurrencyRate[]; // Todas las tasas (EUR, CNY, TRY, RUB, USD, etc.)
  date: string;
  source: string;
  createdAt: string;
}

export interface RateUpdateEvent {
  timestamp: string;
  rates: CurrencyRate[];
  change?: number;
  eventType: 'rate-update';
}
