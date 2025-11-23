# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
