# Guía de Cola de Webhooks con Reintentos

## Problema Resuelto ✅

Cuando un webhook falla después de 3 intentos inmediatos, ahora:
1. ✅ Se guarda en una **cola persistente** en MongoDB
2. ✅ Se **reintenta automáticamente** cada X minutos (backoff exponencial)
3. ✅ **Sobrevive a reinicios** del servidor
4. ✅ Tiene un **máximo de intentos** (5 por defecto) para evitar loops infinitos
5. ✅ **Limpieza automática** de webhooks completados antiguos

---

## Arquitectura

```
Webhook enviado
     ↓
¿Éxito inmediato? → SÍ → ✅ Listo
     ↓ NO
Reintentar 3 veces
     ↓
¿Éxito? → SÍ → ✅ Listo
     ↓ NO
📥 Agregar a COLA PERSISTENTE
     ↓
⏰ Worker procesa cada 1 minuto
     ↓
Reintenta con backoff exponencial:
  - Intento 1: +5 min
  - Intento 2: +10 min
  - Intento 3: +20 min
  - Intento 4: +40 min
  - Intento 5: +60 min (max)
     ↓
¿Éxito? → SÍ → ✅ Completado
     ↓ NO (después de 5 intentos)
❌ Marcado como FAILED permanentemente
```

---

## Paso 1: Registrar el servicio

```typescript
// src/config/types.ts
export const TYPES = {
  // ... existing types
  WebhookQueueService: Symbol.for('WebhookQueueService'),
};

// src/config/inversify.config.ts
import { WebhookQueueService } from '@/services/webhook-queue.service';

export function createContainer(server: Server): Container {
  const container = new Container();

  // ... existing bindings

  container
    .bind<IWebhookQueueService>(TYPES.WebhookQueueService)
    .to(WebhookQueueService)
    .inSingletonScope();

  return container;
}
```

---

## Paso 2: Integrar con WebhookService existente

Actualiza `WebhookService` para que agregue webhooks fallidos a la cola:

```typescript
// src/services/webhook.service.ts
@injectable()
export class WebhookService implements IWebhookService {
  constructor(
    @inject(TYPES.MetricsService)
    private readonly metricsService: IMetricsService,
    @inject(TYPES.WebhookDeliveryService)
    private readonly deliveryService: IWebhookDeliveryService,
    @inject(TYPES.WebhookQueueService)
    private readonly queueService: IWebhookQueueService // NUEVO
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

    // Intentar 3 veces con exponential backoff
    for (let attempt = 1; attempt <= this.webhookConfig.maxRetries; attempt++) {
      try {
        const result = await this.sendWebhook(payload, attempt, webhookUrl);
        const duration = Date.now() - startTime;

        this.metricsService.recordWebhookSuccess(payload.event, duration);

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

    // ❌ Falló después de 3 intentos inmediatos
    this.metricsService.recordWebhookFailure(payload.event, duration);

    await this.deliveryService.recordDelivery({
      event: payload.event,
      url: this.maskUrl(webhookUrl),
      payload,
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: this.webhookConfig.maxRetries,
      duration,
    });

    // 🆕 AGREGAR A LA COLA para reintentar más tarde
    try {
      const queueId = await this.queueService.enqueue(
        payload.event,
        webhookUrl,
        payload,
        {
          maxAttempts: 5, // 5 intentos adicionales
          priority: this.getEventPriority(payload.event),
          delaySeconds: 300, // Esperar 5 minutos antes del primer reintento
        }
      );

      log.warn('Webhook queued for retry after immediate failures', {
        queueId,
        event: payload.event,
        url: this.maskUrl(webhookUrl),
      });
    } catch (queueError) {
      log.error('Failed to queue webhook for retry', {
        error: queueError,
        event: payload.event,
      });
    }

    return {
      success: false,
      url: webhookUrl,
      error: lastError?.message || 'Unknown error',
      attempt: this.webhookConfig.maxRetries,
      duration,
    };
  }

  /**
   * Determina la prioridad del evento para la cola
   */
  private getEventPriority(
    event: string
  ): 'high' | 'normal' | 'low' {
    // Eventos críticos tienen alta prioridad
    if (event === 'service.unhealthy' || event === 'deployment.failure') {
      return 'high';
    }

    // Eventos de deployment tienen prioridad normal
    if (event.startsWith('deployment.')) {
      return 'normal';
    }

    // Rate changes son prioridad baja (no críticos)
    return 'low';
  }
}
```

---

## Paso 3: Iniciar el Worker en Application.ts

```typescript
// src/Application.ts
export class Application {
  private webhookQueueService!: IWebhookQueueService;

  async initialize(): Promise<void> {
    try {
      // ... existing initialization

      // Obtener servicio de cola
      this.webhookQueueService = this.container.get<IWebhookQueueService>(
        TYPES.WebhookQueueService
      );

      // Iniciar worker que procesa la cola cada 1 minuto
      this.webhookQueueService.startWorker(60); // 60 segundos

      log.info('Webhook queue worker started');

      // ... rest of initialization
    } catch (error) {
      log.error('Error during application initialization', { error });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    log.info('Iniciando apagado del servidor...');

    try {
      // Detener worker primero
      this.webhookQueueService?.stopWorker();

      // Luego cerrar otros servicios
      await this.closeServices();

      log.info('Servidor apagado exitosamente');
    } catch (error) {
      log.error('Error durante el apagado del servidor', { error });
      throw error;
    }
  }
}
```

---

## Paso 4: Crear endpoints de monitoreo (Opcional)

```typescript
// src/controllers/webhook.controller.ts
export class WebhookController {
  constructor(
    @inject(TYPES.WebhookDeliveryService)
    private deliveryService: IWebhookDeliveryService,
    @inject(TYPES.WebhookQueueService)
    private queueService: IWebhookQueueService // NUEVO
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // ... existing routes

    // GET /api/v1/webhooks/queue/stats - Estadísticas de la cola
    this.router.get('/queue/stats', this.getQueueStats.bind(this));

    // GET /api/v1/webhooks/queue/pending - Webhooks pendientes
    this.router.get('/queue/pending', this.getPendingWebhooks.bind(this));

    // POST /api/v1/webhooks/queue/process - Forzar procesamiento
    this.router.post('/queue/process', this.forceProcessQueue.bind(this));

    // POST /api/v1/webhooks/queue/clean - Limpiar completados antiguos
    this.router.post('/queue/clean', this.cleanQueue.bind(this));
  }

  private async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.queueService.getQueueStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get queue stats',
      });
    }
  }

  private async getPendingWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number.parseInt(req.query.limit as string) || 20;
      const webhooks = await this.queueService.getPendingWebhooks(limit);

      res.json({
        success: true,
        data: webhooks,
        count: webhooks.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get pending webhooks',
      });
    }
  }

  private async forceProcessQueue(req: Request, res: Response): Promise<void> {
    try {
      await this.queueService.processQueue();

      res.json({
        success: true,
        message: 'Queue processing triggered',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process queue',
      });
    }
  }

  private async cleanQueue(req: Request, res: Response): Promise<void> {
    try {
      const days = Number.parseInt(req.query.days as string) || 7;
      const count = await this.queueService.cleanOldWebhooks(days);

      res.json({
        success: true,
        message: `Cleaned ${count} old webhooks`,
        count,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to clean queue',
      });
    }
  }
}
```

---

## Casos de Uso

### 1. Ver estadísticas de la cola

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/v1/webhooks/queue/stats
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "processing": 1,
    "failed": 3,
    "completed": 142,
    "total": 151
  }
}
```

### 2. Ver webhooks pendientes

```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/v1/webhooks/queue/pending?limit=10"
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "event": "rate.changed",
      "url": "https://discord.com/api/webhooks/...",
      "status": "pending",
      "attempts": 2,
      "maxAttempts": 5,
      "nextAttemptAt": "2025-11-26T11:00:00.000Z",
      "error": "Network timeout",
      "createdAt": "2025-11-26T10:00:00.000Z",
      "metadata": {
        "priority": "low"
      }
    }
  ],
  "count": 1
}
```

### 3. Forzar procesamiento de la cola

```bash
curl -X POST -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/v1/webhooks/queue/process
```

### 4. Limpiar webhooks completados > 7 días

```bash
curl -X POST -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/v1/webhooks/queue/clean?days=7"
```

---

## Configuración (Variables de Entorno)

```bash
# .env

# Intervalo de procesamiento de la cola (segundos)
WEBHOOK_QUEUE_WORKER_INTERVAL=60  # 1 minuto (default)

# Máximo de intentos en la cola
WEBHOOK_QUEUE_MAX_ATTEMPTS=5

# Días antes de limpiar webhooks completados
WEBHOOK_QUEUE_CLEANUP_DAYS=7
```

---

## Monitoreo y Alertas

### Métricas Importantes

1. **Webhooks pendientes** - Si crece mucho, hay un problema
2. **Webhooks fallidos permanentemente** - Revisar logs
3. **Tiempo promedio en cola** - Detectar problemas de procesamiento

### Alertas Recomendadas

```yaml
# Alertas en Prometheus/Grafana
- alert: WebhookQueueBacklog
  expr: webhook_queue_pending > 100
  for: 10m
  annotations:
    summary: "Webhook queue backlog is high"
    description: "{{ $value }} webhooks pending in queue"

- alert: WebhookPermanentFailures
  expr: rate(webhook_queue_failed_total[5m]) > 0.1
  for: 5m
  annotations:
    summary: "High rate of permanent webhook failures"
```

---

## Ventajas de esta Solución

| Característica | Antes | Ahora |
|----------------|-------|-------|
| Reintentos inmediatos | ✅ 3 intentos | ✅ 3 intentos |
| Reintentos diferidos | ❌ No | ✅ Hasta 5 intentos más |
| Sobrevive a restart | ❌ No | ✅ Sí (MongoDB) |
| Backoff exponencial | ✅ En reintentos inmediatos | ✅ También en cola |
| Limpieza automática | ❌ No | ✅ Cada 24 horas |
| Priorización | ❌ No | ✅ Alta/Normal/Baja |
| Monitoreo | ✅ Logs/Métricas | ✅ + API endpoints |

---

## Escenario de Ejemplo

### Situación: Discord está down por 30 minutos

**Sin cola:**
- ❌ Webhook falla después de 3 intentos
- ❌ Se pierde la notificación
- ❌ Nunca llega a Discord

**Con cola:**
1. ✅ Webhook falla después de 3 intentos inmediatos
2. ✅ Se agrega a la cola persistente
3. ✅ Worker intenta cada X minutos (5, 10, 20, 40, 60 min)
4. ✅ Cuando Discord se recupera, el webhook se envía exitosamente
5. ✅ Marcado como completado

---

## Testing

```typescript
// test/unit/services/webhook-queue.service.test.ts
describe('WebhookQueueService', () => {
  it('should queue failed webhook', async () => {
    const id = await queueService.enqueue(
      'rate.changed',
      'https://example.com/webhook',
      { data: 'test' }
    );

    expect(id).toBeDefined();

    const pending = await queueService.getPendingWebhooks(10);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(id);
  });

  it('should retry with exponential backoff', async () => {
    const webhook = await createTestWebhook();

    // Primer fallo - debe programar reintento en +5 min
    await queueService.markAsFailed(webhook.id, 'Network error');
    let updated = await findWebhook(webhook.id);
    expect(updated.nextAttemptAt).toBeCloseTo(
      Date.now() + 5 * 60 * 1000,
      -2 // precision: 100ms
    );

    // Segundo fallo - debe programar en +10 min
    await queueService.markAsFailed(webhook.id, 'Network error');
    updated = await findWebhook(webhook.id);
    expect(updated.nextAttemptAt).toBeCloseTo(
      Date.now() + 10 * 60 * 1000,
      -2
    );
  });

  it('should mark as permanently failed after max attempts', async () => {
    const webhook = await createTestWebhook({ maxAttempts: 3 });

    // Fallar 3 veces
    await queueService.markAsFailed(webhook.id, 'Error 1');
    await queueService.markAsFailed(webhook.id, 'Error 2');
    await queueService.markAsFailed(webhook.id, 'Error 3');

    const updated = await findWebhook(webhook.id);
    expect(updated.status).toBe('failed');
    expect(updated.attempts).toBe(3);
  });

  it('should recover stuck webhooks on startup', async () => {
    // Simular webhook stuck en "processing"
    await createTestWebhook({ status: 'processing' });

    // Reinicializar servicio
    await queueService.initialize();

    const stats = await queueService.getQueueStats();
    expect(stats.processing).toBe(0);
    expect(stats.pending).toBeGreaterThan(0);
  });
});
```

---

## Resumen

✅ **Problema resuelto:** Los webhooks fallidos ahora se reintentan automáticamente incluso después de reiniciar el servidor.

**Flujo completo:**
1. Intento inmediato con 3 reintentos
2. Si falla → Cola persistente en MongoDB
3. Worker procesa cada minuto
4. Backoff exponencial (5, 10, 20, 40, 60 min)
5. Máximo 5 intentos en cola
6. Limpieza automática de completados antiguos

**Próximo paso:** Integrar en tu código siguiendo los pasos 1-3 de esta guía.
