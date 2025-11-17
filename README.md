# Microservicio BCV Tasa de Cambio

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/emilioaray-dev/bcv-service/pulls)

Microservicio en Node.js con TypeScript que consulta periódicamente la tasa oficial de cambio del Banco Central de Venezuela, almacenando los datos localmente y notificando a servicios suscriptores mediante WebSockets cuando hay cambios.

## 🚀 Características

### Core Features
- ✅ Consulta automatizada de tasa de cambio cada 8 horas
- ✅ Scraping directo del sitio oficial del BCV (www.bcv.org.ve)
- ✅ Almacenamiento en MongoDB con modo consola opcional
- ✅ Notificaciones en tiempo real mediante WebSockets
- ✅ **Notificaciones a Discord** cuando se detectan cambios en tasas
- ✅ API REST con autenticación por API Key
- ✅ Rate limiting para protección contra abuso

### Arquitectura y Calidad
- ✅ **Arquitectura SOLID** con Inversify para Dependency Injection
- ✅ Logging estructurado con Winston
- ✅ Testing con Vitest (66% coverage, 55 tests)
- ✅ Gestión segura de secretos con Docker Secrets
- ✅ Formateo y calidad de código con Biome
- ✅ **Seguridad web** con Helmet.js (CSP, HSTS, XSS protection)
- ✅ **Compresión** de respuestas para mejor rendimiento
- ✅ **Integración con Discord** para notificaciones de cambios en tasas

### Observability
- ✅ **Health Checks** para Kubernetes (liveness/readiness probes)
- ✅ **Métricas de Prometheus** para monitoreo
- ✅ Tracking automático de requests HTTP
- ✅ Métricas de negocio (tasas BCV, clientes WebSocket)
- ✅ **Notificaciones a Discord** cuando hay cambios en las tasas

## 📋 Tabla de Contenidos

- [Requisitos](#-requisitos)
- [Instalación Rápida](#-instalación-rápida)
- [Documentación](#-documentación)
- [API Endpoints](#-api-endpoints)
- [WebSockets](#-websockets)
- [Variables de Entorno](#️-variables-de-entorno)
- [Docker](#-docker)
- [Arquitectura](#️-arquitectura-solid)
- [Testing](#-testing)
- [Monitoreo](#-monitoreo)
- [Scripts](#-scripts-disponibles)
- [Troubleshooting](#️-solución-de-problemas)
- [Contribución](#-contribución)

## 📋 Requisitos

- Node.js 18+
- pnpm 8+
- MongoDB 4.4+ (opcional en modo consola)
- Docker 20+ (opcional, para contenedores)

## 🔧 Instalación Rápida

```bash
# Clonar el repositorio
git clone https://github.com/emilioaray-dev/bcv-service.git
cd bcv-service

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar en desarrollo
pnpm dev
```

Para más detalles, ver [Guía de Configuración Local](docs/guides/SETUP_LOCAL.md) o [Quick Start](docs/guides/QUICK_START.md).

## 📚 Documentación

La documentación está organizada en las siguientes secciones:

### Guías
- [**Quick Start**](docs/guides/QUICK_START.md) - Inicio rápido del proyecto
- [**Setup Local**](docs/guides/SETUP_LOCAL.md) - Configuración del entorno local
- [**Secrets Management**](docs/guides/SECRETS_MANAGEMENT.md) - Gestión segura de credenciales
- [**Logging**](docs/guides/LOGGING.md) - Sistema de logging estructurado
- [**Observability**](docs/guides/OBSERVABILITY.md) - Health checks y métricas de Prometheus

### Arquitectura
- [**Plan de Arquitectura**](docs/architecture/PLAN.md) - Planificación arquitectónica
- [**Mejoras**](docs/architecture/MEJORAS.md) - Mejoras implementadas
- [**Resumen de Mejoras**](docs/architecture/RESUMEN_MEJORAS.md) - Resumen ejecutivo

### Desarrollo
- [**Branch Strategy**](docs/development/BRANCH_STRATEGY.md) - Estrategia de branching
- [**Tasks**](docs/development/TASKS.md) - Tareas y roadmap del proyecto

## 🔌 API Endpoints

### REST API

Todos los endpoints REST requieren autenticación mediante header `X-API-Key`.

#### Obtener tasa más reciente

```bash
curl -X GET http://localhost:3000/api/rate/latest \
  -H "X-API-Key: your-api-key"
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "_id": "67330d5f123abc456def7890",
    "date": "2025-11-12T00:00:00.000Z",
    "rates": [
      {
        "currency": "USD",
        "rate": 36.5,
        "name": "Dólar de los Estados Unidos de América"
      },
      {
        "currency": "EUR",
        "rate": 39.2,
        "name": "Euro"
      }
    ],
    "source": "bcv",
    "createdAt": "2025-11-12T10:30:00.000Z",
    "updatedAt": "2025-11-12T10:30:00.000Z"
  }
}
```

#### Obtener historial de tasas

```bash
curl -X GET "http://localhost:3000/api/rate/history?limit=10" \
  -H "X-API-Key: your-api-key"
```

**Parámetros opcionales:**
- `limit`: Número máximo de registros (default: 30, máx: 100)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "67330d5f123abc456def7890",
      "date": "2025-11-12T00:00:00.000Z",
      "rates": [...],
      "source": "bcv",
      "createdAt": "2025-11-12T10:30:00.000Z"
    },
    // ... más registros
  ],
  "count": 10
}
```

#### Obtener tasa por fecha

```bash
curl -X GET http://localhost:3000/api/rate/2025-11-12 \
  -H "X-API-Key: your-api-key"
```

**Formato de fecha:** YYYY-MM-DD

**Respuesta exitosa (200):** Similar a `/latest`

**Respuesta no encontrada (404):**
```json
{
  "success": false,
  "error": "No se encontró tasa para la fecha especificada"
}
```

#### Códigos de Error

- `401 Unauthorized`: API key faltante o inválida
- `403 Forbidden`: API key no autorizada
- `404 Not Found`: Recurso no encontrado
- `429 Too Many Requests`: Límite de rate excedido (100 req/15min)
- `500 Internal Server Error`: Error del servidor
- `503 Service Unavailable`: Servicio no disponible (modo consola sin DB)

### Health Checks (sin autenticación)

```bash
# Health check completo
GET /health

# Kubernetes liveness probe
GET /healthz

# Kubernetes readiness probe
GET /readyz

# Health checks individuales
GET /health/mongodb
GET /health/scheduler
GET /health/bcv
GET /health/websocket
```

**Ejemplo de respuesta `/health`:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "uptime": 86400,
  "services": {
    "mongodb": { "status": "healthy", "message": "Connected" },
    "scheduler": { "status": "healthy", "message": "Running" },
    "bcv": { "status": "healthy", "lastUpdate": "2025-11-12T10:00:00.000Z" },
    "websocket": { "status": "healthy", "connections": 5 }
  }
}
```

Ver [Documentación de Observability](docs/guides/OBSERVABILITY.md) para más detalles.

### Métricas (sin autenticación)

```bash
# Métricas de Prometheus
GET /metrics
```

**Formato:** Prometheus exposition format

## 🌐 WebSockets

Conéctate para recibir actualizaciones en tiempo real cuando cambia la tasa de cambio.

### Conexión Básica

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Conectado al servicio BCV');
});

ws.on('message', (data) => {
  const update = JSON.parse(data);
  console.log('Tasa actualizada:', update);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Desconectado del servicio BCV');
});
```

### Evento de Actualización

**Formato del evento `rate-update`:**
```json
{
  "timestamp": "2025-11-12T10:30:00.000Z",
  "rate": 36.50,
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
    }
  ],
  "change": 0.05,
  "eventType": "rate-update"
}
```

### Ejemplo con Socket.io Client

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Conectado:', socket.id);
});

socket.on('rate-update', (data) => {
  console.log('Nueva tasa USD:', data.rates.find(r => r.currency === 'USD').rate);
});

socket.on('disconnect', () => {
  console.log('Desconectado');
});
```

## 🤖 Discord Integration

El servicio puede enviar notificaciones automáticamente a un canal de Discord cuando se detectan cambios significativos en las tasas de cambio (>0.1%).

### Configuración

Para habilitar la integración con Discord, configura las siguientes variables de entorno:

```bash
# URL del webhook de Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# Opcionalmente, puedes usar Docker Secrets:
DISCORD_WEBHOOK_URL_FILE=/run/secrets/discord_webhook_url
```

### Notificaciones

Cuando se detecta un cambio en las tasas (diferencia mayor al 0.1%), el servicio enviará una notificación al canal de Discord con:

- Embed con título "🔄 Actualización de Tasas de Cambio"
- Descripción indicando que se ha detectado un cambio
- Campos para cada moneda con su nombre y tasa
- Timestamp de la actualización
- Footer con texto "Servicio BCV - Notificaciones"

### Prueba de Funcionamiento

Puedes probar la integración con Discord usando el script de prueba:

```bash
npx tsx scripts/test-discord-notification.ts
```

Este script enviará un mensaje de prueba al canal de Discord para verificar que la integración está funcionando correctamente. Ver más detalles en [DISCORD_TESTING.md](docs/guides/DISCORD_TESTING.md).

## ⚙️ Variables de Entorno

### Obligatorias

```bash
PORT=3000                              # Puerto del servicio
MONGODB_URI=mongodb://localhost:27017/bcv  # Conexión a MongoDB
BCV_WEBSITE_URL=https://www.bcv.org.ve/    # URL del sitio del BCV
API_KEY=your-secret-key-here           # API key para autenticación (puede ser múltiple separado por comas)
```

### Opcionales

```bash
# Scheduler
CRON_SCHEDULE="0 2,10,18 * * *"  # Cada 8 horas (2am, 10am, 6pm)

# Entorno
NODE_ENV=development              # development | production
SAVE_TO_DATABASE=true             # Habilitar almacenamiento en DB (false para modo consola)

# Logging
LOG_LEVEL=info                    # error | warn | info | http | debug
DEV_FILE_LOGS=false              # Escribir logs a archivo en desarrollo

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # Ventana de tiempo (15 min default)
RATE_LIMIT_MAX_REQUESTS=100      # Máximo de requests por ventana
```

### Docker Secrets (Recomendado para Producción)

En lugar de variables de entorno, usa archivos de secretos:

```bash
MONGODB_URI_FILE=/run/secrets/mongodb_uri
API_KEYS_FILE=/run/secrets/api_keys
```

Ver [Secrets Management](docs/guides/SECRETS_MANAGEMENT.md) para gestión segura de credenciales.

## 🐳 Docker

### Desarrollo con Docker Compose

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f bcv-service

# Detener servicios
docker-compose down
```

### Producción

```bash
# Construir imagen
docker build -t bcv-service:latest .

# Ejecutar contenedor
docker run -d \
  --name bcv-service \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://mongo:27017/bcv \
  -e API_KEY=your-secret-key \
  -e NODE_ENV=production \
  bcv-service:latest

# Ver logs
docker logs -f bcv-service

# Health check
docker exec bcv-service curl http://localhost:3000/healthz
```

### Docker con Secrets

```bash
# Crear secrets
echo "mongodb://user:pass@host:27017/bcv" | docker secret create mongodb_uri -
echo "key1,key2,key3" | docker secret create api_keys -

# Ejecutar con secrets
docker service create \
  --name bcv-service \
  --secret mongodb_uri \
  --secret api_keys \
  -e MONGODB_URI_FILE=/run/secrets/mongodb_uri \
  -e API_KEYS_FILE=/run/secrets/api_keys \
  -p 3000:3000 \
  bcv-service:latest
```

## 🏗️ Arquitectura SOLID

El proyecto implementa los principios SOLID con Inversify para Dependency Injection:

```
src/
├── Application.ts              # Bootstrap de la aplicación
├── config/
│   ├── inversify.config.ts    # Configuración del contenedor IoC
│   ├── types.ts               # Symbols para DI
│   └── secrets.ts             # Gestión de secretos
├── interfaces/                # Abstracciones (DIP - Dependency Inversion)
│   ├── IBCVService.ts        # Interfaz para scraping BCV
│   ├── IMongoService.ts      # Interfaz para persistencia
│   ├── IWebSocketService.ts  # Interfaz para WebSockets
│   ├── ISchedulerService.ts  # Interfaz para tareas programadas
│   ├── IHealthCheckService.ts # Interfaz para health checks
│   └── IMetricsService.ts    # Interfaz para métricas
├── services/                  # Implementaciones de servicios
│   ├── bcv.service.ts        # Scraping del BCV
│   ├── mongo.service.ts      # Persistencia en MongoDB
│   ├── websocket.service.ts  # Servidor WebSocket
│   ├── scheduler.service.ts  # Cron jobs
│   ├── health-check.service.ts # Health checks
│   └── metrics.service.ts    # Métricas de Prometheus
├── controllers/               # Controladores HTTP
│   ├── rate.controller.ts    # Endpoints de tasas
│   ├── health.controller.ts  # Endpoints de health
│   └── metrics.controller.ts # Endpoint de métricas
├── middleware/                # Middleware de Express
│   └── auth.middleware.ts    # Autenticación API Key
└── utils/                     # Utilidades compartidas
    └── logger.ts             # Logger con Winston
```

**Configuración de seguridad y rendimiento:**
- **Security Headers**: Configurados en `src/Application.ts` con Helmet.js
- **Compresión de respuestas**: Configurada en `src/Application.ts` con compression middleware

### Flujo de Datos

```
┌─────────────────┐
│  Cron Scheduler │ ──────────┐
└─────────────────┘           │
                              ▼
                    ┌──────────────────┐
                    │   BCV Service    │
                    │  (Web Scraping)  │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌───────────────┐   ┌──────────────┐
            │ Mongo Service │   │  WebSocket   │
            │  (Database)   │   │   Service    │
            └───────────────┘   └──────────────┘
                    │                   │
                    ▼                   ▼
            ┌───────────────┐   ┌──────────────┐
            │  API REST     │   │   Clients    │
            │  (Express)    │   │  (Real-time) │
            └───────────────┘   └──────────────┘
```

**Beneficios de la arquitectura:**
- ✅ Testabilidad mejorada con mocking sencillo
- ✅ Desacoplamiento entre componentes
- ✅ Extensibilidad sin modificar código existente
- ✅ Cumplimiento de principios SOLID
- ✅ Fácil mantenimiento y escalabilidad

## 🧪 Testing

```bash
# Ejecutar todos los tests
pnpm test

# Tests con coverage
pnpm test:coverage

# Tests en modo watch
pnpm test:watch

# UI de tests
pnpm test:ui
```

### Coverage Actual

```
File                     | % Stmts | % Branch | % Funcs | % Lines
-------------------------|---------|----------|---------|--------
All files                |   66.26 |    65.51 |   48.38 |   66.04
 services/               |   77.91 |    72.72 |   57.14 |   77.5
  bcv.service.ts         |   98.75 |    93.33 |     100 |   98.68
  mongo.service.ts       |   39.28 |       25 |      25 |   39.28
  websocket.service.ts   |   93.75 |      100 |      75 |   93.75
 middleware/             |   86.95 |      100 |      50 |   86.95
  auth.middleware.ts     |   86.95 |      100 |      50 |   86.95
 utils/                  |     100 |      100 |     100 |     100
  logger.ts              |     100 |      100 |     100 |     100
```

**Tests:** 55 passing

## 📊 Monitoreo

### Prometheus + Grafana

1. **Configurar Prometheus** para scraping del endpoint `/metrics`:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'bcv-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['bcv-service:3000']
```

2. **Crear dashboards** en Grafana con las métricas expuestas
3. **Configurar alertas** basadas en las métricas de negocio

Ver [Documentación de Observability](docs/guides/OBSERVABILITY.md) para configuración detallada.

### Métricas Disponibles

**HTTP Metrics:**
- `http_requests_total`: Total de requests HTTP (por método, ruta, código de estado)
- `http_request_duration_seconds`: Duración de requests HTTP (histogram)

**Business Metrics:**
- `bcv_websocket_connected_clients`: Número de clientes WebSocket conectados (gauge)
- `bcv_update_total`: Total de actualizaciones de tasa (counter, success/failure)
- `bcv_latest_rate`: Última tasa de cambio obtenida (gauge, por moneda)

**Default Metrics:**
- `process_cpu_user_seconds_total`
- `process_resident_memory_bytes`
- `nodejs_eventloop_lag_seconds`
- `nodejs_heap_size_total_bytes`
- Y más...

### Ejemplo de Query Prometheus

```promql
# Tasa de requests por segundo
rate(http_requests_total[5m])

# Latencia p95 de requests
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Clientes WebSocket activos
bcv_websocket_connected_clients

# Rate de actualizaciones exitosas
rate(bcv_update_total{status="success"}[1h])
```

## 🔍 Scripts Disponibles

```bash
pnpm build          # Compilar TypeScript a JavaScript
pnpm start          # Iniciar en producción (requiere build previo)
pnpm dev            # Iniciar en desarrollo con auto-reload (tsx)
pnpm test           # Ejecutar todos los tests
pnpm test:coverage  # Tests con reporte de coverage
pnpm test:ui        # Abrir UI de Vitest
pnpm test:watch     # Tests en modo watch
pnpm lint           # Verificar código con Biome
pnpm lint:fix       # Corregir errores de código automáticamente
pnpm format         # Formatear código con Biome
pnpm format:check   # Verificar formato sin modificar archivos
```

## 💡 Modo Consola

Para desarrollo/testing sin MongoDB:

```bash
SAVE_TO_DATABASE=false pnpm dev
```

**En este modo:**
- ❌ No se conecta a MongoDB
- ✅ Scraping del BCV funciona normalmente
- ✅ Logs muestran las tasas obtenidas
- ✅ WebSockets siguen operativos
- ✅ Health checks funcionan (MongoDB aparece como unhealthy)
- ❌ API REST retorna error 503 (Service Unavailable)

**Útil para:**
- Testing del scraper sin BD
- Desarrollo de features no relacionadas a persistencia
- Debugging del sistema de logging
- Validación de WebSockets

## 🛠️ Solución de Problemas

### Puerto en uso

```bash
# Encontrar proceso usando el puerto
lsof -i :3000

# Terminar proceso
kill -9 <PID>

# O cambiar puerto
PORT=3001 pnpm dev
```

### Problemas de scraping del BCV

**Síntomas:**
- Error "Failed to fetch BCV rate"
- Tasa no se actualiza

**Soluciones:**
1. Verificar conectividad:
   ```bash
   curl -I https://www.bcv.org.ve/
   ```
2. El sitio del BCV puede haber cambiado su estructura HTML
3. Revisar logs detallados:
   ```bash
   LOG_LEVEL=debug pnpm dev
   ```
4. Verificar logs en archivo:
   ```bash
   tail -f logs/combined.log
   ```

### MongoDB no conecta

**Síntomas:**
- Error "Failed to connect to MongoDB"
- Health check de MongoDB unhealthy

**Soluciones:**
1. Verificar que MongoDB está corriendo:
   ```bash
   # Con Docker
   docker ps | grep mongo

   # O servicio local
   systemctl status mongod
   ```
2. Verificar URI de conexión en `.env`
3. Verificar credenciales si usas autenticación
4. Verificar firewall y reglas de red

### Rate Limit alcanzado

**Síntomas:**
- Error 429 "Too Many Requests"

**Soluciones:**
1. Esperar 15 minutos (ventana de rate limit)
2. Usar múltiples API keys si es legítimo
3. Ajustar configuración:
   ```bash
   RATE_LIMIT_WINDOW_MS=1800000  # 30 min
   RATE_LIMIT_MAX_REQUESTS=200   # 200 req
   ```

### Problemas de certificados SSL

**En desarrollo:**
- Axios maneja certificados automáticamente
- Si hay problemas, usar `NODE_TLS_REJECT_UNAUTHORIZED=0` (solo desarrollo)

**En producción:**
- Configurar certificados válidos
- Verificar cadena de certificados
- Actualizar CA certificates del sistema

### WebSocket no conecta

**Soluciones:**
1. Verificar que el servidor está corriendo
2. Verificar que el puerto está abierto
3. Si usas proxy/load balancer, configurar WebSocket support
4. Verificar firewall

Ver [Setup Local](docs/guides/SETUP_LOCAL.md) para más troubleshooting detallado.

## 🚀 Roadmap

- [x] **Fase 1:** Security & Configuration
- [x] **Fase 2:** Structured Logging
- [x] **Fase 3:** Testing Infrastructure
- [x] **Fase 4:** Observability (Health Checks + Prometheus)
- [ ] **Fase 5:** CI/CD Pipeline
- [ ] **Fase 6:** Documentation (En progreso)
- [x] **Fase 7:** Performance & Optimization (Security Headers + Compression)
- [ ] **Fase 8:** Advanced Features (Multi-source support, GraphQL)

Ver [Tasks Roadmap](docs/development/TASKS.md) para más detalles.

## 🤝 Contribución

Las contribuciones son bienvenidas! Por favor sigue estos pasos:

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/amazing-feature`)
3. Seguir convenciones de código (Biome)
4. Escribir tests para nuevas features
5. Asegurar que todos los tests pasen (`pnpm test`)
6. Commit con convención semántica:
   - `feat:` nueva funcionalidad
   - `fix:` corrección de bug
   - `docs:` cambios en documentación
   - `refactor:` refactorización de código
   - `test:` añadir o modificar tests
   - `chore:` cambios menores (deps, config)
7. Push a la rama (`git push origin feature/amazing-feature`)
8. Abrir Pull Request

Ver [Branch Strategy](docs/development/BRANCH_STRATEGY.md) para más detalles sobre el workflow.

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 🔗 Links Útiles

- [Sitio oficial BCV](https://www.bcv.org.ve/)
- [Documentación de Prometheus](https://prometheus.io/docs/)
- [Inversify Documentation](https://inversify.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Socket.io Documentation](https://socket.io/docs/)
- [Biome Documentation](https://biomejs.dev/)

## 👤 Autor

**Celsius Aray**
- GitHub: [@emilioaray-dev](https://github.com/emilioaray-dev)
- Email: emilioaray@gmail.com

## 🙏 Agradecimientos

- Banco Central de Venezuela por proporcionar los datos oficiales
- Comunidad de TypeScript y Node.js
- Contribuidores y usuarios del proyecto

---

**Versión:** 1.0.0
**Última actualización:** Noviembre 2025
**Estado:** Production Ready 🚀
