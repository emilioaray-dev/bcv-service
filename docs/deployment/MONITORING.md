# Guía de Monitoreo

Guía completa para configurar monitoreo, métricas, alertas y observabilidad del BCV Service en producción.

## Tabla de Contenidos

1. [Stack de Monitoreo](#stack-de-monitoreo)
2. [Métricas Disponibles](#métricas-disponibles)
3. [Prometheus Setup](#prometheus-setup)
4. [Grafana Dashboards](#grafana-dashboards)
5. [Alerting](#alerting)
6. [Logs Centralizados](#logs-centralizados)
7. [APM y Tracing](#apm-y-tracing)
8. [Uptime Monitoring](#uptime-monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Stack de Monitoreo

### Componentes Recomendados

```
┌─────────────────────────────────────────────────────┐
│              Observability Stack                     │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Prometheus  │  │   Grafana   │  │    Loki     │ │
│  │  (Metrics)  │  │ (Dashboards)│  │   (Logs)    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │         │
│         └────────────────┼────────────────┘         │
│                          │                          │
│  ┌─────────────┐  ┌──────▼──────┐  ┌─────────────┐ │
│  │AlertManager │  │ BCV Service │  │  Promtail   │ │
│  │  (Alerts)   │  │   :3000     │  │(Log Shipper)│ │
│  └──────┬──────┘  └─────────────┘  └─────────────┘ │
│         │                                           │
│  ┌──────▼──────┐                                    │
│  │   PagerDuty │  (Opcional)                        │
│  │   / Slack   │                                    │
│  └─────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

---

## Métricas Disponibles

El servicio BCV expone las siguientes métricas Prometheus en el endpoint `/metrics`:

### Métricas de Aplicación
- `bcv_latest_rate{currency}` - Tasa de cambio más reciente por moneda (USD, EUR, etc.)
- `bcv_scrape_total` - Contador total de intentos de scraping
- `bcv_scrape_success_total` - Contador de scrapes exitosos
- `bcv_scrape_failure_total` - Contador de scrapes fallidos
- `bcv_rate_changes_total{currency}` - Contador de cambios en la tasa de cambio por moneda
- `bcv_websocket_connections` - Número actual de conexiones WebSocket activas
- `bcv_database_operations_total{operation, status}` - Contador de operaciones de base de datos

### Métricas Estándar de Node.js
- `nodejs_eventloop_lag_seconds` - Retraso del event loop
- `nodejs_heap_size_total_bytes` - Tamaño total del heap
- `nodejs_heap_used_bytes` - Memoria heap utilizada
- `nodejs_external_memory_bytes` - Memoria externa utilizada
- `nodejs_active_handles_total` - Contador de handles activos
- `nodejs_active_requests_total` - Contador de requests activos
- `process_cpu_user_seconds_total` - Tiempo de CPU en segundos
- `process_resident_memory_bytes` - Memoria residente del proceso
- `process_start_time_seconds` - Timestamp de inicio del proceso

### Métricas de HTTP
- `http_requests_total{method, route, status_code}` - Contador total de requests HTTP
- `http_request_duration_seconds_bucket` - Histograma de duración de requests
- `http_request_duration_seconds_sum` - Suma de duración de requests
- `http_request_duration_seconds_count` - Contador de requests medidos

---

## Prometheus Setup

### Docker Compose

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    networks:
      - monitoring
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    networks:
      - monitoring
    restart: unless-stopped
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    volumes:
      - ./alertmanager/config.yml:/etc/alertmanager/config.yml
    command:
      - '--config.file=/etc/alertmanager/config.yml'
    ports:
      - "9093:9093"
    networks:
      - monitoring
    restart: unless-stopped

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus-data:
  grafana-data:
```

### Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'bcv-production'
    env: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Load rules
rule_files:
  - "alerts.yml"

# Scrape configurations
scrape_configs:
  # BCV Service
  - job_name: 'bcv-service'
    static_configs:
      - targets: ['bcv-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter (system metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # MongoDB Exporter (opcional)
  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['mongodb-exporter:9216']
```

### Alert Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: bcv_service_alerts
    interval: 30s
    rules:
      # Service Down
      - alert: BCVServiceDown
        expr: up{job="bcv-service"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "BCV Service is down"
          description: "BCV Service has been down for more than 2 minutes."

      # High Error Rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{job="bcv-service", status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      # Scraping Failures
      - alert: BCVScrapingFailing
        expr: rate(bcv_scrape_failure_total[10m]) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "BCV scraping is failing"
          description: "More than 50% of BCV scrapes are failing in the last 10 minutes."

      # High Response Time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s (threshold: 1s)"

      # Low WebSocket Connections
      - alert: NoWebSocketClients
        expr: bcv_websocket_connections == 0
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "No WebSocket clients connected"
          description: "There have been no WebSocket clients for 30 minutes."

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes{job="bcv-service"} > 536870912  # 512MB
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanize }}B (threshold: 512MB)"

      # MongoDB Down
      - alert: MongoDBDown
        expr: up{job="mongodb-exporter"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB is down"
          description: "MongoDB has been unreachable for more than 2 minutes."

      # BCV Rate Changes
      - alert: BCVRateChange
        expr: increase(bcv_rate_changes_total[1h]) > 5
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "High number of exchange rate changes"
          description: "There have been more than 5 rate changes in the last hour"
```

---

## Grafana Dashboards

### Datasource Provisioning

```yaml
# grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

### Dashboard Provisioning

```yaml
# grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: 'BCV Service'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

### Dashboard JSON

```json
// grafana/provisioning/dashboards/bcv-service.json
{
  "dashboard": {
    "title": "BCV Service Dashboard",
    "tags": ["bcv", "nodejs"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"bcv-service\"}[5m])",
            "legendFormat": "{{ method }} {{ route }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"bcv-service\", status=~\"5..\"}[5m])",
            "legendFormat": "{{ status }}"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ]
      },
      {
        "title": "WebSocket Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "bcv_websocket_connections",
            "legendFormat": "Connections"
          }
        ]
      },
      {
        "title": "BCV Scraping Success/Failure",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(bcv_scrape_success_total[5m])",
            "legendFormat": "Success"
          },
          {
            "expr": "rate(bcv_scrape_failure_total[5m])",
            "legendFormat": "Failure"
          }
        ]
      },
      {
        "title": "Latest Rate (USD)",
        "type": "stat",
        "targets": [
          {
            "expr": "bcv_latest_rate{currency=\"USD\"}",
            "legendFormat": "USD Rate"
          }
        ]
      },
      {
        "title": "Latest Rate (EUR)",
        "type": "stat",
        "targets": [
          {
            "expr": "bcv_latest_rate{currency=\"EUR\"}",
            "legendFormat": "EUR Rate"
          }
        ]
      },
      {
        "title": "All Currency Rates",
        "type": "timeseries",
        "targets": [
          {
            "expr": "bcv_latest_rate",
            "legendFormat": "{{ currency }}"
          }
        ]
      },
      {
        "title": "Rate Changes",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(bcv_rate_changes_total[5m])",
            "legendFormat": "{{ currency }}"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes{job=\"bcv-service\"}",
            "legendFormat": "RSS Memory"
          },
          {
            "expr": "nodejs_heap_size_used_bytes{job=\"bcv-service\"}",
            "legendFormat": "Heap Used"
          }
        ]
      },
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(process_cpu_user_seconds_total{job=\"bcv-service\"}[5m])",
            "legendFormat": "CPU Usage"
          }
        ]
      }
    ]
  }
}
```

### Acceder a Grafana

```bash
# Iniciar stack
docker-compose -f docker-compose.monitoring.yml up -d

# Acceder a Grafana
# URL: http://localhost:3001
# Usuario: admin
# Password: secure_password

# Importar dashboards
# Dashboards > Import > Upload JSON file
```

---

## Alerting

### AlertManager Configuration

```yaml
# alertmanager/config.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
    - match:
        severity: warning
      receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}'
```

### Integraciones

#### Slack

```yaml
# En config.yml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#bcv-alerts'
        title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
        text: |
          *Alert:* {{ .GroupLabels.alertname }}
          *Severity:* {{ .CommonLabels.severity }}
          *Summary:* {{ .CommonAnnotations.summary }}
          *Description:* {{ .CommonAnnotations.description }}
        send_resolved: true
```

#### Email

```yaml
# En config.yml
receivers:
  - name: 'email'
    email_configs:
      - to: 'ops@yourcompany.com'
        from: 'alerts@yourcompany.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@yourcompany.com'
        auth_password: 'app_password'
        headers:
          Subject: '[ALERT] {{ .GroupLabels.alertname }}'
```

#### PagerDuty

```yaml
# En config.yml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        url: 'https://events.pagerduty.com/v2/enqueue'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          severity: '{{ .CommonLabels.severity }}'
          alert_name: '{{ .GroupLabels.alertname }}'
```

---

## Logs Centralizados

### Loki + Promtail

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki/config.yml:/etc/loki/config.yml
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yml
    networks:
      - monitoring
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    volumes:
      - ./promtail/config.yml:/etc/promtail/config.yml
      - /var/log:/var/log
      - ../bcv-service/logs:/app/logs
    command: -config.file=/etc/promtail/config.yml
    networks:
      - monitoring
    restart: unless-stopped
    depends_on:
      - loki
```

### Loki Configuration

```yaml
# loki/config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2023-01-01
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb:
    directory: /loki/index
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 336h  # 14 days
```

### Promtail Configuration

```yaml
# promtail/config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Winston logs from BCV Service
  - job_name: bcv-service-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: bcv-service
          __path__: /app/logs/*.log
    pipeline_stages:
      - match:
          selector: '{job="bcv-service"}'
          stages:
            - json:
                expressions:
                  level: level
                  message: message
                  service: service
                  timestamp: timestamp
            - labels:
                level:
                service:
            - timestamp:
                source: timestamp
                format: RFC3339
            - output:
                source: message

  # System logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          __path__: /var/log/syslog
```

### Grafana Loki Datasource

```yaml
# grafana/provisioning/datasources/loki.yml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
```

### Queries útiles en Grafana Explore

```logql
# Todos los logs de BCV Service
{job="bcv-service"}

# Solo errores
{job="bcv-service"} |= "level=error"

# Filtrar por mensaje
{job="bcv-service"} |= "MongoDB"

# Rate de logs por segundo
rate({job="bcv-service"}[5m])

# Count de errores
count_over_time({job="bcv-service"} |= "error" [5m])

# Logs de scraping de BCV
{job="bcv-service"} |= "scraping"

# Logs de WebSocket
{job="bcv-service"} |= "websocket"

# Logs de cambio de tasa
{job="bcv-service"} |= "rate change"
```

---

## APM y Tracing

### OpenTelemetry (Opcional - Avanzado)

```bash
# Instalar OpenTelemetry
pnpm add @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-prometheus \
  @opentelemetry/exporter-trace-otlp-http
```

```typescript
// src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://jaeger:4318/v1/traces',
  }),
  metricReader: new PrometheusExporter({
    port: 9464,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

### Jaeger (Distributed Tracing)

```yaml
# docker-compose.tracing.yml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "5775:5775/udp"
      - "6831:6831/udp"
      - "6832:6832/udp"
      - "5778:5778"
      - "16686:16686"  # Jaeger UI
      - "14268:14268"
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    networks:
      - monitoring
```

---

## Uptime Monitoring

### Opción 1: Blackbox Exporter (Prometheus)

```yaml
# prometheus/prometheus.yml (agregar)
scrape_configs:
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://your-domain.com/health
        labels:
          monitor: "external"
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

### Opción 2: Servicios Externos

- **UptimeRobot**: Free tier, 50 monitors
- **Pingdom**: Monitoreo desde múltiples locaciones
- **StatusCake**: Free tier disponible
- **Better Uptime**: Moderno, con status page
- **BCV Service Health Check Endpoint**: Asegúrate de usar `/healthz` para verificación de liveness

```bash
# Ejemplo: UptimeRobot API
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
  -d 'api_key=YOUR_API_KEY' \
  -d 'friendly_name=BCV Service' \
  -d 'url=https://your-domain.com/healthz' \
  -d 'type=1' \
  -d 'interval=300'
```

---

## Queries Útiles

### Prometheus Queries

```promql
# Request rate (QPS)
rate(http_requests_total{job="bcv-service"}[5m])

# Error rate percentage
(rate(http_requests_total{job="bcv-service", status=~"5.."}[5m]) / rate(http_requests_total{job="bcv-service"}[5m])) * 100

# Latency percentiles
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))  # p50
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))  # p95
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))  # p99

# Availability (uptime)
avg_over_time(up{job="bcv-service"}[30d]) * 100

# Scraping success rate
rate(bcv_scrape_success_total[10m]) / (rate(bcv_scrape_success_total[10m]) + rate(bcv_scrape_failure_total[10m]))

# Memory growth rate
deriv(process_resident_memory_bytes{job="bcv-service"}[1h])

# Top endpoints by request count
topk(5, sum by (route) (rate(http_requests_total{job="bcv-service"}[5m])))

# BCV rate changes
rate(bcv_rate_changes_total{currency="USD"}[1h])

# WebSocket connections
bcv_websocket_connections
```

---

## Troubleshooting

### Prometheus no scrapeando

```bash
# Verificar targets
# http://localhost:9090/targets

# Verificar connectivity
curl http://bcv-service:3000/metrics

# Ver logs
docker-compose logs prometheus
```

### Grafana no muestra datos

```bash
# Verificar datasource
# Grafana > Configuration > Data Sources > Test

# Verificar queries en Explore
# Grafana > Explore > Select Prometheus datasource

# Ver logs
docker-compose logs grafana
```

### Alertas no se envían

```bash
# Verificar AlertManager
# http://localhost:9093

# Test de alerta
curl -H "Content-Type: application/json" -d '[{"labels":{"alertname":"Test"}}]' http://localhost:9093/api/v1/alerts

# Ver logs
docker-compose logs alertmanager
```

### Verificación de métricas BCV

```bash
# Verificar métricas específicas de BCV
curl http://localhost:3000/metrics | grep bcv

# Verificar que las métricas estén disponibles
curl -G "http://localhost:9090/api/v1/query" \
  --data-urlencode "query=bcv_latest_rate"
```

---

## Checklist de Monitoreo

- [ ] Prometheus scrapeando métricas del servicio BCV
- [ ] Métricas personalizadas de BCV visibles (tasa de cambio, scraping, etc.)
- [ ] Grafana dashboards configurados y mostrando datos
- [ ] Alertas críticas configuradas (servicio caído, errores, scraping fallido)
- [ ] Notificaciones funcionando (Slack/PagerDuty)
- [ ] Logs centralizados (Loki o similar)
- [ ] Uptime monitoring externo configurado
- [ ] Backup de configuraciones de monitoreo
- [ ] Documentación de runbooks para alertas
- [ ] SLIs y SLOs definidos
- [ ] On-call rotation configurada

---

## Referencias

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [OpenTelemetry](https://opentelemetry.io/)
- [Google SRE Books](https://sre.google/books/)
- [BCV Service Metrics Implementation](../architecture/MEJORAS.md)
