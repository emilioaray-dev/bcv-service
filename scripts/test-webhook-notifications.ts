#!/usr/bin/env node
/**
 * Script de Prueba para Notificaciones de Discord
 *
 * Este script permite probar las notificaciones de:
 * - Estado del servicio (SERVICE_STATUS_WEBHOOK_URL)
 * - Deployment (DEPLOYMENT_WEBHOOK_URL)
 *
 * Uso:
 *   npx tsx scripts/test-webhook-notifications.ts [tipo]
 *
 * Tipos disponibles:
 *   - status: Enviar notificación de estado del servicio
 *   - deployment: Enviar notificación de deployment
 *   - all: Enviar ambas notificaciones (por defecto)
 *
 * Ejemplos:
 *   npx tsx scripts/test-webhook-notifications.ts status
 *   npx tsx scripts/test-webhook-notifications.ts deployment
 *   npx tsx scripts/test-webhook-notifications.ts all
 */

import 'reflect-metadata';
import { Server as HttpServer } from 'node:http';
import { createContainer } from '../src/config/inversify.config';
import { TYPES } from '../src/config/types';
import type { IDiscordStatusService } from '../src/interfaces/IDiscordStatusService';
import type { IDiscordDeploymentService } from '../src/interfaces/IDiscordDeploymentService';

async function testServiceStatusNotification(
  discordStatusService: IDiscordStatusService
) {
  console.log('\n🔔 Probando notificación de estado del servicio...');

  try {
    await discordStatusService.sendStatusNotification(
      'service.healthy',
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 12345,
        checks: {
          mongodb: {
            status: 'healthy',
            message: 'MongoDB connection is healthy',
          },
          redis: {
            status: 'healthy',
            message: 'Redis is operational',
            details: {
              enabled: true,
              connected: true,
            },
          },
          scheduler: {
            status: 'healthy',
            message: 'Scheduler is running',
          },
          websocket: {
            status: 'healthy',
            message: 'WebSocket service is healthy',
            details: {
              connectedClients: 5,
            },
          },
        },
      },
      'degraded' // Previous status
    );

    console.log('✅ Notificación de estado del servicio enviada exitosamente');
  } catch (error) {
    console.error('❌ Error al enviar notificación de estado del servicio:', error);
  }
}

async function testDeploymentNotification(
  discordDeploymentService: IDiscordDeploymentService
) {
  console.log('\n🚀 Probando notificación de deployment...');

  try {
    await discordDeploymentService.sendDeploymentNotification(
      'deployment.success',
      {
        deploymentId: 'test-' + Date.now(),
        environment: 'production',
        version: '2.1.0',
        duration: 45000, // 45 seconds
        message: 'Deployment completed successfully',
      }
    );

    console.log('✅ Notificación de deployment enviada exitosamente');
  } catch (error) {
    console.error('❌ Error al enviar notificación de deployment:', error);
  }
}

async function main() {
  const testType = process.argv[2] || 'all';

  if (!['status', 'deployment', 'all'].includes(testType)) {
    console.error('❌ Tipo de prueba inválido. Use: status, deployment, o all');
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Script de Prueba para Notificaciones de Discord');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Crear un contenedor con todas las dependencias necesarias
  const server = new HttpServer();
  const container = createContainer(server);

  // Obtener los servicios de Discord
  const discordStatusService = container.get<IDiscordStatusService>(
    TYPES.DiscordStatusService
  );
  const discordDeploymentService = container.get<IDiscordDeploymentService>(
    TYPES.DiscordDeploymentService
  );

  try {
    if (testType === 'status' || testType === 'all') {
      await testServiceStatusNotification(discordStatusService);
    }

    if (testType === 'deployment' || testType === 'all') {
      await testDeploymentNotification(discordDeploymentService);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Pruebas completadas');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ Error en la ejecución del script:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error fatal en la ejecución del script:', error);
  process.exit(1);
});
