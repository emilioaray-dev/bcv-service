# Guía de Conventional Commits

Esta guía explica cómo usar Conventional Commits para versionamiento automático con Semantic Release en el proyecto BCV Service.

## 📋 Tabla de Contenidos

- [¿Qué son los Conventional Commits?](#qué-son-los-conventional-commits)
- [Formato de Commits](#formato-de-commits)
- [Tipos de Commits](#tipos-de-commits)
- [Versionamiento Automático](#versionamiento-automático)
- [Ejemplos Prácticos](#ejemplos-prácticos)
- [Mejores Prácticas](#mejores-prácticas)
- [CHANGELOG Automático](#changelog-automático)
- [Integración con GitHub Actions](#integración-con-github-actions)

## ¿Qué son los Conventional Commits?

Conventional Commits es una especificación para agregar significado legible por humanos y máquinas a los mensajes de commit. Permite que herramientas como **semantic-release** determinen automáticamente el tipo de versión (major, minor, patch). En el proyecto BCV Service, el sistema de CI/CD implementa completamente este proceso con versionamiento automático, tagging, generación de Docker images y despliegue.

## Formato de Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Componentes:

- **type** (obligatorio): El tipo de cambio
- **scope** (opcional): El alcance del cambio (ej: auth, api, health, notifications)
- **subject** (obligatorio): Descripción breve del cambio
- **body** (opcional): Descripción detallada
- **footer** (opcional): Breaking changes, referencias a issues

## Tipos de Commits

### 🚀 feat (Feature) → MINOR version

Nuevo funcionalidad para el usuario.

```bash
git commit -m "feat: add WebSocket real-time notifications"
git commit -m "feat(api): add rate history endpoint with pagination"
git commit -m "feat(notifications): implement persistent notification state system"
git commit -m "feat(discord): add rate change notifications to Discord"
git commit -m "feat(webhook): add HTTP webhook notifications with HMAC signing"
git commit -m "feat(metrics): implement Prometheus metrics for all services"
```

**Resultado:** `1.0.0` → `1.1.0`

---

### 🐛 fix (Bug Fix) → PATCH version

Corrección de un bug.

```bash
git commit -m "fix: resolve timeout in BCV scraping"
git commit -m "fix(health): correct MongoDB ping timeout"
git commit -m "fix(notification-state): prevent duplicate notifications on restart"
git commit -m "fix(redis): handle connection failures gracefully"
git commit -m "fix(auth): prevent unauthorized access to protected endpoints"
```

**Resultado:** `1.0.0` → `1.0.1`

---

### 💥 BREAKING CHANGE → MAJOR version

Cambio que rompe compatibilidad hacia atrás.

```bash
git commit -m "feat!: redesign API authentication

BREAKING CHANGE: API now requires X-API-Key header instead of API token in query params"
```

**Resultado:** `1.0.0` → `2.0.0`

---

### 📚 docs (Documentation) → PATCH (si README)

Cambios solo en documentación.

```bash
git commit -m "docs: update API endpoints documentation"
git commit -m "docs(readme): add deployment instructions"
git commit -m "docs(architecture): add detailed SOLID architecture documentation"
git commit -m "docs(guides): add observability and health check documentation"
```

**Resultado:** `1.0.0` → `1.0.1` (solo si es README o documentación significativa)

---

### 🎨 style (Code Style) → NO VERSION

Cambios de formato, espacios, punto y coma, etc.

```bash
git commit -m "style: format code with Biome"
git commit -m "style: add missing semicolons"
git commit -m "style(code-format): apply project-wide formatting rules"
```

**Resultado:** No cambia versión

---

### ♻️ refactor (Refactoring) → PATCH

Cambio de código que no corrige un bug ni agrega funcionalidad.

```bash
git commit -m "refactor: improve health check service architecture"
git commit -m "refactor(bcv): extract scraping logic to separate method"
git commit -m "refactor(architecture): implement SOLID principles with Inversify"
git commit -m "refactor(dependencies): migrate from single file to modular architecture"
```

**Resultado:** `1.0.0` → `1.0.1`

---

### ⚡ perf (Performance) → PATCH

Mejora de rendimiento.

```bash
git commit -m "perf: optimize MongoDB queries with indexes"
git commit -m "perf(api): add Redis caching layer"
git commit -m "perf(scraping): reduce BCV scraping time by 30%"
```

**Resultado:** `1.0.0` → `1.0.1`

---

### ✅ test (Tests) → NO VERSION

Agregar o corregir tests.

```bash
git commit -m "test: add health check endpoint tests"
git commit -m "test(bcv): increase coverage to 66%"
git commit -m "test(notification-state): add tests for persistent state system"
git commit -m "test(websocket): add WebSocket service tests"
```

**Resultado:** No cambia versión

---

### 🔧 build (Build System) → NO VERSION

Cambios en el sistema de build o dependencias externas.

```bash
git commit -m "build: upgrade TypeScript to 5.5.3"
git commit -m "build: add semantic-release dependencies"
git commit -m "build(deps): update project dependencies"
git commit -m "build: optimize Docker image size"
```

**Resultado:** No cambia versión

---

### 👷 ci (Continuous Integration) → NO VERSION

Cambios en archivos de CI/CD.

```bash
git commit -m "ci: add test stage to GitHub Actions"
git commit -m "ci: configure semantic-release workflow"
git commit -m "ci: add Docker build and publish workflow"
git commit -m "ci: implement automated testing pipeline"
```

**Resultado:** No cambia versión

---

### 🧹 chore (Chores) → NO VERSION

Cambios que no modifican src o test files.

```bash
git commit -m "chore: update .gitignore"
git commit -m "chore: clean up old files"
git commit -m "chore(config): add Inversify configuration"
git commit -m "chore: update project dependencies"
```

**Resultado:** No cambia versión

---

### ⏪ revert (Revert) → Depende del commit revertido

Revierte un commit anterior.

```bash
git commit -m "revert: revert feat: add WebSocket notifications"
```

**Resultado:** Depende del tipo de commit revertido

## Versionamiento Automático

### Cómo funciona en BCV Service:

1. **Desarrollador hace commits** usando Conventional Commits
2. **Push a main** activa GitHub Actions (`.github/workflows/release.yml`)
3. **Tests se ejecutan** (linting con Biome, type checking con TypeScript, tests con Vitest, build)
4. **Semantic Release analiza** todos los commits desde la última versión
5. **Determina el tipo de versión:**
   - `BREAKING CHANGE` → Major (2.0.0)
   - `feat` → Minor (1.1.0)
   - `fix`, `refactor`, `perf`, `docs(README)` → Patch (1.0.1)
   - Otros → No versiona
6. **Actualiza package.json** con nueva versión
7. **Genera CHANGELOG.md** con todos los cambios
8. **Crea tag de Git** (ej: v1.1.0)
9. **Crea GitHub Release** con changelog
10. **Construye imagen Docker** con tags semánticos (`1.1.0`, `1.1`, `1`, `latest`)
11. **Publica imagen** a GitHub Container Registry
12. **Despliega a producción** (si está configurado)

### Archivos de Configuración:

- `.releaserc.json` - Configuración de Semantic Release
- `.commitlintrc.json` - Reglas para commitlint
- `package.json` - Scripts de release y dependencias
- `.github/workflows/release.yml` - Workflow de CI/CD

## Ejemplos Prácticos

### Ejemplo 1: Nueva Funcionalidad de Notificaciones

```bash
# Desarrollador implementa sistema de notificaciones persistente
git add src/services/notification-state.service.ts
git add src/interfaces/INotificationStateService.ts
git commit -m "feat(notification-service): implement persistent notification state system

- Added dual-layer architecture with MongoDB (primary) and Redis (cache)
- Prevents duplicate notifications when service restarts
- Implements significant change detection (threshold ≥0.01)
- Adds multi-currency support (USD, EUR, CNY, TRY, RUB)
- Includes trend tracking and percentage calculation

Closes #8"

git push origin main
```

**Resultado automático:**
- Versión: `2.0.0` → `2.1.0`
- Tag: `v2.1.0`
- CHANGELOG actualizado
- Docker image: `ghcr.io/emilioaray-dev/bcv-service:2.1.0`
- GitHub Release: `v2.1.0`
- Despliegue automático

---

### Ejemplo 2: Bug Fix en Sistema de Notificaciones

```bash
git add src/services/notification-state.service.ts
git commit -m "fix(notification-state): prevent duplicate notifications on service restart

Fixed issue where service was sending notification on startup even when no
significant change occurred. Now compares with stored last notified rate
from persistent state instead of in-memory state."

git push origin main
```

**Resultado automático:**
- Versión: `2.1.0` → `2.1.1`
- Tag: `v2.1.1`
- CHANGELOG actualizado
- Docker image: `ghcr.io/emilioaray-dev/bcv-service:2.1.1`
- Despliegue automático

---

### Ejemplo 3: Breaking Change en API

```bash
git add src/middleware/auth.middleware.ts
git add src/controllers/rate.controller.ts
git commit -m "feat!: change API authentication to stricter model

BREAKING CHANGE: All API endpoints now require X-API-Key header authentication.
Previously, some endpoints were accessible without authentication.

Before:
GET /api/rate/latest (public)

After:
GET /api/rate/latest (requires X-API-Key header)

Also updated rate response format to include additional metadata fields.

Closes #15"

git push origin main
```

**Resultado automático:**
- Versión: `2.1.1` → `3.0.0`
- Tag: `v3.0.0`
- CHANGELOG con sección BREAKING CHANGES
- Docker image: `ghcr.io/emilioaray-dev/bcv-service:3.0.0`
- Despliegue automático

---

### Ejemplo 4: Múltiples Cambios Simultáneos

```bash
# Fix en sistema de notificaciones
git add src/services/discord.service.ts
git commit -m "fix(discord): handle webhook failures gracefully"

# Add nueva funcionalidad de webhook
git add src/services/webhook.service.ts
git add src/interfaces/IWebhookService.ts
git commit -m "feat(webhook): add HTTP webhook notifications with HMAC signature"

# Refactor en arquitectura
git add src/config/inversify.config.ts
git commit -m "refactor(architecture): improve dependency injection bindings"

git push origin main
```

**Resultado automático:**
- Semantic Release analiza TODOS los commits
- Encuentra: 1 fix + 1 feat + 1 refactor
- Versión más alta gana: `feat` → Minor
- Versión: `3.0.0` → `3.1.0`
- CHANGELOG incluye todos los cambios
- Despliegue automático

## Mejores Prácticas

### ✅ DO (Hacer)

1. **Usa el presente imperativo**
   ```bash
   ✅ "fix: resolve timeout issue"
   ❌ "fix: resolved timeout issue"
   ❌ "fix: resolves timeout issue"
   ```

2. **Sé específico y conciso**
   ```bash
   ✅ "fix(auth): validate API key format before database query"
   ❌ "fix: fix bug"
   ```

3. **Usa scope cuando sea relevante**
   ```bash
   ✅ "feat(websocket): add reconnection logic"
   ✅ "fix(health): correct MongoDB ping timeout"
   ✅ "feat(notification-state): implement dual-layer architecture"
   ```

4. **Separa múltiples cambios significativos**
   ```bash
   ✅ Commit 1: "feat: add email notifications"
   ✅ Commit 2: "feat: add SMS notifications"
   ❌ "feat: add email and SMS notifications and fix bug"
   ```

5. **Usa body para detalles técnicos**
   ```bash
   git commit -m "feat(api): add rate limiting

   - Added express-rate-limit middleware
   - Configured 100 requests per 15 minutes per IP
   - Added custom error messages in Spanish
   - Updated API documentation
   - Includes headers for rate limit tracking

   Related: #123"
   ```

6. **Referencia issues cuando aplique**
   ```bash
   git commit -m "feat: add Prometheus metrics

   Implements full Prometheus metric collection for:
   - HTTP request counters and durations
   - WebSocket connection tracking
   - BCV scraping success/failure rates
   - Custom business metrics

   Closes #45"
   ```

### ❌ DON'T (No hacer)

1. **No uses punto final en el subject**
   ```bash
   ✅ "fix: resolve timeout"
   ❌ "fix: resolve timeout."
   ```

2. **No uses mayúsculas en type**
   ```bash
   ✅ "feat: add feature"
   ❌ "Feat: add feature"
   ❌ "FEAT: add feature"
   ```

3. **No mezcles múltiples tipos en un commit**
   ```bash
   ❌ "feat: add feature and fix bug and update docs"
   ✅ Usa commits separados para cada tipo
   ```

4. **No uses mensajes vagos**
   ```bash
   ❌ "fix: fix stuff"
   ❌ "chore: updates"
   ❌ "WIP"
   ```

## CHANGELOG Automático

Semantic Release genera automáticamente el archivo `CHANGELOG.md`:

```markdown
# Changelog

## [2.1.0](https://github.com/emilioaray-dev/bcv-service/compare/v2.0.0...v2.1.0) (2025-11-24)

### Features

* **notifications** implement persistent notification state system ([abc1234](https://github.com/emilioaray-dev/bcv-service/commit/abc1234))
* **webhook** add HTTP webhook notifications with HMAC signature ([def5678](https://github.com/emilioaray-dev/bcv-service/commit/def5678))
* **discord** add rate change notifications to Discord ([ghi9012](https://github.com/emilioaray-dev/bcv-service/commit/ghi9012))

### Bug Fixes

* **health** correct MongoDB ping timeout ([jkl3456](https://github.com/emilioaray-dev/bcv-service/commit/jkl3456))

## [2.0.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.1.1...v2.0.0) (2025-11-23)

### ⚠ BREAKING CHANGES

* API responses now require X-API-Key header authentication

### Features

* **auth** implement API key authentication for all endpoints ([mno7890](https://github.com/emilioaray-dev/bcv-service/commit/mno7890))
```

## Integración con GitHub Actions

### Workflow de Release Automático

El proyecto implementa un workflow de CI/CD completo:

1. **STAGE 1: Validate & Test**
   - Biome linting
   - TypeScript type checking
   - 66+ unit tests con Vitest
   - Build del proyecto
   - Si falla, pipeline se detiene (NO se versiona)

2. **STAGE 2: Semantic Release**
   - Analiza commits desde última versión
   - Determina tipo de versión según conventional commits
   - Actualiza package.json
   - Genera CHANGELOG.md
   - Crea tag de Git
   - Crea GitHub Release

3. **STAGE 3: Build & Publish Docker**
   - Construye imagen Docker
   - Publica con tags semánticos (v3.1.0, v3.1, v3, latest)

4. **STAGE 4: Deploy**
   - Despliega a servidor de producción
   - Verifica health del servicio

### Archivos de Workflow

- `.github/workflows/release.yml` - Pipeline principal
- `.github/workflows/test.yml` - Tests en pull requests
- `.releaserc.json` - Configuración de semantic-release
- `.commitlintrc.json` - Reglas de validación para commits

## Recursos Adicionales

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

## Validación Local

Para validar tu commit message localmente antes de hacer push:

```bash
# Instalar commitizen (opcional, para ayuda con commits)
pnpm add -D @commitlint/cli @commitlint/config-conventional

# Validar mensaje manualmente
echo "feat: add new feature" | npx commitlint

# O usar commitizen para commits estructurados
npx cz
```

## Soporte

Si tienes dudas sobre cómo formatear un commit, consulta:
1. Esta guía
2. El archivo `.commitlintrc.json` en la raíz del proyecto
3. GitHub Actions logs si el commit fue rechazado
4. Los ADRs (Architecture Decision Records) para decisiones de diseño
5. Los archivos en `/docs/guides/` para documentación detallada

---

**Versión actual del proyecto**: 2.1.0
**Última actualización**: 2025-11-24
**Última mejora**: Sistema de notifications persistentes implementado
**Próxima mejora planeada**: Performance optimizations y Redis integration