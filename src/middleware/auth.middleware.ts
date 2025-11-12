import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Middleware de autenticación con API Key
 *
 * Valida que la petición incluya un header X-API-Key válido.
 * Soporta múltiples API keys para diferentes clientes/servicios.
 *
 * Uso:
 *   app.use('/api', apiKeyAuth);
 *
 * Headers requeridos:
 *   X-API-Key: tu-api-key-aqui
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // Extraer API key del header
  const apiKey = req.header('X-API-Key');

  // Verificar si se proporcionó la API key
  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key es requerida. Incluye el header X-API-Key en tu petición.',
      code: 'MISSING_API_KEY'
    });
    return;
  }

  // Obtener las API keys válidas desde la configuración
  const validApiKeys = config.apiKeys;

  // Verificar si no hay API keys configuradas (modo desarrollo sin autenticación)
  if (validApiKeys.length === 0) {
    console.warn('⚠️  No hay API keys configuradas. Modo desarrollo: autenticación desactivada.');
    next();
    return;
  }

  // Validar la API key
  const isValidKey = validApiKeys.includes(apiKey);

  if (!isValidKey) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'API key inválida.',
      code: 'INVALID_API_KEY'
    });
    return;
  }

  // API key válida, continuar con la petición
  next();
}

/**
 * Middleware opcional de autenticación
 *
 * Si se proporciona una API key, la valida.
 * Si no se proporciona, permite el acceso (útil para endpoints públicos opcionales).
 */
export function optionalApiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.header('X-API-Key');

  // Si no hay API key, permitir acceso
  if (!apiKey) {
    next();
    return;
  }

  // Si hay API key, validarla
  const validApiKeys = config.apiKeys;

  if (validApiKeys.length === 0 || validApiKeys.includes(apiKey)) {
    next();
    return;
  }

  // API key proporcionada pero inválida
  res.status(403).json({
    error: 'Forbidden',
    message: 'API key inválida.',
    code: 'INVALID_API_KEY'
  });
}
