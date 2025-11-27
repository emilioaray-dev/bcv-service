# Problema: Webhooks de Cambio de Tasa NO se Envían

## Diagnóstico

Después de revisar el código del servicio bcv-service, he identificado el **problema raíz**:

### El Problema

El `SchedulerService` (`src/services/scheduler.service.ts`) **NO está enviando notificaciones via webhook** cuando detecta cambios en las tasas del BCV.

**Código actual (líneas 106-141 en scheduler.service.ts):**

```typescript
if (hasSignificantChange) {
  if (this.saveToDatabase) {
    const newRate = await this.cacheService.saveRate({...});

    // ✅ ESTO SE EJECUTA: Notificar vía WebSocket
    this.webSocketService.broadcastRateUpdate({
      timestamp: new Date().toISOString(),
      rates: newRate.rates,
      change,
      eventType: 'rate-update',
    });

    // ❌ ESTO FALTA: No hay llamada a webhookService
  }
}
```

**Lo que debería hacer:**

```typescript
if (hasSignificantChange) {
  if (this.saveToDatabase) {
    const newRate = await this.cacheService.saveRate({...});

    // ✅ Notificar vía WebSocket (ya existe)
    this.webSocketService.broadcastRateUpdate({...});

    // ✅ AGREGAR: Notificar vía Webhook (FALTA ESTO)
    await this.webhookService.sendRateUpdateNotification(
      newRate,
      previousRate
    );
  }
}
```

## ¿Por Qué No Funciona el Webhook?

1. **El scheduler solo notifica via WebSocket**, no via webhook
2. **El webhook service SÍ existe** y funciona correctamente en `src/services/webhook.service.ts`
3. **El webhook service tiene el método** `sendRateUpdateNotification()` listo para usar
4. **Pero nadie lo está llamando** cuando cambian las tasas

## Variables de Entorno Requeridas

Para que los webhooks funcionen (una vez arreglado el código), necesitas:

```env
# Webhook principal para cambios de tasa
WEBHOOK_URL=https://tu-webhook-url.com/webhook

# Webhook para estado del servicio (opcional, usa WEBHOOK_URL si no se define)
SERVICE_STATUS_WEBHOOK_URL=https://tu-webhook-url.com/service-status

# Webhook para notificaciones de deployment (opcional)
DEPLOYMENT_WEBHOOK_URL=https://tu-webhook-url.com/deployment

# Secret para firmar los webhooks (recomendado en producción)
WEBHOOK_SECRET=tu-secreto-super-seguro-aqui

# Timeout y reintentos
WEBHOOK_TIMEOUT=5000
WEBHOOK_MAX_RETRIES=3
```

## Solución

### Opción 1: Modificar scheduler.service.ts (Recomendado)

Agregar la inyección del webhook service y llamarlo cuando haya cambios:

**1. Agregar al constructor:**
```typescript
constructor(
  @inject(TYPES.BCVService) private bcvService: IBCVService,
  @inject(TYPES.CacheService) private cacheService: ICacheService,
  @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService,
  @inject(TYPES.MetricsService) private metricsService: IMetricsService,
  @inject(TYPES.WebhookService) private webhookService: IWebhookService, // ⭐ AGREGAR ESTO
  @inject(TYPES.Config) config: { ... }
) { ... }
```

**2. Modificar el método updateRate():**
```typescript
if (hasSignificantChange) {
  if (this.saveToDatabase) {
    const newRate = await this.cacheService.saveRate({
      rates: currentData.rates,
      date: currentData.date,
      source: 'bcv',
    });

    log.info('Tasa actualizada', {
      usdRate: getCurrencyRate(newRate, 'USD'),
      date: newRate.date,
      detailedRates: newRate.rates,
    });

    // Notificar a los clientes WebSocket
    const newUsdRate = getCurrencyRate(newRate, 'USD');
    const change = previousRate ? newUsdRate - previousUsdRate : 0;
    this.webSocketService.broadcastRateUpdate({
      timestamp: new Date().toISOString(),
      rates: newRate.rates,
      change,
      eventType: 'rate-update',
    });

    // ⭐ AGREGAR: Enviar notificación via webhook
    try {
      await this.webhookService.sendRateUpdateNotification(
        newRate,
        previousRate
      );
      log.info('Webhook de cambio de tasa enviado exitosamente');
    } catch (error) {
      log.error('Error enviando webhook de cambio de tasa', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Métrica de actualización exitosa
    this.metricsService.incrementBCVUpdateSuccess();
  }
}
```

### Opción 2: Script de Diagnóstico

Si tienes acceso SSH al servidor, ejecuta:

```bash
cd /path/to/bcv-service
chmod +x diagnose-service.sh
./diagnose-service.sh
```

Este script verificará:
- ✅ Si el servicio está corriendo
- ✅ Si las variables de entorno están configuradas
- ✅ Si el cron está ejecutándose
- ✅ Si hay logs de webhooks
- ✅ Si hay errores en los logs

## Verificación Post-Fix

Después de implementar la solución, verifica que funcione:

1. **Revisa los logs del servicio:**
   ```bash
   docker logs -f bcv-service
   ```

2. **Busca estas líneas en los logs:**
   ```
   info: Tarea programada configurada {"schedule":"0 * * * *"}
   info: Ejecutando tarea programada para actualizar tasa de cambio
   info: Tasa actualizada {"usdRate":36.5, ...}
   info: Webhook delivered successfully {"url":"...", "statusCode":200, ...}
   ```

3. **Si ves esto, el problema está resuelto:**
   ```
   info: Webhook delivered successfully
   ```

4. **Si ves esto, revisa la configuración:**
   ```
   warn: Webhook URL not configured - Webhook notifications disabled
   ```

## Comandos Útiles para SSH

```bash
# Ver logs en tiempo real
docker logs -f bcv-service

# Ver últimas 100 líneas de logs
docker logs --tail 100 bcv-service

# Buscar menciones de webhook en los logs
docker logs bcv-service | grep -i webhook

# Verificar variables de entorno del contenedor
docker exec bcv-service printenv | grep WEBHOOK

# Reiniciar el servicio
docker-compose restart bcv-service

# Ver estado del servicio
docker-compose ps
```

## Resumen

**El problema:** El código del scheduler NO llama al webhook service cuando detecta cambios en las tasas.

**La solución:** Agregar `await this.webhookService.sendRateUpdateNotification()` en el método `updateRate()` del scheduler.

**Variables necesarias:** `WEBHOOK_URL` debe estar configurada en el `.env` o en el contenedor de Docker.

**Verificación:** Los logs deben mostrar `"Webhook delivered successfully"` cuando hay cambios en las tasas.
