import dotenv from 'dotenv';
import { readSecret, readSecretList } from './secrets';

dotenv.config();

// Nota: No importamos logger aquí para evitar dependencias circulares
// El logging del modo de configuración se hará en app.ts

export const config = {
  port: Number.parseInt(process.env.PORT || '3000', 10),
  bcvWebsiteUrl: process.env.BCV_WEBSITE_URL || 'https://www.bcv.org.ve/',
  mongoUri: readSecret(
    'MONGODB_URI',
    'MONGODB_URI_FILE',
    process.env.MONGODB_URI || 'mongodb://localhost:27017/bcv_service'
  ),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cronSchedule: process.env.CRON_SCHEDULE || '0 2,10,18 * * *', // Cada 8 horas: 2am, 10am, 6pm
  nodeEnv: process.env.NODE_ENV || 'development',
  saveToDatabase:
    process.env.SAVE_TO_DATABASE?.toLowerCase() !== 'false' &&
    process.env.SAVE_TO_DATABASE !== '0',

  // Nivel de logging: error | warn | info | http | debug
  logLevel: process.env.LOG_LEVEL || 'info',

  // API Keys para autenticación
  // Soporta múltiples keys separadas por coma en API_KEYS, o archivo con una key por línea en API_KEYS_FILE
  apiKeys: readSecretList('API_KEYS', 'API_KEYS_FILE', []),

  // Discord webhook URL para notificaciones
  discordWebhookUrl: readSecret(
    'DISCORD_WEBHOOK_URL',
    'DISCORD_WEBHOOK_URL_FILE',
    process.env.DISCORD_WEBHOOK_URL || ''
  ),

  // Webhook configuration for HTTP notifications
  webhookUrl: readSecret(
    'WEBHOOK_URL',
    'WEBHOOK_URL_FILE',
    process.env.WEBHOOK_URL || ''
  ),
  webhookSecret: readSecret(
    'WEBHOOK_SECRET',
    'WEBHOOK_SECRET_FILE',
    process.env.WEBHOOK_SECRET || ''
  ),
  webhookTimeout: Number.parseInt(process.env.WEBHOOK_TIMEOUT || '5000', 10),
  webhookMaxRetries: Number.parseInt(
    process.env.WEBHOOK_MAX_RETRIES || '3',
    10
  ),

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
    password: readSecret(
      'REDIS_PASSWORD',
      'REDIS_PASSWORD_FILE',
      process.env.REDIS_PASSWORD || ''
    ),
    db: Number.parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: Number.parseInt(
      process.env.REDIS_MAX_RETRIES || '3',
      10
    ),
    retryDelay: Number.parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
    connectTimeout: Number.parseInt(
      process.env.REDIS_CONNECT_TIMEOUT || '10000',
      10
    ),
    enabled: process.env.CACHE_ENABLED?.toLowerCase() !== 'false',
  },

  // Cache TTL Configuration (in seconds)
  cacheTTL: {
    latest: Number.parseInt(process.env.CACHE_TTL_LATEST || '300', 10), // 5 minutes
    history: Number.parseInt(process.env.CACHE_TTL_HISTORY || '86400', 10), // 24 hours
  },
};
