/**
 * Route constants for the application
 * Centralizes all route definitions for easier maintenance and refactoring
 */

export const ROUTES = {
  // API Routes
  API: '/api',

  // Documentation
  DOCS: '/docs',

  // Health Checks
  HEALTH: '/health',
  HEALTHZ: '/healthz',
  READYZ: '/readyz',
  HEALTH_MONGODB: '/health/mongodb',
  HEALTH_SCHEDULER: '/health/scheduler',
  HEALTH_BCV: '/health/bcv',
  HEALTH_WEBSOCKET: '/health/websocket',
  HEALTH_REDIS: '/health/redis',

  // Metrics
  METRICS: '/metrics',

  // Root
  ROOT: '/',
} as const;

// Export individual route groups for convenience
export const API_ROUTES = {
  RATE_LATEST: `${ROUTES.API}/rate/latest`,
  RATE_HISTORY: `${ROUTES.API}/rate/history`,
  RATE_BY_DATE: `${ROUTES.API}/rate/:date`,
} as const;

// Export relative routes for RateController (without /api prefix)
export const RATE_ROUTES = {
  LATEST: '/rate/latest',
  HISTORY: '/rate/history',
  BY_DATE: '/rate/:date',
} as const;
