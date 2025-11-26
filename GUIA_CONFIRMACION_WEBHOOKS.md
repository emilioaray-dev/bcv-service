# Guía de Confirmación y Notificaciones de Webhooks

## Problema 1: ¿Cómo confirmar que un webhook fue enviado?

### Soluciones Actuales (Ya Implementadas)

#### 1. **Verificar en Logs**

```bash
# Ver webhooks exitosos
grep "Webhook delivered successfully" logs/combined.log

# Ver webhooks fallidos
grep "Webhook delivery failed" logs/error.log

# Ver últimos 20 webhooks
tail -n 20 logs/combined.log | grep -i webhook
```

#### 2. **Consultar Métricas de Prometheus**

```bash
# Ver métricas de webhooks
curl http://localhost:3000/metrics | grep webhook

# Ejemplos de métricas disponibles:
# webhook_success_total{event="rate.changed"} 150
# webhook_failure_total{event="rate.changed"} 5
# webhook_duration_seconds_bucket{event="rate.changed",le="1"} 145
```

#### 3. **Valor de Retorno (Solo en WebhookService)**

El `WebhookService` ya retorna confirmación:

```typescript
const result = await webhookService.sendRateUpdateNotification(rate);
console.log(result);
// {
//   success: true,
//   url: "https://example.com/webhook",
//   statusCode: 200,
//   attempt: 1,
//   duration: 250
// }
```

---

### Nueva Solución: Historial de Webhooks en Base de Datos

#### Paso 1: Registrar el servicio en InversifyJS

```typescript
// src/config/types.ts
export const TYPES = {
  // ... existing types
  WebhookDeliveryService: Symbol.for('WebhookDeliveryService'),
  LifecycleNotifierService: Symbol.for('LifecycleNotifierService'),
};
```

```typescript
// src/config/inversify.config.ts
import { WebhookDeliveryService } from '@/services/webhook-delivery.service';
import { LifecycleNotifierService } from '@/services/lifecycle-notifier.service';

export function createContainer(server: Server): Container {
  const container = new Container();

  // ... existing bindings

  // Nuevos servicios
  container.bind<IWebhookDeliveryService>(TYPES.WebhookDeliveryService)
    .to(WebhookDeliveryService)
    .inSingletonScope();

  container.bind<LifecycleNotifierService>(TYPES.LifecycleNotifierService)
    .to(LifecycleNotifierService)
    .inSingletonScope();

  return container;
}
```

#### Paso 2: Actualizar WebhookService para guardar historial

```typescript
// src/services/webhook.service.ts
@injectable()
export class WebhookService implements IWebhookService {
  constructor(
    @inject(TYPES.MetricsService)
    private readonly metricsService: IMetricsService,
    @inject(TYPES.WebhookDeliveryService)
    private readonly deliveryService: IWebhookDeliveryService // NUEVO
  ) {
    // ... existing code
  }

  private async sendWithRetry(
    payload: WebhookPayload,
    targetUrl?: string
  ): Promise<WebhookDeliveryResult> {
    const webhookUrl = targetUrl || this.webhookConfig.url;
    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.webhookConfig.maxRetries; attempt++) {
      try {
        const result = await this.sendWebhook(payload, attempt, webhookUrl);
        const duration = Date.now() - startTime;

        // Registrar métrica
        this.metricsService.recordWebhookSuccess(payload.event, duration);

        // NUEVO: Guardar en base de datos
        await this.deliveryService.recordDelivery({
          event: payload.event,
          url: this.maskUrl(webhookUrl),
          payload,
          success: true,
          statusCode: result.statusCode,
          attempts: attempt,
          duration,
        });

        return { ...result, duration };
      } catch (error) {
        lastError = error as Error;
        // ... retry logic
      }
    }

    const duration = Date.now() - startTime;

    // Registrar métrica de fallo
    this.metricsService.recordWebhookFailure(payload.event, duration);

    // NUEVO: Guardar fallo en base de datos
    await this.deliveryService.recordDelivery({
      event: payload.event,
      url: this.maskUrl(webhookUrl),
      payload,
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: this.webhookConfig.maxRetries,
      duration,
    });

    return {
      success: false,
      url: webhookUrl,
      error: lastError?.message || 'Unknown error',
      attempt: this.webhookConfig.maxRetries,
      duration,
    };
  }
}
```

#### Paso 3: Crear endpoint para consultar historial

```typescript
// src/controllers/webhook.controller.ts
import { Router, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { TYPES } from '@/config/types';
import type { IWebhookDeliveryService } from '@/interfaces/IWebhookDeliveryService';

@injectable()
export class WebhookController {
  public readonly router: Router;

  constructor(
    @inject(TYPES.WebhookDeliveryService)
    private deliveryService: IWebhookDeliveryService
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // GET /api/v1/webhooks/history - Últimas entregas
    this.router.get('/history', this.getHistory.bind(this));

    // GET /api/v1/webhooks/history/:event - Entregas por evento
    this.router.get('/history/:event', this.getHistoryByEvent.bind(this));

    // GET /api/v1/webhooks/stats - Estadísticas
    this.router.get('/stats', this.getStats.bind(this));

    // GET /api/v1/webhooks/stats/:event - Estadísticas por evento
    this.router.get('/stats/:event', this.getStatsByEvent.bind(this));
  }

  private async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number.parseInt(req.query.limit as string) || 50;
      const deliveries = await this.deliveryService.getRecentDeliveries(limit);

      res.json({
        success: true,
        data: deliveries,
        count: deliveries.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook history',
      });
    }
  }

  private async getHistoryByEvent(req: Request, res: Response): Promise<void> {
    try {
      const { event } = req.params;
      const limit = Number.parseInt(req.query.limit as string) || 50;
      const deliveries = await this.deliveryService.getDeliveriesByEvent(
        event,
        limit
      );

      res.json({
        success: true,
        data: deliveries,
        count: deliveries.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook history by event',
      });
    }
  }

  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const since = req.query.since
        ? new Date(req.query.since as string)
        : undefined;

      const stats = await this.deliveryService.getDeliveryStats(since);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook stats',
      });
    }
  }

  private async getStatsByEvent(req: Request, res: Response): Promise<void> {
    try {
      const { event } = req.params;
      const since = req.query.since
        ? new Date(req.query.since as string)
        : undefined;

      const stats = await this.deliveryService.getDeliveryStatsByEvent(
        event,
        since
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook stats by event',
      });
    }
  }
}
```

#### Paso 4: Registrar el controller

```typescript
// src/Application.ts
private registerRoutes(): void {
  // ... existing routes

  // Webhook history routes (protegidas con API key)
  const webhookController = this.container.get<WebhookController>(
    TYPES.WebhookController
  );
  this.app.use(
    '/api/v1/webhooks',
    authMiddleware,
    webhookController.router
  );
}
```

---

## Problema 2: Notificar cuando el servidor se apaga/inicia

### Solución: Lifecycle Notifier Service (Ya Creado)

#### Paso 1: Inicializar en Application.ts

```typescript
// src/Application.ts
export class Application {
  private lifecycleNotifier!: LifecycleNotifierService;

  async initialize(): Promise<void> {
    try {
      // ... existing initialization

      // Inicializar lifecycle notifier
      this.lifecycleNotifier = this.container.get<LifecycleNotifierService>(
        TYPES.LifecycleNotifierService
      );

      // ... rest of initialization

      // Al final, notificar que el servidor inició
      await this.lifecycleNotifier.notifyServerStarted();

      log.info('Application initialized successfully');
    } catch (error) {
      log.error('Error during application initialization', { error });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    log.info('Iniciando apagado del servidor...');

    try {
      // IMPORTANTE: Notificar PRIMERO antes de cerrar servicios
      await this.lifecycleNotifier?.notifyServerShutdown('Graceful shutdown');

      // Luego cerrar servicios
      await this.closeServices();

      log.info('Servidor apagado exitosamente');
    } catch (error) {
      log.error('Error durante el apagado del servidor', { error });
      throw error;
    }
  }
}
```

#### Paso 2: Configurar heartbeat (opcional)

```typescript
// src/Application.ts
async initialize(): Promise<void> {
  // ... existing code

  // Enviar heartbeat cada 5 minutos (opcional)
  setInterval(
    () => {
      this.lifecycleNotifier.sendHeartbeat().catch((error) => {
        log.error('Error sending heartbeat', { error });
      });
    },
    5 * 60 * 1000 // 5 minutos
  );
}
```

---

## Casos de Uso: Consultar Webhooks

### 1. Ver últimos webhooks enviados

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/v1/webhooks/history?limit=10
```

Respuesta:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "event": "rate.changed",
      "url": "https://discord.com/***",
      "success": true,
      "statusCode": 200,
      "attempts": 1,
      "duration": 245,
      "timestamp": "2025-11-26T10:30:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "event": "service.healthy",
      "url": "https://discord.com/***",
      "success": false,
      "error": "Network timeout",
      "attempts": 3,
      "duration": 15230,
      "timestamp": "2025-11-26T10:25:00.000Z"
    }
  ],
  "count": 2
}
```

### 2. Ver estadísticas generales

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/v1/webhooks/stats
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "totalDeliveries": 150,
    "successfulDeliveries": 145,
    "failedDeliveries": 5,
    "successRate": 96.67,
    "averageDuration": 312.45,
    "lastDelivery": "2025-11-26T10:30:00.000Z",
    "lastSuccess": "2025-11-26T10:30:00.000Z",
    "lastFailure": "2025-11-26T09:15:00.000Z"
  }
}
```

### 3. Ver estadísticas de un evento específico

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/v1/webhooks/stats/rate.changed
```

### 4. Ver historial de un evento desde una fecha

```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/v1/webhooks/stats?since=2025-11-20T00:00:00Z"
```

---

## Monitoreo Externo para Detectar Caídas Inesperadas

Para detectar cuando el servidor se cae SIN poder notificar (crash, power loss, etc.), necesitas monitoreo externo:

### Opción 1: UptimeRobot (Gratis)

1. Crear cuenta en https://uptimerobot.com
2. Agregar monitor de tipo "HTTP(S)"
3. URL: `https://tu-servidor.com/health`
4. Intervalo: 5 minutos
5. Alertas: Email/SMS/Webhook cuando el servidor esté down

### Opción 2: BetterUptime (Más features)

1. Crear cuenta en https://betteruptime.com
2. Crear monitor para tu endpoint `/health`
3. Configurar notificaciones a Discord/Slack/PagerDuty
4. Incluye status page público

### Opción 3: Healthchecks.io + Cron

```typescript
// Enviar ping periódico a healthchecks.io
setInterval(async () => {
  try {
    await axios.get(`https://hc-ping.com/${YOUR_CHECK_UUID}`);
  } catch (error) {
    log.error('Failed to send healthcheck ping', { error });
  }
}, 60000); // Cada minuto
```

Si el ping no llega, healthchecks.io te notifica.

---

## Resumen de Soluciones

| Problema | Solución | Estado |
|----------|----------|--------|
| Confirmar webhook enviado | Logs + Métricas | ✅ Ya existe |
| Historial de webhooks | MongoDB + API endpoint | 🆕 Implementar |
| Notificar startup | LifecycleNotifier | 🆕 Implementar |
| Notificar shutdown | LifecycleNotifier + SIGTERM/SIGINT | 🆕 Implementar |
| Detectar crash inesperado | Monitoreo externo (UptimeRobot) | 📋 Configurar |
| Heartbeat periódico | LifecycleNotifier.sendHeartbeat() | 🆕 Opcional |

---

## Orden de Implementación Recomendado

1. ✅ **Lifecycle Notifier** (1-2 horas)
   - Notificaciones de inicio/apagado
   - Handlers de SIGTERM/SIGINT
   - Integrar en Application.ts

2. ✅ **Webhook Delivery Tracking** (2-3 horas)
   - Crear modelo y servicio
   - Integrar en WebhookService
   - Crear endpoints de consulta

3. 📋 **Monitoreo Externo** (30 minutos)
   - Configurar UptimeRobot o similar
   - Configurar alertas a Discord/Email

4. 🔄 **Heartbeat Periódico** (15 minutos) - Opcional
   - Solo si necesitas confirmación frecuente

---

## Testing

```typescript
// test/integration/webhook-tracking.test.ts
describe('Webhook Delivery Tracking', () => {
  it('should record successful webhook delivery', async () => {
    const result = await webhookService.sendRateUpdateNotification(mockRate);
    expect(result.success).toBe(true);

    const deliveries = await deliveryService.getRecentDeliveries(1);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].success).toBe(true);
    expect(deliveries[0].event).toBe('rate.changed');
  });

  it('should record failed webhook delivery', async () => {
    // Mock axios to fail
    mockedAxios.post.mockRejectedValue(new Error('Network error'));

    const result = await webhookService.sendRateUpdateNotification(mockRate);
    expect(result.success).toBe(false);

    const deliveries = await deliveryService.getRecentDeliveries(1);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].success).toBe(false);
    expect(deliveries[0].error).toContain('Network error');
  });
});
```

---

## Variables de Entorno Adicionales

```bash
# .env
# Webhooks existentes
WEBHOOK_URL=https://your-webhook.com
SERVICE_STATUS_WEBHOOK_URL=https://discord.com/api/webhooks/...
DEPLOYMENT_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Nuevas (opcionales)
LIFECYCLE_NOTIFICATIONS_ENABLED=true
HEARTBEAT_INTERVAL_MINUTES=5  # 0 para deshabilitar
```
