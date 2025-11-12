export interface CurrencyRate {
  currency: string;
  rate: number;
  name: string;
}

export interface Rate {
  id: string;
  rate: number;  // Tasa principal (por ejemplo, USD)
  rates: CurrencyRate[]; // Todas las tasas (EUR, CNY, TRY, RUB, USD, etc.)
  date: string;
  source: string;
  createdAt: string;
}

export interface RateUpdateEvent {
  timestamp: string;
  rate: number;
  rates?: CurrencyRate[]; // Opcional para mantener compatibilidad
  change?: number;
  eventType: 'rate-update';
}