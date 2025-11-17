import { z } from 'zod';

/**
 * Schema para validar el formato de fecha (YYYY-MM-DD)
 */
export const DateParamSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD')
    .refine((date) => {
      const parsed = new Date(date);
      return !Number.isNaN(parsed.getTime());
    }, 'La fecha proporcionada no es válida'),
});

/**
 * Schema para validar query parameters de historial
 */
export const HistoryQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 30))
    .refine((val) => val > 0 && val <= 100, {
      message: 'El límite debe estar entre 1 y 100',
    }),
});

/**
 * Schema para validar una tasa de cambio de una moneda
 */
export const CurrencyRateSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'CNY', 'TRY', 'RUB'], {
    errorMap: () => ({ message: 'Moneda no soportada' }),
  }),
  rate: z
    .number()
    .positive('La tasa debe ser un número positivo')
    .finite('La tasa debe ser un número finito')
    .refine((val) => val < 1000000000000, {
      message: 'La tasa parece inusualmente alta',
    }),
  name: z.string().min(1, 'El nombre de la moneda es requerido'),
});

/**
 * Schema para validar los datos completos de tasa del BCV
 */
export const BCVRateDataSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD'),
  rates: z
    .array(CurrencyRateSchema)
    .min(1, 'Debe haber al menos una tasa de cambio'),
  rate: z
    .number()
    .positive('La tasa del dólar debe ser un número positivo')
    .finite('La tasa debe ser un número finito'),
});

/**
 * Tipos inferidos de los schemas
 */
export type DateParam = z.infer<typeof DateParamSchema>;
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
export type CurrencyRate = z.infer<typeof CurrencyRateSchema>;
export type BCVRateData = z.infer<typeof BCVRateDataSchema>;
