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
- ✅ **Apagado gracioso** con cierre ordenado de recursos y conexiones

### Arquitectura y Calidad
- ✅ **Arquitectura SOLID** con Inversify para Dependency Injection
- ✅ Logging estructurado con Winston
- ✅ Testing con Vitest (139 tests pasando)
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
- [API Documentation (Swagger)](#-api-documentation-swagger)
- [API Endpoints](#-api-endpoints)
- [WebSockets](#-websockets)
- [Variables de Entorno](#️-variables-de-entorno)
- [Docker](#-docker)
- [Arquitectura](#️-arquitectura-solid)
- [Testing](#-testing)
- [Monitoreo](#-monitoreo)
- [Scripts](#-scripts-disponibles)
- [Troubleshooting](#️-solución-de-problemas)
  - [Apagado Gracioso (Graceful Shutdown)](#apagado-gracioso-graceful-shutdown)
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
- [**Webhook Integration**](docs/guides/WEBHOOK_INTEGRATION.md) - Integración con webhooks HTTP
- [**Confirmación de Webhooks**](GUIA_CONFIRMACION_WEBHOOKS.md) - Sistema de tracking y notificaciones de ciclo de vida
- [**Cola de Webhooks**](GUIA_COLA_WEBHOOKS.md) - Sistema de reintentos persistente

### Arquitectura
- [**Plan de Arquitectura**](docs/architecture/PLAN.md) - Planificación arquitectónica
- [**Mejoras**](docs/architecture/MEJORAS.md) - Mejoras implementadas
- [**Resumen de Mejoras**](docs/architecture/RESUMEN_MEJORAS.md) - Resumen ejecutivo
- [**Mejoras y Recomendaciones**](MEJORAS_Y_RECOMENDACIONES.md) - 25 tickets priorizados de mejoras

### Desarrollo
- [**Branch Strategy**](docs/development/BRANCH_STRATEGY.md) - Estrategia de branching
- [**Tasks**](docs/development/TASKS.md) - Tareas y roadmap del proyecto

## 📖 API Documentation (Swagger)

El servicio incluye documentación interactiva de la API mediante **Swagger UI**, que permite:

- ✅ Explorar todos los endpoints disponibles
- ✅ Ver esquemas de request/response
- ✅ Probar endpoints directamente desde el navegador
- ✅ Consultar códigos de error y autenticación
- ✅ Acceso sin autenticación ni rate limiting

### Acceso a Swagger UI

**Desarrollo local:**
```
http://localhost:3000/docs
```

**Producción:**
```
http://your-server-ip:3000/docs
```

### Características

- **Sin autenticación**: No requiere API Key para visualizar la documentación
- **Interactivo**: Permite probar endpoints directamente desde la interfaz
- **OpenAPI 3.0**: Especificación estándar de la industria
- **Esquemas completos**: Documentación detallada de todos los modelos de datos
- **Ejemplos de uso**: Requests y responses de ejemplo para cada endpoint

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

El servicio implementa una arquitectura de health checks estilo Kubernetes con 3 niveles:

```bash
# 1. Liveness Probe - Verifica que el proceso Node.js está vivo (< 50ms)
GET /healthz

# 2. Readiness Probe - Verifica que el servicio puede recibir tráfico (< 500ms)
GET /readyz

# 3. Full Health Check - Diagnóstico detallado de todos los componentes
GET /health

# Health checks individuales (bajo demanda)
GET /health/mongodb    # Verifica conexión a MongoDB
GET /health/scheduler  # Verifica estado del cron job
GET /health/bcv        # Verifica scraping del BCV (hace scraping real)
GET /health/websocket  # Verifica servidor WebSocket
GET /health/redis      # Verifica conexión a Redis cache
```

**Diferencias entre los endpoints:**
- **`/healthz`**: Ultra-rápido, sin I/O, solo verifica que el proceso responde. Usado por Docker/K8s para decidir si reiniciar el contenedor.
- **`/readyz`**: Pings rápidos solo a dependencias críticas (MongoDB). Usado por Docker/K8s para decidir si enviar tráfico.
- **`/health`**: Checks completos de MongoDB, Redis, Scheduler y WebSocket. NO incluye scraping del BCV (use `/health/bcv` para eso).

**Ejemplo de respuesta `/healthz`:**
```
OK
```

**Ejemplo de respuesta `/readyz`:**
```
READY
```

**Ejemplo de respuesta `/health`:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "uptime": 86400,
  "checks": {
    "mongodb": { "status": "healthy", "message": "MongoDB connection is healthy" },
    "redis": { "status": "healthy", "message": "Redis is operational", "details": { "enabled": true, "connected": true } },
    "scheduler": { "status": "healthy", "message": "Scheduler is running" },
    "websocket": { "status": "healthy", "message": "WebSocket service is healthy", "details": { "connectedClients": 5 } }
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

## 🔔 Webhook Notifications

El servicio puede enviar notificaciones por HTTP Webhook no solo para cambios en tasas de cambio, sino también para eventos de estado del servicio y despliegues.

### Sistema de estado persistente de notificaciones

El servicio implementa un sistema de estado persistente de notificaciones que:
- Almacena en MongoDB la última tasa notificada para persistencia a través de reinicios
- Usa Redis como capa de caché para operaciones rápidas de lectura/escritura
- Previene notificaciones duplicadas al reiniciar el servicio
- Usa una diferencia absoluta (≥0.01) en lugar de porcentaje para detectar cambios significativos
- Rastrea cambios en todas las monedas (USD, EUR, CNY, TRY, RUB, etc.)

### 📊 Webhook Delivery Tracking (Nuevo)

El servicio incluye un sistema de tracking persistente de entregas de webhooks que:
- **Almacena historial completo** de todas las entregas (exitosas y fallidas) en MongoDB
- **API endpoints** para consultar entregas por evento, URL, o fecha
- **Estadísticas de entregas** con tasas de éxito/fallo y tiempos promedio
- **Debugging mejorado** con logs detallados de cada intento
- **Métricas Prometheus** para monitoreo en tiempo real

Ver [GUIA_CONFIRMACION_WEBHOOKS.md](./GUIA_CONFIRMACION_WEBHOOKS.md) para detalles de implementación.

### 🔄 Webhook Retry Queue (Nuevo)

Sistema de cola persistente para webhooks fallidos que:
- **Sobrevive a reinicios** del servidor (cola en MongoDB)
- **Reintentos automáticos** con backoff exponencial (5, 10, 20, 40, 60 minutos)
- **Worker automático** que procesa la cola cada minuto
- **Máximo 5 intentos** antes de marcar como fallido permanentemente
- **Priorización** de eventos (high/normal/low)
- **Limpieza automática** de webhooks completados antiguos

**Ejemplo de flujo:**
```
Webhook falla después de 3 intentos inmediatos
    ↓
Agregado a cola persistente en MongoDB
    ↓
Worker reintenta cada X minutos (backoff exponencial)
    ↓
Éxito → Marcado como completado
Fallo después de 5 intentos → Marcado como fallido permanentemente
```

Ver [GUIA_COLA_WEBHOOKS.md](./GUIA_COLA_WEBHOOKS.md) para detalles de implementación.

### 🚀 Lifecycle Notifications (Nuevo)

Notificaciones automáticas del ciclo de vida del servidor:
- **Startup**: Notifica cuando el servidor inicia exitosamente
- **Shutdown**: Notifica cuando el servidor se apaga graciosamente (SIGTERM, SIGINT)
- **Heartbeat** (opcional): Notificaciones periódicas de que el servidor sigue vivo
- **Uncaught Exceptions**: Notifica antes de que el servidor se caiga por errores no manejados

Ver [GUIA_CONFIRMACION_WEBHOOKS.md](./GUIA_CONFIRMACION_WEBHOOKS.md) sección "Lifecycle Notifier" para detalles.

### Configuración

Para habilitar la integración de webhooks, configura las siguientes variables de entorno:

```bash
# URL del webhook genérico (usado para tasas de cambio)
WEBHOOK_URL=https://your-webhook-url.com/webhook

# URLs específicas para diferentes tipos de notificaciones (opcional)
# SERVICE_STATUS_WEBHOOK_URL=https://your-webhook-url.com/service-status
# DEPLOYMENT_WEBHOOK_URL=https://your-webhook-url.com/deployment

# Clave secreta para firmar las solicitudes (recomendado para producción)
WEBHOOK_SECRET=your-super-secret-key
```

### Tipos de Eventos

#### Eventos de Tasas de Cambio
- `rate.updated`: Cuando se obtienen nuevas tasas (incluso si no han cambiado)
- `rate.changed`: Cuando las tasas han cambiado significativamente (diferencia absoluta >= 0.01 en cualquier moneda)

#### Eventos de Estado del Servicio
- `service.healthy`: Cuando el servicio cambia a estado saludable
- `service.unhealthy`: Cuando el servicio cambia a estado no saludable
- `service.degraded`: Cuando el servicio cambia a estado degradado

#### Eventos de Despliegue
- `deployment.success`: Cuando el servicio se inicia correctamente
- `deployment.failure`: Cuando el servicio se detiene (en el cierre gracioso)

### Seguridad

Todas las solicitudes de webhook incluyen una firma HMAC-SHA256 en el header `X-Webhook-Signature` para verificar autenticidad.

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

# Swagger/OpenAPI Documentation
SWAGGER_PROD_URL=https://bcv-api.yourdomain.com  # URL del servidor de producción para Swagger (default: https://api.example.com)
# Nota: La lista de servidores en Swagger se adapta dinámicamente según NODE_ENV:
# - En desarrollo: muestra servidores de desarrollo y producción
# - En producción: muestra solo servidor de producción
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

### Versionamiento Automático con Conventional Commits

El proyecto implementa versionamiento semántico 100% automático usando **Conventional Commits + Semantic Release**.

#### 🎯 Flujo Automatizado (CI/CD Pipeline)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Desarrollador hace commit con formato convencional         │
│     git commit -m "feat: add new feature"                      │
│     git push origin main                                       │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. STAGE 1: Validate & Test (< 2 min)                         │
│     ✓ Biome linting                                            │
│     ✓ TypeScript type checking                                 │
│     ✓ 111 unit tests                                           │
│     ✓ Build project                                            │
│     → Si falla, pipeline se detiene (NO se versiona)           │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. STAGE 2: Semantic Release (< 30 sec)                       │
│     → Analiza commits desde última versión                     │
│     → Determina tipo de versión:                               │
│       • feat: nueva funcionalidad → MINOR (1.0.0 → 1.1.0)      │
│       • fix: corrección bug → PATCH (1.0.0 → 1.0.1)            │
│       • BREAKING CHANGE → MAJOR (1.0.0 → 2.0.0)                │
│     → Actualiza package.json                                   │
│     → Genera CHANGELOG.md                                      │
│     → Crea tag de Git (v1.1.0)                                 │
│     → Crea GitHub Release                                      │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. STAGE 3: Build & Publish Docker Image (< 3 min)            │
│     → Construye imagen Docker                                  │
│     → Publica con tags semánticos:                             │
│       • ghcr.io/emilioaray-dev/bcv-service:1.1.0 (exacto)      │
│       • ghcr.io/emilioaray-dev/bcv-service:1.1 (minor)         │
│       • ghcr.io/emilioaray-dev/bcv-service:1 (major)           │
│       • ghcr.io/emilioaray-dev/bcv-service:latest              │
│       • ghcr.io/emilioaray-dev/bcv-service:main                │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. STAGE 4: Deploy to Proxmox (< 1 min)                       │
│     → SSH a Proxmox VM                                         │
│     → Pull nueva imagen                                        │
│     → Restart contenedores                                     │
│     → Verify health                                            │
│     ✅ Deployment exitoso                                      │
└─────────────────────────────────────────────────────────────────┘
```

#### 📝 Formato de Commits (Conventional Commits Preset)

El proyecto usa el preset **`conventionalcommits`** siguiendo la especificación estándar de [Conventional Commits](https://www.conventionalcommits.org).

**Tipos de commits que incrementan versión:**

```bash
# Nueva funcionalidad (incrementa MINOR: 1.0.0 → 1.1.0)
git commit -m "feat: add email notifications for rate changes"
git commit -m "feat(websocket): add reconnection logic"

# Corrección de bug (incrementa PATCH: 1.0.0 → 1.0.1)
git commit -m "fix: resolve timeout in BCV scraping"
git commit -m "fix(health): correct MongoDB ping timeout"

# Breaking change (incrementa MAJOR: 1.0.0 → 2.0.0)
git commit -m "feat!: change API response format

BREAKING CHANGE: API responses now use 'data' field"

# Refactorización (incrementa PATCH: 1.0.0 → 1.0.1)
git commit -m "refactor: improve error handling in services"
git commit -m "refactor(mongo): optimize query performance"

# Mejoras de rendimiento (incrementa PATCH: 1.0.0 → 1.0.1)
git commit -m "perf: reduce scraping time by 30%"
git commit -m "perf(cache): implement Redis caching for rates"
```

**Tipos de commits que NO incrementan versión:**

```bash
git commit -m "docs: update README with new examples"
git commit -m "style: format code with Biome"
git commit -m "test: add health check tests"
git commit -m "chore: update dependencies"
git commit -m "build: configure Docker image optimization"
git commit -m "ci: add GitHub Actions workflow"
```

**Ventajas del preset `conventionalcommits`:**
- ✅ Especificación estándar universal (no específica de Angular)
- ✅ Incluye `refactor` y `perf` en el CHANGELOG automáticamente
- ✅ Más flexible y configurable
- ✅ Mejor soporte para tipos personalizados
- ✅ Ampliamente adoptado en la industria

**📚 Guía Completa:** Ver [Conventional Commits Guide](docs/guides/CONVENTIONAL_COMMITS.md)

#### 🎯 Mejores Prácticas de la Industria

✅ **Lo que hace el proyecto:**
- Tests OBLIGATORIOS antes de versionar (linting, type-check, tests, build)
- Versionamiento basado en commits (semántico y automático)
- CHANGELOG generado automáticamente
- GitHub Releases automáticos
- Tags de Git automáticos
- Zero-downtime deployment

✅ **Ventajas:**
- No hay commits manuales de versionamiento
- Historial claro y semántico
- Rollbacks fáciles con tags
- Trazabilidad perfecta (commit → versión → deployment)
- CI/CD completo y automático

**Usar versión específica:**
```bash
# Producción (siempre usa latest)
docker-compose up -d

# Usar versión específica
DOCKER_IMAGE=ghcr.io/emilioaray-dev/bcv-service:1.1.0 docker-compose up -d

# Rollback a versión anterior
DOCKER_IMAGE=ghcr.io/emilioaray-dev/bcv-service:1.1.1 docker-compose up -d
```

#### 🔄 Proceso de Desarrollo

```bash
# 1. Desarrollar funcionalidad
git checkout -b feature/my-feature
# ... hacer cambios ...

# 2. Commit con formato convencional
git commit -m "feat(api): add rate limiting middleware"

# 3. Push a main
git push origin main

# 4. GitHub Actions hace TODO automáticamente:
#    - Tests
#    - Versionamiento (ej: 1.0.2 → 1.1.0)
#    - Build Docker
#    - Deploy a Proxmox
#    - GitHub Release
```

#### 📊 Versionamiento Automático Sincronizado

La versión se sincroniza automáticamente en:
- ✅ `package.json`
- ✅ Swagger API Documentation (`/docs`)
- ✅ Docker image tags
- ✅ GitHub Releases
- ✅ CHANGELOG.md
- ✅ Git tags

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
│   ├── metrics.service.ts    # Métricas de Prometheus
│   ├── webhook-delivery.service.ts # Tracking de entregas de webhooks
│   ├── webhook-queue.service.ts # Cola de reintentos persistente
│   └── lifecycle-notifier.service.ts # Notificaciones de startup/shutdown
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

**Apagado Gracioso (Graceful Shutdown):**
- **Manejo de señales**: El servicio maneja las señales SIGTERM y SIGINT para cerrarse ordenadamente
- **Cierre de conexiones**: Cierra todas las conexiones de Redis, MongoDB y WebSocket antes de apagar
- **Liberación de recursos**: Asegura la desconexión de todos los servicios antes de finalizar el proceso
- **Implementación**: Utiliza el método `close()` en la clase `Application` para liberar recursos

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

### Apagado Gracioso (Graceful Shutdown)

El servicio implementa un sistema de apagado gracioso que asegura el cierre ordenado de todos los recursos antes de finalizar el proceso. Esto es especialmente importante en entornos de contenedores (Docker, Kubernetes) y en despliegues automatizados.

**Funcionalidades:**
- **Manejo de señales**: El servicio responde a las señales SIGTERM y SIGINT
- **Cierre de conexiones**: Cierra de forma segura todas las conexiones activas
- **Liberación de recursos**: Desconecta Redis, MongoDB, detiene el scheduler y cierra el servidor HTTP
- **Finalización limpia**: Asegura que no hay procesos pendientes antes de salir

**Comportamiento durante apagado:**
1. Recibe señal de sistema (SIGTERM/SIGINT)
2. Detiene nuevas conexiones
3. Finaliza procesamiento de tareas en curso
4. Cierra conexiones activas
5. Desconecta servicios (Redis, MongoDB, etc.)
6. Cierra servidor HTTP
7. Finaliza proceso con código 0

**Útil para:**
- Despliegues sin tiempo de inactividad (zero-downtime deployments)
- Entornos de contenedores (Docker, Kubernetes)
- Operaciones de mantenimiento programado

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
6. Commit siguiendo **Conventional Commits** (preset `conventionalcommits`):

   **Incrementan versión:**
   - `feat:` nueva funcionalidad → MINOR (1.0.0 → 1.1.0)
   - `fix:` corrección de bug → PATCH (1.0.0 → 1.0.1)
   - `refactor:` refactorización de código → PATCH (1.0.0 → 1.0.1)
   - `perf:` mejora de rendimiento → PATCH (1.0.0 → 1.0.1)
   - `BREAKING CHANGE:` cambio incompatible → MAJOR (1.0.0 → 2.0.0)

   **NO incrementan versión:**
   - `docs:` cambios en documentación
   - `test:` añadir o modificar tests
   - `chore:` cambios menores (deps, config)
   - `style:` formato de código
   - `build:` cambios en build
   - `ci:` cambios en CI/CD

7. Push a la rama (`git push origin feature/amazing-feature`)
8. Abrir Pull Request

**Importante:** El versionamiento es 100% automático basado en los commits. No edites manualmente `package.json` ni crees tags de versión.

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

**Versión:** 3.0.0
**Última actualización:** Noviembre 2025
**Estado:** Production Ready 🚀

## 🆕 Novedades en v3.0.0

### Webhook Enhancements
- ✅ **Webhook Delivery Tracking**: Historial completo de entregas con API para consultas
- ✅ **Webhook Retry Queue**: Cola persistente con reintentos automáticos
- ✅ **Lifecycle Notifications**: Notificaciones de startup/shutdown del servidor

### Documentación
- ✅ Guías completas de implementación (GUIA_CONFIRMACION_WEBHOOKS.md, GUIA_COLA_WEBHOOKS.md)
- ✅ 25 tickets de mejoras priorizadas (MEJORAS_Y_RECOMENDACIONES.md)
- ✅ Documentación actualizada con nuevos servicios
