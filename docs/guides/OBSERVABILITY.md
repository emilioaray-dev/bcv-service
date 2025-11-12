# Observability - Monitoreo y Health Checks

Este documento describe las capacidades de observabilidad implementadas en el microservicio BCV, incluyendo health checks y métricas de Prometheus.

## Health Checks

El servicio expone varios endpoints para verificar el estado de salud del sistema.

### Endpoints Disponibles

#### `GET /health`
Verifica el estado completo del sistema, incluyendo todos los servicios.

**Respuesta exitosa (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T18:19:31.381Z",
  "uptime": 52,
  "checks": {
    "mongodb": {
      "status": "healthy",
      "message": "MongoDB connection is active"
    },
    "scheduler": {
      "status": "healthy",
      "message": "Scheduler is running"
    },
    "bcv": {
      "status": "healthy",
      "message": "BCV service is operational"
    },
    "websocket": {
      "status": "healthy",
      "message": "WebSocket service is healthy",
      "details": {
        "connectedClients": 5
      }
    }
  }
}
```

**Respuesta con problemas (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-12T18:19:31.381Z",
  "uptime": 52,
  "checks": {
    "mongodb": {
      "status": "unhealthy",
      "message": "MongoDB connection failed",
      "details": {
        "error": "Connection timeout"
      }
    },
    "scheduler": {
      "status": "healthy",
      "message": "Scheduler is running"
    },
    "bcv": {
      "status": "degraded",
      "message": "BCV service returned no data"
    },
    "websocket": {
      "status": "healthy",
      "message": "WebSocket service is healthy",
      "details": {
        "connectedClients": 0
      }
    }
  }
}
```

#### `GET /healthz`
Alias de `/health` compatible con Kubernetes liveness probes.

#### `GET /readyz`
Alias de `/health` compatible con Kubernetes readiness probes.

#### `GET /health/mongodb`
Verifica solo el estado de la conexión a MongoDB.

**Respuesta:**
```json
{
  "status": "healthy",
  "message": "MongoDB connection is active"
}
```

#### `GET /health/scheduler`
Verifica solo el estado del programador de tareas.

#### `GET /health/bcv`
Verifica solo el estado del servicio de scraping del BCV.

#### `GET /health/websocket`
Verifica solo el estado del servicio WebSocket.

### Estados de Salud

- **healthy**: El componente está funcionando correctamente
- **unhealthy**: El componente tiene fallos críticos
- **degraded**: El componente funciona pero con limitaciones

### Configuración en Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bcv-service
spec:
  containers:
  - name: bcv-service
    image: bcv-service:latest
    livenessProbe:
      httpGet:
        path: /healthz
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /readyz
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 2
```

## Métricas de Prometheus

El servicio expone métricas en formato Prometheus para monitoreo y alertas.

### Endpoint de Métricas

#### `GET /metrics`
Expone todas las métricas en formato Prometheus text.

**Características:**
- Sin autenticación (para permitir scraping de Prometheus)
- Sin rate limiting
- Formato: `text/plain; version=0.0.4; charset=utf-8`

### Métricas Personalizadas

#### `http_requests_total`
Contador total de requests HTTP recibidos.

**Labels:**
- `method`: Método HTTP (GET, POST, etc.)
- `route`: Ruta del endpoint
- `status_code`: Código de respuesta HTTP

**Ejemplo:**
```
http_requests_total{method="GET",route="/api/rate",status_code="200"} 1250
http_requests_total{method="GET",route="/health",status_code="200"} 543
```

#### `http_request_duration_seconds`
Histograma de duración de requests HTTP en segundos.

**Labels:**
- `method`: Método HTTP
- `route`: Ruta del endpoint
- `status_code`: Código de respuesta HTTP

**Buckets:** 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10 segundos

**Ejemplo:**
```
http_request_duration_seconds_bucket{method="GET",route="/api/rate",status_code="200",le="0.01"} 890
http_request_duration_seconds_bucket{method="GET",route="/api/rate",status_code="200",le="0.05"} 1200
http_request_duration_seconds_sum{method="GET",route="/api/rate",status_code="200"} 15.432
http_request_duration_seconds_count{method="GET",route="/api/rate",status_code="200"} 1250
```

#### `bcv_websocket_connected_clients`
Gauge del número actual de clientes WebSocket conectados.

**Ejemplo:**
```
bcv_websocket_connected_clients 15
```

#### `bcv_update_total`
Contador de actualizaciones de tasa del BCV.

**Labels:**
- `status`: Estado de la actualización (`success` o `failure`)

**Ejemplo:**
```
bcv_update_total{status="success"} 145
bcv_update_total{status="failure"} 3
```

#### `bcv_latest_rate`
Gauge de la última tasa de cambio BCV obtenida (Bs/USD).

**Ejemplo:**
```
bcv_latest_rate 36.5
```

### Métricas por Defecto

El servicio también expone métricas estándar de Node.js:

- **Process metrics:**
  - `process_cpu_user_seconds_total`
  - `process_cpu_system_seconds_total`
  - `process_resident_memory_bytes`
  - `process_heap_bytes`
  - `process_open_fds`

- **Node.js metrics:**
  - `nodejs_eventloop_lag_seconds`
  - `nodejs_heap_size_total_bytes`
  - `nodejs_heap_size_used_bytes`
  - `nodejs_external_memory_bytes`
  - `nodejs_gc_duration_seconds`

### Configuración de Prometheus

#### Scrape Configuration

Añade el siguiente job a tu `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'bcv-service'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
    static_configs:
      - targets: ['bcv-service:3000']
        labels:
          env: 'production'
          service: 'bcv'
```

#### Queries PromQL Útiles

**Tasa de requests por segundo:**
```promql
rate(http_requests_total[5m])
```

**Latencia promedio (p95):**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Tasa de errores:**
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

**Clientes WebSocket conectados:**
```promql
bcv_websocket_connected_clients
```

**Tasa de éxito de actualizaciones BCV:**
```promql
rate(bcv_update_total{status="success"}[5m]) / rate(bcv_update_total[5m])
```

**Última tasa de cambio:**
```promql
bcv_latest_rate
```

### Dashboard de Grafana

Puedes importar estas queries en un dashboard de Grafana:

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "targets": [
        {
          "expr": "rate(http_requests_total[5m])"
        }
      ]
    },
    {
      "title": "Response Time (p95)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
        }
      ]
    },
    {
      "title": "WebSocket Connections",
      "targets": [
        {
          "expr": "bcv_websocket_connected_clients"
        }
      ]
    },
    {
      "title": "BCV Rate",
      "targets": [
        {
          "expr": "bcv_latest_rate"
        }
      ]
    }
  ]
}
```

## Alertas Recomendadas

### Alertmanager Configuration

```yaml
groups:
  - name: bcv-service
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: ServiceDown
        expr: up{job="bcv-service"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "BCV service is down"

      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile is {{ $value }}s"

      - alert: BCVUpdateFailures
        expr: |
          rate(bcv_update_total{status="failure"}[10m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "BCV updates are failing"
          description: "Failure rate: {{ $value }}/s"

      - alert: NoWebSocketClients
        expr: bcv_websocket_connected_clients == 0
        for: 15m
        labels:
          severity: info
        annotations:
          summary: "No WebSocket clients connected"
```

## Testing

### Manual Testing

**Health check:**
```bash
curl http://localhost:3000/health | jq
```

**Metrics:**
```bash
curl http://localhost:3000/metrics
```

**Specific health check:**
```bash
curl http://localhost:3000/health/mongodb | jq
```

### Automated Testing

Los health checks y métricas están integrados en los tests unitarios del proyecto. Ver:
- `test/unit/services/health-check.service.test.ts`
- `test/unit/controllers/health.controller.test.ts`

## Arquitectura

La implementación de observability sigue los principios SOLID:

- **IHealthCheckService**: Interface para health checks
- **HealthCheckService**: Implementación de health checks con DI
- **HealthController**: Exposición de endpoints HTTP
- **IMetricsService**: Interface para métricas
- **MetricsService**: Implementación de métricas con Prometheus
- **MetricsController**: Exposición del endpoint /metrics

Todos los servicios reportan métricas y estado de salud mediante inyección de dependencias.

## Referencias

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Kubernetes Liveness/Readiness Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
