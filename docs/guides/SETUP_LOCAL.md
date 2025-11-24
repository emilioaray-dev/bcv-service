# Configuración Local del Entorno

Guía para configurar el entorno de desarrollo local del servicio BCV con todas sus características implementadas.

## 📋 Prerrequisitos

- Node.js 18+ instalado
- pnpm 8+ instalado (`npm install -g pnpm`)
- MongoDB 4.4+ instalado localmente o acceso a instancia remota (opcional en modo consola)
- Redis instalado localmente o acceso a instancia remota (opcional para cache de notificaciones)
- Git configurado
- Docker instalado (opcional para contenedores)

## 🚀 Setup Inicial

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd bcv-service
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

**IMPORTANTE**: El archivo `.env` NO está en el repositorio por seguridad. Cada desarrollador debe crear el suyo.

```bash
# Copiar la plantilla
cp .env.example .env
```

### 4. Editar .env con tus credenciales

Abrir `.env` y configurar:

```bash
# Editar con tu editor preferido
nano .env
# o
code .env
# o
vim .env
```

**Configuración completa recomendada**:

```env
# Puerto del servidor
PORT=3000

# Modo de ambiente
NODE_ENV=development

# MongoDB - CAMBIAR con tus credenciales
MONGODB_URI=mongodb://bcv_user:bcv4r4y4r4y@192.168.11.185:27017/bcv?authSource=admin

# Configuración de conexión MongoDB
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_MAX_IDLE_TIME_MS=60000
MONGODB_CONNECT_TIMEOUT_MS=10000
MONGODB_SOCKET_TIMEOUT_MS=45000
MONGODB_RETRY_WRITES=true
MONGODB_RETRY_READS=true

# Redis (opcional para cache de notificaciones)
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=false  # Cambiar a true para habilitar Redis
CACHE_TTL_LATEST=300  # TTL en segundos para cache de tasa reciente

# Redis Configuración detallada
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
REDIS_CONNECT_TIMEOUT=10000

# Modo de operación (false = solo consola, true = guarda en DB)
SAVE_TO_DATABASE=true

# URL del BCV
BCV_WEBSITE_URL=https://www.bcv.org.ve/

# Programación de scraping (8 horas: 2am, 10am, 6pm)
CRON_SCHEDULE=0 2,10,18 * * *

# API Key para autenticación
API_KEYS=your-api-key-here  # Separar múltiples keys con coma

# Nivel de logging
LOG_LEVEL=info
DEV_FILE_LOGS=false

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100

# Discord notifications
DISCORD_WEBHOOK_URL=  # URL de webhook de Discord

# Webhook notifications
WEBHOOK_URL=  # URL de webhook HTTP general
WEBHOOK_SECRET=  # Clave secreta para firma HMAC
WEBHOOK_TIMEOUT=5000
WEBHOOK_MAX_RETRIES=3
SERVICE_STATUS_WEBHOOK_URL=  # URL específica para eventos de estado
DEPLOYMENT_WEBHOOK_URL=  # URL específica para eventos de deployment

# Swagger/OpenAPI
SWAGGER_PROD_URL=https://api.example.com  # URL del servidor de producción para Swagger
```

### 5. Configurar MongoDB (si usas local)

**Opción A: MongoDB local con Docker**:

```bash
docker run -d \
  --name mongodb-bcv \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=bcv_admin \
  -e MONGO_INITDB_ROOT_PASSWORD=bcv4r4y4r4y \
  -e MONGO_INITDB_DATABASE=bcv \
  mongo:latest

# Crear usuario para la aplicación
docker exec -it mongodb-bcv mongosh admin -u bcv_admin -p bcv4r4y4r4y --eval "
  db.getSiblingDB('bcv').createUser({
    user: 'bcv_user',
    pwd: 'bcv4r4y4r4y',
    roles: [{role: 'readWrite', db: 'bcv'}]
  })
"
```

Luego en tu `.env`:
```env
MONGODB_URI=mongodb://bcv_user:bcv4r4y4r4y@localhost:27017/bcv?authSource=admin
SAVE_TO_DATABASE=true
```

### 6. Configurar Redis (opcional, para cache de notificaciones)

**Opción A: Redis local con Docker**:

```bash
docker run -d \
  --name redis-bcv \
  -p 6379:6379 \
  redis:latest
```

Luego en tu `.env`:
```env
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=true
```

### 7. Verificar configuración

```bash
# Verificar que el .env existe
ls -la .env

# Verificar que .env NO aparece en git
git status  # No debe aparecer .env

# Verificar que .env.example SÍ está trackeado
git ls-files | grep .env.example  # Debe aparecer
```

## ✅ Ejecutar el Proyecto

### Modo desarrollo (recomendado)

```bash
pnpm dev
```

Deberías ver:
```
Servidor BCV iniciado
{
  "port": 3000,
  "schedule": "0 2,10,18 * * *",
  "environment": "development",
  "architecture": "SOLID with Inversify"
}
```

### Modo producción

```bash
# Compilar TypeScript
pnpm build

# Ejecutar build
pnpm start
```

## 📡 Pruebas de Conectividad

### 1. Servidor corriendo
```bash
curl http://localhost:3000
# {"message":"Microservicio BCV Tasa de Cambio","status":"running","connectedClients":0,"architecture":"SOLID with Inversify DI","documentation":"/docs"}
```

### 2. API endpoints (requiere API Key)
```bash
# Última tasa
curl -H "X-API-Key: your-api-key-here" http://localhost:3000/api/rate/latest

# Historial
curl -H "X-API-Key: your-api-key-here" "http://localhost:3000/api/rate/history?limit=10"

# Tasa por fecha
curl -H "X-API-Key: your-api-key-here" http://localhost:3000/api/rate/2025-11-24
```

### 3. Health Checks
```bash
# Liveness probe
curl http://localhost:3000/healthz

# Readiness probe
curl http://localhost:3000/readyz

# Health check completo
curl http://localhost:3000/health

# Health checks individuales
curl http://localhost:3000/health/mongodb
curl http://localhost:3000/health/scheduler
curl http://localhost:3000/health/bcv
curl http://localhost:3000/health/websocket
curl http://localhost:3000/health/redis
```

### 4. Métricas Prometheus
```bash
# Métricas de Prometheus
curl http://localhost:3000/metrics
```

### 5. WebSocket (opcional)
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.on('open', () => {
  console.log('Conectado al servicio BCV');
});
ws.on('message', (data) => {
  const update = JSON.parse(data);
  console.log('Tasa actualizada:', update);
});
```

### 6. Swagger UI
```bash
# Abrir en navegador
http://localhost:3000/docs
```

## 🔐 Seguridad - MUY IMPORTANTE

### ⚠️ NUNCA hagas esto:

```bash
# ❌ NUNCA agregar .env al repo
git add .env

# ❌ NUNCA commitear credenciales
git commit -m "add env"

# ❌ NUNCA compartir tu .env por email/slack/etc.
```

### ✅ Opciones seguras para producción:

```bash
# ✅ Usar Docker Secrets
echo "mongodb://user:pass@host:27017/bcv" | docker secret create mongodb_uri -
# Luego usar MONGODB_URI_FILE=/run/secrets/mongodb_uri

# ✅ Variables de entorno desde files
MONGODB_URI_FILE=/path/to/secret/file
API_KEYS_FILE=/path/to/api-keys/file
DISCORD_WEBHOOK_URL_FILE=/path/to/discord-webhook/file
WEBHOOK_URL_FILE=/path/to/webhook/file
WEBHOOK_SECRET_FILE=/path/to/webhook-secret/file
```

### 🛡️ Si accidentalmente commiteas .env:

```bash
# 1. Remover del staging
git reset HEAD .env

# 2. Si ya hiciste commit (NO PUSH)
git reset HEAD~1
git checkout .env

# 3. Si ya hiciste PUSH (CRÍTICO)
# Contactar al líder del equipo INMEDIATAMENTE
# Se deben rotar TODAS las credenciales
```

## 🔔 Sistema de Notificaciones

### WebSocket
- Conecta clientes en tiempo real para actualizaciones de tasas
- Compatible con Socket.io clientes

### Discord
- Configura `DISCORD_WEBHOOK_URL` en tu `.env`
- Notifica cambios significativos (>0.1%) en tasas

### HTTP Webhooks
- Configura `WEBHOOK_URL` y `WEBHOOK_SECRET` en tu `.env`
- Soporta firma HMAC-SHA256 para verificación
- Eventos: rate.updated, rate.changed, service.healthy, deployment.success/failure

### Sistema Persistente de Estado
- Previene notificaciones duplicadas al reiniciar el servicio
- Detección de cambios significativos (umbral ≥0.01)

## 🏗️ Arquitectura SOLID

### Inversify IoC Container
- Inyección de dependencias configurada en `src/config/inversify.config.ts`
- Todas las interfaces con bindings en el contenedor
- Singleton pattern para servicios críticos

### Patrones Implementados
- Repository Pattern (MongoService)
- Observer Pattern (WebSocketService)
- Strategy Pattern (diferentes estrategias de configuración)
- State Pattern (NotificationStateService)

## 🧪 Verificar Funcionalidad Completa

### Scripts de prueba
```bash
# Test de notificaciones a Discord
npx tsx scripts/test-discord-notification.ts

# Test de notificaciones por webhook
npx tsx scripts/test-webhook-notifications.ts

# Backup de la base de datos
npx tsx scripts/backup-database.ts
```

### Tests unitarios
```bash
# Todos los tests
pnpm test

# Tests con cobertura
pnpm test:coverage

# Tests en modo watch
pnpm test:watch

# UI de tests
pnpm test:ui
```

## 🐛 Troubleshooting

### Error: "Puerto 3000 ya en uso"

```bash
# Ver qué proceso usa el puerto
lsof -i :3000

# Matar el proceso
kill -9 <PID>

# O cambiar el puerto en .env
PORT=3001
```

### Error: "Cannot connect to MongoDB"

```bash
# Verificar que MongoDB está corriendo
docker ps | grep mongo
# o
mongosh --eval "db.version()"

# Verificar credenciales en .env
cat .env | grep MONGODB_URI

# Modo consola si no tienes MongoDB
echo "SAVE_TO_DATABASE=false" >> .env
```

### Error: "Cannot connect to Redis"

```bash
# Verificar que Redis está corriendo
docker ps | grep redis
# o
redis-cli ping

# Verificar credenciales en .env
cat .env | grep REDIS

# Deshabilitar cache si no tienes Redis
echo "CACHE_ENABLED=false" >> .env
```

### Error: "SSL Certificate verification failed"

Este error ya está resuelto en el código. El servicio ignora la verificación de certificados del BCV:
- Configuración en `src/services/bcv.service.ts` con HTTPS agent
- Necesario por problemas con la cadena de certificados del BCV

### Error: "API Key no autorizada"

```bash
# Verificar que estás usando el header correcto
curl -H "X-API-Key: your-api-key-here" http://localhost:3000/api/rate/latest

# Verificar que la API key está en .env
cat .env | grep API_KEYS
```

### Error: "Module not found"

```bash
# Limpiar y reinstalar
rm -rf node_modules dist
pnpm install

# Verificar versión de Node
node --version  # debe ser 18+

# Verificar versión de pnpm
pnpm --version  # debe ser 8+
```

### Error: "Rate limit exceeded"

```bash
# El rate limiting es de 100 requests por 15 minutos por IP
# Solo aplica a rutas /api/*
# Ajustar según necesidad en producción
```

## 📈 Observabilidad

### Logging
- Formato JSON para producción
- Formato colorizado para desarrollo
- 5 niveles: error, warn, info, http, debug
- Rotación diaria de archivos

### Métricas Prometheus
```bash
# Endpoint: /metrics
# Métricas disponibles:
# - http_requests_total por método, ruta y status
# - http_request_duration_seconds
# - websocket_clients_connected
# - bcv_scrape_success_total
# - bcv_scrape_failure_total
# - bcv_latest_rate
```

### Health Checks
- `/healthz`: Liveness probe (muy rápido)
- `/readyz`: Readiness probe (conectividad BD)
- `/health`: Diagnóstico completo con todos los componentes

## 🔄 Versionamiento Automático

El proyecto implementa **Conventional Commits + Semantic Release**:
- Commits con formato convencional generan versiones automáticamente
- `feat`: Nueva funcionalidad → MINOR (1.0.0 → 1.1.0)
- `fix`: Corrección de bug → PATCH (1.0.0 → 1.0.1)
- `BREAKING CHANGE`: Cambio importante → MAJOR (1.0.0 → 2.0.0)

## 📚 Recursos Adicionales

- **README.md**: Documentación completa del proyecto
- **API Docs**: `/docs` para documentación interactiva de Swagger
- **QUICK_START.md**: Comandos rápidos
- **Architecture docs**: `/docs/architecture/` para documentos de arquitectura
- **Guías**: `/docs/guides/` para guías detalladas

## 🤝 Contribuir

1. Lee **CONTRIBUTING.md** para entender las convenciones
2. Sigue la estrategia de branching
3. Sigue las convenciones de commits semánticos
4. Ejecuta tests y linter antes de PR
5. Documenta cambios en variables de entorno en `.env.example`

## 📞 Ayuda

Si tienes problemas:
1. Revisa este documento completo
2. Verifica que tu `.env` tiene todas las variables de `.env.example`
3. Consulta el README.md
4. Pregunta al equipo

---

**Última actualización**: 2025-11-24
**Mantenido por**: Equipo BCV Service
**Versión actual**: 2.1.0