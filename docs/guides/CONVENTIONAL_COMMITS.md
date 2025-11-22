# Guía de Conventional Commits

Esta guía explica cómo usar Conventional Commits para versionamiento automático con Semantic Release.

## 📋 Tabla de Contenidos

- [¿Qué son los Conventional Commits?](#qué-son-los-conventional-commits)
- [Formato de Commits](#formato-de-commits)
- [Tipos de Commits](#tipos-de-commits)
- [Versionamiento Automático](#versionamiento-automático)
- [Ejemplos Prácticos](#ejemplos-prácticos)
- [Mejores Prácticas](#mejores-prácticas)
- [CHANGELOG Automático](#changelog-automático)

## ¿Qué son los Conventional Commits?

Conventional Commits es una especificación para agregar significado legible por humanos y máquinas a los mensajes de commit. Permite que herramientas como **semantic-release** determinen automáticamente el tipo de versión (major, minor, patch).

## Formato de Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Componentes:

- **type** (obligatorio): El tipo de cambio
- **scope** (opcional): El alcance del cambio (ej: auth, api, health)
- **subject** (obligatorio): Descripción breve del cambio
- **body** (opcional): Descripción detallada
- **footer** (opcional): Breaking changes, referencias a issues

## Tipos de Commits

### 🚀 feat (Feature) → MINOR version

Nuevo funcionalidad para el usuario.

```bash
git commit -m "feat: add WebSocket real-time notifications"
git commit -m "feat(api): add rate history endpoint with pagination"
```

**Resultado:** `1.0.0` → `1.1.0`

---

### 🐛 fix (Bug Fix) → PATCH version

Corrección de un bug.

```bash
git commit -m "fix: resolve timeout in BCV scraping"
git commit -m "fix(health): correct MongoDB ping timeout"
```

**Resultado:** `1.0.0` → `1.0.1`

---

### 💥 BREAKING CHANGE → MAJOR version

Cambio que rompe compatibilidad hacia atrás.

```bash
git commit -m "feat!: redesign API authentication

BREAKING CHANGE: API now requires Bearer tokens instead of API keys"
```

**Resultado:** `1.0.0` → `2.0.0`

---

### 📚 docs (Documentation) → PATCH (si README)

Cambios solo en documentación.

```bash
git commit -m "docs: update API endpoints documentation"
git commit -m "docs(readme): add deployment instructions"
```

**Resultado:** `1.0.0` → `1.0.1` (solo si es README)

---

### 🎨 style (Code Style) → NO VERSION

Cambios de formato, espacios, punto y coma, etc.

```bash
git commit -m "style: format code with Biome"
git commit -m "style: add missing semicolons"
```

**Resultado:** No cambia versión

---

### ♻️ refactor (Refactoring) → PATCH

Cambio de código que no corrige un bug ni agrega funcionalidad.

```bash
git commit -m "refactor: improve health check service architecture"
git commit -m "refactor(bcv): extract scraping logic to separate method"
```

**Resultado:** `1.0.0` → `1.0.1`

---

### ⚡ perf (Performance) → PATCH

Mejora de rendimiento.

```bash
git commit -m "perf: optimize MongoDB queries with indexes"
git commit -m "perf(api): add Redis caching layer"
```

**Resultado:** `1.0.0` → `1.0.1`

---

### ✅ test (Tests) → NO VERSION

Agregar o corregir tests.

```bash
git commit -m "test: add health check endpoint tests"
git commit -m "test(bcv): increase coverage to 80%"
```

**Resultado:** No cambia versión

---

### 🔧 build (Build System) → NO VERSION

Cambios en el sistema de build o dependencias externas.

```bash
git commit -m "build: upgrade TypeScript to 5.5.3"
git commit -m "build: add semantic-release dependencies"
```

**Resultado:** No cambia versión

---

### 👷 ci (Continuous Integration) → NO VERSION

Cambios en archivos de CI/CD.

```bash
git commit -m "ci: add test stage to GitHub Actions"
git commit -m "ci: configure semantic-release workflow"
```

**Resultado:** No cambia versión

---

### 🧹 chore (Chores) → NO VERSION

Cambios que no modifican src o test files.

```bash
git commit -m "chore: update .gitignore"
git commit -m "chore: clean up old files"
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

### Cómo funciona:

1. **Desarrollador hace commits** usando Conventional Commits
2. **Push a main** activa GitHub Actions
3. **Tests se ejecutan** (linting, type checking, tests, build)
4. **Semantic Release analiza** todos los commits desde la última versión
5. **Determina el tipo de versión:**
   - `BREAKING CHANGE` → Major (2.0.0)
   - `feat` → Minor (1.1.0)
   - `fix`, `refactor`, `perf`, `docs(README)` → Patch (1.0.1)
   - Otros → No versiona
6. **Actualiza package.json**
7. **Genera CHANGELOG.md**
8. **Crea tag de Git** (ej: v1.1.0)
9. **Crea GitHub Release**
10. **Construye imagen Docker** con tags semánticos
11. **Despliega a producción**

## Ejemplos Prácticos

### Ejemplo 1: Nueva Funcionalidad

```bash
# Desarrollador crea nueva funcionalidad
git add src/services/notification.service.ts
git commit -m "feat(notifications): add email notifications for rate changes

- Implemented NodeMailer integration
- Added email templates
- Configured SMTP settings
- Added tests for email service"

git push origin main
```

**Resultado automático:**
- Versión: `1.0.2` → `1.1.0`
- Tag: `v1.1.0`
- CHANGELOG actualizado
- Docker image: `ghcr.io/emilioaray-dev/bcv-service:1.1.0`
- Despliegue automático

---

### Ejemplo 2: Bug Fix

```bash
git add src/services/bcv.service.ts
git commit -m "fix(bcv): resolve SSL certificate validation error

Fixed issue where BCV scraping was failing due to SSL cert chain problems.
Now using custom HTTPS agent with rejectUnauthorized=false for BCV domain only."

git push origin main
```

**Resultado automático:**
- Versión: `1.1.0` → `1.1.1`
- Tag: `v1.1.1`
- CHANGELOG actualizado
- Docker image: `ghcr.io/emilioaray-dev/bcv-service:1.1.1`
- Despliegue automático

---

### Ejemplo 3: Breaking Change

```bash
git add src/controllers/rate.controller.ts
git commit -m "feat!: change API response format to match REST standards

BREAKING CHANGE: API responses now return data in 'data' field instead of root level.

Before:
{
  \"rate\": 36.5,
  \"date\": \"2025-11-22\"
}

After:
{
  \"success\": true,
  \"data\": {
    \"rate\": 36.5,
    \"date\": \"2025-11-22\"
  }
}"

git push origin main
```

**Resultado automático:**
- Versión: `1.1.1` → `2.0.0`
- Tag: `v2.0.0`
- CHANGELOG con sección BREAKING CHANGES
- Docker image: `ghcr.io/emilioaray-dev/bcv-service:2.0.0`
- Despliegue automático

---

### Ejemplo 4: Múltiples Cambios

```bash
# Fix bug
git commit -m "fix(health): correct readiness probe timeout"

# Add feature
git commit -m "feat(metrics): add Prometheus histogram for response times"

# Refactor
git commit -m "refactor(bcv): improve error handling"

git push origin main
```

**Resultado automático:**
- Semantic Release analiza TODOS los commits
- Encuentra: 1 fix + 1 feat + 1 refactor
- Versión más alta gana: `feat` → Minor
- Versión: `2.0.0` → `2.1.0`
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
   ```

4. **Separa múltiples cambios**
   ```bash
   ✅ Commit 1: "feat: add email notifications"
   ✅ Commit 2: "feat: add SMS notifications"
   ❌ "feat: add email and SMS notifications and fix bug"
   ```

5. **Usa body para detalles**
   ```bash
   git commit -m "feat(api): add rate limiting

   - Added express-rate-limit middleware
   - Configured 100 requests per 15 minutes
   - Added custom error messages
   - Updated API documentation"
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

3. **No uses commits vagos**
   ```bash
   ❌ "fix: fix stuff"
   ❌ "chore: updates"
   ❌ "WIP"
   ```

4. **No mezcles tipos de cambios**
   ```bash
   ❌ "feat: add feature and fix bug and update docs"
   ✅ Usa 3 commits separados
   ```

## CHANGELOG Automático

Semantic Release genera automáticamente el archivo `CHANGELOG.md`:

```markdown
# Changelog

## [2.1.0](https://github.com/emilioaray-dev/bcv-service/compare/v2.0.0...v2.1.0) (2025-11-22)

### Features

* **metrics** add Prometheus histogram for response times ([abc1234](https://github.com/emilioaray-dev/bcv-service/commit/abc1234))

### Bug Fixes

* **health** correct readiness probe timeout ([def5678](https://github.com/emilioaray-dev/bcv-service/commit/def5678))

## [2.0.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.1.1...v2.0.0) (2025-11-21)

### ⚠ BREAKING CHANGES

* API responses now return data in 'data' field instead of root level

### Features

* change API response format to match REST standards ([ghi9012](https://github.com/emilioaray-dev/bcv-service/commit/ghi9012))
```

## Recursos Adicionales

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [Commitlint Documentation](https://commitlint.js.org/)

## Validación Local

Para validar tu commit message localmente antes de hacer push:

```bash
# Instalar husky (opcional, para hooks de git)
pnpm add -D husky

# Validar mensaje manualmente
echo "feat: add new feature" | pnpm commitlint
```

## Soporte

Si tienes dudas sobre cómo formatear un commit, consulta:
1. Esta guía
2. El archivo `.commitlintrc.json` en la raíz del proyecto
3. GitHub Actions logs si el commit fue rechazado
 Human: continua