import log from '@/utils/logger';
import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';

/**
 * Middleware genérico de validación para Zod schemas
 */
export const validate = <T extends z.ZodTypeAny>(
  schema: T,
  source: 'body' | 'params' | 'query' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data =
        source === 'body'
          ? req.body
          : source === 'params'
            ? req.params
            : req.query;

      const validated = await schema.parseAsync(data);

      // Reemplazar los datos con los datos validados y transformados
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'params') {
        req.params = validated;
      } else {
        req.query = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          error: 'Error de validación',
          details: formattedErrors,
        });
        return;
      }

      // Error inesperado
      log.error('Error en validación', { error });
      res.status(500).json({
        error: 'Error interno del servidor durante la validación',
      });
    }
  };
};

/**
 * Middleware para validar parámetros de fecha
 */
export const validateDateParam = validate(
  z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD')
      .refine((date) => {
        const parsed = new Date(date);
        return !Number.isNaN(parsed.getTime());
      }, 'La fecha proporcionada no es válida'),
  }),
  'params'
);

/**
 * Middleware para validar query parameters de historial
 */
export const validateHistoryQuery = validate(
  z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? String(Number.parseInt(val, 10)) : '30'))
      .refine(
        (val) => {
          const num = Number.parseInt(val, 10);
          return num > 0 && num <= 100;
        },
        {
          message: 'El límite debe estar entre 1 y 100',
        }
      ),
  }),
  'query'
);

/**
 * Middleware para validar query parameters de rango de fechas
 */
export const validateDateRangeQuery = validate(
  z.object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de inicio debe estar en formato YYYY-MM-DD')
      .refine((date) => {
        const parsed = new Date(date);
        return !Number.isNaN(parsed.getTime());
      }, 'La fecha de inicio no es válida'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha final debe estar en formato YYYY-MM-DD')
      .refine((date) => {
        const parsed = new Date(date);
        return !Number.isNaN(parsed.getTime());
      }, 'La fecha final no es válida'),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? String(Number.parseInt(val, 10)) : '100'))
      .refine(
        (val) => {
          const num = Number.parseInt(val, 10);
          return num > 0 && num <= 1000;
        },
        {
          message: 'El límite debe estar entre 1 y 1000',
        }
      ),
    fillGaps: z
      .string()
      .optional()
      .default('false')
      .transform((val) => val === 'true' || val === '1'),
  }).refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: 'La fecha final debe ser posterior o igual a la fecha de inicio',
      path: ['endDate']
    }
  ).refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const daysDiff = Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 730; // Máximo 2 años
    },
    {
      message: 'El rango máximo permitido es de 2 años (730 días)',
      path: ['endDate']
    }
  ),
  'query'
);
