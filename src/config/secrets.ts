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
 * Lee múltiples secretos desde un archivo (uno por línea)
 * Útil para listas de API keys
 *
 * @param envVar - Nombre de la variable de entorno que contiene los secretos separados por coma
 * @param filePathVar - Nombre de la variable de entorno que contiene la ruta al archivo de secretos
 * @param defaultValue - Array de valores por defecto si no se encuentra el secreto
 * @returns Array de valores
 */
export function readSecretList(
  envVar: string,
  filePathVar: string,
  defaultValue: string[] = []
): string[] {
  // Primero intentar leer desde variable de entorno (separada por comas)
  const envValue = process.env[envVar];
  if (envValue) {
    return envValue.split(',').map(v => v.trim()).filter(v => v.length > 0);
  }

  // Luego intentar leer desde archivo (Docker Secrets)
  const filePath = process.env[filePathVar];
  if (filePath) {
    try {
      const resolvedPath = resolve(filePath);
      const content = readFileSync(resolvedPath, 'utf-8');
      const secrets = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (secrets.length > 0) {
        console.log(`✓ Secretos cargados desde archivo: ${filePathVar} (${secrets.length} items)`);
        return secrets;
      }
    } catch (error) {
      console.error(`⚠️  Error leyendo secretos desde archivo ${filePath}:`, error);
    }
  }

  // Retornar valor por defecto
  if (defaultValue.length > 0) {
    console.warn(`⚠️  Usando valores por defecto para ${envVar}`);
  }

  return defaultValue;
}

/**
 * Verifica si se están usando secretos desde archivos (Docker Secrets)
 */
export function isUsingSecrets(): boolean {
  return !!(process.env.MONGODB_URI_FILE || process.env.API_KEYS_FILE);
}
