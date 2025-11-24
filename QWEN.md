# BCV Service Project Context

## Project Overview
BCV Service is a Node.js/TypeScript microservice that periodically scrapes the official exchange rate from the Central Bank of Venezuela (BCV), stores the data locally, and notifies subscriber services via WebSockets when changes occur. The service follows SOLID principles with Inversify for Dependency Injection.

## Key Features
- Automated exchange rate scraping every 8 hours (currently USD, EUR, CNY, TRY, RUB)
- Direct scraping from the official BCV website (www.bcv.org.ve)
- MongoDB storage with optional console mode (without database)
- Real-time WebSocket notifications with Socket.io compatibility
- REST API with API Key authentication
- Rate limiting for abuse protection
- Graceful shutdown with ordered resource cleanup
- Discord notifications for rate changes
- Health checks for Kubernetes (liveness/readiness probes)
- Prometheus metrics for monitoring
- Docker containerization with Docker Compose support
- Automated semantic versioning with Conventional Commits

## Architecture
The project follows SOLID principles with a clear separation of concerns:

```
src/
├── Application.ts              # Bootstrap of the application
├── config/
│   ├── inversify.config.ts    # IoC container configuration
│   ├── types.ts               # Symbols for DI
│   ├── index.ts               # Configuration management
│   └── secrets.ts             # Secure secret management
├── interfaces/                # Abstractions (DIP - Dependency Inversion)
│   ├── IBCVService.ts        # BCV scraping interface
│   ├── IMongoService.ts      # Persistence interface
│   ├── IWebSocketService.ts  # WebSocket interface
│   ├── ISchedulerService.ts  # Scheduled tasks interface
│   ├── IHealthCheckService.ts # Health checks interface
│   └── IMetricsService.ts    # Metrics interface
├── services/                  # Service implementations
│   ├── bcv.service.ts        # BCV scraping implementation
│   ├── mongo.service.ts      # MongoDB persistence
│   ├── websocket.service.ts  # WebSocket server
│   ├── scheduler.service.ts  # Cron jobs
│   ├── health-check.service.ts # Health checks
│   └── metrics.service.ts    # Prometheus metrics
├── controllers/               # HTTP controllers
│   ├── rate.controller.ts    # Rate endpoints
│   ├── health.controller.ts  # Health endpoints
│   └── metrics.controller.ts # Metrics endpoint
├── middleware/                # Express middleware
│   └── auth.middleware.ts    # API Key authentication
└── utils/                     # Shared utilities
    └── logger.ts             # Winston-based structured logging
```

## Building and Running
### Prerequisites
- Node.js 18+
- pnpm 8+
- MongoDB 4.4+ (optional in console mode)
- Docker 20+ (optional, for containers)

### Development
```bash
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
# Edit .env with your credentials

# Start in development mode
pnpm dev
```

### Production
```bash
# Using Docker
docker build -t bcv-service .
docker run -p 3000:3000 -e MONGODB_URI=... -e API_KEY=... bcv-service

# Using Docker Compose
docker-compose up -d
```

### Environment Variables
Key variables include:
- `PORT`: Service port (default: 3000)
- `MONGODB_URI`: MongoDB connection string
- `BCV_WEBSITE_URL`: BCV website URL
- `API_KEY`: API key for authentication (comma-separated for multiple keys)
- `CRON_SCHEDULE`: Schedule for rate scraping (default: "0 2,10,18 * * *")
- `NODE_ENV`: Environment (development/production)
- `SAVE_TO_DATABASE`: Enable database storage (default: true)
- `LOG_LEVEL`: Logging level (error/warn/info/http/debug)
- `DISCORD_WEBHOOK_URL`: Discord webhook for notifications
- `WEBHOOK_URL`: Generic webhook URL for notifications
- `WEBHOOK_SECRET`: Secret for webhook request signing

## API Endpoints
All REST endpoints require API key authentication via the `X-API-Key` header:
- `GET /api/rate/latest` - Get the most recent exchange rate
- `GET /api/rate/history` - Get historical rates (optional `limit` parameter)
- `GET /api/rate/:date` - Get rate for specific date (YYYY-MM-DD format)

Health checks (no authentication):
- `GET /healthz` - Liveness probe
- `GET /readyz` - Readiness probe
- `GET /health` - Full health status for all components
- `GET /metrics` - Prometheus metrics

Documentation: `GET /docs` (Swagger UI)

## Development Conventions
- Uses Biome for code formatting and linting
- TypeScript 5+ with strict typing
- SOLID principles with Inversify DI
- Structured logging with Winston
- Conventional Commits with automated semantic release
- Unit tests with Vitest (66% coverage, 55+ tests)
- Security headers with Helmet.js
- Response compression with express compression middleware
- Docker secrets for secure credential management

## Testing
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run test UI
pnpm test:ui
```

## Docker & Deployment
The project includes automated semantic versioning with Conventional Commits and semantic release. The CI/CD pipeline includes:
1. Validation & testing (linting, type checking, tests, build) - &lt; 2 minutes
2. Semantic release (analyze commits, version, changelog, git tags) - &lt; 30 seconds
3. Docker image build and publish (with semantic tags) - &lt; 3 minutes
4. Deploy to Proxmox - &lt; 1 minute

Docker images are published to GitHub Container Registry with tags:
- Exact version (e.g., `1.1.0`)
- Minor version (e.g., `1.1`)
- Major version (e.g., `1`)
- `latest` and `main` tags