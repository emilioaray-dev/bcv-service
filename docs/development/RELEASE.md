# Release Process

Guía del proceso de release para BCV Service. Define cómo crear y publicar nuevas versiones del proyecto.

## Tabla de Contenidos

1. [Versioning](#versioning)
2. [Release Types](#release-types)
3. [Release Workflow](#release-workflow)
4. [Changelog](#changelog)
5. [Git Tags](#git-tags)
6. [Docker Images](#docker-images)
7. [Rollback](#rollback)

---

## Versioning

### Semantic Versioning

Seguimos [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH

Example: 2.3.1
```

**MAJOR** (2.x.x):
- Breaking changes
- Incompatible API changes
- Major architectural changes

**MINOR** (x.3.x):
- New features (backwards compatible)
- New functionality
- Deprecations

**PATCH** (x.x.1):
- Bug fixes
- Security patches
- Performance improvements

### Version Examples

```bash
# Patch: Bug fix
1.2.3 → 1.2.4

# Minor: New feature
1.2.4 → 1.3.0

# Major: Breaking change
1.3.0 → 2.0.0

# Pre-release versions
2.0.0-alpha.1
2.0.0-beta.1
2.0.0-rc.1
```

### Version in package.json

```json
{
  "name": "bcv-service",
  "version": "1.2.3",
  "description": "Microservicio BCV Tasa de Cambio"
}
```

---

## Release Types

### Patch Release (1.2.x)

**When**: Bug fixes, security patches, minor improvements

**Changes**:
- Fix bugs
- Security updates
- Performance improvements
- Documentation updates

**Frequency**: As needed (weekly or when critical)

**Example**:
```bash
# Fix: Memory leak in WebSocket service
1.2.3 → 1.2.4
```

### Minor Release (1.x.0)

**When**: New features, backwards compatible changes

**Changes**:
- New features
- Enhancements to existing features
- New API endpoints (non-breaking)
- Deprecations (with migration path)

**Frequency**: Monthly or when features are ready

**Example**:
```bash
# Feature: Add Redis caching layer
1.2.4 → 1.3.0
```

### Major Release (x.0.0)

**When**: Breaking changes, major refactoring

**Changes**:
- Breaking API changes
- Removal of deprecated features
- Major architectural changes
- Database schema changes

**Frequency**: Rarely (6-12 months)

**Example**:
```bash
# Breaking: Change API response format
1.3.0 → 2.0.0
```

---

## Release Workflow

### Pre-Release Checklist

Antes de crear un release:

- [ ] Todos los tests pasan (`pnpm test`)
- [ ] Coverage cumple thresholds
- [ ] No hay linter errors (`pnpm run lint`)
- [ ] Código formateado (`pnpm run format`)
- [ ] Build exitoso (`pnpm run build`)
- [ ] Documentación actualizada
- [ ] CHANGELOG.md actualizado
- [ ] Version bump en package.json

### Step-by-Step Process

#### 1. Create Release Branch

```bash
# Create release branch from main
git checkout main
git pull origin main
git checkout -b release/v1.3.0
```

#### 2. Update Version

```bash
# Bump version in package.json
npm version minor  # or major, patch

# This will:
# - Update version in package.json
# - Create git commit
# - Create git tag

# Or manually:
vim package.json  # Change version to 1.3.0
git add package.json
git commit -m "chore: bump version to 1.3.0"
```

#### 3. Update CHANGELOG

```bash
vim CHANGELOG.md
```

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2025-01-12

### Added
- Redis caching layer for rate data
- New `/api/rate/cache` endpoint to manage cache
- Prometheus metrics for cache hit/miss ratio

### Changed
- Improved WebSocket reconnection logic
- Updated MongoDB driver to v6.0

### Fixed
- Memory leak in WebSocket service
- Race condition in scheduler service

### Security
- Updated dependencies with security vulnerabilities

## [1.2.4] - 2025-01-05

### Fixed
- MongoDB connection timeout issues
- Incorrect date parsing for Spanish months

...
```

#### 4. Run Full Test Suite

```bash
# Run all tests
pnpm test

# Check coverage
pnpm run test:coverage

# Lint
pnpm run lint

# Build
pnpm run build

# Verify build works
node dist/index.js
```

#### 5. Create Pull Request

```bash
# Push release branch
git push origin release/v1.3.0

# Create PR to main
# Title: "Release v1.3.0"
# Description: Copy changelog content
```

#### 6. Review and Merge

- Code review by maintainer
- All CI checks pass
- Approval from team lead
- Squash and merge to main

#### 7. Tag Release

```bash
# Switch to main
git checkout main
git pull origin main

# Create tag
git tag -a v1.3.0 -m "Release v1.3.0

### Added
- Redis caching layer
- Cache management endpoint

### Changed
- Improved WebSocket reconnection

### Fixed
- Memory leak in WebSocket service
"

# Push tag
git push origin v1.3.0
```

#### 8. Create GitHub Release

```bash
# Using GitHub CLI
gh release create v1.3.0 \
  --title "v1.3.0" \
  --notes-file CHANGELOG_v1.3.0.md \
  --latest

# Or manually on GitHub:
# 1. Go to Releases
# 2. Click "Draft a new release"
# 3. Select tag v1.3.0
# 4. Title: "v1.3.0"
# 5. Description: Copy changelog
# 6. Publish release
```

#### 9. Build and Push Docker Image

```bash
# Build image
docker build -t bcv-service:1.3.0 .
docker tag bcv-service:1.3.0 bcv-service:latest

# Push to registry
docker push your-registry/bcv-service:1.3.0
docker push your-registry/bcv-service:latest
```

#### 10. Deploy to Production

```bash
# Update production deployment
kubectl set image deployment/bcv-service \
  bcv-service=your-registry/bcv-service:1.3.0 \
  -n production

# Watch rollout
kubectl rollout status deployment/bcv-service -n production

# Verify deployment
kubectl get pods -n production
curl https://api.production.com/health
```

#### 11. Post-Release

- [ ] Monitor logs and metrics
- [ ] Verify no errors in production
- [ ] Update documentation site
- [ ] Announce release (Slack, email)
- [ ] Close related issues
- [ ] Create milestone for next release

---

## Changelog

### CHANGELOG.md Format

Seguir [Keep a Changelog](https://keepachangelog.com/):

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features in development

### Changed
- Changes in existing functionality

### Deprecated
- Features that will be removed

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security fixes

## [1.3.0] - 2025-01-12

### Added
- Redis caching layer (#123)
- Cache management API endpoint (#124)

### Changed
- Improved WebSocket reconnection logic (#125)

### Fixed
- Memory leak in WebSocket service (#126)

## [1.2.4] - 2025-01-05

### Fixed
- MongoDB connection timeout (#120)
- Date parsing for Spanish locale (#121)

## [1.2.3] - 2024-12-28

...
```

### Changelog Sections

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

### Link to Issues

```markdown
### Fixed
- Memory leak in WebSocket service (#126)
- MongoDB connection timeout (#120)
```

---

## Git Tags

### Annotated Tags

```bash
# Create annotated tag (recommended)
git tag -a v1.3.0 -m "Release v1.3.0"

# View tag
git show v1.3.0

# List all tags
git tag -l

# Push tag
git push origin v1.3.0

# Push all tags
git push origin --tags
```

### Tag Naming

- `v1.3.0`: Production release
- `v1.3.0-rc.1`: Release candidate
- `v1.3.0-beta.1`: Beta release
- `v1.3.0-alpha.1`: Alpha release

### Delete Tag

```bash
# Delete local tag
git tag -d v1.3.0

# Delete remote tag
git push origin --delete v1.3.0
```

---

## Docker Images

### Build Image

```bash
# Build with version tag
docker build -t bcv-service:1.3.0 .

# Tag as latest
docker tag bcv-service:1.3.0 bcv-service:latest

# Multi-platform build
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t bcv-service:1.3.0 \
  --push \
  .
```

### Tag Strategy

```bash
# Version tags
bcv-service:1.3.0       # Specific version
bcv-service:1.3         # Minor version
bcv-service:1           # Major version
bcv-service:latest      # Latest stable

# Environment tags
bcv-service:staging
bcv-service:production

# Git commit SHA
bcv-service:abc123f
```

### Push to Registry

```bash
# Docker Hub
docker login
docker push username/bcv-service:1.3.0
docker push username/bcv-service:latest

# GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/username/bcv-service:1.3.0

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/bcv-service:1.3.0
```

---

## Rollback

### Rollback Strategy

Si el release tiene problemas en producción:

#### 1. Quick Rollback (Kubernetes)

```bash
# Rollback to previous version
kubectl rollout undo deployment/bcv-service -n production

# Rollback to specific revision
kubectl rollout undo deployment/bcv-service --to-revision=2 -n production

# Check rollout history
kubectl rollout history deployment/bcv-service -n production
```

#### 2. Docker Rollback

```bash
# Redeploy previous version
docker-compose down
docker-compose up -d bcv-service:1.2.4
```

#### 3. Git Rollback

```bash
# Revert release commit
git revert v1.3.0

# Or create hotfix branch
git checkout -b hotfix/v1.3.1 v1.2.4
# Fix issue
git commit -m "fix: critical bug"
# Follow release process for 1.3.1
```

### Rollback Checklist

- [ ] Identify issue severity
- [ ] Notify team of rollback
- [ ] Execute rollback
- [ ] Verify rollback successful
- [ ] Monitor system stability
- [ ] Create hotfix branch if needed
- [ ] Document incident
- [ ] Post-mortem analysis

---

## Hotfix Process

Para bugs críticos en producción:

### 1. Create Hotfix Branch

```bash
# Branch from production tag
git checkout -b hotfix/v1.3.1 v1.3.0
```

### 2. Fix Bug

```bash
# Make minimal changes
vim src/services/buggy-service.ts

# Test fix
pnpm test

# Commit
git commit -m "fix: critical memory leak in WebSocket service"
```

### 3. Bump Version (Patch)

```bash
# Update version to 1.3.1
npm version patch

# Update CHANGELOG
vim CHANGELOG.md
```

### 4. Fast-Track Release

```bash
# Push hotfix
git push origin hotfix/v1.3.1

# Create tag
git tag -a v1.3.1 -m "Hotfix v1.3.1"
git push origin v1.3.1

# Deploy immediately
kubectl set image deployment/bcv-service \
  bcv-service=bcv-service:1.3.1 \
  -n production
```

### 5. Merge Back

```bash
# Merge to main
git checkout main
git merge hotfix/v1.3.1
git push origin main

# Delete hotfix branch
git branch -d hotfix/v1.3.1
git push origin --delete hotfix/v1.3.1
```

---

## Release Automation

### GitHub Actions (Futuro)

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm run build

      - name: Build Docker image
        run: |
          docker build -t bcv-service:${{ github.ref_name }} .
          docker push bcv-service:${{ github.ref_name }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref_name }}
          draft: false
          prerelease: false
```

---

## References

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
