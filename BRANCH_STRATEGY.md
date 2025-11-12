# Estrategia de Ramas por Fase

Esta guía define la estrategia de branching para implementar las mejoras del servicio BCV en 4 fases progresivas.

## 📌 Rama Base

```bash
main (commit: 156222b)
└── feat: initial BCV exchange rate service with security improvements
```

## 🌳 Estructura de Ramas

```
main
├── phase-1/security-critical
│   ├── feat/secrets-management
│   ├── feat/api-authentication
│   └── feat/production-rate-limiting
│
├── phase-2/quality-stability
│   ├── feat/unit-tests
│   ├── feat/structured-logging
│   ├── feat/zod-validation-complete
│   └── feat/health-checks
│
├── phase-3/optimization
│   ├── feat/redis-cache-decision
│   ├── feat/integration-tests
│   ├── feat/graceful-shutdown
│   └── feat/api-documentation
│
└── phase-4/observability
    ├── feat/prometheus-metrics
    ├── feat/monitoring-dashboard
    └── feat/alerting-system
```

---

## 🔴 Fase 1: Seguridad Crítica

**Base branch**: `main`
**Target**: `phase-1/security-critical`
**Duración estimada**: 1-2 días

### Comandos para crear las ramas:

```bash
# Crear rama de fase
git checkout -b phase-1/security-critical main

# Sub-ramas de features
git checkout -b feat/secrets-management phase-1/security-critical
git checkout -b feat/api-authentication phase-1/security-critical
git checkout -b feat/production-rate-limiting phase-1/security-critical
```

### Features a implementar:

#### 1. `feat/secrets-management`
**Prioridad**: CRÍTICA - INMEDIATA

Tareas:
- [ ] Rotar credenciales de MongoDB
- [ ] Implementar Docker Secrets o HashiCorp Vault
- [ ] Actualizar .env.example con variables de secretos
- [ ] Crear script de inicialización de secretos
- [ ] Documentar proceso de gestión de secretos

Mensaje de commit sugerido:
```
feat(security): implement secrets management system

- Rotate MongoDB credentials
- Add Docker Secrets integration
- Create secrets initialization script
- Update environment variable handling
- Document secrets management process

BREAKING CHANGE: Old .env format no longer supported, use Docker Secrets

Closes #1
```

#### 2. `feat/api-authentication`
**Prioridad**: ALTA

Tareas:
- [ ] Implementar middleware de API Key authentication
- [ ] Crear sistema de generación de API keys
- [ ] Agregar endpoint de validación de API key
- [ ] Actualizar documentación de API
- [ ] Agregar tests de autenticación

Mensaje de commit sugerido:
```
feat(security): add API key authentication

- Implement API key middleware
- Add key generation and validation system
- Protect all /api/* endpoints
- Update API documentation with auth instructions
- Add authentication tests

Closes #2
```

#### 3. `feat/production-rate-limiting`
**Prioridad**: MEDIA

Tareas:
- [ ] Ajustar límites de rate limiting para producción
- [ ] Implementar diferentes límites por tier/API key
- [ ] Agregar Redis store para rate limiting distribuido
- [ ] Monitorear y ajustar límites

Mensaje de commit sugerido:
```
feat(security): enhance rate limiting for production

- Add Redis-based rate limiting store
- Implement tiered limits (free/premium)
- Add rate limit monitoring
- Configure production-ready limits

Closes #3
```

### Merge a main:
```bash
# Una vez todas las features estén completas
git checkout phase-1/security-critical
git merge feat/secrets-management
git merge feat/api-authentication
git merge feat/production-rate-limiting

# Crear PR a main
git push origin phase-1/security-critical
```

---

## 🟡 Fase 2: Calidad y Estabilidad

**Base branch**: `phase-1/security-critical` (o `main` después de merge)
**Target**: `phase-2/quality-stability`
**Duración estimada**: 3-4 días

### Comandos:

```bash
git checkout -b phase-2/quality-stability main

# Sub-ramas
git checkout -b feat/unit-tests phase-2/quality-stability
git checkout -b feat/structured-logging phase-2/quality-stability
git checkout -b feat/zod-validation-complete phase-2/quality-stability
git checkout -b feat/health-checks phase-2/quality-stability
```

### Features a implementar:

#### 1. `feat/unit-tests`
**Prioridad**: ALTA

Tareas:
- [ ] Tests para BCVService (scraping, parsing, retry logic)
- [ ] Tests para MongoService (CRUD operations)
- [ ] Tests para WebSocketService
- [ ] Tests para middleware de validación
- [ ] Configurar coverage reporting (target: 80%)

Mensaje de commit:
```
test: add comprehensive unit test suite

- Add BCVService tests (scraping, retry logic)
- Add MongoService tests (CRUD operations)
- Add middleware validation tests
- Configure coverage reporting
- Achieve 80%+ code coverage

Closes #4
```

#### 2. `feat/structured-logging`
**Prioridad**: MEDIA

Tareas:
- [ ] Instalar y configurar Winston
- [ ] Crear logger utility con niveles
- [ ] Reemplazar console.log/error con logger
- [ ] Configurar log rotation
- [ ] Agregar request logging middleware

Mensaje de commit:
```
feat(observability): implement structured logging with Winston

- Replace console.log with Winston logger
- Add log levels (error, warn, info, debug)
- Configure log rotation and file output
- Add request logging middleware
- Include contextual metadata in logs

Closes #5
```

#### 3. `feat/zod-validation-complete`
**Prioridad**: MEDIA

Tareas:
- [ ] Validar datos del scraper con BCVRateDataSchema
- [ ] Agregar validación de configuración al inicio
- [ ] Validar payloads de WebSocket
- [ ] Tests de validación

Mensaje de commit:
```
feat(validation): complete Zod validation implementation

- Validate scraped data before saving
- Add configuration validation on startup
- Validate WebSocket payloads
- Add validation error tests
- Ensure all data flows are validated

Closes #6
```

#### 4. `feat/health-checks`
**Prioridad**: MEDIA

Tareas:
- [ ] Endpoint /health (basic)
- [ ] Endpoint /ready (dependencies check)
- [ ] Endpoint /metrics (basic stats)
- [ ] Actualizar Docker healthcheck

Mensaje de commit:
```
feat(monitoring): add health check endpoints

- Add /health endpoint (uptime, status)
- Add /ready endpoint (dependency checks)
- Add /metrics endpoint (basic stats)
- Update Docker compose healthcheck
- Document health check usage

Closes #7
```

---

## 🟢 Fase 3: Optimización

**Base branch**: `phase-2/quality-stability` (o `main`)
**Target**: `phase-3/optimization`
**Duración estimada**: 2-3 días

### Comandos:

```bash
git checkout -b phase-3/optimization main

# Sub-ramas
git checkout -b feat/redis-cache-decision phase-3/optimization
git checkout -b feat/integration-tests phase-3/optimization
git checkout -b feat/graceful-shutdown phase-3/optimization
git checkout -b feat/api-documentation phase-3/optimization
```

### Features a implementar:

#### 1. `feat/redis-cache-decision`
**Prioridad**: MEDIA

**Opción A: Implementar Redis**
```
feat(performance): implement Redis caching layer

- Add Redis client and configuration
- Cache latest BCV rate (TTL: 1h)
- Cache historical queries
- Add cache invalidation logic
- Monitor cache hit rates

Closes #8
```

**Opción B: Remover Redis**
```
refactor: remove unused Redis configuration

- Remove REDIS_URL from environment
- Remove Redis service from docker-compose
- Update documentation
- Simplify deployment

Closes #8
```

#### 2. `feat/integration-tests`
**Prioridad**: MEDIA

```
test: add integration test suite

- Test API endpoints end-to-end
- Test WebSocket connection and events
- Test MongoDB integration
- Test scheduled task execution
- Add CI/CD integration

Closes #9
```

#### 3. `feat/graceful-shutdown`
**Prioridad**: MEDIA

```
feat(reliability): implement graceful shutdown

- Handle SIGTERM and SIGINT signals
- Close HTTP server gracefully
- Disconnect WebSocket clients properly
- Close MongoDB connections
- Wait for pending operations

Closes #10
```

#### 4. `feat/api-documentation`
**Prioridad**: BAJA

```
docs: add Swagger/OpenAPI documentation

- Install swagger-ui-express
- Add OpenAPI 3.0 specification
- Document all API endpoints
- Include authentication info
- Add example requests/responses

Closes #11
```

---

## 🔵 Fase 4: Observabilidad

**Base branch**: `phase-3/optimization` (o `main`)
**Target**: `phase-4/observability`
**Duración estimada**: 2-3 días

### Comandos:

```bash
git checkout -b phase-4/observability main

# Sub-ramas
git checkout -b feat/prometheus-metrics phase-4/observability
git checkout -b feat/monitoring-dashboard phase-4/observability
git checkout -b feat/alerting-system phase-4/observability
```

### Features a implementar:

#### 1. `feat/prometheus-metrics`
**Prioridad**: BAJA

```
feat(observability): add Prometheus metrics

- Install prom-client
- Add /metrics endpoint
- Track request count and duration
- Track scraping success/failure rate
- Track WebSocket connections
- Monitor rate limiting hits

Closes #12
```

#### 2. `feat/monitoring-dashboard`
**Prioridad**: BAJA

```
feat(observability): create Grafana dashboard

- Add Grafana to docker-compose
- Create dashboard for BCV service metrics
- Add panels for key metrics
- Configure alerting rules
- Document dashboard usage

Closes #13
```

#### 3. `feat/alerting-system`
**Prioridad**: BAJA

```
feat(monitoring): implement alerting system

- Configure Prometheus alertmanager
- Define alert rules (scraping failures, high error rate)
- Set up notification channels (email, Slack)
- Document alert management
- Test alert delivery

Closes #14
```

---

## 🔄 Workflow de Desarrollo

### 1. Crear feature branch
```bash
git checkout -b feat/nombre-descriptivo phase-X/nombre-fase
```

### 2. Desarrollar y commitear
```bash
# Hacer cambios
git add .
git commit -m "tipo(scope): descripción

Detalles adicionales...

Closes #issue-number"
```

### 3. Push y crear PR
```bash
git push origin feat/nombre-descriptivo

# Crear PR hacia la rama de fase
# Título: mismo que el mensaje de commit
# Descripción: detalles de implementación, screenshots, etc.
```

### 4. Merge a rama de fase
```bash
# Después de review y aprobación
git checkout phase-X/nombre-fase
git merge --no-ff feat/nombre-descriptivo
git push origin phase-X/nombre-fase
```

### 5. Merge de fase a main
```bash
# Una vez completadas todas las features de la fase
git checkout main
git merge --no-ff phase-X/nombre-fase
git tag -a vX.Y.Z -m "Release version X.Y.Z - Phase X completed"
git push origin main --tags
```

---

## 📝 Convenciones de Commits

### Tipos de commits:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bugs
- `docs`: Cambios en documentación
- `style`: Formato, punto y coma faltantes, etc.
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Cambios en build, herramientas, etc.
- `perf`: Mejoras de rendimiento
- `ci`: Cambios en CI/CD

### Scopes sugeridos:
- `security`: Cambios relacionados con seguridad
- `validation`: Validación de datos
- `api`: Endpoints de API
- `scraper`: Lógica de scraping
- `database`: MongoDB, cache
- `websocket`: WebSocket server
- `config`: Configuración
- `docker`: Dockerfiles, compose
- `monitoring`: Métricas, logs
- `observability`: Monitoreo, alertas

### Formato de mensaje:
```
tipo(scope): descripción corta (max 72 caracteres)

Descripción más detallada del cambio si es necesario.
Puede incluir múltiples párrafos.

- Punto clave 1
- Punto clave 2
- Punto clave 3

BREAKING CHANGE: descripción si aplica

Closes #123
Refs #456
```

---

## 🏷️ Versionado Semántico

Seguir [SemVer](https://semver.org/):

- **v0.1.0**: Implementación inicial (commit actual)
- **v0.2.0**: Fase 1 completada (seguridad crítica)
- **v0.3.0**: Fase 2 completada (calidad y estabilidad)
- **v0.4.0**: Fase 3 completada (optimización)
- **v1.0.0**: Fase 4 completada (observabilidad) - **PRODUCTION READY**

### Crear tags:
```bash
# Después de merge de fase a main
git tag -a v0.2.0 -m "Release v0.2.0 - Phase 1: Security Critical

- Secrets management implemented
- API authentication added
- Production-ready rate limiting

See CHANGELOG.md for details"

git push origin v0.2.0
```

---

## 📊 Seguimiento de Progreso

### Issues sugeridos en GitHub/GitLab:

**Fase 1:**
- #1 Implementar gestión de secretos
- #2 Agregar autenticación API
- #3 Rate limiting para producción

**Fase 2:**
- #4 Tests unitarios completos
- #5 Logging estructurado con Winston
- #6 Validación Zod completa
- #7 Health check endpoints

**Fase 3:**
- #8 Decisión e implementación de Redis
- #9 Tests de integración
- #10 Graceful shutdown
- #11 Documentación Swagger

**Fase 4:**
- #12 Métricas Prometheus
- #13 Dashboard Grafana
- #14 Sistema de alertas

---

## 🎯 Checklist por Fase

### Antes de merge a main:
- [ ] Todos los tests pasan
- [ ] Code coverage cumple objetivo (80%+)
- [ ] Linter sin errores (biome check)
- [ ] Documentación actualizada
- [ ] CHANGELOG.md actualizado
- [ ] PR review aprobado
- [ ] CI/CD pasa
- [ ] Tag de versión creado

---

## 📚 Referencias

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

---

**Última actualización**: 2025-11-11
**Versión**: 1.0.0
**Mantenido por**: Equipo BCV Service
