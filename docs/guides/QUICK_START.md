# Quick Start - BCV Service

Guía rápida para comenzar a usar y desarrollar el servicio de tasas de cambio del BCV.

## 📊 Estado Actual

```
✅ Arquitectura SOLID implementada
✅ Sistema de notificaciones multi-canal (WebSocket, Discord, Webhook)
✅ Observabilidad completa (Prometheus, Health checks, Logging)
✅ Seguridad implementada (API Key, Rate limiting, Helmet)
✅ Versionamiento automático con Conventional Commits
✅ Documentación completa del API en Swagger
```

**Versión actual**: 2.1.0
**Último release**: Conventional Commits + Semantic Release automatizado

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- pnpm 8+
- MongoDB 4.4+ (opcional en modo consola)
- Docker 20+ (opcional para contenedores)

### Instalación Rápida

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

### Configuración Básica

Variables esenciales en `.env`:
- `PORT`: Puerto del servicio (default: 3000)
- `MONGODB_URI`: Conexión a MongoDB
- `API_KEY`: API key para autenticación
- `BCV_WEBSITE_URL`: URL del sitio del BCV

---

## 🛠️ Comandos de Desarrollo

### Desarrollo local
```bash
# Iniciar modo desarrollo (watch mode)
pnpm dev

# Build del proyecto
pnpm build

# Ejecutar build
pnpm start

# Linting con Biome
pnpm lint
pnpm lint:fix

# Formateo de código
pnpm format

# Tests unitarios
pnpm test
pnpm test:watch
pnpm test:ui

# Cobertura de tests
pnpm test:coverage
```

### Docker
```bash
# Build imagen Docker
pnpm docker:build

# Run container
pnpm docker:run

# Docker Compose (desarrollo)
docker-compose up -d
docker-compose logs -f bcv-service
docker-compose down
```

### Docker en Producción
```bash
# Con Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Con Docker Secrets
echo "your-mongodb-uri" | docker secret create mongodb_uri -
echo "your-api-key" | docker secret create api_keys -
```

---

## 🔐 Seguridad

### API Key Authentication
Todos los endpoints REST requieren header `X-API-Key`:
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/rate/latest
```

### Rate Limiting
- Límite: 100 requests por 15 minutos por IP
- Aplica solo a rutas `/api/*`
- Headers estándar incluidos

### Headers de Seguridad
- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-XSS-Protection

---

## 📡 Endpoints API

### REST API
- `GET /api/rate/latest` - Tasa más reciente
- `GET /api/rate/history` - Historial (parámetro `limit` opcional)
- `GET /api/rate/:date` - Tasa para fecha específica (YYYY-MM-DD)
- `GET /healthz` - Health check liveness
- `GET /readyz` - Health check readiness
- `GET /health` - Health check completo
- `GET /metrics` - Métricas Prometheus
- `GET /docs` - Documentación Swagger UI

### WebSocket
Conexión en `ws://localhost:3000` para notificaciones en tiempo real

---

## 📈 Observabilidad

### Métricas Prometheus
Endpoint: `http://localhost:3000/metrics`
- Métricas de requests HTTP
- Conexiones WebSocket
- Operaciones de scraping BCV
- Métricas del proceso Node.js

### Health Checks Kubernetes
- `/healthz`: Liveness probe (rápido, sin I/O)
- `/readyz`: Readiness probe (conectividad BD)
- `/health`: Diagnóstico completo

### Logging
- Formato JSON para producción
- Formato colorizado para desarrollo
- 5 niveles: error, warn, info, http, debug
- Rotación diaria de archivos

---

## 🔔 Notificaciones

### WebSocket
Notificaciones en tiempo real a clientes conectados

### Discord
Notificaciones a canales de Discord cuando cambian las tasas

### HTTP Webhooks
Notificaciones a endpoints HTTP con firma HMAC-SHA256

### Sistema Persistente de Estado
- Prevención de notificaciones duplicadas al reiniciar
- Detección de cambios significativos (umbral ≥0.01)
- Arquitectura dual-layer: MongoDB + Redis cache opcional

---

## 🏗️ Arquitectura

### Patrones Implementados
- **SOLID**: Arquitectura completa con Inversify
- **Dependency Injection**: Inversify IoC container
- **Repository Pattern**: MongoDB service
- **Observer Pattern**: WebSocket notifications
- **Strategy Pattern**: Diferentes estrategias de configuración

### Servicios Principales
- `BCVService`: Scraping del BCV
- `MongoService`: Persistencia
- `WebSocketService`: Comunicación real-time
- `SchedulerService`: Tareas programadas
- `MetricsService`: Métricas Prometheus
- `NotificationStateService`: Estado persistente de notificaciones

---

## 🔄 Versionamiento Automático

El proyecto implementa **Conventional Commits + Semantic Release**:
- Commits con formato convencional generan versiones automáticamente
- `feat`: Nueva funcionalidad → MINOR (1.0.0 → 1.1.0)
- `fix`: Corrección de bug → PATCH (1.0.0 → 1.0.1)
- `BREAKING CHANGE`: Cambio importante → MAJOR (1.0.0 → 2.0.0)

---

## 🔧 Configuración Avanzada

### Variables de Entorno
- `CRON_SCHEDULE`: Programación scraping (default: "0 2,10,18 * * *")
- `NODE_ENV`: Entorno (development/production)
- `SAVE_TO_DATABASE`: Habilitar almacenamiento (default: true)
- `LOG_LEVEL`: Nivel logging (error/warn/info/http/debug)
- `CACHE_ENABLED`: Redis cache (default: true)
- `DISCORD_WEBHOOK_URL`: URL webhook Discord
- `WEBHOOK_URL`: URL webhook genérico
- `WEBHOOK_SECRET`: Clave para firma HMAC

### Docker Secrets
Soporte para secrets en archivos:
- `MONGODB_URI_FILE`
- `API_KEYS_FILE`
- `DISCORD_WEBHOOK_URL_FILE`
- `WEBHOOK_URL_FILE`

---

## 🐛 Solución de Problemas

### Problemas Comunes

**Error SSL en scraping**: Ya resuelto con agente HTTPS personalizado
**Notificaciones duplicadas**: Sistema persistente ya implementado
**Conexión a BD**: Verificar MONGODB_URI y conectividad
**Rate limiting**: Ajustar según necesidades en producción

### Comandos de Diagnóstico
```bash
# Verificar métricas
curl http://localhost:3000/metrics

# Verificar health checks
curl http://localhost:3000/health

# Logs del servicio
docker-compose logs bcv-service
```

---

## 📚 Documentación Adicional

- **README.md**: Documentación completa del proyecto
- **API Docs**: `/docs` para documentación interactiva
- **Guías**: En carpeta `/docs/guides/`
- **Arquitectura**: En carpeta `/docs/architecture/`

---

## 🎯 Próximos Pasos

1. **Personalizar configuración**: Ajustar variables de entorno
2. **Probar API**: Usar endpoints con tu API Key
3. **Configurar notificaciones**: WebSocket, Discord o Webhooks
4. **Monitorear**: Configurar Prometheus/Grafana para métricas
5. **Desplegar**: Usar Docker Compose o Kubernetes

---

**¡Listo para usar!** El servicio está completamente funcional con arquitectura robusta y seguridad implementada. 🚀