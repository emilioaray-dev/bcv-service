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
import { Container } from 'inversify';
import { createContainer } from '../src/config/inversify.config';
import { config } from '../src/config';
import { TYPES } from '../src/config/types';
import { Server as HttpServer } from 'http';

async function main() {
  console.log('🚀 Iniciando prueba de notificación a Discord con datos reales...');

  // Crear un contenedor con todas las dependencias necesarias
  const server = new HttpServer();
  const container = createContainer(server);

  // Obtener los servicios necesarios
  const discordService = container.get(TYPES.DiscordService);
  const bcvService = container.get(TYPES.BCVService);

  try {
    console.log('📊 Obteniendo tasas reales del BCV...');

    // Obtener las tasas reales desde el BCV sin enviar notificaciones automáticas
    const realRateData = await bcvService.getCurrentRate(false);

    if (!realRateData) {
      console.error('❌ No se pudieron obtener las tasas del BCV');
      process.exit(1);
    }

    console.log('📝 Enviando tasas reales a Discord...');
    // Formatear las tasas para mejor lectura en consola
    console.log('📊 Tasas obtenidas del BCV:');
    if (realRateData.rates && Array.isArray(realRateData.rates)) {
      realRateData.rates.forEach((rate: any) => {
        console.log(`  - ${rate.name} (${rate.currency}): ${rate.rate?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      });
    } else {
      console.log(`  - Dólar (USD): ${realRateData.rate?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }

    // Enviar las tasas reales a Discord
    await discordService.sendRateUpdateNotification(realRateData);

    console.log('✅ Notificación con tasas reales enviada exitosamente a Discord!');
    console.log('🎉 La integración con Discord está funcionando correctamente.');
  } catch (error) {
    console.error('❌ Error al obtener tasas del BCV o al enviar notificación a Discord:', error instanceof Error ? error.message : String(error));
    process.exit(1); // Salir con código de error
  }

  console.log('✅ Prueba completada exitosamente.');
}

main().catch(error => {
  console.error('❌ Error en la ejecución del script:', error);
  process.exit(1);
});