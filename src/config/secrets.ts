import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Lee un secreto desde un archivo
 * Útil para Docker Secrets que se montan en /run/secrets/
 *
 * @param envVar - Nombre de la variable de entorno que contiene el secreto
 * @param filePathVar - Nombre de la variable de entorno que contiene la ruta al archivo de secreto
 * @param defaultValue - Valor por defecto si no se encuentra el secreto
 * @returns El valor del secreto
 */
export function readSecret(
  envVar: string,
  filePathVar: string,
  defaultValue = ''
): string {
  // Primero intentar leer desde variable de entorno directa
  const envValue = process.env[envVar];
  if (envValue) {
    return envValue;
  }

  // Luego intentar leer desde archivo (Docker Secrets)
  const filePath = process.env[filePathVar];
  if (filePath) {
    try {
      const resolvedPath = resolve(filePath);
      const secret = readFileSync(resolvedPath, 'utf-8').trim();
      if (secret) {
        console.log(`✓ Secreto cargado desde archivo: ${filePathVar}`);
        return secret;
      }
    } catch (error) {
      console.error(`⚠️  Error leyendo secreto desde archivo ${filePath}:`, error);
    }
  }

  // Retornar valor por defecto
  if (defaultValue) {
    console.warn(`⚠️  Usando valor por defecto para ${envVar}`);
  }

  return defaultValue;
}

/**
 * Verifica si se están usando secretos desde archivos (Docker Secrets)
 */
export function isUsingSecrets(): boolean {
  return !!(process.env.MONGODB_URI_FILE);
}
