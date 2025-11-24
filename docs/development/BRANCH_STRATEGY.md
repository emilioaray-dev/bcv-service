# Estrategia de Ramas - BCV Service

Esta guía define la estrategia de branching para el desarrollo del servicio BCV con las mejoras ya implementadas.

## 📌 Estado Actual del Repositorio

**Ramas principales existentes**:
- `main`: Versión estable con todas las mejoras implementadas
- `develop`: Desarrollo activo (si aplica)
- Ramas de feature ya fusionadas:
  - `feat/secrets-management`
  - `feat/api-authentication` 
  - `feat/production-rate-limiting`
  - `feat/unit-tests`
  - `feat/structured-logging`
  - `feat/zod-validation-complete`
  - `feat/health-checks`
  - `feat/prometheus-metrics`
  - `feat/graceful-shutdown`
  - `feat/websocket-improvements`
  - `feat/discord-notifications`
  - `feat/webhook-notifications`
  - `feat/notification-state-persistent`
  - `feat/solid-architecture`
  - `feat/conventional-commits-automation`

## 🌳 Estructura Actual de Ramas

```
main (v2.1.0) [ESTABLE - PRODUCCIÓN]
├── feat/secrets-management (merged) [✅ Completado]
├── feat/api-authentication (merged) [✅ Completado] 
├── feat/production-rate-limiting (merged) [✅ Completado]
├── feat/unit-tests (merged) [✅ Completado]
├── feat/structured-logging (merged) [✅ Completado]
├── feat/zod-validation-complete (merged) [✅ Completado]
├── feat/health-checks (merged) [✅ Completado]
├── feat/prometheus-metrics (merged) [✅ Completado]
├── feat/graceful-shutdown (merged) [✅ Completado]
├── feat/websocket-improvements (merged) [✅ Completado]
├── feat/discord-notifications (merged) [✅ Completado]
├── feat/webhook-notifications (merged) [✅ Completado]
├── feat/notification-state-persistent (merged) [✅ Completado]
├── feat/solid-architecture (merged) [✅ Completado]
├── feat/conventional-commits-automation (merged) [✅ Completado]
└── feat/redis-cache-implementation (merged) [✅ Completado]
```

---

## 🔄 Workflow de Desarrollo Actual

Desde que todas las fases principales han sido completadas, el workflow actual es:

### 1. Nueva Feature o Hotfix
```bash
# Crear rama desde main
git checkout main
git pull origin main
git checkout -b feat/nueva-caracteristica-o-fix-habilitador

# Desarrollar y commitear
git add .
git commit -m "feat: descripción de la nueva funcionalidad

Implementación detallada del cambio
- Punto 1
- Punto 2
- Punto 3

Closes #issue-number"
```

### 2. Push y Creación de PR
```bash
# Push a origin
git push origin feat/nueva-caracteristica-o-fix-habilitador

# Crear PR a main (no a ramas de fase intermedias)
# En GitHub/GitLab:
# - Title: Mismo que el commit
# - Description: Detalles de implementación
# - Labels: feature, enhancement, bugfix, etc.
# - Assignees: Desarrolladores responsables
# - Reviewers: Código de pares
```

### 3. Code Review y Merge
```bash
# Después de revisión y aprobación
# Squash merge o merge sin fast-forward
git checkout main
git pull origin main
git merge --no-ff feat/nueva-caracteristica-o-fix-habilitador
git push origin main

# Eliminar rama remota
git push origin --delete feat/nueva-caracteristica-o-fix-habilitador

# Eliminar rama local
git branch -d feat/nueva-caracteristica-o-fix-habilitador
```

---

## 🏷️ Convenciones de Nomenclatura de Ramas

### Tipos de ramas:
- `feat/` - Nuevas funcionalidades
- `fix/` - Correcciones de bugs
- `refactor/` - Cambios de arquitectura/mejoras de código
- `test/` - Agregar o mejorar tests
- `docs/` - Cambios en documentación
- `chore/` - Tareas de mantenimiento
- `hotfix/` - Correcciones urgentes para producción
- `perf/` - Mejoras de rendimiento

### Ejemplos:
```bash
feat/websocket-rate-broadcast          # Nueva funcionalidad
fix/ssl-certificate-error              # Corrección de bug
refactor/solid-architecture            # Refactoring
test/unit-tests-coverage               # Tests
docs/update-deployment-guide           # Documentación
chore/update-dependencies              # Mantenimiento
hotfix/critical-security-patch         # Fix urgente
perf/redis-cache-optimization         # Rendimiento
```

---

## 📝 Convenciones de Commits (Conventional Commits)

### Tipos permitidos:
- `feat`: Nueva funcionalidad (MINOR en Semantic Versioning)
- `fix`: Corrección de bug (PATCH en Semantic Versioning)
- `docs`: Cambios en documentación
- `style`: Formato, puntos y comas faltantes, etc. (sin cambio de lógica)
- `refactor`: Refactorización de código (sin cambio de funcionalidad)
- `perf`: Mejora de rendimiento
- `test`: Agregar o corregir tests
- `build`: Cambios en sistema de build o dependencias externas
- `ci`: Cambios en archivos de CI/CD
- `chore`: Otros cambios que no modifican src o test files
- `revert`: Revertir un commit anterior
- `feat!`, `fix!`: Indican cambios que rompen compatibilidad (MAJOR version)

### Scopes comunes:
- `api`: Cambios en API REST
- `websocket`: Cambios en sistema WebSocket
- `discord`: Cambios en notificaciones Discord
- `webhook`: Cambios en notificaciones HTTP
- `notifications`: Cambios en sistema de notificaciones
- `state`: Cambios en sistema de estado persistente
- `health`: Cambios en health checks
- `auth`: Cambios en autenticación
- `security`: Cambios de seguridad
- `tests`: Cambios en tests
- `deps`: Cambios en dependencias
- `ci`: Cambios en CI/CD
- `docs`: Cambios en documentación

### Formato de mensaje:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Ejemplos de commits válidos**:
```
feat(api): add rate history endpoint with pagination

Add new /api/rate/history endpoint that supports:
- Pagination with limit parameter
- Date range filtering
- Rate limiting (100 req/15 min)

Closes #123
```

```
fix(webhook): handle failures gracefully with retry logic

Fixed issue where webhook failures caused unhandled promise exceptions.
Now implements retry logic with exponential backoff for failed webhooks.

Closes #456
```

```
refactor(notification-state): implement dual-layer architecture

Replace in-memory notification state with dual-layer system:
- MongoDB as primary persistent storage
- Redis as secondary cache layer
- Automatic fallback if Redis unavailable

BREAKING CHANGE: Notification state format has changed
```

---

## 🏷️ Versionado Semántico Automático

El proyecto implementa **Conventional Commits + Semantic Release** con integración automática:

### Proceso automático:
1. **Developer commits** usando Conventional Commits format
2. **Push to main** activa GitHub Actions
3. **Tests ejecutados** (linting, type checking, unit tests, build)
4. **Semantic Release analiza** todos los commits desde última versión
5. **Determina tipo de versión**:
   - `feat`: Nueva funcionalidad → MINOR (1.0.0 → 1.1.0)
   - `fix`: Corrección bug → PATCH (1.0.0 → 1.0.1)
   - `BREAKING CHANGE`: Cambio importante → MAJOR (1.0.0 → 2.0.0)
   - Otros (`docs`, `style`, `chore`, etc.): No cambian versión
6. **Actualiza package.json** con nueva versión
7. **Genera CHANGELOG.md** automáticamente
8. **Crea tag de Git** (ej: v1.1.0)
9. **Crea GitHub Release** con changelog
10. **Construye imagen Docker** con tags semánticos
11. **Despliega a producción** (si está configurado)

### Tags de Docker generados automáticamente:
```
ghcr.io/emilioaray-dev/bcv-service:1.1.0    # Versión exacta
ghcr.io/emilioaray-dev/bcv-service:1.1     # Minor tag
ghcr.io/emilioaray-dev/bcv-service:1       # Major tag
ghcr.io/emilioaray-dev/bcv-service:latest  # Última versión
```

---

## 🧪 Estrategia de Testing

### Niveles de Testing Implementados:
1. **Unit Tests**: Vitest con cobertura >66%
2. **Integration Tests**: Endpoints API y servicios integrados
3. **Security Tests**: Validación de autenticación y rate limiting
4. **Performance Tests**: Benchmarks con autocannon
5. **Load Tests**: Simulación de tráfico real con Artillery

### Scripts de Testing:
```bash
# Todos los tests
pnpm test

# Tests con cobertura
pnpm test:coverage

# Tests unitarios específicos
pnpm test:unit

# Tests de integración
pnpm test:integration

# Benchmarks
pnpm benchmark

# Load tests
pnpm load-test:light
pnpm load-test:medium
pnpm load-test:stress
```

---

## 🚀 Deployment Automático

### Proceso de CI/CD Automatizado:
1. **Pull Request** creado a `main`
2. **Code Review** y aprobación
3. **Merge a main** (squash merge o no-fast-forward)
4. **GitHub Actions**:
   - `test`: Ejecuta todos los tests
   - `lint`: Verifica estilo de código
   - `build`: Compila TypeScript
   - `security`: Escaneo de vulnerabilidades
   - Si cualquiera falla → No se versiona
5. **Semantic Release**:
   - `analyze`: Analiza commits desde última versión
   - `version`: Determina nueva versión, actualiza package.json
   - `changelog`: Genera CHANGELOG.md
   - `publish`: Crea tag Git, GitHub Release, Docker image
   - `deploy`: Despliega a producción si está configurado

### Resultados del deployment:
- ✅ Nueva versión en package.json
- ✅ Tag de Git creado (ej: v2.1.0)
- ✅ GitHub Release con changelog
- ✅ Docker image publicada con tags semánticos
- ✅ Despliegue a producción (si está configurado)

---

## 🔧 Ramas de Soporte para Producción

### En caso de hotfixes críticos:
```bash
# Crear rama de hotfix desde el tag de producción actual
git checkout v2.1.0
git checkout -b hotfix/critical-security-patch

# Implementar fix
# Commits usando conventional commits

# Push y PR a main
git push origin hotfix/critical-security-patch

# Después de merge:
git checkout main
git pull origin main
git tag -a v2.1.1 -m "Hotfix v2.1.1 - Critical security patch for XYZ"
git push origin v2.1.1
```

### Ramas de mantenimiento de versiones antiguas (si aplica):
```bash
# Si se necesita mantener una versión antigua
git checkout v1.5.0
git checkout -b support/v1.5.x

# Solo fixes críticos en esta rama
# No nuevas features
# Mantenimiento limitado
```

---

## 📊 Métricas de Calidad del Código

### Actualmente en el proyecto:
- **Cobertura de tests**: >66% en líneas de código
- **Cobertura de funciones**: >45% 
- **Cobertura de ramificaciones**: >50%
- **Ciclo de desarrollo**: Commits con conventional commits
- **CI/CD**: Tests automáticos en cada PR y merge
- **Linter**: Biome con reglas estrictas
- **Type Safety**: TypeScript strict mode
- **SOLID Architecture**: Implementada con Inversify DI
- **Documentación**: Actualizada y completa

### Herramientas de calidad:
- **Biome**: Formateo y linting de código
- **TypeScript**: Type checking estricto
- **Vitest**: Pruebas unitarias e integración
- **SonarQube**: Análisis estático de código (opcional)
- **Security audit**: Escaneo de dependencias (pnpm audit)

---

## 👥 Gestión de Equipo

### Roles y Responsabilidades:
- **Maintainers**: Aprobación de PRs importantes, versionado
- **Developers**: Desarrollo de features, fixes, tests
- **Reviewers**: Revisión de código y calidad
- **DevOps**: CI/CD, deployment, infraestructura

### Proceso de Code Review:
- Mínimo 1 reviewer por PR (2 para cambios críticos)
- Revisar calidad de commits (conventional commits)
- Verificar tests (cobertura, casos límite)
- Asegurar cumplimiento de estándares de seguridad
- Confirmar documentación actualizada

---

## 🚨 Casos de Uso Específicos

### Caso 1: Nueva funcionalidad multi-canal de notificaciones
```bash
# Rama específica para la funcionalidad
git checkout main
git pull origin main
git checkout -b feat/multi-channel-notifications

# Implementación de Discord, WebHook y WebSocket services
git add src/services/discord.service.ts
git add src/services/webhook.service.ts
git commit -m "feat: implement multi-channel notification system

- Add DiscordService for Discord webhook notifications
- Add WebhookService for HTTP endpoint notifications with HMAC
- Integrate with WebSocketService for real-time delivery
- Implement notification routing logic

Closes #789"

# Implementación de estado persistente
git add src/services/notification-state.service.ts
git commit -m "feat: add persistent notification state system

- Implement dual-layer state (MongoDB primary + Redis cache)
- Prevent duplicate notifications on service restart
- Track significant changes (threshold ≥0.01)
- Support for multiple currencies (USD, EUR, CNY, etc.)

Closes #790"

# Push y PR
git push origin feat/multi-channel-notifications
```

### Caso 2: Cambio que rompe compatibilidad (Breaking Change)
```bash
git checkout main
git pull origin main
git checkout -b refactor/api-response-format

# Implementar cambio significativo
git add src/controllers/rate.controller.ts
git commit -m "refactor!: change API response format to align with REST standards

BREAKING CHANGE: API responses now return data in 'data' field instead of root level

Before:
{
  \"rate\": 36.5,
  \"date\": \"2025-11-24\"
}

After:
{
  \"success\": true,
  \"data\": {
    \"rate\": 36.5,
    \"date\": \"2025-11-24\"
  }
}

Closes #1011"
```

---

## 📚 Recursos Adicionales

### Documentación relacionada:
- [CONVENTIONAL_COMMITS.md](../guides/CONVENTIONAL_COMMITS.md) - Guía de commits convencionales
- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - Arquitectura del sistema
- [TESTING.md](TESTING.md) - Estrategia de pruebas
- [RELEASE.md](RELEASE.md) - Proceso de release
- [CODE_STYLE.md](CODE_STYLE.md) - Estándares de código

### Herramientas utilizadas:
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [InversifyJS](https://github.com/inversify/InversifyJS)
- [Vitest](https://vitest.dev/)
- [Biome](https://biomejs.dev/)

---

## ✅ Checklist de Desarrollo

Antes de crear un PR, verificar:
- [ ] Commits siguen conventional commits
- [ ] Tests pasan (unit + integration)
- [ ] Cobertura de tests >66%
- [ ] Linter no reporta errores (pnpm lint)
- [ ] Build exitoso (pnpm build)
- [ ] Documentación actualizada
- [ ] Variables de entorno documentadas en `.env.example`
- [ ] No hay credenciales en el código (solo en secrets)
- [ ] Health checks y observabilidad funcionan
- [ ] Cambios de seguridad probados
- [ ] Notificaciones funcionan correctamente
- [ ] WebSocket broadcasting funciona
- [ ] API Keys funcionan correctamente

---

## 🔁 Iteración Continua

Actualmente el proyecto está en **modo de iteración continua** donde nuevas features y fixes se integran directamente a `main` tras pasar el proceso de CI/CD y code review, aprovechando el sistema de versionado automático con conventional commits.

### Beneficios del modelo actual:
- ✅ Entrega continua automatizada
- ✅ Versionado automático basado en commits
- ✅ Feedback rápido de cambios
- ✅ Reducción de overhead de gestión de ramas
- ✅ Despliegues frecuentes y seguros

---

**Última actualización**: 2025-11-24
**Versión actual**: 2.1.0
**Estado**: ✅ Todas las fases completadas - Sistema completo y funcional