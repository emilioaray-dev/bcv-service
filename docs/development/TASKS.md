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
- [x] Coverage alcanzado: 66% líneas, 65% branches, 48% funciones

**Resultado:**
- 55 tests pasando
- Coverage: 66.26% statements, 65.51% branches, 48.38% functions, 66.04% lines
- bcv.service.ts: 98.75% coverage
- auth.middleware.ts: 86.95% coverage

**Commit:** Próximo

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
- [ ] Configurar alertas en Prometheus (opcional)

### Tracing (Opcional - No implementado)
- [ ] OpenTelemetry integration (opcional avanzado)
- [ ] Distributed tracing (opcional avanzado)
- [ ] Request correlation IDs (opcional avanzado)

**Resultado:** Sistema completo de observabilidad con health checks y Prometheus metrics
**Meta:** Observabilidad completa para debugging en producción ✅

---

## ⏳ Fase 5: CI/CD

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

## ⏳ Fase 6: Documentation

### README
- [ ] Descripción del proyecto
- [ ] Features principales
- [ ] Quick start guide
- [ ] Instalación y configuración
- [ ] Variables de entorno documentadas
- [ ] Ejemplos de uso
- [ ] API endpoints
- [ ] WebSocket protocol
- [ ] Docker deployment
- [ ] Troubleshooting

### API Documentation
- [ ] Swagger/OpenAPI spec
- [ ] Endpoint descriptions
- [ ] Request/response examples
- [ ] Error codes
- [ ] Authentication guide

### Architecture
- [ ] Diagrama de arquitectura
- [ ] Flujo de datos
- [ ] Componentes y responsabilidades
- [ ] Decisiones técnicas (ADRs)

### Deployment Guides
- [ ] Guía de deploy en Docker
- [ ] Guía de deploy en Kubernetes
- [ ] Guía de deploy en VPS
- [ ] Guía de configuración de secrets
- [ ] Guía de monitoreo

### Developer Guides
- [ ] Contributing guidelines
- [ ] Code style guide
- [ ] Testing guide
- [ ] Logging guide (ya existe)
- [ ] Release process

**Meta:** Documentación completa y profesional

---

## ⏳ Fase 7: Performance & Optimization (Opcional)

### Caching
- [ ] Implementar Redis para caché
- [ ] Cache de última tasa
- [ ] Cache de tasas históricas
- [ ] TTL configurables
- [ ] Invalidación de caché

### Performance
- [ ] Benchmarking con autocannon
- [ ] Optimización de queries MongoDB
- [ ] Connection pooling
- [ ] Compression middleware
- [ ] Load testing

### Scalability
- [ ] Horizontal scaling considerations
- [ ] Stateless design
- [ ] Shared state management
- [ ] Load balancing

**Meta:** Servicio optimizado para alto tráfico

---

## ⏳ Fase 8: Advanced Features (Opcional)

### Advanced Monitoring
- [ ] Sentry para error tracking
- [ ] Datadog/New Relic integration
- [ ] Custom dashboards

### Multi-Source Support
- [ ] Soporte para múltiples fuentes de tasas
- [ ] Agregación de tasas
- [ ] Fallback sources

### API Enhancements
- [ ] GraphQL endpoint
- [ ] Webhooks para notificaciones
- [ ] Bulk operations API
- [ ] Historical data export

### Resilience
- [ ] Circuit breaker pattern
- [ ] Retry policies
- [ ] Graceful degradation
- [ ] Chaos engineering tests

**Meta:** Features empresariales avanzados

---

## Estado Actual

**Completado:** 4/8 fases (Security, Logging, Testing, Observability)
**En progreso:** Ninguna
**Progreso total:** ~50%

## Próximos Pasos

1. → Fase 5: CI/CD (GitHub Actions con Biome, Code Quality)
2. → Fase 6: Documentation (README, API docs, Architecture)
3. → Fase 7: Performance & Optimization (Redis caching, Benchmarking)
4. → Fase 8: Advanced Features (Multi-source support, GraphQL)
