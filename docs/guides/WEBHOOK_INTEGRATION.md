# Guía de Integración con Webhooks HTTP

Esta guía explica cómo configurar y usar webhooks HTTP para recibir notificaciones en tiempo real sobre cambios en tasas de cambio del BCV, actualizaciones de estado del servicio y eventos de despliegue.

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Configuración](#configuración)
- [Payload de Webhook](#payload-de-webhook)
- [Seguridad](#seguridad)
- [Eventos](#eventos)
- [Lógica de Reintento](#lógica-de-reintento)
- [Implementación de Ejemplo](#implementación-de-ejemplo)
- [Monitoreo](#monitoreo)
- [Troubleshooting](#troubleshooting)

## Descripción General

El servicio BCVService puede enviar solicitudes HTTP POST a una URL de webhook configurada para varios eventos:
- Cambios en tasas de cambio (usando estado persistente de notificaciones para prevenir duplicados)
- Cambios en el estado de salud del servicio
- Eventos de despliegue (inicio, éxito, fallo)

Esto permite a tu aplicación recibir actualizaciones en tiempo real sin necesidad de hacer polling de la API.

### Sistema de Estado Persistente de Notificaciones

El servicio ahora implementa un sistema persistente de estado de notificaciones que:
- Almacena las últimas tasas notificadas en MongoDB para persistencia a través de reinicios
- Usa Redis como capa de cache para operaciones de lectura/escritura más rápidas
- Previene notificaciones duplicadas cuando se reinicia el servicio
- Usa diferencia absoluta (≥0.01) en lugar de cambio porcentual para determinar cambios significativos
- Rastrea cambios en todas las monedas (USD, EUR, CNY, TRY, RUB, etc.)

### Características

- **Firma HMAC-SHA256**: Verifica la autenticidad del webhook
- **Reintento con Backoff Exponencial**: Reintento automático con backoff exponencial (hasta 3 intentos)
- **Métricas Prometheus**: Rastrea tasas de éxito/fallo de entrega de webhook
- **Timeout Configurable**: Configura timeout personalizado para solicitudes de webhook
- **Detección de Cambio de Tasa**: Solo se activa cuando las tasas cambian significativamente (≥0.01)
- **Sistema Multi-Canal**: Integra con WebSockets, Discord y Webhooks HTTP simultáneamente
- **Firma HMAC para Seguridad**: Cada solicitud incluye firma HMAC-SHA256 para verificación

## Configuración

### Variables de Entorno

Configura el servicio de webhook usando las siguientes variables de entorno:

```bash
# Requerido: URL del endpoint de webhook
WEBHOOK_URL=https://tu-app.com/api/webhook/bcv-rates

# Requerido (recomendado): Clave secreta para firma HMAC
WEBHOOK_SECRET=tu-clave-secreta-aqui

# Opcional: Timeout en milisegundos (predeterminado: 5000)
WEBHOOK_TIMEOUT=5000

# Opcional: Número máximo de reintentos (predeterminado: 3)
WEBHOOK_MAX_RETRIES=3

# Opcional: URLs específicas para diferentes tipos de eventos
SERVICE_STATUS_WEBHOOK_URL=https://tu-app.com/api/webhook/bcv-service-status
DEPLOYMENT_WEBHOOK_URL=https://tu-app.com/api/webhook/bcv-deployment
```

### Uso de Docker Secrets (Recomendado para Producción)

Para mayor seguridad en entornos de producción:

```bash
# Crear Docker secrets
echo "https://tu-app.com/api/webhook/bcv-rates" | docker secret create webhook_url -
echo "tu-clave-secreta" | docker secret create webhook_secret -

# Usar en configuración de entorno
WEBHOOK_URL_FILE=/run/secrets/webhook_url
WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret
```

### URLs Específicas por Tipo de Evento

También puedes configurar URLs diferentes para tipos específicos de eventos:

```bash
# URL general (usada si no hay URL específica)
WEBHOOK_URL=https://tu-app.com/api/webhook/bcv

# URL específica para eventos de estado del servicio
SERVICE_STATUS_WEBHOOK_URL=https://tu-app.com/api/webhook/service-status

# URL específica para eventos de despliegue
DEPLOYMENT_WEBHOOK_URL=https://tu-app.com/api/webhook/deployment
```

## Payload de Webhook

### Estructura del Payload

Cuando se detecta un cambio de tasa, el servicio envía un payload JSON con la siguiente estructura:

```json
{
  "event": "rate.changed",
  "timestamp": "2025-11-24T10:30:00.000Z",
  "data": {
    "date": "2025-11-24",
    "rates": [
      {
        "currency": "USD",
        "rate": 36.50,
        "name": "Dólar de los Estados Unidos de América"
      },
      {
        "currency": "EUR",
        "rate": 39.20,
        "name": "Euro"
      },
      {
        "currency": "CNY",
        "rate": 5.05,
        "name": "Yuan"
      },
      {
        "currency": "TRY",
        "rate": 1.08,
        "name": "Lira Turca"
      },
      {
        "currency": "RUB",
        "rate": 0.36,
        "name": "Rublo Ruso"
      }
    ],
    "change": {
      "previousRate": 36.40,
      "currentRate": 36.50,
      "percentageChange": 0.2747
    }
  }
}
```

### Descripción de Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `event` | string | Tipo de evento: `rate.updated`, `rate.changed`, `service.healthy`, `service.unhealthy`, `service.degraded`, `deployment.success`, `deployment.failure` |
| `timestamp` | string | Timestamp ISO 8601 cuando se envió el webhook |
| `data.date` | string | Fecha de la tasa de cambio (AAAA-MM-DD) |
| `data.rates` | array | Array de tasas de moneda |
| `data.rates[].currency` | string | Código de moneda (USD, EUR, etc.) |
| `data.rates[].rate` | number | Tasa de cambio en VES |
| `data.rates[].name` | string | Nombre completo de la moneda |
| `data.change` | object | Información de cambio (solo cuando `event` es `rate.changed`) |
| `data.change.previousRate` | number | Tasa USD anterior |
| `data.change.currentRate` | number | Tasa USD actual |
| `data.change.percentageChange` | number | Cambio porcentual (ej., 0.2747 = 0.2747%) |

## Seguridad

### Verificación de Firma HMAC

Todas las solicitudes de webhook incluyen un header `X-Webhook-Signature` que contiene una firma HMAC-SHA256:

```
X-Webhook-Signature: sha256=a3f5b1c2d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

### Verificando la Firma

#### Ejemplo en Node.js

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  // Comparación en tiempo constante para prevenir ataques de temporización
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// En tu handler de webhook
app.post('/api/webhook/bcv-rates', express.json({ verify: (req, res, buf) => {
  req.rawBody = buf;
}}), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.rawBody;

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Firma inválida' });
  }

  // Procesar el webhook...
  res.status(200).json({ received: true });
});
```

#### Ejemplo en Python

```python
import hmac
import hashlib

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected_signature = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

# En tu handler de webhook (Flask example)
@app.route('/api/webhook/bcv-rates', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data()

    if not verify_webhook_signature(payload, signature, os.getenv('WEBHOOK_SECRET')):
        return {'error': 'Firma inválida'}, 401

    # Procesar el webhook...
    return {'received': True}, 200
```

### Headers de Solicitud

La solicitud de webhook incluye los siguientes headers:

| Header | Descripción | Ejemplo |
|--------|-------------|---------|
| `Content-Type` | Siempre `application/json` | `application/json` |
| `User-Agent` | Identificador de servicio | `BCV-Service-Webhook/2.1.0` |
| `X-Webhook-Signature` | Firma HMAC-SHA256 | `sha256=a3f5b1c2...` |
| `X-Webhook-Event` | Tipo de evento | `rate.changed` |
| `X-Webhook-Timestamp` | Timestamp del evento | `2025-11-24T10:30:00.000Z` |
| `X-Webhook-Attempt` | Número de intento (1-3) | `1` |

## Eventos

### Tipos de Eventos

#### Eventos de Cambio de Tasa

##### `rate.updated`

Enviado cuando se obtienen tasas por primera vez o después de un reinicio.

```json
{
  "event": "rate.updated",
  "timestamp": "2025-11-24T10:30:00.000Z",
  "data": {
    "date": "2025-11-24",
    "rates": [...],
    "rate": 36.50
    // No incluye campo "change"
  }
}
```

##### `rate.changed`

Enviado cuando las tasas cambian por diferencia absoluta ≥ 0.01 comparado con la tasa anterior (en cualquier moneda).

```json
{
  "event": "rate.changed",
  "timestamp": "2025-11-24T10:30:00.000Z",
  "data": {
    "date": "2025-11-24",
    "rates": [...],
    "rate": 36.50,
    "change": {
      "previousRate": 36.40,
      "currentRate": 36.50,
      "percentageChange": 0.2747,
      "significantChange": true
    }
  }
}
```

#### Eventos de Estado del Servicio

##### `service.healthy`

Enviado cuando el servicio cambia a estado saludable.

```json
{
  "event": "service.healthy",
  "timestamp": "2025-11-24T18:00:00.000Z",
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "checks": {
      "mongodb": {
        "status": "healthy",
        "message": "MongoDB connection is healthy"
      },
      "redis": {
        "status": "healthy",
        "message": "Redis is operational",
        "details": {
          "enabled": true,
          "connected": true
        }
      },
      "scheduler": {
        "status": "healthy",
        "message": "Scheduler is running"
      },
      "websocket": {
        "status": "healthy",
        "message": "WebSocket service is healthy",
        "details": {
          "connectedClients": 5
        }
      }
    },
    "previousStatus": "unhealthy"
  }
}
```

##### `service.unhealthy`

Enviado cuando el servicio cambia a estado no saludable.

```json
{
  "event": "service.unhealthy",
  "timestamp": "2025-11-24T18:05:00.000Z",
  "data": {
    "status": "unhealthy",
    "uptime": 3900,
    "checks": {
      "mongodb": {
        "status": "unhealthy",
        "message": "MongoDB connection failed"
      }
    },
    "previousStatus": "healthy"
  }
}
```

##### `service.degraded`

Enviado cuando el servicio cambia a estado degradado.

```json
{
  "event": "service.degraded",
  "timestamp": "2025-11-24T18:10:00.000Z",
  "data": {
    "status": "degraded",
    "uptime": 4200,
    "checks": {
      "mongodb": {
        "status": "healthy",
        "message": "MongoDB connection is healthy"
      },
      "websocket": {
        "status": "unhealthy",
        "message": "WebSocket service check failed"
      }
    },
    "previousStatus": "healthy"
  }
}
```

#### Eventos de Despliegue

##### `deployment.success`

Enviado cuando el servicio inicia exitosamente.

```json
{
  "event": "deployment.success",
  "timestamp": "2025-11-24T17:30:00.000Z",
  "data": {
    "deploymentId": "start-1700880600000",
    "environment": "production",
    "version": "2.1.0",
    "message": "Servidor BCV iniciado en puerto 3000",
    "architecture": "SOLID with Inversify DI",
    "features": {
      "notifications": true,
      "websockets": true,
      "discrod_integration": true,
      "webhook_integration": true
    }
  }
}
```

##### `deployment.failure`

Enviado cuando el servicio se detiene (durante apagado gracioso).

```json
{
  "event": "deployment.failure",
  "timestamp": "2025-11-24T19:00:00.000Z",
  "data": {
    "deploymentId": "shutdown-1700883600000",
    "environment": "production",
    "version": "2.1.0",
    "message": "Aplicación BCV Service cerrándose correctamente"
  }
}
```

## Lógica de Reintento

### Backoff Exponencial

Si una entrega de webhook falla, el servicio reintenta automáticamente con backoff exponencial:

| Intento | Retraso Antes de Reintento |
|---------|---------------------------|
| 1 | Inmediato |
| 2 | 1 segundo |
| 3 | 2 segundos |

### Condiciones de Fallo

Los webhooks se consideran fallidos cuando:

- El código de estado de respuesta HTTP no es 2xx
- La solicitud supera el timeout (predeterminado: 5 segundos)
- Ocurre un error de red

### Criterios de Éxito

Un webhook se considera exitoso cuando:

- El código de estado de respuesta HTTP es 2xx (200-299)
- La respuesta se recibe antes del timeout

## Implementación de Ejemplo

### Handler de Webhook en Express.js

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// Middleware para capturar cuerpo raw para verificación de firma
app.use('/api/webhook/bcv-rates', express.json({ verify: (req, res, buf) => {
  req.rawBody = buf;
}}));

// Middleware para verificar firma de webhook
function verifyWebhook(req, res, next) {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!signature || !secret) {
    return res.status(401).json({ error: 'Falta firma o clave secreta' });
  }

  const rawBody = req.rawBody;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody, 'utf8');
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ error: 'Firma inválida' });
  }

  next();
}

// Endpoint de webhook
app.post('/api/webhook/bcv-rates', verifyWebhook, async (req, res) => {
  const { event, timestamp, data } = req.body;

  console.log(`Evento recibido: ${event} a las ${timestamp}`);

  try {
    // Procesar cambio de tasa
    if (event === 'rate.changed') {
      const { change, rates, date } = data;
      console.log(`Tasa cambiada de ${change.previousRate} a ${change.currentRate}`);
      console.log(`Cambio porcentual: ${change.percentageChange}%`);
      
      // Actualizar base de datos, notificar usuarios, etc.
      await updateRatesInDatabase(rates, date);
      await notifyUsers(change);
    }

    // Procesar evento de estado del servicio
    if (event.startsWith('service.')) {
      const { status, checks } = data;
      console.log(`Estado del servicio: ${status}`);
      
      // Actualizar dashboard de monitoreo, notificar equipo de ops, etc.
      await updateServiceStatus(status, checks);
    }

    // Procesar evento de despliegue
    if (event.startsWith('deployment.')) {
      const { deploymentId, environment, message } = data;
      console.log(`Evento de despliegue: ${message}`);
      
      // Actualizar sistema de monitoreo, notificar equipo, etc.
      await logDeploymentEvent(deploymentId, environment, message);
    }

    // Siempre responder con 200 para prevenir reintentos
    res.status(200).json({ received: true, processed: true });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    // Devolver 200 para evitar reintentos, pero registrar el error
    res.status(200).json({ received: true, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor de webhook corriendo en puerto 3000');
});
```

### Buenas Prácticas

1. **Responder Rápidamente**: Devuelve una respuesta 200 tan pronto sea posible (dentro del timeout)
2. **Procesar Asincrónicamente**: Maneja el procesamiento pesado en trabajos en segundo plano
3. **Idempotencia**: Usa `timestamp` o `data.date` para prevenir procesamiento duplicado
4. **Validar Firma**: Siempre verifica la firma HMAC
5. **Registrar Solicitudes**: Registra todas las solicitudes de webhook para debugging y auditoría
6. **Manejar Reintentos**: Prepárate para recibir el mismo webhook múltiples veces

## Monitoreo

### Métricas Prometheus

El servicio de webhook expone las siguientes métricas Prometheus:

#### `webhook_notifications_total`

Contador de intentos de entrega de webhook.

**Etiquetas:**
- `status`: `success` o `failure`
- `event_type`: `rate.updated`, `rate.changed`, `service.healthy`, etc.

**Ejemplo de Consulta:**
```promql
# Total de entregas exitosas de webhook
webhook_notifications_total{status="success"}

# Tasa de fallo de webhook
rate(webhook_notifications_total{status="failure"}[5m])
```

#### `webhook_delivery_duration_seconds`

Histograma de duración de entrega de webhook.

**Etiquetas:**
- `status`: `success` o `failure`
- `event_type`: tipo de evento

**Ejemplo de Consulta:**
```promql
# Latencia de entrega de webhook p95
histogram_quantile(0.95, rate(webhook_delivery_duration_seconds_bucket[5m]))

# Duración promedio de entrega
rate(webhook_delivery_duration_seconds_sum[5m]) / rate(webhook_delivery_duration_seconds_count[5m])
```

### Dashboard de Grafana Ejemplo

```promql
# Tasa de éxito de webhook (%)
(rate(webhook_notifications_total{status="success"}[5m]) / rate(webhook_notifications_total[5m])) * 100

# Entregas de webhook por minuto
rate(webhook_notifications_total[1m]) * 60

# Eventos por tipo
rate(webhook_notifications_total{event_type="rate.changed"}[5m])
rate(webhook_notifications_total{event_type="rate.updated"}[5m])
```

## Troubleshooting

### Problemas Comunes

#### Webhook No Recibe Solicitudes

1. **Verificar Configuración**:
   ```bash
   # Verificar que la URL de webhook esté configurada
   echo $WEBHOOK_URL
   ```

2. **Verificar Logs**:
   ```bash
   # Buscar logs relacionados con webhooks
   docker logs bcv-service | grep -i webhook
   ```

3. **Verificar Cambios de Tasa**:
   Los webhooks solo se envían cuando las tasas cambian significativamente (≥0.01)

#### Verificación de Firma Fallando

1. **Asegurar Coincidencia de Clave**:
   - La clave usada para verificar debe coincidir con `WEBHOOK_SECRET`
   - Verificar espacios extra o problemas de codificación

2. **Verificar Payload**:
   - Usar el cuerpo JSON raw exacto (antes de parsear)
   - No modificar ni reserializar el payload

#### Tasa Alta de Fallos

1. **Verificar Timeout**:
   ```bash
   # Aumentar timeout si es necesario
   WEBHOOK_TIMEOUT=10000  # 10 segundos
   ```

2. **Verificar Rendimiento del Endpoint**:
   - Asegurar que el endpoint responda rápidamente
   - Procesar trabajo pesado asíncronamente

3. **Verificar Conectividad de Red**:
   - Verificar reglas de firewall
   - Verificar resolución DNS

### Pruebas de Webhooks Localmente

#### Usando ngrok

```bash
# Iniciar túnel ngrok
ngrok http 3000

# Configurar URL de webhook
export WEBHOOK_URL=https://tu-subdominio.ngrok.io/api/webhook/bcv-rates

# Iniciar servicio BCV
pnpm dev
```

#### Pruebas Manuales con curl

```bash
# Generar firma HMAC
SECRET="tu-clave-secreta"
PAYLOAD='{"event":"rate.changed","timestamp":"2025-11-24T10:30:00.000Z","data":{"date":"2025-11-24","rates":[{"currency":"USD","rate":36.5,"name":"Dólar"}]}}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Enviar webhook de prueba
curl -X POST http://localhost:3000/api/webhook/bcv-rates \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -H "X-Webhook-Event: rate.changed" \
  -d "$PAYLOAD"
```

## Nuevas Características de Webhooks (v3.0.0)

### 📊 Webhook Delivery Tracking

El servicio ahora incluye un sistema completo de tracking de entregas de webhooks que:

- **Almacena historial completo** de todas las entregas en MongoDB
- **API endpoints** para consultar entregas por evento, URL, o rango de fechas
- **Estadísticas agregadas** con tasas de éxito/fallo y duraciones promedio
- **Debugging mejorado** con información detallada de cada intento

#### Endpoints Disponibles

```bash
# Ver últimas entregas
GET /api/v1/webhooks/deliveries/recent?limit=50

# Ver entregas de un evento específico
GET /api/v1/webhooks/deliveries/event/rate.changed?limit=50

# Ver entregas a una URL específica
GET /api/v1/webhooks/deliveries/url?url=https://example.com/webhook

# Ver estadísticas generales
GET /api/v1/webhooks/deliveries/stats

# Ver estadísticas de un evento
GET /api/v1/webhooks/deliveries/stats/event/rate.changed
```

**Respuesta de ejemplo:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "event": "rate.changed",
      "url": "https://example.com/webhook",
      "payload": { ... },
      "success": true,
      "statusCode": 200,
      "attempts": 1,
      "duration": 243,
      "timestamp": "2025-11-26T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

Ver [GUIA_CONFIRMACION_WEBHOOKS.md](../../GUIA_CONFIRMACION_WEBHOOKS.md) para detalles completos.

### 🔄 Webhook Retry Queue

Sistema de cola persistente que garantiza entrega de webhooks incluso después de reinicios:

**Características:**
- ✅ Cola persistente en MongoDB que sobrevive reinicios
- ✅ Reintentos automáticos con backoff exponencial (5, 10, 20, 40, 60 minutos)
- ✅ Worker que procesa la cola cada minuto
- ✅ Máximo 5 intentos antes de marcar como fallido permanentemente
- ✅ Priorización de eventos (high, normal, low)
- ✅ Limpieza automática de webhooks completados antiguos

**Flujo de funcionamiento:**
1. Webhook falla después de 3 intentos inmediatos
2. Se agrega a la cola persistente en MongoDB
3. Worker procesa cada minuto los webhooks pendientes
4. Reintenta con backoff exponencial hasta 5 veces
5. Si tiene éxito → marcado como completado
6. Si falla 5 veces → marcado como fallido permanentemente

#### Endpoints de Monitoreo de Cola

```bash
# Ver estadísticas de la cola
GET /api/v1/webhooks/queue/stats

# Ver webhooks pendientes
GET /api/v1/webhooks/queue/pending?limit=20

# Forzar procesamiento de la cola
POST /api/v1/webhooks/queue/process

# Limpiar webhooks completados antiguos
POST /api/v1/webhooks/queue/clean?days=7
```

**Respuesta de stats:**
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

Ver [GUIA_COLA_WEBHOOKS.md](../../GUIA_COLA_WEBHOOKS.md) para guía completa de implementación.

### 🚀 Lifecycle Notifications

Notificaciones automáticas del ciclo de vida del servidor:

- **Startup**: Notifica cuando el servidor inicia exitosamente
- **Shutdown**: Notifica cuando el servidor se apaga graciosamente
- **Heartbeat**: Notificaciones periódicas opcionales
- **Uncaught Exceptions**: Notifica errores críticos antes del crash

**Configuración:**
```bash
# Habilitar lifecycle notifications
ENABLE_LIFECYCLE_NOTIFICATIONS=true

# Configurar heartbeat (opcional)
LIFECYCLE_HEARTBEAT_ENABLED=true
LIFECYCLE_HEARTBEAT_INTERVAL=300000  # 5 minutos
```

Ver [GUIA_CONFIRMACION_WEBHOOKS.md](../../GUIA_CONFIRMACION_WEBHOOKS.md) sección "Lifecycle Notifier" para detalles.

## Documentación Relacionada

- [Guía de Observabilidad](./OBSERVABILITY.md) - Métricas Prometheus y monitoreo
- [Configuración Local](./SETUP_LOCAL.md) - Configuración de desarrollo local
- [Gestión de Secretos](./SECRETS_MANAGEMENT.md) - Configuración segura
- [Prueba de Discord](./DISCORD_TESTING.md) - Prueba de notificaciones Discord
- [Confirmación de Webhooks](../../GUIA_CONFIRMACION_WEBHOOKS.md) - Sistema completo de tracking
- [Cola de Webhooks](../../GUIA_COLA_WEBHOOKS.md) - Sistema de reintentos persistente

---

**¿Necesitas ayuda?**

Si encuentras problemas no cubiertos en esta guía:

1. Revisa la sección [Troubleshooting](#troubleshooting)
2. Revisa los logs del servicio: `docker logs bcv-service`
3. Revisa las métricas Prometheus en `/metrics`
4. Abre un issue en [GitHub](https://github.com/emilioaray-dev/bcv-service/issues)

---

**Última actualización**: 2025-11-26
**Versión del servicio**: 3.0.0