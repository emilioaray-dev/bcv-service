import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '@/config';

/**
 * Niveles de logging personalizados
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Colores para cada nivel (solo para consola)
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Registrar colores
winston.addColors(colors);

/**
 * Formato para desarrollo (consola)
 * Formato legible con colores, timestamps y metadata
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;

    let msg = `${timestamp} [${level}]: ${message}`;

    // Si hay metadata adicional, mostrarla de forma legible
    if (Object.keys(metadata).length > 0) {
      // Filtrar propiedades de Winston que no son metadata del usuario
      const filteredMeta = Object.fromEntries(
        Object.entries(metadata).filter(([key]) =>
          !['level', 'timestamp', 'message', Symbol.for('level')].includes(key) &&
          typeof key !== 'symbol'
        )
      );

      if (Object.keys(filteredMeta).length > 0) {
        msg += `\n  ${JSON.stringify(filteredMeta, null, 2).split('\n').join('\n  ')}`;
      }
    }

    return msg;
  })
);

/**
 * Formato para producción (archivos)
 * Formato JSON estructurado para fácil parsing
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Transport para consola (desarrollo)
 */
const consoleTransport = new winston.transports.Console({
  format: devFormat,
});

/**
 * Transport para archivos con rotación - Error logs
 * Guarda solo logs de error con rotación diaria
 */
const errorFileTransport: DailyRotateFile = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',       // Tamaño máximo por archivo
  maxFiles: '14d',      // Mantener logs por 14 días
  format: prodFormat,
});

/**
 * Transport para archivos con rotación - Combined logs
 * Guarda todos los logs con rotación diaria
 */
const combinedFileTransport: DailyRotateFile = new DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',       // Mantener logs por 7 días
  format: prodFormat,
});

/**
 * Transport para archivos con rotación - HTTP logs
 * Guarda logs HTTP específicamente (útil para auditoría de API)
 */
const httpFileTransport: DailyRotateFile = new DailyRotateFile({
  filename: 'logs/http-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'http',
  maxSize: '20m',
  maxFiles: '7d',
  format: prodFormat,
});

/**
 * Configurar transports según el entorno
 */
const transports: winston.transport[] = [];

const isDevelopment = config.nodeEnv === 'development';
const isProduction = config.nodeEnv === 'production';

if (isDevelopment) {
  // DESARROLLO: Consola colorizada con metadata legible
  transports.push(consoleTransport);

  // Opcional: También guardar logs en archivos en desarrollo
  // Útil para debugging sin llenar la consola
  if (process.env.DEV_FILE_LOGS === 'true') {
    transports.push(errorFileTransport);
    transports.push(combinedFileTransport);
  }
} else if (isProduction) {
  // PRODUCCIÓN: Archivos con rotación + consola JSON
  transports.push(errorFileTransport);
  transports.push(combinedFileTransport);
  transports.push(httpFileTransport);

  // Consola en JSON para Docker/Kubernetes logs
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
} else {
  // OTROS ENTORNOS (testing, staging, etc): Consola simple
  transports.push(consoleTransport);
  transports.push(errorFileTransport);
  transports.push(combinedFileTransport);
}

/**
 * Crear instancia del logger
 */
const logger = winston.createLogger({
  level: config.logLevel || 'info',
  levels,
  transports,
  // Salir en caso de error del logger mismo
  exitOnError: false,
});

/**
 * Wrapper para mejorar la experiencia de desarrollo
 * Agrega métodos convenientes para logging
 */
export const log = {
  /**
   * Log de error - Situaciones que requieren atención inmediata
   */
  error: (message: string, meta?: Record<string, any>) => {
    logger.error(message, meta);
  },

  /**
   * Log de warning - Situaciones que deberían revisarse pero no rompen la app
   */
  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn(message, meta);
  },

  /**
   * Log de info - Información general sobre el funcionamiento de la app
   */
  info: (message: string, meta?: Record<string, any>) => {
    logger.info(message, meta);
  },

  /**
   * Log HTTP - Peticiones HTTP y respuestas
   */
  http: (message: string, meta?: Record<string, any>) => {
    logger.http(message, meta);
  },

  /**
   * Log de debug - Información detallada para debugging
   */
  debug: (message: string, meta?: Record<string, any>) => {
    logger.debug(message, meta);
  },
};

// Exportar logger de Winston por si se necesita acceso directo
export { logger };
export default log;
