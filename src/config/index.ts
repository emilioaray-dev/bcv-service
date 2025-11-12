import dotenv from 'dotenv';
import { readSecret, isUsingSecrets } from './secrets';

dotenv.config();

// Mostrar modo de configuración
if (isUsingSecrets()) {
  console.log('🔐 Modo: Docker Secrets activado');
} else {
  console.log('⚙️  Modo: Variables de entorno estándar');
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  bcvWebsiteUrl: process.env.BCV_WEBSITE_URL || 'https://www.bcv.org.ve/',
  mongoUri: readSecret('MONGODB_URI', 'MONGODB_URI_FILE', process.env.MONGODB_URI || 'mongodb://localhost:27017/bcv_service'),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cronSchedule: process.env.CRON_SCHEDULE || '0 2,10,18 * * *', // Cada 8 horas: 2am, 10am, 6pm
  nodeEnv: process.env.NODE_ENV || 'development',
  saveToDatabase: process.env.SAVE_TO_DATABASE?.toLowerCase() !== 'false' && process.env.SAVE_TO_DATABASE !== '0',
};