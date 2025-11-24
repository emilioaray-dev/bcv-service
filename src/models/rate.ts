/**
 * Información sobre la denominación monetaria venezolana
 * Solo presente en registros históricos antiguos (2020)
 */
export interface Denomination {
  code: string;      // Ej: "BS_S" (Bolívar Soberano)
  name: string;      // Ej: "Bolívar Soberano"
  note: string;      // Ej: "Moneda vigente desde 20-ago-2018 hasta 30-sep-2021"
}

export interface CurrencyRate {
  currency: string;
  rate: number;
  name: string;
  normalized_bs?: number; // Solo presente en registros históricos (2020)
}

export interface Rate {
  id: string;
  rates: CurrencyRate[]; // Todas las tasas (EUR, CNY, TRY, RUB, USD, etc.)
  date: string;
  source: string;
  createdAt: string;
  denomination?: Denomination; // Solo presente en registros históricos antiguos (2020)
}

export interface RateUpdateEvent {
  timestamp: string;
  rates: CurrencyRate[];
  change?: number;
  eventType: 'rate-update';
}
