# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.6.2](https://github.com/emilioaray-dev/bcv-service/compare/v1.6.1...v1.6.2) (2025-11-29)

### Bug Fixes

* **cors:** allow all origins in development mode ([5bd0de0](https://github.com/emilioaray-dev/bcv-service/commit/5bd0de08fc5e2b413276b22a673eaee8d4bcdc89))

## [1.6.1](https://github.com/emilioaray-dev/bcv-service/compare/v1.6.0...v1.6.1) (2025-11-28)

### Bug Fixes

* **cors:** allow localhost origins for web app development ([83b52bd](https://github.com/emilioaray-dev/bcv-service/commit/83b52bdaeaa5a27e0a531c3f417a372e070ddd31))

## [1.6.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.5.1...v1.6.0) (2025-11-28)

### Features

* add CORS support for React Native apps ([758808e](https://github.com/emilioaray-dev/bcv-service/commit/758808edb7497e861c761445e3ad3d2c716328d8))

## [1.5.1](https://github.com/emilioaray-dev/bcv-service/compare/v1.5.0...v1.5.1) (2025-11-27)

### Bug Fixes

* **ci:** add confirmation message to cleanup step ([8bf5d02](https://github.com/emilioaray-dev/bcv-service/commit/8bf5d02b78e0606701037ab4c45b5c0dd49ed1f8))

## [1.5.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.4.2...v1.5.0) (2025-11-27)

### Features

* **tests:** add unit tests for services including Metrics, NotificationState, Redis, Scheduler, and WebSocket ([#2](https://github.com/emilioaray-dev/bcv-service/issues/2)) ([fce9d2a](https://github.com/emilioaray-dev/bcv-service/commit/fce9d2a0adcb1d84980ce257f29ecdac6c5353db))

## [1.4.2](https://github.com/emilioaray-dev/bcv-service/compare/v1.4.1...v1.4.2) (2025-11-27)

### Bug Fixes

* **scheduler:** add webhook notifications on BCV rate changes ([b3d39bf](https://github.com/emilioaray-dev/bcv-service/commit/b3d39bf8df9655625c7dabed09b6942a9bf4075c))
* **webhooks:** queue all deployment notifications immediately in WebhookService ([23329db](https://github.com/emilioaray-dev/bcv-service/commit/23329db4461682a165eb1f5c5d17c1d994b93e21))

## [1.4.1](https://github.com/emilioaray-dev/bcv-service/compare/v1.4.0...v1.4.1) (2025-11-27)

### Bug Fixes

* **ci:** correct YAML syntax error in workflow separator line ([461edad](https://github.com/emilioaray-dev/bcv-service/commit/461edadb1a1851f84e1399509206094a986d10eb))
* **notifications:** queue deployment notifications immediately to prevent startup blocking ([9b75e03](https://github.com/emilioaray-dev/bcv-service/commit/9b75e0356a049f4de528dd316cd12781e92e3b00))

## [1.4.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.3.2...v1.4.0) (2025-11-26)

### ⚠️ Version Correction Notice

This release corrects the version numbering scheme. Previous releases (2.x.x, 3.x.x, 4.x.x) were incorrectly marked as BREAKING CHANGES when they were only features and fixes. The project now correctly continues from v1.3.2 → v1.4.0.

### Bug Fixes

* **notifications:** use package.json version instead of npm_package_version env var ([dba836f](https://github.com/emilioaray-dev/bcv-service/commit/dba836f))
  - Fixes deployment notification error 400 in Docker containers
  - The npm_package_version environment variable is only available when running with npm/pnpm scripts
  - Docker containers execute with 'node dist/app.js' directly, making this variable unavailable
  - This caused deployment.success notifications to send 'unknown' as the version, which Discord rejected with HTTP 400

### Features

* **notifications:** integrate Discord services with webhook queue system ([1768abd](https://github.com/emilioaray-dev/bcv-service/commit/1768abdfc64deedff32e1c8e695b92046f43043b))
* **webhooks:** add persistent delivery tracking, retry queue, and lifecycle notifications ([ab3ff30](https://github.com/emilioaray-dev/bcv-service/commit/ab3ff30304d9fab07b1fc16a764f332fbec12bf8))
* **notifications:** implement Discord-specific services and historical data gap-filling ([596dcf1](https://github.com/emilioaray-dev/bcv-service/commit/596dcf1))

---

## Historical Releases (Incorrect Version Numbering - Archived for Reference)

### [4.1.0](https://github.com/emilioaray-dev/bcv-service/compare/v4.0.0...v4.1.0) (2025-11-26) - Now v1.4.0

### Features

* **notifications:** integrate Discord services with webhook queue system ([1768abd](https://github.com/emilioaray-dev/bcv-service/commit/1768abdfc64deedff32e1c8e695b92046f43043b))

## [4.0.0](https://github.com/emilioaray-dev/bcv-service/compare/v3.0.0...v4.0.0) (2025-11-26)

### ⚠ BREAKING CHANGES

* **webhooks:** WebhookService constructor now requires WebhookDeliveryService and WebhookQueueService dependencies

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

### Features

* **webhooks:** add persistent delivery tracking, retry queue, and lifecycle notifications ([ab3ff30](https://github.com/emilioaray-dev/bcv-service/commit/ab3ff30304d9fab07b1fc16a764f332fbec12bf8))

### Bug Fixes

* **types:** add server property to HealthCheckResult checks ([e4d3526](https://github.com/emilioaray-dev/bcv-service/commit/e4d3526b1882682e4d56b3bef3b6c71f13343812))

## [3.0.0](https://github.com/emilioaray-dev/bcv-service/compare/v2.1.0...v3.0.0) (2025-11-24)

### ⚠ BREAKING CHANGES

* **notifications:** HealthCheckService now uses DiscordStatusService instead of WebhookService for status notifications

## Features

### Discord Notification Services
- Add Discord-specific notification services with proper embed format
- Create DiscordStatusService for service health status notifications
  - Implements color-coded embeds (green=healthy, orange=degraded, red=unhealthy)
  - Includes emoji indicators for visual clarity
  - Displays detailed health check fields (MongoDB, Redis, Scheduler, WebSocket)
  - Shows uptime information and status change tracking
- Create DiscordDeploymentService for deployment notifications
  - Implements color-coded embeds (green=success, orange=started, red=failure)
  - Includes deployment metadata (ID, environment, version, duration, message)
  - Provides visual feedback for CI/CD pipeline events

### Historical Data Gap Filling
- Implement forward fill algorithm for missing weekend/holiday data
- Add `fillGaps` query parameter to date range endpoint
- Create date-fill utility with `fillDateGaps()` and `generateDateRange()`
- Add `isFilled` and `filledFrom` metadata fields to filled rates
- Update API response structure to include gap-filling status

### Webhook Configuration Enhancement
- Add specific webhook URLs for different notification types
  - SERVICE_STATUS_WEBHOOK_URL for health check notifications
  - DEPLOYMENT_WEBHOOK_URL for deployment notifications
- Update WebhookService to support multiple target URLs
- Maintain backward compatibility with generic WEBHOOK_URL

## Refactoring

### Service Architecture
- Update HealthCheckService to use DiscordStatusService
- Remove WebhookService dependency from health checks
- Register Discord services in InversifyJS container
- Add new service symbols to TYPES configuration

### API Enhancements
- Update RateController to apply conditional gap filling
- Enhance validation middleware with fillGaps boolean parameter
- Update Swagger documentation with new fields and parameters

## Infrastructure

### Docker & CI/CD
- Add SERVICE_STATUS_WEBHOOK_URL to docker-compose.yml
- Add DEPLOYMENT_WEBHOOK_URL to docker-compose.production.yml
- Update GitHub Actions workflow to inject webhook secrets
- Configure environment variables for all deployment targets

### Configuration
- Add serviceStatusWebhookUrl to config/index.ts
- Add deploymentWebhookUrl to config/index.ts
- Implement secret reading for webhook URLs

## Testing

### Unit Tests
- Add 11 unit tests for date-fill utilities
  - Test date range generation
  - Test gap filling with forward fill strategy
  - Test edge cases (empty data, no gaps, large gaps)
  - Test metadata preservation (denomination, normalized_bs)

### Integration Tests
- Add 6 integration tests for gap-filling functionality
  - Test fillGaps parameter validation
  - Test API response structure with filled data
  - Test default behavior (fillGaps=false)
  - Test filled rate metadata (isFilled, filledFrom)

### Scripts
- Create test-webhook-notifications.ts script
- Update script to use Discord services instead of WebhookService
- Support testing status and deployment notifications separately

## Documentation

### API Documentation
- Update Swagger with fillGaps parameter
- Document isFilled and filledFrom fields in RateData schema
- Add examples for gap-filled responses

### Architecture Documentation
- Document Discord notification service architecture
- Document gap-filling algorithm and use cases
- Update webhook configuration guide

## Database

### Backups & Analysis
- Create database backup script (backup-database.ts)
- Generate comprehensive data analysis (data-analysis-2025-11-23.json)
- Create rates backup (rates-backup-2025-11-23.json)
- Document 1,364 historical records from 2020-2025

## Technical Details

### Services Created
- src/services/discord-status.service.ts (160 lines)
- src/services/discord-deployment.service.ts (161 lines)
- src/interfaces/IDiscordStatusService.ts
- src/interfaces/IDiscordDeploymentService.ts
- src/utils/date-fill.ts

### Services Modified
- src/services/health-check.service.ts
- src/services/webhook.service.ts
- src/config/inversify.config.ts
- src/config/types.ts

### Controller & Middleware Updates
- src/controllers/rate.controller.ts
- src/middleware/validation.middleware.ts

### Test Coverage
- 139 tests passing
- Added 17 new tests (11 unit + 6 integration)
- Maintained 100% backwards compatibility

## Migration Notes

### For Existing Deployments
1. Add SERVICE_STATUS_WEBHOOK_URL to environment variables (Discord webhook)
2. Add DEPLOYMENT_WEBHOOK_URL to environment variables (Discord webhook)
3. Existing WEBHOOK_URL remains supported as fallback
4. No database migrations required
5. No breaking changes to API endpoints (fillGaps is optional)

### For Developers
1. HealthCheckService now injects DiscordStatusService
2. WebhookService still available for custom webhook integrations
3. Use fillGaps=true query parameter to enable gap filling
4. Gap filling uses forward fill strategy (financial industry standard)

## Performance Impact
- Gap filling is opt-in (fillGaps parameter)
- No performance impact when fillGaps=false
- Gap filling executes in O(n) time where n = days in range
- Discord notifications use async fire-and-forget pattern

## Fixes
- fix(notifications): resolve Discord webhook 400 error by using proper embed format
- fix(validation): correct TypeScript type handling for boolean parameters
- fix(controller): improve type safety for fillGaps parameter

Resolves issues with Discord webhook notifications and provides solution for
missing weekend/holiday data in historical rate queries.

Co-Authored-By: Claude <noreply@anthropic.com>

### Features

* **notifications:** implement Discord-specific services and historical data gap-filling ([596dcf1](https://github.com/emilioaray-dev/bcv-service/commit/596dcf1a595a41cd728a737a7a0749a3bc2bf483))

### Bug Fixes

* **lint:** resolve biome linting issues ([67fcb4c](https://github.com/emilioaray-dev/bcv-service/commit/67fcb4c33e993f89efcdb192ce89841f2828c07e))

## [2.1.0](https://github.com/emilioaray-dev/bcv-service/compare/v2.0.1...v2.1.0) (2025-11-23)

### Features

* **notification-state:** implement persistent notification state system with enhanced API documentation ([4036ef5](https://github.com/emilioaray-dev/bcv-service/commit/4036ef592cc662e004912c4b7638a8e886540a5f))

## [2.0.1](https://github.com/emilioaray-dev/bcv-service/compare/v2.0.0...v2.0.1) (2025-11-23)

### Bug Fixes

* **api:** standardize API response format with success wrapper ([725ecbd](https://github.com/emilioaray-dev/bcv-service/commit/725ecbd952e1d0eed340d97754b226f9e1b42d12))

## [2.0.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.3.2...v2.0.0) (2025-11-23)

### ⚠ BREAKING CHANGES

* **deployment:** .env file on Proxmox server is no longer used for secrets.
All secrets must be configured in GitHub repository settings before deployment.

### Features

* **deployment:** implement centralized secrets management via GitHub Secrets ([c94b751](https://github.com/emilioaray-dev/bcv-service/commit/c94b7513ac88e3719cf6ef3d9c7c3d980a1d5ef2))

### Bug Fixes

* **config:** revert version and migrate to conventionalcommits preset ([1a98855](https://github.com/emilioaray-dev/bcv-service/commit/1a98855780e5403428c04e3ac32868707ca7450b))

## [2.0.1](https://github.com/emilioaray-dev/bcv-service/compare/v2.0.0...v2.0.1) (2025-11-23)

# [2.0.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.3.2...v2.0.0) (2025-11-23)


### Features

* **deployment:** implement centralized secrets management via GitHub Secrets ([c94b751](https://github.com/emilioaray-dev/bcv-service/commit/c94b7513ac88e3719cf6ef3d9c7c3d980a1d5ef2))


### BREAKING CHANGES

* **deployment:** .env file on Proxmox server is no longer used for secrets.
All secrets must be configured in GitHub repository settings before deployment.

## [1.3.2](https://github.com/emilioaray-dev/bcv-service/compare/v1.3.1...v1.3.2) (2025-11-22)


### Bug Fixes

* **docker:** inject all environment variables from .env file into container ([5fdbdbb](https://github.com/emilioaray-dev/bcv-service/commit/5fdbdbb3616924a6a633a36ee14c9a91aff5ed15))

## [1.3.1](https://github.com/emilioaray-dev/bcv-service/compare/v1.3.0...v1.3.1) (2025-11-22)


### Bug Fixes

* **swagger:** use proper default production URL for Swagger documentation ([c0f4edc](https://github.com/emilioaray-dev/bcv-service/commit/c0f4edc8ab0d37939b36719b602729163cb3bdf3))

# [1.3.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.2.0...v1.3.0) (2025-11-22)


### Features

* **swagger:** make server URLs dynamic based on NODE_ENV ([bc6da73](https://github.com/emilioaray-dev/bcv-service/commit/bc6da736302273cfc6d5d160cdc72d3eb8674db5))

# [1.2.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.1.1...v1.2.0) (2025-11-22)


### Features

* **swagger:** add SWAGGER_PROD_URL environment variable for production server URL ([f8d4f58](https://github.com/emilioaray-dev/bcv-service/commit/f8d4f580b9f193b9d151d4c1f274563caa9c7acc))

## [1.1.1](https://github.com/emilioaray-dev/bcv-service/compare/v1.1.0...v1.1.1) (2025-11-22)


### Bug Fixes

* **ci:** corregir outputs del stage de semantic-release para habilitar ejecución de stages siguientes ([c1d1649](https://github.com/emilioaray-dev/bcv-service/commit/c1d1649572eaff3b7b6c6477dd05db5771ab63cd))

# [1.1.0](https://github.com/emilioaray-dev/bcv-service/compare/v1.0.1...v1.1.0) (2025-11-22)


### Features

* add graceful shutdown functionality with proper resource cleanup ([6d806b8](https://github.com/emilioaray-dev/bcv-service/commit/6d806b8786b728fb952f1ce64a93ea5e74bb173b))

## [1.0.1](https://github.com/emilioaray-dev/bcv-service/compare/v1.0.0...v1.0.1) (2025-11-22)


### Bug Fixes

* **ci:** use semantic-release GitHub Action to properly export outputs ([7da4e41](https://github.com/emilioaray-dev/bcv-service/commit/7da4e410ca5c689a8c63217cdf89600679b0eac3))

# 1.0.0 (2025-11-22)


### Bug Fixes

* add robust validation to deployment script ([131a3cd](https://github.com/emilioaray-dev/bcv-service/commit/131a3cdd231d4e7d82a2845bf6ce1962ee510b04))
* change workflow to use GitHub hosted runners ([f879638](https://github.com/emilioaray-dev/bcv-service/commit/f8796386ab3899ce70e94c4c234c05b86c109c1d))
* correct MongoDB compressors type definition ([9663f04](https://github.com/emilioaray-dev/bcv-service/commit/9663f04cd2ec291d5faf18d2f0a46027d67cd958))
* **health:** implement fast Kubernetes-style health checks to resolve timeout issues ([bd9240d](https://github.com/emilioaray-dev/bcv-service/commit/bd9240d4bcd2811f8439d01032286fe773e1d87c))
* restore self-hosted runners configuration ([f68f0d7](https://github.com/emilioaray-dev/bcv-service/commit/f68f0d7e841a6c21e5d38ceb6ee24b2091beda52))
* **security:** update artillery to fix Playwright SSL vulnerability ([969102c](https://github.com/emilioaray-dev/bcv-service/commit/969102c8f67c9b1cac8a074b8cc738b72a41917d)), closes [#1](https://github.com/emilioaray-dev/bcv-service/issues/1)
* **ci:** update Node.js version to 24 for semantic-release compatibility ([bd80da5](https://github.com/emilioaray-dev/bcv-service/commit/bd80da523928edac8a85b04f8a0c46ef50ae8a79))


### Code Refactoring

* **docker:** unify docker-compose files into single config ([7b368f7](https://github.com/emilioaray-dev/bcv-service/commit/7b368f7838bcefb46dc4a832e046e25b652ebf3a))


### Features

* **security:** add API Key authentication ([759816e](https://github.com/emilioaray-dev/bcv-service/commit/759816ec28ef47649508458ef0a0f44f5a37207d))
* add automatic deployment to Proxmox VM ([6fea334](https://github.com/emilioaray-dev/bcv-service/commit/6fea3340c906e6f2ab092fc8bca818f7db233b1e))
* add CI workflow to publish Docker image ([f1e085f](https://github.com/emilioaray-dev/bcv-service/commit/f1e085f7f0e50edf3b92e1265ecc93ce0c82bc77))
* **security:** add Helmet.js security headers and compression middleware ([6d20b6b](https://github.com/emilioaray-dev/bcv-service/commit/6d20b6b2d26432caac0dcea26c7b39904f30a6e8))
* **testing:** add Vitest testing infrastructure and task tracking ([1e762c9](https://github.com/emilioaray-dev/bcv-service/commit/1e762c92d03282d0c0bdf37a14d9d91a41eca1ac))
* **perf:** complete Phase 5 - Performance & Optimization ([a2b7810](https://github.com/emilioaray-dev/bcv-service/commit/a2b78109e6274b16e27aa94eeaa4d7b5340f6107))
* implement automatic semantic versioning with conventional commits ([9863d24](https://github.com/emilioaray-dev/bcv-service/commit/9863d245122bf1fc7e2b3b7a957dc178ba65bd37))
* **observability:** implement comprehensive monitoring and health check system ([1ccfca3](https://github.com/emilioaray-dev/bcv-service/commit/1ccfca3551eee481a3d25edf2ba60f146f5cee46))
* **security:** implement Docker Secrets for credentials management ([a179a79](https://github.com/emilioaray-dev/bcv-service/commit/a179a797155c641519ff77e18f46f66ff5ded258))
* implement Redis caching, webhooks, and MongoDB containerization ([7c30fd7](https://github.com/emilioaray-dev/bcv-service/commit/7c30fd7188bf19f25660c789eae93e4d999d100d))
* **logging:** implement Winston structured logging system ([a1e7d3c](https://github.com/emilioaray-dev/bcv-service/commit/a1e7d3cce2fbed396a48326c229c76f9945f1029))
* improve Swagger docs and add route constants ([7cf2ba6](https://github.com/emilioaray-dev/bcv-service/commit/7cf2ba6f047aed9bd3310fd1b6c689d2d7f8399e))
* initial BCV exchange rate service with security improvements ([5e4946d](https://github.com/emilioaray-dev/bcv-service/commit/5e4946d5a93f84449f9a0842f68cb2784e04f251))
* integrate Discord notifications for rate change alerts ([80bba32](https://github.com/emilioaray-dev/bcv-service/commit/80bba323e9ae0bd3e36c7c7a89c18b764d3b37e0))


### BREAKING CHANGES

* All future commits must follow Conventional Commits format (type(scope): subject).
This enables automatic semantic versioning. Use: feat (minor), fix (patch), BREAKING CHANGE (major).
See docs/guides/CONVENTIONAL_COMMITS.md for complete guide.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
* - Swagger UI moved from /api-docs to /docs
* **logging:** Replaces all console.log/console.error with Winston.
Applications consuming logs should expect structured JSON in production.
* **security:** None (backward compatible, auth optional)
* **docker:** None (backward compatible)
* **security:** None (backward compatible)
* None (initial implementation)

Next Steps:
- Phase 1: Critical security (credential rotation, API authentication)
- Phase 2: Quality & stability (unit tests, structured logging)
- Phase 3: Optimization (caching, performance)
- Phase 4: Observability (metrics, monitoring)
