#!/usr/bin/env node
/**
 * Script de Prueba para la Integración con Discord
 *
 * Este script permite probar la funcionalidad de envío de notificaciones a Discord
 * obteniendo datos reales de tasas del BCV antes de enviar la notificación.
 *
 * Uso:
 *   npx tsx scripts/test-discord-notification.ts
 *
 * Requisitos:
 *   - El archivo de secret con el webhook de Discord debe existir
 *   - Las variables de entorno deben estar configuradas correctamente
 *
 * El script obtendrá datos reales de tasas del BCV y los enviará al canal de Discord configurado.
 */

import 'reflect-metadata';
import { Server as HttpServer } from 'node:http';
import { createContainer } from '../src/config/inversify.config';
import { TYPES } from '../src/config/types';

async function main() {
  // Crear un contenedor con todas las dependencias necesarias
  const server = new HttpServer();
  const container = createContainer(server);

  // Obtener los servicios necesarios
  const discordService = container.get(TYPES.DiscordService);
  const bcvService = container.get(TYPES.BCVService);

  try {
    // Obtener las tasas reales desde el BCV sin enviar notificaciones automáticas
    const realRateData = await bcvService.getCurrentRate(false);

    if (!realRateData) {
      console.error('❌ No se pudieron obtener las tasas del BCV');
      process.exit(1);
    }
    if (realRateData.rates && Array.isArray(realRateData.rates)) {
      realRateData.rates.forEach((_rate: { currency: string; rate: number; name: string }) => {});
    } else {
    }

    // Enviar las tasas reales a Discord
    await discordService.sendRateUpdateNotification(realRateData);
  } catch (error) {
    console.error(
      '❌ Error al obtener tasas del BCV o al enviar notificación a Discord:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1); // Salir con código de error
  }
}

main().catch((error) => {
  console.error('❌ Error en la ejecución del script:', error);
  process.exit(1);
});
