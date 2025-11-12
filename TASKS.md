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

## 🔄 Fase 3: Testing (EN PROGRESO)

### Test Infrastructure
- [ ] Instalar Vitest y dependencias de testing
- [ ] Configurar `vitest.config.ts`
- [ ] Configurar coverage con v8/istanbul
- [ ] Crear estructura de directorios `__tests__/`
- [ ] Configurar scripts de test en `package.json`

### Unit Tests
- [ ] Tests para `src/services/bcv.service.ts`
  - [ ] Test de scraping exitoso
  - [ ] Test de reintentos en fallos
  - [ ] Test de parsing de fechas
  - [ ] Test de extracción de múltiples monedas
  - [ ] Mock de axios para evitar requests reales
- [ ] Tests para `src/services/mongo.service.ts`
  - [ ] Test de conexión/desconexión
  - [ ] Test de guardado de tasas
  - [ ] Test de consultas (getLatestRate, getRateByDate, etc.)
  - [ ] Mock de MongoDB
- [ ] Tests para `src/services/websocket.service.ts`
  - [ ] Test de conexión de clientes
  - [ ] Test de broadcast de mensajes
  - [ ] Test de desconexión de clientes
- [ ] Tests para `src/middleware/auth.middleware.ts`
  - [ ] Test de API key válida
  - [ ] Test de API key inválida
  - [ ] Test de API key faltante
  - [ ] Test de modo desarrollo sin keys
- [ ] Tests para `src/utils/logger.ts`
  - [ ] Test de niveles de log
  - [ ] Test de formatos (dev vs prod)
  - [ ] Test de transports

### Integration Tests
- [ ] Test de flujo completo de actualización de tasa
- [ ] Test de API endpoints
- [ ] Test de rate limiting
- [ ] Test de autenticación end-to-end
- [ ] Test de cron job scheduling

### E2E Tests (opcional)
- [ ] Test de servidor completo
- [ ] Test de WebSocket real
- [ ] Test de persistencia en MongoDB
- [ ] Test de scraping real (con timeout)

### Coverage
- [ ] Configurar threshold mínimo (80%)
- [ ] Generar reportes HTML
- [ ] Integrar con CI/CD

**Meta:** Coverage >80% en todos los servicios críticos

---

## ⏳ Fase 4: Observability

### Health Checks
- [ ] Implementar endpoint `/health`
- [ ] Verificar conectividad a MongoDB
- [ ] Verificar estado del cron job
- [ ] Health check de servicios externos
- [ ] Readiness vs Liveness probes

### Metrics
- [ ] Instalar Prometheus client (`prom-client`)
- [ ] Exponer endpoint `/metrics`
- [ ] Métricas custom:
  - [ ] Contador de requests por endpoint
  - [ ] Histograma de duración de requests
  - [ ] Gauge de clientes WebSocket conectados
  - [ ] Contador de actualizaciones de tasa exitosas/fallidas
  - [ ] Gauge de última tasa obtenida

### Monitoring
- [ ] Configurar Grafana dashboards (opcional)
- [ ] Configurar alertas en Prometheus
- [ ] Logging estructurado de métricas
- [ ] Performance monitoring

### Tracing (opcional avanzado)
- [ ] OpenTelemetry integration
- [ ] Distributed tracing
- [ ] Request correlation IDs

**Meta:** Observabilidad completa para debugging en producción

---

## ⏳ Fase 5: CI/CD

### GitHub Actions
- [ ] Workflow de CI (`.github/workflows/ci.yml`)
  - [ ] Checkout code
  - [ ] Setup Node.js
  - [ ] Install dependencies (pnpm)
  - [ ] Run linter (ESLint)
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
- [ ] Configurar ESLint estricto
- [ ] Configurar Prettier
- [ ] Pre-commit hooks con Husky
- [ ] Conventional commits enforcement
- [ ] Branch protection rules

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

**Completado:** 2/8 fases (Security, Logging)
**En progreso:** Fase 3 - Testing
**Progreso total:** ~25%

## Próximos Pasos

1. ✅ Setup Vitest infrastructure
2. ✅ Write unit tests for services
3. ✅ Achieve 80%+ coverage
4. ✅ Add integration tests
5. → Fase 4: Observability
