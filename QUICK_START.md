# Quick Start - Desarrollo por Fases

Guía rápida para comenzar el desarrollo del proyecto BCV Service usando la estrategia de ramas por fase.

## 📊 Estado Actual

```
✅ Commit inicial completado
✅ 2,378 líneas de código implementadas
✅ Documentación completa creada
✅ Estrategia de branching definida
```

**Último commit**: `ca3bdcd` - docs: add branch strategy guide for phased development
**Base commit**: `156222b` - feat: initial BCV exchange rate service

---

## 🚀 Comandos Rápidos

### Ver el estado actual
```bash
git log --oneline -5
git status
```

### Iniciar Fase 1 (Seguridad Crítica)
```bash
# Crear rama de fase
git checkout -b phase-1/security-critical main

# Crear primera feature: Secrets Management
git checkout -b feat/secrets-management phase-1/security-critical

# Trabajar en la feature...
# Cuando esté lista:
git add .
git commit -m "feat(security): implement secrets management system

- Rotate MongoDB credentials
- Add Docker Secrets integration
- Create secrets initialization script

Closes #1"

git push origin feat/secrets-management

# Crear PR hacia phase-1/security-critical
```

### Merge de feature a fase
```bash
git checkout phase-1/security-critical
git merge --no-ff feat/secrets-management
git push origin phase-1/security-critical
```

### Merge de fase a main (cuando todas las features estén completas)
```bash
git checkout main
git merge --no-ff phase-1/security-critical
git tag -a v0.2.0 -m "Release v0.2.0 - Phase 1: Security Critical"
git push origin main --tags
```

---

## 📋 Roadmap de Fases

### Fase 1: Seguridad Crítica (1-2 días)
```bash
git checkout -b phase-1/security-critical main
```

**Features**:
- [ ] `feat/secrets-management` - Gestión de secretos
- [ ] `feat/api-authentication` - Autenticación API
- [ ] `feat/production-rate-limiting` - Rate limiting mejorado

**Target**: `v0.2.0`

---

### Fase 2: Calidad y Estabilidad (3-4 días)
```bash
git checkout -b phase-2/quality-stability main
```

**Features**:
- [ ] `feat/unit-tests` - Tests unitarios completos
- [ ] `feat/structured-logging` - Winston logging
- [ ] `feat/zod-validation-complete` - Validación completa
- [ ] `feat/health-checks` - Health check endpoints

**Target**: `v0.3.0`

---

### Fase 3: Optimización (2-3 días)
```bash
git checkout -b phase-3/optimization main
```

**Features**:
- [ ] `feat/redis-cache-decision` - Decisión Redis
- [ ] `feat/integration-tests` - Tests de integración
- [ ] `feat/graceful-shutdown` - Graceful shutdown
- [ ] `feat/api-documentation` - Swagger docs

**Target**: `v0.4.0`

---

### Fase 4: Observabilidad (2-3 días)
```bash
git checkout -b phase-4/observability main
```

**Features**:
- [ ] `feat/prometheus-metrics` - Métricas Prometheus
- [ ] `feat/monitoring-dashboard` - Dashboard Grafana
- [ ] `feat/alerting-system` - Sistema de alertas

**Target**: `v1.0.0` - **PRODUCTION READY** 🎉

---

## 📝 Plantillas de Commits

### Feature commit
```bash
git commit -m "feat(scope): descripción corta

Detalles de la implementación:
- Punto 1
- Punto 2
- Punto 3

Closes #issue-number"
```

### Fix commit
```bash
git commit -m "fix(scope): descripción del fix

Describe el problema y la solución.

Fixes #issue-number"
```

### Docs commit
```bash
git commit -m "docs: descripción del cambio

Actualización de documentación para X.

Refs #issue-number"
```

### Test commit
```bash
git commit -m "test: descripción de los tests

- Tests para funcionalidad X
- Coverage: 85%

Closes #issue-number"
```

---

## 🔍 Comandos Útiles

### Ver ramas
```bash
# Todas las ramas
git branch -a

# Solo ramas remotas
git branch -r

# Ramas con último commit
git branch -v
```

### Ver diferencias
```bash
# Entre ramas
git diff main..phase-1/security-critical

# Archivos cambiados
git diff --name-only main..phase-1/security-critical

# Estadísticas
git diff --stat main..phase-1/security-critical
```

### Ver historial
```bash
# Log gráfico
git log --graph --oneline --all --decorate

# Log de una rama específica
git log phase-1/security-critical --oneline

# Commits entre dos puntos
git log main..phase-1/security-critical --oneline
```

### Limpiar ramas
```bash
# Eliminar rama local
git branch -d feat/nombre-feature

# Eliminar rama remota
git push origin --delete feat/nombre-feature

# Limpiar referencias obsoletas
git fetch --prune
```

---

## 🎯 Checklist de PR

Antes de crear un Pull Request, verificar:

- [ ] Código funciona localmente con `pnpm dev`
- [ ] Tests pasan: `pnpm test`
- [ ] Linter sin errores: `pnpm lint`
- [ ] Build exitoso: `pnpm build`
- [ ] README.md actualizado si es necesario
- [ ] CHANGELOG.md actualizado
- [ ] Commit message sigue convenciones
- [ ] Branch actualizado con main: `git merge main`

---

## 📚 Documentos de Referencia

- **MEJORAS.md**: Plan completo de mejoras (12 issues identificados)
- **RESUMEN_MEJORAS.md**: Resumen ejecutivo de cambios implementados
- **BRANCH_STRATEGY.md**: Guía detallada de estrategia de branching
- **README.md**: Setup e instrucciones de uso
- **PLAN.md**: Plan inicial del proyecto

---

## 🛠️ Comandos de Desarrollo

### Desarrollo local
```bash
# Instalar dependencias
pnpm install

# Modo desarrollo (watch mode)
pnpm dev

# Build
pnpm build

# Ejecutar build
pnpm start

# Linting
pnpm lint
pnpm lint:fix

# Format
pnpm format

# Tests
pnpm test
pnpm test:watch
```

### Docker
```bash
# Build imagen
pnpm docker:build

# Run container
pnpm docker:run

# Docker Compose
docker-compose up -d
docker-compose logs -f bcv-service
docker-compose down
```

---

## 🔐 Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```bash
cp .env.example .env
```

Variables principales:
- `PORT`: Puerto del servidor (default: 3000)
- `MONGODB_URI`: URI de MongoDB
- `SAVE_TO_DATABASE`: true/false para modo consola
- `CRON_SCHEDULE`: Programación de tareas
- `NODE_ENV`: development/production

**IMPORTANTE**: Rotar credenciales antes de producción (Ver Fase 1)

---

## 🐛 Solución de Problemas

### El servidor no inicia
```bash
# Verificar puerto ocupado
lsof -i :3000

# Verificar dependencias
pnpm install

# Limpiar y reinstalar
rm -rf node_modules dist
pnpm install
```

### Error SSL en scraping
```bash
# Ya está resuelto en el código
# Verificar NODE_ENV
echo $NODE_ENV

# En desarrollo: certificados no verificados
# En producción: verificación activa
```

### Tests fallan
```bash
# Limpiar cache
rm -rf coverage

# Verificar biome config
pnpm lint

# Ejecutar tests en verbose
pnpm test --reporter=verbose
```

---

## 📞 Soporte

- Issues: Ver MEJORAS.md para problemas conocidos
- Documentación: README.md, PLAN.md
- Estrategia: BRANCH_STRATEGY.md

---

## 🎓 Próximos Pasos

1. **Revisar documentación**: Leer MEJORAS.md y BRANCH_STRATEGY.md
2. **Configurar environment**: Copiar .env.example a .env
3. **Iniciar Fase 1**: Crear rama `phase-1/security-critical`
4. **Primera feature**: Implementar secrets management
5. **Seguir roadmap**: Continuar con features de Fase 1

---

**Última actualización**: 2025-11-11
**Versión actual**: v0.1.0 (commit inicial)
**Próxima versión**: v0.2.0 (después de Fase 1)

¡Buena suerte con el desarrollo! 🚀
