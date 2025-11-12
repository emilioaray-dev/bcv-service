import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Middleware genérico de validación para Zod schemas
 */
export const validate = <T extends z.ZodTypeAny>(
  schema: T,
  source: 'body' | 'params' | 'query' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body :
                   source === 'params' ? req.params :
                   req.query;

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
          code: err.code
        }));

        return res.status(400).json({
          error: 'Error de validación',
          details: formattedErrors
        });
      }

      // Error inesperado
      console.error('Error en validación:', error);
      return res.status(500).json({
        error: 'Error interno del servidor durante la validación'
      });
    }
  };
};

/**
 * Middleware para validar parámetros de fecha
 */
export const validateDateParam = validate(
  z.object({
    date: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD')
      .refine((date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      }, 'La fecha proporcionada no es válida')
  }),
  'params'
);

/**
 * Middleware para validar query parameters de historial
 */
export const validateHistoryQuery = validate(
  z.object({
    limit: z.string()
      .optional()
      .transform((val) => val ? String(parseInt(val, 10)) : '30')
      .refine((val) => {
        const num = parseInt(val, 10);
        return num > 0 && num <= 100;
      }, {
        message: 'El límite debe estar entre 1 y 100'
      })
  }),
  'query'
);
