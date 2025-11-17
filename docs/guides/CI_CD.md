# CI/CD Setup Guide

Complete guide for Continuous Integration and Continuous Deployment setup for the BCV Service.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Docker Optimization](#docker-optimization)
- [Code Quality](#code-quality)
- [Release Process](#release-process)
- [Secrets Management](#secrets-management)
- [Troubleshooting](#troubleshooting)

## Overview

The BCV Service implements a modern CI/CD pipeline using GitHub Actions with the following features:

- **Continuous Integration (CI)**: Automated testing, linting, and building
- **Continuous Deployment (CD)**: Automated releases and Docker image publishing
- **Code Quality**: Strict linting with Biome
- **Docker Optimization**: Multi-stage builds with security best practices
- **Semantic Versioning**: Automated version management and changelog generation

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Steps:**
1. Checkout code
2. Setup pnpm and Node.js 20.x
3. Install dependencies
4. Run Biome linting
5. Run tests with coverage
6. Build TypeScript
7. Upload coverage to Codecov (optional)
8. Test Docker build

**Configuration:**

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

**Features:**
- Matrix testing with Node.js 20.x
- Frozen lockfile for reproducible builds
- Coverage reporting
- Docker build verification with caching

**Run locally:**
```bash
# Simulate CI workflow
pnpm install --frozen-lockfile
pnpm lint
pnpm test:coverage
pnpm build
```

### Release Workflow (`.github/workflows/release.yml`)

Triggered when a tag matching `v*.*.*` is pushed.

**Steps:**
1. **Release Creation**:
   - Run tests and build
   - Extract version from tag
   - Generate CHANGELOG automatically
   - Create GitHub Release with release notes

2. **Docker Image Publishing**:
   - Build multi-platform Docker image (linux/amd64, linux/arm64)
   - Push to GitHub Container Registry (GHCR)
   - Tag with multiple strategies:
     - Semantic version (v1.2.3)
     - Major.minor (v1.2)
     - Major (v1)
     - Commit SHA
     - Latest (if default branch)
   - Generate artifact attestation for security

**Creating a release:**

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# The workflow will automatically:
# - Create a GitHub Release
# - Build and push Docker images
# - Generate CHANGELOG
```

**Access Docker images:**

```bash
# Pull from GHCR
docker pull ghcr.io/OWNER/REPO:latest
docker pull ghcr.io/OWNER/REPO:v1.0.0
```

## Docker Optimization

### Multi-Stage Dockerfile

The optimized Dockerfile uses a two-stage build:

**Stage 1: Builder**
- Installs all dependencies (including devDependencies)
- Compiles TypeScript
- Removes devDependencies for smaller size

**Stage 2: Production**
- Uses minimal base image (node:20-alpine)
- Creates non-root user for security
- Copies only production dependencies and compiled code
- Includes health check
- Sets up proper permissions

**Benefits:**
- Smaller final image (~200MB vs ~500MB)
- Better security (non-root user)
- Faster deployment
- Built-in health checks

**Build locally:**
```bash
docker build -t bcv-service:local .
```

### .dockerignore

Optimized to exclude:
- Development files (tests, docs, .github)
- Build artifacts (node_modules, dist from host)
- Configuration files
- Large files (benchmarks, logs)

**Result:** Faster builds, smaller context size

### Docker Compose

Two configurations provided:

**Development (`docker-compose.yml`)**
- Uses environment variables directly
- Optimized for local development
- Includes MongoDB and Redis

**Production (`docker-compose.prod.yml`)**
- Uses Docker Secrets
- Resource limits configured
- Health checks for all services
- Production-ready configuration

**Usage:**

```bash
# Development
docker compose up

# Production
docker compose -f docker-compose.prod.yml up -d
```

## Code Quality

### Biome Configuration

Strict linting and formatting rules configured in `biome.json`:

**Enabled Rules:**
- **Complexity**: Detect overly complex code
- **Correctness**: Catch common errors
- **Performance**: Optimize performance
- **Security**: Prevent security issues
- **Style**: Enforce consistent coding style
- **Suspicious**: Detect suspicious patterns

**Key Settings:**
```json
{
  "lineWidth": 100,
  "indentWidth": 2,
  "quoteStyle": "single",
  "semicolons": "always"
}
```

**Run locally:**
```bash
# Check
pnpm lint

# Auto-fix
pnpm lint:fix

# Format
pnpm format
```

### Pre-commit Checks

Recommended to add pre-commit hooks:

```bash
# Install husky (optional)
pnpm add -D husky
npx husky init

# Add pre-commit hook
echo "pnpm lint && pnpm test" > .husky/pre-commit
```

## Release Process

### Semantic Versioning

Follow semantic versioning (semver):
- **MAJOR** (v1.0.0 → v2.0.0): Breaking changes
- **MINOR** (v1.0.0 → v1.1.0): New features
- **PATCH** (v1.0.0 → v1.0.1): Bug fixes

### Conventional Commits

Recommended commit message format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Tests
- `chore`: Maintenance

**Examples:**
```bash
git commit -m "feat(api): add rate history endpoint"
git commit -m "fix(cache): resolve Redis connection timeout"
git commit -m "docs: update CI/CD guide"
```

### Creating a Release

#### Manual Release

1. **Update version:**
```bash
# Update package.json version
npm version [major|minor|patch]
```

2. **Create tag:**
```bash
git tag v1.0.0
```

3. **Push:**
```bash
git push origin main --tags
```

#### Automated Release

1. **Push to main:**
```bash
git push origin main
```

2. **Create and push tag:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

3. **Workflow runs automatically:**
   - Creates GitHub Release
   - Generates CHANGELOG
   - Builds and publishes Docker images

### CHANGELOG Generation

The release workflow automatically generates a CHANGELOG with:
- **Features**: New functionality
- **Bug Fixes**: Resolved issues
- **Performance**: Performance improvements
- **Documentation**: Documentation changes
- **Other Changes**: Miscellaneous updates

## Secrets Management

### Required Secrets

Configure in GitHub repository settings (Settings → Secrets and variables → Actions):

#### Optional Secrets

1. **CODECOV_TOKEN** (optional)
   - For coverage reporting
   - Get from https://codecov.io

#### Automatic Secrets

1. **GITHUB_TOKEN**
   - Automatically provided by GitHub
   - Used for releases and GHCR

### Production Secrets (Docker)

Create `./secrets/` directory for production:

```bash
mkdir -p secrets
echo "mongodb://user:pass@host:27017/db" > secrets/mongodb_uri.txt
echo "your-redis-password" > secrets/redis_password.txt
```

**Never commit secrets to git!** (Already in `.gitignore`)

## Monitoring and Observability

### CI/CD Monitoring

**GitHub Actions:**
- View workflow runs: Repository → Actions
- Check logs for failures
- Review test coverage reports
- Monitor build times

**Codecov:**
- Coverage trends over time
- Pull request coverage impact
- Code coverage by file

### Docker Registry

**GHCR:**
- View images: Repository → Packages
- Check image sizes and tags
- Review security vulnerabilities
- Monitor pull statistics

## Troubleshooting

### CI Workflow Fails

**Linting errors:**
```bash
# Run locally
pnpm lint

# Auto-fix
pnpm lint:fix
```

**Test failures:**
```bash
# Run tests
pnpm test

# With coverage
pnpm test:coverage
```

**Build failures:**
```bash
# Build locally
pnpm build

# Check TypeScript errors
tsc --noEmit
```

### Release Workflow Fails

**Tag format incorrect:**
```bash
# Correct format: v1.2.3
git tag v1.0.0

# Not: 1.0.0 or release-1.0.0
```

**Missing permissions:**
- Ensure GITHUB_TOKEN has write permissions
- Check repository settings → Actions → General → Workflow permissions

**Docker build fails:**
```bash
# Test build locally
docker build -t test .

# Check Dockerfile syntax
docker build --no-cache -t test .
```

### Docker Issues

**Image too large:**
- Ensure .dockerignore is properly configured
- Use multi-stage build (already implemented)
- Remove unnecessary files

**Health check fails:**
```bash
# Test health check locally
docker run -p 3000:3000 bcv-service:local
curl http://localhost:3000/healthz
```

**Permission issues:**
- Dockerfile already uses non-root user
- Check file permissions in container
- Verify logs directory permissions

### Common Issues

**pnpm install fails:**
```bash
# Clear cache
pnpm store prune

# Reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Coverage not uploading:**
- Check CODECOV_TOKEN is set
- Ensure coverage is generated
- Check Codecov service status

**Docker cache issues:**
```bash
# Clear Docker cache
docker builder prune -a

# Rebuild without cache
docker build --no-cache -t bcv-service .
```

## Best Practices

### Development Workflow

1. **Create feature branch:**
```bash
git checkout -b feat/my-feature
```

2. **Make changes and test:**
```bash
pnpm lint
pnpm test
pnpm build
```

3. **Commit with conventional commits:**
```bash
git commit -m "feat: add new feature"
```

4. **Push and create PR:**
```bash
git push origin feat/my-feature
```

5. **CI runs automatically on PR**

6. **Merge to main after approval**

7. **Create release when ready**

### Production Deployment

1. **Merge approved changes to main**

2. **Create release tag:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

3. **Workflow builds and publishes automatically**

4. **Deploy using Docker:**
```bash
docker pull ghcr.io/OWNER/REPO:v1.0.0
docker compose -f docker-compose.prod.yml up -d
```

### Maintenance

**Weekly:**
- Review CI/CD logs
- Check for dependency updates
- Monitor coverage trends

**Monthly:**
- Review Docker image sizes
- Clean up old images
- Update documentation

**Quarterly:**
- Review and update workflows
- Optimize build times
- Security audit

## Advanced Configuration

### Matrix Testing

Add multiple Node.js versions:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
```

### Conditional Steps

Run steps conditionally:

```yaml
- name: Deploy to staging
  if: github.ref == 'refs/heads/develop'
  run: ./deploy-staging.sh
```

### Environment Variables

Configure per environment:

```yaml
env:
  NODE_ENV: production
  LOG_LEVEL: info
```

### Custom Actions

Create reusable actions:

```yaml
- uses: ./.github/actions/my-action
  with:
    param: value
```

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Biome Documentation](https://biomejs.dev/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Conclusion

The BCV Service CI/CD pipeline provides:
- Automated testing and quality checks
- Secure and optimized Docker images
- Semantic versioning and releases
- Comprehensive monitoring and observability

For questions or improvements, please open an issue or pull request.
