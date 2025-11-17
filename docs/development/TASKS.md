# BCV Service - Roadmap de Mejoras

Roadmap de mejoras progresivas para convertir el microservicio BCV en una aplicación production-ready de nivel empresarial.

---

## ✅ Fase 1: Security & Configuration (COMPLETADO)

### Docker Secrets Support
- [x] Implementar `src/config/secrets.ts` para lectura de secretos desde archivos
- [x] Soporte para `MONGODB_URI_FILE` y `API_KEYS_FILE`
- [x] Fallback a variables de entorno estándar
- [x] Logging de modo de configuración (Secrets vs Env Vars)
- [x] Actualizar `.gitignore` para excluir archivos sensibles

### API Key Authentication
- [x] Implementar `apiKeyAuth` middleware en `src/middleware/auth.middleware.ts`
- [x] Soporte para múltiples API keys (array)
- [x] Validación de header `X-API-Key`
- [x] Respuestas de error estandarizadas (401, 403)
- [x] Modo desarrollo sin autenticación cuando no hay keys configuradas
- [x] Middleware `optionalApiKeyAuth` para endpoints públicos
- [x] Aplicar rate limiting a rutas protegidas
- [x] Documentar uso en `.env.example`

**Resultado:** Commit `2b2cf11` - Security improvements

---

## ✅ Fase 2: Structured Logging (COMPLETADO)

### Winston Implementation
- [x] Instalar `winston` y `winston-daily-rotate-file`
- [x] Crear `src/utils/logger.ts` con configuración completa
- [x] Definir 5 niveles de log: error, warn, info, http, debug
- [x] Formato colorizado para desarrollo
- [x] Formato JSON para producción
- [x] Rotación diaria de archivos de log
- [x] Configuración de retención (14d errores, 7d otros)

### Migration to Winston
- [x] Migrar `src/app.ts` de console.log a Winston
- [x] Migrar `src/services/bcv.service.ts`
- [x] Migrar `src/services/mongo.service.ts`
- [x] Migrar `src/services/websocket.service.ts`
- [x] Migrar `src/middleware/auth.middleware.ts`
- [x] Actualizar `src/config/secrets.ts` con comentarios

### Documentation & Configuration
- [x] Crear `docs/LOGGING.md` con guía completa
- [x] Agregar `LOG_LEVEL` a `.env.example`
- [x] Agregar `DEV_FILE_LOGS` para desarrollo
- [x] Documentar niveles de log y mejores prácticas
- [x] Ejemplos de consulta de logs
- [x] Actualizar `.gitignore` para archivos de log

**Resultado:** Commit `bc37b6e` - Winston structured logging

---

## ✅ Fase 3: Testing (COMPLETADO)

### Test Infrastructure
- [x] Instalar Vitest y dependencias de testing
- [x] Configurar `vitest.config.ts`
- [x] Configurar coverage con v8/istanbul
- [x] Crear estructura de directorios `test/unit/`
- [x] Configurar scripts de test en `package.json`

### Unit Tests
- [x] Tests para `src/services/bcv.service.ts`
  - [x] Test de scraping exitoso (13 tests)
  - [x] Test de reintentos en fallos
  - [x] Test de parsing de fechas españolas
  - [x] Test de extracción de múltiples monedas
  - [x] Mock de axios para evitar requests reales
  - [x] Test de manejo de errores
- [x] Tests para `src/services/mongo.service.ts`
  - [x] Test de estructura de clase (17 tests)
  - [x] Test de métodos requeridos
  - [x] Test de implementación de interfaz
  - [x] Test de estructuras de datos
- [x] Tests para `src/services/websocket.service.ts`
  - [x] Test de estructura de módulo (8 tests)
  - [x] Test de métodos requeridos
  - [x] Test de tipos de datos
  - [x] Test de RateUpdateEvent
- [x] Tests para `src/middleware/auth.middleware.ts`
  - [x] Test de API key válida (6 tests)
  - [x] Test de API key inválida
  - [x] Test de API key faltante
  - [x] Test de modo opcional
- [x] Tests para `src/utils/logger.ts`
  - [x] Test de estructura del logger (11 tests)
  - [x] Test de métodos de logging
  - [x] Test de manejo de metadata

### Coverage
- [x] Configurar threshold mínimo (50% líneas, 45% funciones)
- [x] Excluir archivos de configuración e interfaces
- [x] Generar reportes HTML
- [x] Actualizar exclusiones para archivos nuevos (Fase 4 y 5)
- [x] Coverage mejorado: 80% statements, 74% branches, 68% funciones

### Tests para `src/utils/number-parser.ts`
- [x] Test de parsing de números venezolanos (44 tests)
- [x] Test de formato con coma decimal
- [x] Test de formato con punto de miles
- [x] Test de casos edge y valores inválidos
- [x] Test de formateo venezolano
- [x] Test de integración round-trip

**Resultado:**
- 99 tests pasando (6 archivos de test)
- Coverage: 80% statements, 74.21% branches, 67.74% functions, 79.43% lines
- bcv.service.ts: 93.22% coverage
- auth.middleware.ts: 86.95% coverage
- number-parser.ts: 90.9% coverage

**Commit:** Completado

---

## ✅ Fase 4: Observability (COMPLETADO)

### Health Checks
- [x] Implementar endpoint `/health`
- [x] Verificar conectividad a MongoDB
- [x] Verificar estado del cron job
- [x] Health check de servicios externos
- [x] Readiness vs Liveness probes (/healthz, /readyz)

### Metrics
- [x] Instalar Prometheus client (`prom-client`)
- [x] Exponer endpoint `/metrics`
- [x] Métricas custom:
  - [x] Contador de requests por endpoint
  - [x] Histograma de duración de requests
  - [x] Gauge de clientes WebSocket conectados
  - [x] Contador de actualizaciones de tasa exitosas/fallidas
  - [x] Gauge de última tasa obtenida
- [x] Incluir métricas default de Node.js y proceso

### Documentation
- [x] Crear guía de observabilidad (docs/guides/OBSERVABILITY.md)
- [x] Documentar endpoints de health checks
- [x] Documentar métricas de Prometheus
- [x] Ejemplos de uso y configuración

### Monitoring (Opcional - No implementado)
- [ ] Configurar Grafana dashboards (opcional)
- [ ] Configurar Alertmanager con Prometheus y alertas clave

### Tracing & Logs (Opcional - No implementado)
- [ ] Implementar OpenTelemetry (OTEL) para tracing distribuido
- [ ] Integración de logs con Loki/Promtail y visualización en Grafana
- [ ] Configuración de Sentry Self-Hosted para error tracking

**Resultado:** Sistema completo de observabilidad con health checks y Prometheus metrics
**Meta:** Observabilidad completa para debugging en producción ✅

---

## ⏳ Fase 5: Performance & Optimization (EN PROGRESO)

### Security & Performance Headers ✅
- [x] Implementar Helmet security headers
- [x] Configurar Content Security Policy (CSP)
- [x] Configurar Strict Transport Security (HSTS)
- [x] Configurar X-Frame-Options
- [x] Configurar Referrer Policy
- [x] Eliminar header X-Powered-By
- [x] Implementar compression middleware

### Discord Integration ✅
- [x] Crear canal de Discord bcv-service
- [x] Implementar servicio Discord con Webhook API
- [x] Modificar servicio BCV para detectar cambios de tasa
- [x] Agregar configuración de Discord a las variables de entorno
- [x] Implementar lógica de verificación de cambios en tasas
- [x] Enviar notificaciones cuando se detecten cambios significativos (>0.1%)
- [x] Actualizar documentación

**Commit:** `80bba32` - Discord notifications integration

### Webhooks para Notificaciones (PRIORIDAD)
**Nota:** Completar el sistema de notificaciones antes de implementar caching.
Webhooks se integra con la misma lógica de verificación de cambios que Discord y WebSocket.

- [ ] Diseñar estructura de Webhook API
  - [ ] Definir formato de payload (JSON)
  - [ ] Definir eventos a notificar (rate.updated, rate.changed, etc.)
  - [ ] Headers de autenticación (signature/secret)
- [ ] Implementar `src/services/webhook.service.ts`
  - [ ] Interface `IWebhookService`
  - [ ] Método `sendRateUpdate(rate: Rate)`
  - [ ] Retry logic con exponential backoff
  - [ ] Timeout configurables
  - [ ] Queue de webhooks fallidos
- [ ] Implementar seguridad
  - [ ] HMAC signature para verificar autenticidad
  - [ ] Secret key por webhook
  - [ ] Validación de URLs permitidas
- [ ] Integrar con verificación de cambios
  - [ ] Llamar solo cuando `hasSignificantChange === true`
  - [ ] Mismo flujo que Discord y WebSocket
- [ ] Agregar variables de entorno:
  - [ ] `WEBHOOK_ENABLED`, `WEBHOOK_URL`, `WEBHOOK_SECRET`
  - [ ] `WEBHOOK_TIMEOUT`, `WEBHOOK_RETRY_ATTEMPTS`
- [ ] Métricas de Prometheus
  - [ ] Contador de webhooks enviados exitosos/fallidos
  - [ ] Histograma de latencia de webhooks
- [ ] Tests unitarios
  - [ ] Mock de HTTP requests
  - [ ] Test de retry logic
  - [ ] Test de signature verification
- [ ] Documentación
  - [ ] Guía de configuración de webhooks
  - [ ] Ejemplos de payload
  - [ ] Guía de verificación de signatures

### Caching con Redis (Stateless Design)
**Nota:** Redis se implementará después de Webhooks, mediante Docker Compose para mantener el microservicio stateless.
El servicio no tendrá estado interno, delegando el caché a Redis como servicio externo.

- [ ] Crear `docker-compose.yml` con servicio Redis
- [ ] Configurar Redis en modo standalone (development)
- [ ] Configurar Redis Sentinel/Cluster (production - opcional)
- [ ] Implementar `src/services/redis.service.ts`
  - [ ] Conexión a Redis usando `ioredis`
  - [ ] Manejo de reconexión automática
  - [ ] Health checks de Redis
- [ ] Implementar cache de última tasa
  - [ ] Key: `bcv:latest_rate`
  - [ ] TTL: 5 minutos
  - [ ] Invalidación solo cuando `hasSignificantChange === true`
- [ ] Implementar cache de tasas históricas
  - [ ] Key pattern: `bcv:history:{date}`
  - [ ] TTL: 24 horas
- [ ] Integrar con verificación de cambios
  - [ ] Invalidar/actualizar cache solo cuando hay cambios
  - [ ] Sincronizado con MongoDB, Discord, WebSocket y Webhooks
- [ ] Agregar variables de entorno:
  - [ ] `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
  - [ ] `CACHE_TTL_LATEST`, `CACHE_TTL_HISTORY`
  - [ ] `CACHE_ENABLED`
- [ ] Actualizar health checks para incluir Redis
- [ ] Métricas de Prometheus para cache hit/miss
- [ ] Tests unitarios de Redis service
- [ ] Documentar configuración de Redis en deployment guides

### Performance
- [ ] Benchmarking con autocannon
- [ ] Optimización de queries MongoDB con índices
- [ ] MongoDB connection pooling optimizado
- [ ] Load testing con Artillery o k6
- [ ] Profiling de memoria con Node.js Inspector

### Scalability (Stateless Architecture)
- [ ] Validar diseño stateless (sin estado en memoria)
- [ ] Shared state management via Redis
- [ ] Preparar para horizontal scaling (múltiples instancias)
- [ ] Load balancing considerations
- [ ] Session management stateless

**Meta:** Servicio optimizado, seguro y stateless para alto tráfico

---

## ⏳ Fase 6: Advanced Features (Opcional - Futuro)

### Multi-Source Support
- [ ] Soporte para múltiples fuentes de tasas (DolarToday, Paralelo, etc.)
- [ ] Agregación de tasas de múltiples fuentes
- [ ] Fallback sources automático
- [ ] Comparación de tasas entre fuentes

### API Enhancements
- [ ] Bulk operations API (consultas masivas)
- [ ] Historical data export (CSV, JSON)
- [ ] GraphQL API (alternativa a REST)
- [ ] Rate limiting por API key

### Resilience Patterns
- [ ] Circuit breaker pattern (usando opossum o similar)
- [ ] Retry policies configurables
- [ ] Graceful degradation
- [ ] Chaos engineering tests

**Meta:** Features empresariales avanzados

**Nota:** Esta fase es opcional y se implementará según necesidades futuras del proyecto.

---

## ✅ Fase 7: Documentation (COMPLETADO)

### README
- [x] Descripción del proyecto
- [x] Features principales
- [x] Quick start guide
- [x] Instalación y configuración
- [x] Variables de entorno documentadas
- [x] Ejemplos de uso
- [x] API endpoints
- [x] WebSocket protocol
- [x] Docker deployment
- [x] Troubleshooting
- [x] Badges y tabla de contenidos
- [x] Diagramas de arquitectura ASCII
- [x] Roadmap y contribución

### API Documentation
- [x] Swagger/OpenAPI spec
- [x] Endpoint descriptions
- [x] Request/response examples
- [x] Error codes
- [x] Authentication guide
- [x] Swagger UI setup

### Architecture
- [x] Diagrama de arquitectura
- [x] Flujo de datos
- [x] Componentes y responsabilidades
- [x] Decisiones técnicas (ADRs)

### Deployment Guides
- [x] Guía de deploy en Docker
- [x] Guía de deploy en Kubernetes
- [x] Guía de deploy en VPS
- [x] Guía de configuración de secrets
- [x] Guía de monitoreo

### Developer Guides
- [x] Contributing guidelines
- [x] Code style guide
- [x] Testing guide
- [x] Logging guide (ya existe)
- [x] Release process

**Meta:** Documentación completa y profesional

---

## ⏳ Fase 8: CI/CD (FINAL)

### GitHub Actions
- [ ] Workflow de CI (`.github/workflows/ci.yml`)
  - [ ] Checkout code
  - [ ] Setup Node.js
  - [ ] Install dependencies (pnpm)
  - [ ] Run Biome check (lint + format)
  - [ ] Run tests con coverage
  - [ ] Build TypeScript
  - [ ] Upload coverage a Codecov (opcional)
- [ ] Workflow de Release (`.github/workflows/release.yml`)
  - [ ] Semantic versioning automático
  - [ ] Generar CHANGELOG
  - [ ] Crear GitHub Release
  - [ ] Build Docker image
  - [ ] Push a Docker Hub/GHCR

### Code Quality
- [ ] Configurar Biome rules estrictas
- [ ] Configurar Biome formatter
- [ ] Conventional commits enforcement
- [ ] Branch protection rules
- [ ] Automatizar Biome check en CI

### Docker
- [ ] Multi-stage Dockerfile optimizado
- [ ] Docker Compose para desarrollo
- [ ] Docker Compose para producción con secrets
- [ ] Health checks en containers
- [ ] .dockerignore optimizado

**Meta:** Pipeline automático de CI/CD

---

## Estado Actual

**Completado:** 5/8 fases completas (Security, Logging, Testing, Observability, Documentation)
**En progreso:** Fase 5 - Performance & Optimization (70% completado)
**Progreso total:** ~68%

### Resumen de Testing (Actualizado)
- ✅ 99 tests unitarios pasando
- ✅ Coverage: 80% statements, 74% branches, 68% funciones, 79% lines
- ✅ 6 módulos con tests completos
- ✅ Configuración de coverage actualizada con exclusiones correctas

### Últimos Commits
- `80bba32` - feat: integrate Discord notifications for rate change alerts
- `6d20b6b` - feat(security): add Helmet.js security headers and compression middleware
- `5652200` - docs: complete Phase 6 - comprehensive documentation
- `1ccfca3` - feat(observability): implement comprehensive monitoring and health check system

## Próximos Pasos (Orden de Prioridad)

### 1. Completar Sistema de Notificaciones (Fase 5)
**Prioridad: ALTA** - Completar el sistema de notificaciones antes del caching

#### Paso 1.1: Implementar Webhooks (SIGUIENTE)
- [ ] Diseñar API de Webhooks (payload, eventos, autenticación)
- [ ] Implementar `WebhookService` con retry logic
- [ ] Integrar con verificación de cambios existente
- [ ] Tests unitarios y documentación
- **Estimado:** 2-3 días
- **Resultado:** Sistema completo de notificaciones (Discord + WebSocket + Webhooks)

#### Paso 1.2: Implementar Redis Caching
- [ ] Setup Docker Compose con Redis
- [ ] Implementar `RedisService` con ioredis
- [ ] Integrar cache con verificación de cambios
- [ ] Health checks y métricas de Prometheus
- [ ] Tests unitarios y documentación
- **Estimado:** 3-4 días
- **Resultado:** Caching stateless con invalidación inteligente

#### Paso 1.3: Performance Testing
- [ ] Benchmarking con autocannon
- [ ] Optimización de queries MongoDB (índices)
- [ ] Connection pooling optimizado
- [ ] Load testing con Artillery/k6
- **Estimado:** 2 días
- **Resultado:** Servicio optimizado y benchmarks documentados

### 2. Fase 6: Advanced Features (Opcional - Futuro)
**Prioridad: BAJA** - Solo si hay necesidad del negocio

- Multi-source support para tasas
- Circuit breaker pattern
- GraphQL API
- Rate limiting avanzado

### 3. Fase 8: CI/CD (FINAL - Alta Prioridad)
**Prioridad: ALTA** - Implementar al final para automatizar todo

**Razón:** CI/CD se implementa al final para asegurar que:
- ✅ Todas las features estén completas y estables
- ✅ Tests tengan buen coverage (actual: 80%)
- ✅ Linting y formatting estén configurados (Biome)
- ✅ Procesos de build y deployment estén validados
- ✅ Se puedan automatizar con confianza

#### Paso 3.1: GitHub Actions CI Workflow
- [ ] Workflow de CI (lint, test, build)
- [ ] Coverage reporting (Codecov)
- [ ] Configuración estricta de Biome
- **Estimado:** 1-2 días

#### Paso 3.2: GitHub Actions Release Workflow
- [ ] Semantic versioning automático
- [ ] CHANGELOG generation
- [ ] Docker build y push a registry
- [ ] GitHub Releases
- **Estimado:** 1-2 días

#### Paso 3.3: Docker Optimization
- [ ] Multi-stage Dockerfile
- [ ] Docker Compose para desarrollo y producción
- [ ] Health checks en containers
- **Estimado:** 1 día

---

## Roadmap Visual

```
┌─────────────────────────────────────────────────────────────────┐
│  ESTADO ACTUAL: 68% Completado                                  │
│  ✅ Security, Logging, Testing, Observability, Documentation    │
│  ⏳ Performance & Optimization (70% - en progreso)              │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PRÓXIMOS PASOS (Orden de ejecución):                        │
└──────────────────────────────────────────────────────────────┘

1. 🔔 Webhooks (2-3 días)
   └─> Completar sistema de notificaciones
       (Discord + WebSocket + Webhooks)

2. 💾 Redis Caching (3-4 días)
   └─> Stateless architecture con Docker Compose
       Invalidación inteligente solo cuando hay cambios

3. ⚡ Performance Testing (2 días)
   └─> Benchmarking, optimización, load testing

4. 🚀 CI/CD Automation (3-4 días)
   └─> GitHub Actions, Docker optimization
       Automatizar testing y deployment

TOTAL ESTIMADO: ~12-15 días para completar 100%
```

---

## Criterios de Éxito

### Fase 5 Completa cuando:
- ✅ Webhooks implementado y funcionando
- ✅ Redis caching operativo con Docker Compose
- ✅ Performance testing completado con resultados documentados
- ✅ Todas las notificaciones sincronizadas (Discord, WebSocket, Webhooks)
- ✅ Sistema completamente stateless

### Fase 8 Completa cuando:
- ✅ CI workflow automático (lint + test + build)
- ✅ Release workflow automático (versioning + docker + changelog)
- ✅ Branch protection configurado
- ✅ Code quality gates activos
- ✅ Dockerfile optimizado con multi-stage
