# Proceso de Release Automático

Guía del proceso de release automatizado para BCV Service. Define cómo se crean y publican nuevas versiones del proyecto con Conventional Commits y Semantic Release.

## Tabla de Contenidos

1. [Versionamiento Automático](#versionamiento-automático)
2. [Tipos de Release](#tipos-de-release)
3. [Workflow de Release Automático](#workflow-de-release-automático)
4. [Changelog Automático](#changelog-automático)
5. [Git Tags Automáticos](#git-tags-automáticos)
6. [Imágenes Docker Automáticas](#imágenes-docker-automáticas)
7. [Rollback y Despliegue Manual](#rollback-y-despliegue-manual)

---

## Versionamiento Automático

### Semantic Versioning con Conventional Commits

El proyecto implementa **versionamiento semántico automatizado** usando **Conventional Commits** y **semantic-release**. El tipo de commit determina automáticamente el tipo de versión:

```
MAJOR.MINOR.PATCH

Example: 2.1.0
```

**MAJOR** (2.x.x):
- Commits con `BREAKING CHANGE` en el footer
- Cambios incompatibles con versiones anteriores
- Cambios arquitectónicos importantes (como implementación de SOLID con Inversify)

**MINOR** (x.1.x):
- Commits con tipo `feat:` (nuevas funcionalidades)
- Cambios hacia atrás compatibles
- Nuevas características como sistema de notificaciones persistente

**PATCH** (x.x.0):
- Commits con tipo `fix:` (correcciones de bugs)
- Mejoras de seguridad
- Mejoras de rendimiento
- Cambios de refactorización

### Ejemplos de Commits y Versionado

```bash
# PATCH: Corrección de bug
git commit -m "fix(bcvservice): resolve SSL certificate validation error

Fixed issue where BCV scraping was failing due to SSL cert chain problems.
Now using custom HTTPS agent with rejectUnauthorized=false for BCV domain only."

# Resultado: 1.0.0 → 1.0.1

# MINOR: Nueva funcionalidad
git commit -m "feat(notification-state): implement persistent notification state system

- Add dual-layer architecture with MongoDB (primary) + Redis (cache)
- Prevent duplicate notifications on service restart
- Implement significant change detection (threshold ≥0.01)
- Support all available currencies (USD, EUR, CNY, etc.)

Closes #8"

# Resultado: 1.0.1 → 1.1.0

# MAJOR: Breaking change
git commit -m "feat!: change API authentication to stricter model

BREAKING CHANGE: All API endpoints now require X-API-Key header authentication.
Previously, some endpoints were accessible without authentication.

Before:
GET /api/rate/latest (public)

After:
GET /api/rate/latest (requires X-API-Key header)"

# Resultado: 1.1.0 → 2.0.0
```

### Versionado Actual

La versión actual del servicio es **2.1.0**, reflejando:
- **MAJOR 2**: Cambios arquitectónicos importantes (SOLID + Inversify + sistema de notificaciones persistente)
- **MINOR 1**: Nuevas funcionalidades (multi-channel notifications, Redis cache, etc.)
- **PATCH 0**: Arreglo de bugs menores y mejoras

---

## Tipos de Release Automatizado

### Patch Release Automático (x.x.1)

**Activado por**: Commits de tipo `fix:`, `refactor:`, `perf:`, `docs(README):` y algunos `chore:`

**Ejemplos**:
```bash
fix(bcv): resolve timeout error in scraping
perf(mongo): optimize database queries
docs: update deployment guide
refactor(architecture): improve error handling
```

**Resultado**: 2.0.0 → 2.0.1

### Minor Release Automático (x.1.0)

**Activado por**: Commits de tipo `feat:` y `BREAKING CHANGE` (en el footer)

**Ejemplos**:
```bash
feat(notification-state): implement persistent notification state system
feat(webhook): add HTTP webhook notifications with HMAC signature
feat(discord): add rate change notifications to Discord

# Con breaking change
feat!: change response format to include metadata

BREAKING CHANGE: Response format changed from root-level to data field
```

**Resultado**: 2.0.1 → 2.1.0

### Major Release Automático (1.0.0)

**Activado por**: Commits con `BREAKING CHANGE` en el footer

**Ejemplos**:
```bash
feat!: change API response structure

BREAKING CHANGE: API responses now return data in 'data' field instead of root level
```

**Resultado**: 1.1.1 → 2.0.0

---

## Workflow de Release Automático

### Proceso CI/CD Automatizado

El proceso de release es completamente automatizado mediante GitHub Actions:

#### 1. Push a main (o merge de PR a main)

```bash
# Desarrollador hace push o merge PR
git add .
git commit -m "feat(notification-state): implement persistent notification state system"
git push origin main
```

#### 2. Análisis de Commits

GitHub Actions ejecuta semantic-release que analiza todos los commits desde la última versión:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Run linter
        run: pnpm lint

      - name: Build project
        run: pnpm build

      - name: Semantic Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

#### 3. Determinación de Tipo de Release

Semantic Release analiza el tipo de commits en el rango:
- Si alguno es `BREAKING CHANGE` → Major release
- Si hay `feat:` → Minor release  
- Si hay `fix:`, `refactor:`, etc. → Patch release
- Si solo hay `docs:`, `chore:`, etc. → No versiona

#### 4. Actualización Automática de package.json

```json
{
  "name": "bcv-service",
  "version": "2.1.0",  // ← Actualizado automáticamente
  "description": "Microservicio BCV Tasa de Cambio",
  "main": "dist/index.js"
}
```

#### 5. Generación Automática de CHANGELOG.md

Semantic Release actualiza el CHANGELOG.md con todos los commits del rango:

```markdown
# [2.1.0](https://github.com/emilioaray-dev/bcv-service/compare/v2.0.0...v2.1.0) (2025-11-24)

### Features

* **notification-state**: implement persistent notification state system ([abc1234](https://github.com/emilioaray-dev/bcv-service/commit/abc1234))
* **webhook**: add HTTP webhook notifications with HMAC signature ([def5678](https://github.com/emilioaray-dev/bcv-service/commit/def5678))
* **discord**: add rate change notifications to Discord ([ghi9012](https://github.com/emilioaray-dev/bcv-service/commit/ghi9012))

### Bug Fixes

* **bcv**: resolve SSL certificate validation error ([jkl3456](https://github.com/emilioaray-dev/bcv-service/commit/jkl3456))

### Refactors

* **architecture**: implement SOLID principles with Inversify DI ([mno7890](https://github.com/emilioaray-dev/bcv-service/commit/mno7890))
```

#### 6. Creación Automática de Git Tag

```bash
# Semantic release crea automáticamente el tag
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0
```

#### 7. Creación Automática de GitHub Release

GitHub Actions crea automáticamente un release en GitHub con:
- Título: v2.1.0
- Descripción: Contenido del CHANGELOG para esa versión
- Assets: (opcional, archivos binarios si aplica)

#### 8. Build y Push de Imágenes Docker

```bash
# Build con tags semánticos múltiples
docker build -t ghcr.io/emilioaray-dev/bcv-service:2.1.0 .
docker build -t ghcr.io/emilioaray-dev/bcv-service:2.1 .
docker build -t ghcr.io/emilioaray-dev/bcv-service:2 .
docker build -t ghcr.io/emilioaray-dev/bcv-service:latest .

# Push a GitHub Container Registry
docker push ghcr.io/emilioaray-dev/bcv-service:2.1.0
docker push ghcr.io/emilioaray-dev/bcv-service:2.1
docker push ghcr.io/emilioaray-dev/bcv-service:2
docker push ghcr.io/emilioaray-dev/bcv-service:latest
```

#### 9. Despliegue Automático (si está configurado)

```bash
# Despliegue a servidor de producción (si está configurado)
ssh user@server "cd /path/to/bcv-service && docker-compose pull && docker-compose up -d"
```

---

## Changelog Automático

### Formato de CHANGELOG.md

El archivo CHANGELOG.md se actualiza automáticamente con el formato estándar de keep-a-changelog:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0](https://github.com/emilioaray-dev/bcv-service/compare/v2.0.0...v2.1.0) (2025-11-24)

### Features

* **notification-state**: implement persistent notification state system ([#8](https://github.com/emilioaray-dev/bcv-service/issues/8))
* **webhook**: add HTTP webhook notifications with HMAC signature
* **discord**: add rate change notifications to Discord
* **redis**: implement Redis as cache layer for notification state

### Bug Fixes

* **bcv**: resolve SSL certificate validation error
* **health**: fix MongoDB health check timeout

### Performance Improvements

* **notification-state**: implement dual-layer architecture (MongoDB + Redis)
* **scraping**: improve HTTP timeout handling

### Refactors

* **architecture**: apply SOLID principles with Inversify DI
* **notifications**: implement multi-channel notification system

## [2.0.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.1.1...v2.0.0) (2025-11-17)

### ⚠ BREAKING CHANGES

* **api**: All endpoints now require X-API-Key header authentication
* **response**: API responses now return data in 'data' field

### Features

* **auth**: add API key authentication for all endpoints
* **security**: implement rate limiting and security headers
* **observability**: add Prometheus metrics and health checks

### BREAKING CHANGES

* **api**: All API endpoints now require X-API-Key header
* **response**: Response format changed to include success flag
```

### Secciones del Changelog

- **Features**: Commits con tipo `feat:`
- **Bug Fixes**: Commits con tipo `fix:`
- **Performance Improvements**: Commits con tipo `perf:`
- **Refactors**: Commits con tipo `refactor:`
- **BREAKING CHANGES**: Commits con `BREAKING CHANGE` en footer

---

## Git Tags Automáticos

### Etiquetas Semánticas

Semantic Release crea automáticamente tags con el formato `vX.Y.Z`:

```bash
# Tags creados automáticamente
v2.1.0  # Último release
v2.0.0  # Versión anterior (con breaking changes)
v1.2.3  # Versión anterior más antigua
```

### Acceso a Versiones Específicas

```bash
# Ver tags
git tag -l

# Checkout de versión específica
git checkout v2.1.0

# Ver commits de una versión
git log --oneline v2.0.0..v2.1.0
```

### Anotaciones en Tags

Cada tag incluye información detallada del release:

```bash
git show v2.1.0
```

```
tag v2.1.0
Tagger: GitHub Actions <action@github.com>
Date:   Mon Nov 24 10:30:00 2025

Release v2.1.0

Features:
- persistent notification state system
- HTTP webhook notifications
- Discord notifications
- Redis cache layer

Bug Fixes:
- SSL certificate validation error
- MongoDB health check timeout
```

---

## Imágenes Docker Automáticas

### Estrategia de Tags

El proceso de CI/CD construye imágenes con múltiples tags semánticos:

#### Tags Generados

```
ghcr.io/emilioaray-dev/bcv-service:2.1.0    # Versión específica
ghcr.io/emilioaray-dev/bcv-service:2.1     # Versión minor
ghcr.io/emilioaray-dev/bcv-service:2       # Versión major  
ghcr.io/emilioaray-dev/bcv-service:latest  # Última versión estable
```

### Dockerfile Actual

```dockerfile
# Usa Node.js LTS
FROM node:24-alpine

# Instala pnpm y deps necesarios
RUN npm install -g pnpm
RUN apk add --no-cache ca-certificates

# Crea directorio de trabajo
WORKDIR /app

# Copia dependencias
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copia código fuente
COPY . .

# Compila TypeScript
RUN pnpm build

# Expone puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/healthz || exit 1

# Comando de inicio
CMD ["node", "dist/app.js"]
```

### Multi-Platform Build

```bash
# Build multi-platform (AMD64, ARM64)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/emilioaray-dev/bcv-service:2.1.0 \
  --push .
```

### Despliegue con Docker Compose

```yaml
# docker-compose.yml
services:
  bcv-service:
    image: ghcr.io/emilioaray-dev/bcv-service:2.1.0  # ← Versión específica
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI_FILE=/run/secrets/mongodb_uri
      - API_KEYS_FILE=/run/secrets/api_keys
    secrets:
      - mongodb_uri
      - api_keys
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
```

---

## Rollback y Despliegue Manual

### Rollback (versión anterior)

Si hay problemas con un release automatizado:

#### 1. Despliegue Manual de Versión Anterior

```bash
# Despliegue con Docker Compose
docker-compose down
docker-compose pull bcv-service:v2.0.0  # Usar versión anterior
docker-compose up -d
```

#### 2. Despliegue con Kubernetes

```bash
# Rollback a versión anterior
kubectl set image deployment/bcv-service \
  bcv-service=ghcr.io/emilioaray-dev/bcv-service:2.0.0 \
  -n production

# Verificar despliegue
kubectl rollout status deployment/bcv-service -n production
```

#### 3. Git Revert de Commits Problemáticos

```bash
# Si el problema es un commit específico, revertirlo
git revert abc1234  # SHA del commit problemático
git push origin main

# Esto generará un nuevo release automático si el revert es significativo
```

### Despliegue Manual (no recomendado)

En casos excepcionales, se puede hacer un despliegue manual:

#### 1. Actualizar Versión Manualmente

```bash
# Actualizar package.json manualmente
npm version patch  # o minor, major
```

#### 2. Actualizar CHANGELOG Manualmente

```bash
# Editar CHANGELOG.md manualmente
vim CHANGELOG.md
```

#### 3. Crear Git Tag Manualmente

```bash
# Crear tag
git tag -a v2.1.1 -m "Manual release v2.1.1"
git push origin v2.1.1
```

**Nota**: Esto interrumpe el flujo automático y se desaconseja a menos que sea estrictamente necesario.

### Monitoreo Post-Release

Después de cada release, monitorizar:

#### 1. Métricas de Prometheus

```bash
# Ver estado del servicio
curl http://localhost:3000/metrics | grep -E "(up|http_requests_total|bcv_latest_rate)"
```

#### 2. Health Checks

```bash
# Verificar health
curl http://localhost:3000/health
curl http://localhost:3000/readyz
curl http://localhost:3000/healthz
```

#### 3. Logs

```bash
# Verificar que el servicio esté funcionando
docker-compose logs bcv-service

# Buscar errores
docker-compose logs bcv-service | grep -i error
```

#### 4. Notificaciones

Verificar que el sistema de notificaciones funcione correctamente:
- WebSocket connections
- Discord notifications
- HTTP webhook deliveries
- Estado persistente de notificaciones

---

## Próximos Releases

### Estrategia de Versionado

El proyecto seguirá usando versionado semántico automatizado con Conventional Commits. Los desarrolladores deben:

#### 1. Seguir Convenciones de Commits

```bash
# ✅ Bien - Siguiendo conventional commits
git commit -m "feat(notification-state): implement dual-layer notification system

- Add MongoDB as primary persistent storage
- Add Redis as cache layer for fast read/write
- Prevent duplicate notifications on service restart
- Implement significant change detection (threshold ≥0.01)

Closes #8"

# ✅ Bien - Con breaking change
git commit -m "feat!: change API response format

BREAKING CHANGE: API responses now use 'data' field instead of root level

Before:
{ rate: 36.5 }

After:
{ success: true, data: { rate: 36.5 } }
```

#### 2. Evitar Commits Vagos

```bash
# ❌ Mal - No sigue conventional commits
git commit -m "fix bug"
git commit -m "update code"
git commit -m "WIP"
```

---

## Referencias

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [GitHub Actions for Package Publishing](https://docs.github.com/en/actions/publishing-packages)
- [Docker Multi-Platform Builds](https://docs.docker.com/build/building/multi-platform/)

---

**Última actualización**: 2025-11-24  
**Versión actual del servicio**: 2.1.0  
**Estado**: ✅ Sistema de release automatizado implementado y operativo