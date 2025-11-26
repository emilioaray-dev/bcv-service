# Plan de Mejoras y Recomendaciones - BCV Service

## Resumen Ejecutivo

**Calificación General: B+ (Muy Bueno)**

El BCV Service es un microservicio bien arquitecturado con Node.js/TypeScript que demuestra excelentes prácticas en arquitectura limpia, inyección de dependencias, y testing comprehensivo. Existen algunas mejoras de seguridad y optimizaciones recomendadas para fortalecer el servicio.

### Estadísticas Clave
- **Archivos Analizados:** ~51 archivos TypeScript
- **Cobertura de Tests:** 50% (objetivo: 70-80%)
- **Dependencias:** 23 producción, 20 desarrollo
- **Vulnerabilidades:** 0 Críticas, 3 Altas, 4 Medias

### Puntuaciones por Categoría
- 🏗️ **Arquitectura:** 9/10 (Excelente)
- 🔒 **Seguridad:** 7/10 (Bueno - SSL deshabilitado por limitación del sitio BCV)
- ⚡ **Performance:** 7/10 (Bueno)
- ✅ **Testing:** 7.5/10 (Bueno)
- 📊 **Monitoreo:** 7.5/10 (Bueno)
- 🚀 **DevOps:** 8/10 (Muy Bueno)

---

## Tickets Organizados por Prioridad

### 🚨 CRÍTICO - Arreglar Inmediatamente

---

#### **Ticket #002: Agregar Tests Automatizados a CI/CD**
**Branch:** `feat/ci-automated-tests`
**Prioridad:** 🚨 CRÍTICA
**Esfuerzo:** 1 hora
**Tipo:** DevOps

**Descripción:**
Actualmente existen 139 tests pero no se ejecutan automáticamente en el pipeline de CI/CD, permitiendo que código con bugs llegue a producción.

**Archivos Afectados:**
- `.github/workflows/docker-publish.yml`

**Solución Propuesta:**
Agregar job de testing antes del build:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          token: ${{ secrets.CODECOV_TOKEN }}

  build:
    needs: [test]
    # ... existing build job
```

**Criterios de Aceptación:**
- [ ] Job de tests agregado al workflow
- [ ] Tests se ejecutan antes del build
- [ ] Build falla si los tests fallan
- [ ] Coverage report se sube a Codecov
- [ ] Badge de coverage en README

---

### 🔴 ALTA PRIORIDAD - Semana 1

---

#### **Ticket #003: Implementar Rate Limiting por API Key**
**Branch:** `feat/per-key-rate-limiting`
**Prioridad:** 🔴 ALTA
**Esfuerzo:** 1 día
**Tipo:** Security Enhancement

**Descripción:**
Actualmente todas las API keys comparten el mismo rate limit global (100 req/15min). Si una key se ve comprometida, puede agotar la cuota para todos los usuarios.

**Archivos Afectados:**
- `src/middleware/auth.middleware.ts`
- `src/Application.ts:165-176`
- `src/models/api-key.ts` (nuevo)

**Solución Propuesta:**
```typescript
// Crear rate limiter por API key
const apiKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: async (req) => {
    const key = req.header('X-API-Key');
    const keyConfig = await getKeyConfig(key);
    return keyConfig?.quotaPerHour || 100;
  },
  keyGenerator: (req) => req.header('X-API-Key') || 'anonymous',
  message: {
    success: false,
    error: 'Rate limit exceeded for this API key',
  },
});
```

**Criterios de Aceptación:**
- [ ] Rate limiting por API key individual
- [ ] Configuración de quota por key en DB
- [ ] Respuesta clara cuando se excede el límite
- [ ] Tests para diferentes keys y cuotas
- [ ] Documentación de cómo configurar quotas
- [ ] Migration para agregar quotas a keys existentes

---

#### **Ticket #004: Arreglar Inyección Regex en MongoDB**
**Branch:** `fix/mongo-regex-injection`
**Prioridad:** 🔴 ALTA
**Esfuerzo:** 30 minutos
**Tipo:** Security Fix

**Descripción:**
Query de MongoDB usa regex sin escapar caracteres especiales, permitiendo potencial inyección NoSQL.

**Archivos Afectados:**
- `src/services/mongo.service.ts:186-194`

**Problema Actual:**
```typescript
const result = await this.collection.findOne({
  date: { $regex: `^${date}`, $options: 'i' },  // Sin escapar
});
```

**Solución Propuesta:**
```typescript
private escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async getRateByDate(date: string): Promise<Rate | null> {
  // Primero intentar match exacto (usa índice)
  let result = await this.collection.findOne(
    { date },
    { sort: { createdAt: -1 } }
  );

  // Fallback a regex solo si no hay match exacto
  if (!result) {
    const escapedDate = this.escapeRegex(date);
    result = await this.collection.findOne(
      { date: { $regex: `^${escapedDate}`, $options: 'i' } },
      { sort: { createdAt: -1 } }
    );
  }

  return result || null;
}
```

**Criterios de Aceptación:**
- [ ] Función de escape de regex implementada
- [ ] Búsqueda exacta primero (más rápida)
- [ ] Regex escapado en fallback
- [ ] Tests para caracteres especiales en fecha
- [ ] Tests de performance (debe ser 10x más rápido para fechas exactas)

---

#### **Ticket #005: Agregar Auditoría de Dependencias a CI**
**Branch:** `feat/dependency-audit-ci`
**Prioridad:** 🔴 ALTA
**Esfuerzo:** 15 minutos
**Tipo:** Security

**Descripción:**
No hay escaneo automático de vulnerabilidades en dependencias, permitiendo que vulnerabilidades conocidas lleguen a producción.

**Archivos Afectados:**
- `.github/workflows/docker-publish.yml`
- `.github/workflows/security-audit.yml` (nuevo)

**Solución Propuesta:**
```yaml
# .github/workflows/security-audit.yml
name: Security Audit

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 1'  # Semanalmente

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm audit --audit-level=moderate

  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**Criterios de Aceptación:**
- [ ] Workflow de security audit creado
- [ ] Se ejecuta en push, PR y semanalmente
- [ ] Falla si hay vulnerabilidades moderadas o superiores
- [ ] Integración con Snyk configurada
- [ ] Notificaciones de vulnerabilidades

---

#### **Ticket #006: Validación de Configuración con Zod**
**Branch:** `feat/config-validation-zod`
**Prioridad:** 🔴 ALTA
**Esfuerzo:** 1 día
**Tipo:** Quality Improvement

**Descripción:**
La configuración no se valida en startup, permitiendo que la aplicación inicie con configuración inválida y falle durante operación.

**Archivos Afectados:**
- `src/config/index.ts`
- `src/config/schema.ts` (nuevo)
- `src/config/utils.ts` (nuevo)

**Solución Propuesta:**
```typescript
// src/config/schema.ts
import { z } from 'zod';

export const ConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  bcvWebsiteUrl: z.string().url(),
  mongoUri: z.string().min(1),
  mongodb: z.object({
    maxPoolSize: z.number().int().min(1).max(100),
    minPoolSize: z.number().int().min(1).max(10),
    serverSelectionTimeoutMS: z.number().int().positive(),
  }),
  redis: z.object({
    enabled: z.boolean(),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    password: z.string().optional(),
  }),
  apiKeys: z.array(z.string().min(32))
    .min(1, 'At least one API key required'),
  cronSchedule: z.string().regex(
    /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
    'Invalid cron expression'
  ),
});

// src/config/utils.ts
export function parseBoolean(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (!value) return defaultValue;
  const normalized = value.toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  console.warn(`Invalid boolean "${value}", using default: ${defaultValue}`);
  return defaultValue;
}

// src/config/index.ts
const rawConfig = {
  // ... build config from env vars
};

export const config = ConfigSchema.parse(rawConfig);
```

**Criterios de Aceptación:**
- [ ] Schema de Zod completo para toda la config
- [ ] Validación ejecutada en startup
- [ ] Mensajes de error claros para config inválida
- [ ] Función parseBoolean consistente
- [ ] Tests para validación de config
- [ ] Documentación de variables requeridas

---

#### **Ticket #007: Estandarizar Respuestas de Error API**
**Branch:** `refactor/standardize-error-responses`
**Prioridad:** 🔴 ALTA
**Esfuerzo:** 4 horas
**Tipo:** API Consistency

**Descripción:**
Los controllers retornan diferentes formatos de error, creando inconsistencia en el contrato de la API.

**Archivos Afectados:**
- `src/models/api-response.ts` (nuevo)
- `src/controllers/rate.controller.ts`
- `src/middleware/error-handler.middleware.ts` (nuevo)

**Solución Propuesta:**
```typescript
// src/models/api-response.ts
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Error codes enum
export enum ErrorCode {
  RATE_NOT_FOUND = 'RATE_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// Helper functions
export function successResponse<T>(data: T, requestId?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  requestId?: string
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}
```

**Criterios de Aceptación:**
- [ ] Tipos de respuesta definidos
- [ ] Enum de códigos de error
- [ ] Helper functions para responses
- [ ] Todos los controllers actualizados
- [ ] Middleware de error handler global
- [ ] Tests actualizados
- [ ] Documentación de API actualizada

---

#### **Ticket #008: Agregar Request ID Tracing**
**Branch:** `feat/request-id-tracing`
**Prioridad:** 🔴 ALTA
**Esfuerzo:** 2 horas
**Tipo:** Observability

**Descripción:**
No hay forma de correlacionar logs a través de una request, dificultando el debugging de problemas.

**Archivos Afectados:**
- `src/middleware/request-id.middleware.ts` (nuevo)
- `src/Application.ts`
- `src/utils/logger.ts`

**Solución Propuesta:**
```typescript
// src/middleware/request-id.middleware.ts
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.header('X-Request-ID') || randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// Extender Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Actualizar logger para incluir requestId
// src/utils/logger.ts - agregar en formato
const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.printf(({ level, message, timestamp, metadata }) => {
    const requestId = metadata.requestId ? `[${metadata.requestId}] ` : '';
    return `${timestamp} ${level}: ${requestId}${message}`;
  })
);
```

**Criterios de Aceptación:**
- [ ] Middleware de request ID implementado
- [ ] Request ID en headers de respuesta
- [ ] Request ID en todos los logs
- [ ] Acepta X-Request-ID del cliente
- [ ] Genera UUID si no viene del cliente
- [ ] Tests de middleware
- [ ] Documentación de header

---

#### **Ticket #009: Ejecutar Docker como Usuario No-Root**
**Branch:** `fix/docker-non-root-user`
**Prioridad:** 🔴 ALTA
**Esfuerzo:** 15 minutos
**Tipo:** Security

**Descripción:**
El contenedor Docker corre como root, creando riesgo de seguridad si el contenedor es comprometido.

**Archivos Afectados:**
- `Dockerfile`

**Solución Propuesta:**
```dockerfile
FROM node:24-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache ca-certificates wget && \
    npm install -g pnpm

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar archivos de dependencias
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY --chown=nodejs:nodejs . .

# Build
RUN pnpm build

# Cambiar a usuario no-root
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/app.js"]
```

**Criterios de Aceptación:**
- [ ] Usuario nodejs creado en Dockerfile
- [ ] Todos los archivos con ownership correcto
- [ ] Contenedor corre como usuario nodejs
- [ ] Health check funciona
- [ ] Permisos correctos en directorios
- [ ] Tests de contenedor pasando
- [ ] Documentación actualizada

---

### 🟠 MEDIA PRIORIDAD - Semana 2-3

---

#### **Ticket #010: Tests de Integración para Controllers**
**Branch:** `test/integration-controllers`
**Prioridad:** 🟠 MEDIA
**Esfuerzo:** 2 días
**Tipo:** Testing

**Descripción:**
Existen tests unitarios comprehensivos pero faltan tests de integración E2E que verifiquen el flujo completo request/response con middleware.

**Archivos Afectados:**
- `test/integration/rate-endpoints.test.ts` (nuevo)
- `test/integration/health-endpoints.test.ts` (nuevo)
- `test/integration/metrics-endpoints.test.ts` (nuevo)
- `test/helpers/test-server.ts` (nuevo)

**Solución Propuesta:**
```typescript
// test/helpers/test-server.ts
import { Application } from '@/Application';
import { Server as HttpServer } from 'http';
import { createContainer } from '@/config/inversify.config';

export async function createTestServer(): Promise<{
  app: Express.Application;
  server: HttpServer;
  cleanup: () => Promise<void>;
}> {
  const server = new HttpServer();
  const container = createContainer(server);
  const application = new Application(container);
  await application.initialize();

  return {
    app: application.app,
    server,
    cleanup: async () => {
      await application.shutdown();
    },
  };
}

// test/integration/rate-endpoints.test.ts
import request from 'supertest';
import { createTestServer } from '../helpers/test-server';

describe('Rate Endpoints', () => {
  let app: Express.Application;
  let cleanup: () => Promise<void>;
  const TEST_API_KEY = 'test-api-key-32-characters-min';

  beforeAll(async () => {
    const testServer = await createTestServer();
    app = testServer.app;
    cleanup = testServer.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('GET /api/v1/rates/latest', () => {
    it('should return 401 without API key', async () => {
      const response = await request(app)
        .get('/api/v1/rates/latest')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should return latest rate with valid API key', async () => {
      const response = await request(app)
        .get('/api/v1/rates/latest')
        .set('X-API-Key', TEST_API_KEY)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          rates: expect.any(Array),
          date: expect.any(String),
          source: 'bcv',
        },
      });
    });

    it('should return X-Request-ID header', async () => {
      const response = await request(app)
        .get('/api/v1/rates/latest')
        .set('X-API-Key', TEST_API_KEY);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('GET /api/v1/rates/history', () => {
    it('should validate date format', async () => {
      const response = await request(app)
        .get('/api/v1/rates/history?startDate=invalid')
        .set('X-API-Key', TEST_API_KEY)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce max range limit', async () => {
      const response = await request(app)
        .get('/api/v1/rates/history?startDate=2020-01-01&endDate=2025-01-01')
        .set('X-API-Key', TEST_API_KEY)
        .expect(400);

      expect(response.body.error.message).toContain('730 days');
    });
  });
});
```

**Criterios de Aceptación:**
- [ ] Test server helper creado
- [ ] Tests para todos los endpoints de rates
- [ ] Tests para health endpoints
- [ ] Tests para metrics endpoints
- [ ] Tests de validación de input
- [ ] Tests de autenticación
- [ ] Tests de rate limiting
- [ ] Coverage > 80% en controllers
- [ ] Documentación de cómo correr tests

---

#### **Ticket #011: Optimizar Queries MongoDB con Projections**
**Branch:** `perf/mongodb-projections`
**Prioridad:** 🟠 MEDIA
**Esfuerzo:** 2 horas
**Tipo:** Performance

**Descripción:**
Los queries de MongoDB fetchean todos los campos innecesariamente, causando ~20-30% de overhead en network I/O.

**Archivos Afectados:**
- `src/services/mongo.service.ts`

**Solución Propuesta:**
```typescript
// Definir projection constante
private readonly RATE_PROJECTION = {
  id: 1,
  rates: 1,
  date: 1,
  source: 1,
  createdAt: 1,
  _id: 0,
};

async getRateHistory(limit = 30): Promise<Rate[]> {
  const result = await this.collection
    .find({}, { projection: this.RATE_PROJECTION })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return result;
}

async getRateByDate(date: string): Promise<Rate | null> {
  let result = await this.collection.findOne(
    { date },
    {
      projection: this.RATE_PROJECTION,
      sort: { createdAt: -1 },
    }
  );

  if (!result) {
    const escapedDate = this.escapeRegex(date);
    result = await this.collection.findOne(
      { date: { $regex: `^${escapedDate}`, $options: 'i' } },
      {
        projection: this.RATE_PROJECTION,
        sort: { createdAt: -1 },
      }
    );
  }

  return result || null;
}

async getRatesByDateRange(
  startDate: string,
  endDate: string,
  limit?: number
): Promise<Rate[]> {
  const query = this.collection
    .find(
      {
        date: { $gte: startDate, $lte: endDate },
      },
      { projection: this.RATE_PROJECTION }
    )
    .sort({ date: 1, createdAt: -1 });

  if (limit) {
    query.limit(limit);
  }

  return await query.toArray();
}
```

**Criterios de Aceptación:**
- [ ] Projection agregado a todos los find/findOne
- [ ] Constante RATE_PROJECTION definida
- [ ] Tests verificando que retorna campos correctos
- [ ] Benchmark de performance (antes/después)
- [ ] Documentación de mejora de performance
- [ ] Network I/O reducido 20-30%

---

#### **Ticket #012: Distributed Locking para Scheduler**
**Branch:** `feat/distributed-scheduler-lock`
**Prioridad:** 🟠 MEDIA
**Esfuerzo:** 1 día
**Tipo:** Scalability

**Descripción:**
El scheduler no es horizontally scalable. Múltiples instancias ejecutarán el scraping simultáneamente, duplicando requests al BCV.

**Archivos Afectados:**
- `src/services/scheduler.service.ts`
- `src/interfaces/IRedisService.ts`
- `src/services/redis.service.ts`

**Solución Propuesta:**
```typescript
// Agregar a IRedisService
interface IRedisService {
  // ... existing methods
  acquireLock(key: string, ttl: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
}

// Implementar en RedisService
async acquireLock(key: string, ttl: number): Promise<boolean> {
  if (!this.isEnabled || !this.client) {
    return true; // Si Redis está deshabilitado, permitir ejecución
  }

  try {
    const lockKey = `lock:${key}`;
    const lockValue = `${process.env.HOSTNAME || 'unknown'}-${Date.now()}`;

    const result = await this.client.set(
      lockKey,
      lockValue,
      'NX',  // Only set if not exists
      'EX',  // Expiration in seconds
      ttl
    );

    const acquired = result === 'OK';

    if (acquired) {
      log.debug('Lock acquired', { key: lockKey, value: lockValue });
    } else {
      log.debug('Lock already held by another instance', { key: lockKey });
    }

    return acquired;
  } catch (error) {
    log.error('Error acquiring lock', { key, error });
    return false;
  }
}

async releaseLock(key: string): Promise<void> {
  if (!this.isEnabled || !this.client) return;

  try {
    const lockKey = `lock:${key}`;
    await this.client.del(lockKey);
    log.debug('Lock released', { key: lockKey });
  } catch (error) {
    log.error('Error releasing lock', { key, error });
  }
}

// Actualizar SchedulerService
private async updateRate(): Promise<void> {
  const lockAcquired = await this.redisService.acquireLock(
    'bcv-scraper',
    60  // Lock expires in 60 seconds
  );

  if (!lockAcquired) {
    log.info('Another instance is already updating rates, skipping');
    return;
  }

  try {
    const newRate = await this.bcvService.getCurrentRate();
    // ... rest of the update logic
  } finally {
    await this.redisService.releaseLock('bcv-scraper');
  }
}
```

**Criterios de Aceptación:**
- [ ] Métodos acquireLock/releaseLock en RedisService
- [ ] Scheduler usa distributed lock
- [ ] Lock expira automáticamente (60s)
- [ ] Graceful degradation si Redis está down
- [ ] Tests unitarios para lock acquisition
- [ ] Tests de integración con múltiples instancias
- [ ] Logs claros cuando otra instancia tiene el lock
- [ ] Documentación de scaling horizontal

---

#### **Ticket #013: Métricas de Performance (Cache Hit Ratio, Query Duration)**
**Branch:** `feat/performance-metrics`
**Prioridad:** 🟠 MEDIA
**Esfuerzo:** 4 horas
**Tipo:** Observability

**Descripción:**
Faltan métricas clave para identificar problemas de performance: cache hit ratio, duración de queries MongoDB, uso de connection pool.

**Archivos Afectados:**
- `src/services/metrics.service.ts`
- `src/services/redis.service.ts`
- `src/services/mongo.service.ts`

**Solución Propuesta:**
```typescript
// Agregar a MetricsService
private cacheHitRatio = new promClient.Gauge({
  name: 'redis_cache_hit_ratio',
  help: 'Redis cache hit ratio (hits / total requests)',
});

private cacheOperations = new promClient.Counter({
  name: 'redis_cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'],
});

private mongoQueryDuration = new promClient.Histogram({
  name: 'mongodb_query_duration_seconds',
  help: 'MongoDB query duration in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  labelNames: ['operation'],
});

private mongoPoolSize = new promClient.Gauge({
  name: 'mongodb_pool_connections',
  help: 'MongoDB connection pool usage',
  labelNames: ['state'],
});

public recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'del'): void {
  this.cacheOperations.inc({
    operation,
    result: operation === 'hit' ? 'success' : 'miss'
  });
}

public recordMongoQuery(operation: string, duration: number): void {
  this.mongoQueryDuration.observe({ operation }, duration);
}

public updateMongoPoolMetrics(
  active: number,
  available: number,
  total: number
): void {
  this.mongoPoolSize.set({ state: 'active' }, active);
  this.mongoPoolSize.set({ state: 'available' }, available);
  this.mongoPoolSize.set({ state: 'total' }, total);
}

// Actualizar RedisService
async get<T>(key: string): Promise<T | null> {
  if (!this.isEnabled || !this.client) {
    this.metricsService.recordCacheOperation('miss');
    return null;
  }

  try {
    const value = await this.client.get(key);

    if (value) {
      this.metricsService.recordCacheOperation('hit');
      return JSON.parse(value);
    }

    this.metricsService.recordCacheOperation('miss');
    return null;
  } catch (error) {
    log.error('Error getting key from Redis', { key, error });
    this.metricsService.recordCacheOperation('miss');
    return null;
  }
}

// Wrapper para queries MongoDB
private async timedQuery<T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    return await queryFn();
  } finally {
    const duration = (Date.now() - start) / 1000;
    this.metricsService.recordMongoQuery(operation, duration);

    if (duration > 0.1) {
      log.warn('Slow MongoDB query detected', { operation, duration });
    }
  }
}

async getRateHistory(limit = 30): Promise<Rate[]> {
  return this.timedQuery('getRateHistory', async () => {
    const result = await this.collection
      .find({}, { projection: this.RATE_PROJECTION })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return result;
  });
}
```

**Criterios de Aceptación:**
- [ ] Métrica de cache hit ratio
- [ ] Contador de operaciones de cache
- [ ] Histograma de duración de queries MongoDB
- [ ] Gauge de uso de connection pool
- [ ] Logs de queries lentas (> 100ms)
- [ ] Métricas expuestas en /metrics
- [ ] Grafana dashboard actualizado
- [ ] Documentación de métricas

---

#### **Ticket #014: Circuit Breaker para BCV Scraping**
**Branch:** `feat/circuit-breaker-bcv`
**Prioridad:** 🟠 MEDIA
**Esfuerzo:** 4 horas
**Tipo:** Resilience

**Descripción:**
El servicio continúa intentando scraping incluso cuando BCV está caído, desperdiciando recursos. Un circuit breaker permite fail-fast y fallback a último dato conocido.

**Archivos Afectados:**
- `src/services/bcv.service.ts`
- `package.json` (agregar `opossum`)

**Solución Propuesta:**
```typescript
import CircuitBreaker from 'opossum';

export class BCVService implements IBCVService {
  private circuitBreaker: CircuitBreaker;

  constructor(
    @inject(TYPES.DiscordService) private discordService: IDiscordService,
    @inject(TYPES.WebhookService) private webhookService: IWebhookService,
    @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService,
    @inject(TYPES.MetricsService) private metricsService: IMetricsService,
    @inject(TYPES.CacheService) private cacheService: ICacheService
  ) {
    // Configurar circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.fetchRateData.bind(this),
      {
        timeout: 15000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 60000,
        rollingCountBuckets: 10,
      }
    );

    // Event handlers
    this.circuitBreaker.on('open', () => {
      log.warn('Circuit breaker opened - BCV service appears to be down');
      this.metricsService.recordCircuitBreakerState('open');
    });

    this.circuitBreaker.on('halfOpen', () => {
      log.info('Circuit breaker half-open - testing BCV service');
      this.metricsService.recordCircuitBreakerState('halfOpen');
    });

    this.circuitBreaker.on('close', () => {
      log.info('Circuit breaker closed - BCV service is healthy');
      this.metricsService.recordCircuitBreakerState('closed');
    });

    // Fallback a último dato conocido
    this.circuitBreaker.fallback(async () => {
      log.warn('Using fallback: returning last known rate from cache');
      const cachedRate = await this.cacheService.get<Rate>(
        CacheKeys.LATEST_RATE
      );

      if (cachedRate) {
        return cachedRate;
      }

      throw new Error('No fallback data available');
    });
  }

  async getCurrentRate(): Promise<Rate | null> {
    try {
      return await this.circuitBreaker.fire();
    } catch (error) {
      log.error('Failed to get current rate even with circuit breaker', {
        error: this.getErrorMessage(error),
      });
      return null;
    }
  }
}
```

**Criterios de Aceptación:**
- [ ] Circuit breaker configurado con opossum
- [ ] Fallback a último dato conocido
- [ ] Métricas de estado del circuit breaker
- [ ] Logs de cambios de estado
- [ ] Tests de circuit breaker (open, half-open, close)
- [ ] Documentación de comportamiento
- [ ] Configuración via env vars

---

#### **Ticket #015: Schema Validation en MongoDB**
**Branch:** `feat/mongodb-schema-validation`
**Prioridad:** 🟠 MEDIA
**Esfuerzo:** 2 horas
**Tipo:** Data Integrity

**Descripción:**
MongoDB no tiene validación de schema, permitiendo que datos inválidos sean insertados directamente via mongo shell o errores de código.

**Archivos Afectados:**
- `src/services/mongo.service.ts`
- `src/models/notification-state.ts` (nuevo)

**Solución Propuesta:**
```typescript
async connect(): Promise<void> {
  try {
    await this.client.connect();
    this.db = this.client.db(config.database);
    this.collection = this.db.collection<Rate>('rates');
    this.notificationStateCollection = this.db.collection('notification_states');

    log.info('Conexión exitosa a MongoDB');

    // Aplicar schema validation para rates
    await this.applyRatesSchema();

    // Aplicar schema validation para notification_states
    await this.applyNotificationStatesSchema();

    // Crear índices
    await this.createIndexes();
  } catch (error) {
    log.error('Error conectando a MongoDB', { error });
    throw error;
  }
}

private async applyRatesSchema(): Promise<void> {
  try {
    await this.db.command({
      collMod: 'rates',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'rates', 'date', 'source', 'createdAt'],
          properties: {
            id: {
              bsonType: 'string',
              pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}-.+$',
              description: 'Must be a string in format YYYY-MM-DD-source',
            },
            rates: {
              bsonType: 'array',
              minItems: 1,
              items: {
                bsonType: 'object',
                required: ['currency', 'rate', 'name'],
                properties: {
                  currency: {
                    bsonType: 'string',
                    minLength: 3,
                    maxLength: 3,
                    description: 'Must be a 3-letter currency code',
                  },
                  rate: {
                    bsonType: 'double',
                    minimum: 0,
                    description: 'Must be a positive number',
                  },
                  name: {
                    bsonType: 'string',
                    description: 'Currency name',
                  },
                },
              },
            },
            date: {
              bsonType: 'string',
              pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
              description: 'Must be in YYYY-MM-DD format',
            },
            source: {
              enum: ['bcv'],
              description: 'Must be a valid source',
            },
            createdAt: {
              bsonType: 'string',
              description: 'ISO timestamp',
            },
          },
        },
      },
      validationLevel: 'moderate',
      validationAction: 'error',
    });

    log.info('Schema validation applied for rates collection');
  } catch (error) {
    // Si la colección no existe, se creará con el schema
    log.warn('Could not apply schema validation to existing collection', {
      error,
    });
  }
}

private async applyNotificationStatesSchema(): Promise<void> {
  try {
    await this.db.command({
      collMod: 'notification_states',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['type', 'state', 'timestamp'],
          properties: {
            type: {
              enum: ['service_status', 'deployment'],
              description: 'Type of notification',
            },
            state: {
              bsonType: 'string',
              description: 'Current state',
            },
            timestamp: {
              bsonType: 'date',
              description: 'Last update timestamp',
            },
            metadata: {
              bsonType: 'object',
              description: 'Additional metadata',
            },
          },
        },
      },
      validationLevel: 'moderate',
      validationAction: 'error',
    });

    log.info('Schema validation applied for notification_states collection');
  } catch (error) {
    log.warn('Could not apply schema validation to notification_states', {
      error,
    });
  }
}
```

**Criterios de Aceptación:**
- [ ] Schema validation para collection rates
- [ ] Schema validation para notification_states
- [ ] Modelo TypeScript para NotificationState
- [ ] Tests de inserción con datos válidos
- [ ] Tests de rechazo con datos inválidos
- [ ] Documentación de schemas
- [ ] Migration guide para datos existentes

---

#### **Ticket #016: Health Check para Scheduler**
**Branch:** `feat/scheduler-health-check`
**Prioridad:** 🟠 MEDIA
**Esfuerzo:** 2 horas
**Tipo:** Monitoring

**Descripción:**
El health check no puede verificar si el scheduler está corriendo, dificultando detectar problemas con el cron job.

**Archivos Afectados:**
- `src/interfaces/ISchedulerService.ts`
- `src/services/scheduler.service.ts`
- `src/services/health-check.service.ts`

**Solución Propuesta:**
```typescript
// src/interfaces/ISchedulerService.ts
export interface ISchedulerService {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  getLastRunTime(): Date | null;
  getNextRunTime(): Date | null;
  getLastRunStatus(): 'success' | 'failure' | 'pending' | null;
}

// src/services/scheduler.service.ts
export class SchedulerService implements ISchedulerService {
  private job: ScheduledTask | null = null;
  private running = false;
  private lastRunTime: Date | null = null;
  private lastRunStatus: 'success' | 'failure' | 'pending' | null = null;

  start(): void {
    if (this.running) {
      log.warn('Scheduler already running');
      return;
    }

    log.info('Iniciando scheduler para actualización automática de tasas', {
      cronSchedule: config.cronSchedule,
    });

    this.job = cron.schedule(config.cronSchedule, async () => {
      this.lastRunStatus = 'pending';
      this.lastRunTime = new Date();

      try {
        await this.updateRate();
        this.lastRunStatus = 'success';
      } catch (error) {
        this.lastRunStatus = 'failure';
        log.error('Error in scheduled rate update', { error });
      }
    });

    this.running = true;
  }

  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      this.running = false;
      log.info('Scheduler detenido');
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getLastRunTime(): Date | null {
    return this.lastRunTime;
  }

  getNextRunTime(): Date | null {
    if (!this.job) return null;

    // Calcular próxima ejecución basado en cron schedule
    // Esto requiere una librería como cron-parser
    const parser = require('cron-parser');
    try {
      const interval = parser.parseExpression(config.cronSchedule);
      return interval.next().toDate();
    } catch {
      return null;
    }
  }

  getLastRunStatus(): 'success' | 'failure' | 'pending' | null {
    return this.lastRunStatus;
  }
}

// src/services/health-check.service.ts
private async checkScheduler(): Promise<CheckResult> {
  try {
    const isRunning = this.schedulerService.isRunning();
    const lastRunTime = this.schedulerService.getLastRunTime();
    const lastRunStatus = this.schedulerService.getLastRunStatus();
    const nextRunTime = this.schedulerService.getNextRunTime();

    if (!isRunning) {
      return {
        status: 'unhealthy',
        message: 'Scheduler is not running',
        details: { isRunning: false },
      };
    }

    // Verificar si la última ejecución fue hace mucho tiempo
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastRunTime && lastRunTime < oneHourAgo && lastRunStatus !== 'pending') {
      return {
        status: 'degraded',
        message: 'Scheduler has not run in over an hour',
        details: {
          isRunning: true,
          lastRunTime: lastRunTime.toISOString(),
          lastRunStatus,
        },
      };
    }

    return {
      status: 'healthy',
      message: 'Scheduler is running',
      details: {
        isRunning: true,
        lastRunTime: lastRunTime?.toISOString() || null,
        lastRunStatus,
        nextRunTime: nextRunTime?.toISOString() || null,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Error checking scheduler',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
```

**Criterios de Aceptación:**
- [ ] ISchedulerService con métodos de status
- [ ] Tracking de última ejecución y estado
- [ ] Cálculo de próxima ejecución
- [ ] Health check usa métodos de scheduler
- [ ] Tests de health check para scheduler
- [ ] Documentación de métricas de scheduler
- [ ] Agregar `cron-parser` a dependencies

---

#### **Ticket #017: Agregar Linting a CI/CD**
**Branch:** `feat/ci-linting`
**Prioridad:** 🟠 MEDIA
**Esfuerzo:** 30 minutos
**Tipo:** Code Quality

**Descripción:**
No hay verificación automática de calidad de código en CI/CD, permitiendo que código con problemas de estilo llegue a main.

**Archivos Afectados:**
- `.github/workflows/docker-publish.yml`

**Solución Propuesta:**
```yaml
# Agregar job de lint antes del build
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Biome check
        run: pnpm biome check

      - name: Run TypeScript check
        run: pnpm tsc --noEmit

  test:
    runs-on: ubuntu-latest
    # ... existing test job

  build:
    needs: [lint, test]
    # ... existing build job
```

**Criterios de Aceptación:**
- [ ] Job de lint agregado
- [ ] Biome check ejecutado
- [ ] TypeScript check ejecutado
- [ ] Build depende de lint y test
- [ ] PR checks actualizados
- [ ] Documentación actualizada

---

#### **Ticket #018: Incrementar Coverage Thresholds**
**Branch:** `test/increase-coverage-thresholds`
**Prioridad:** 🟠 MEDIA
**Esfuerzo:** 3-4 días
**Tipo:** Testing

**Descripción:**
Los thresholds de coverage están en 50% (lines) y 45% (functions), muy por debajo del estándar de industria de 70-80%.

**Archivos Afectados:**
- `vitest.config.ts`
- `test/unit/services/redis.service.test.ts` (nuevo)
- `test/unit/services/scheduler.service.test.ts` (nuevo)
- `test/unit/services/health-check.service.test.ts` (nuevo)
- `test/unit/services/metrics.service.test.ts` (nuevo)

**Solución Propuesta:**
```typescript
// vitest.config.ts - actualizar thresholds gradualmente
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov', 'html'],
  exclude: [
    'node_modules/**',
    'dist/**',
    '**/*.d.ts',
    '**/*.config.ts',
    '**/types.ts',
  ],
  thresholds: {
    lines: 60,        // Incremento de 50% a 60%
    functions: 55,    // Incremento de 45% a 55%
    branches: 60,     // Incremento de 50% a 60%
    statements: 60,   // Incremento de 50% a 60%
  },
},

// test/unit/services/redis.service.test.ts - ejemplo
describe('RedisService', () => {
  let redisService: RedisService;
  let mockClient: MockedObject<Redis>;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
      ping: vi.fn(),
      quit: vi.fn(),
      on: vi.fn(),
    } as any;

    redisService = new RedisService(mockMetricsService);
    (redisService as any).client = mockClient;
  });

  describe('Connection handling', () => {
    it('should handle connection errors gracefully', async () => {
      mockClient.ping.mockRejectedValue(new Error('Connection failed'));
      const result = await redisService.get('test-key');
      expect(result).toBeNull();
    });

    it('should retry with exponential backoff', async () => {
      // Test retry logic
    });
  });

  describe('Cache operations', () => {
    it('should record cache hit metric', async () => {
      mockClient.get.mockResolvedValue('{"data":"test"}');
      await redisService.get('test-key');
      expect(mockMetricsService.recordCacheOperation).toHaveBeenCalledWith('hit');
    });

    it('should record cache miss metric', async () => {
      mockClient.get.mockResolvedValue(null);
      await redisService.get('test-key');
      expect(mockMetricsService.recordCacheOperation).toHaveBeenCalledWith('miss');
    });
  });
});
```

**Criterios de Aceptación:**
- [ ] Tests agregados para RedisService
- [ ] Tests agregados para SchedulerService
- [ ] Tests agregados para HealthCheckService
- [ ] Tests agregados para MetricsService
- [ ] Coverage >= 60% lines
- [ ] Coverage >= 55% functions
- [ ] Todos los tests pasando
- [ ] Documentación de gaps restantes

---

### 🟡 BAJA PRIORIDAD - Mes 1-2

---

#### **Ticket #019: Integrar Sentry para Error Tracking**
**Branch:** `feat/sentry-integration`
**Prioridad:** 🟡 BAJA
**Esfuerzo:** 1 día
**Tipo:** Observability

**Descripción:**
No hay servicio de error tracking, dificultando identificar y agrupar errores en producción.

**Archivos Afectados:**
- `src/utils/sentry.ts` (nuevo)
- `src/Application.ts`
- `src/config/index.ts`
- `package.json`

**Solución Propuesta:**
```typescript
// src/utils/sentry.ts
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from '@/config';

export function initializeSentry(): void {
  if (!config.sentryDsn) {
    log.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    release: `bcv-service@${process.env.npm_package_version}`,
    integrations: [
      nodeProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: true }),
    ],
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
    profilesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Scrub sensitive data
      if (event.request?.headers) {
        delete event.request.headers['x-api-key'];
        delete event.request.headers['authorization'];
      }
      return event;
    },
  });

  log.info('Sentry initialized', {
    environment: config.nodeEnv,
    sampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
  });
}

// src/Application.ts
import { initializeSentry } from '@/utils/sentry';
import * as Sentry from '@sentry/node';

export class Application {
  async initialize(): Promise<void> {
    // Initialize Sentry first
    initializeSentry();

    // Sentry request handler must be first middleware
    this.app.use(Sentry.Handlers.requestHandler());
    this.app.use(Sentry.Handlers.tracingHandler());

    // ... other middleware

    // Sentry error handler must be before other error handlers
    this.app.use(Sentry.Handlers.errorHandler());

    // ... other error handlers
  }
}

// src/config/index.ts
export const config = {
  // ... existing config
  sentryDsn: process.env.SENTRY_DSN || '',
};
```

**Criterios de Aceptación:**
- [ ] Sentry SDK instalado
- [ ] Configuración de Sentry
- [ ] Request handler agregado
- [ ] Error handler agregado
- [ ] Scrubbing de datos sensibles
- [ ] Performance monitoring
- [ ] Source maps subidos
- [ ] Tests no envían datos a Sentry
- [ ] Documentación de configuración

---

#### **Ticket #020: Log Aggregation (ELK o Datadog)**
**Branch:** `feat/log-aggregation`
**Prioridad:** 🟡 BAJA
**Esfuerzo:** 2-3 días
**Tipo:** Observability

**Descripción:**
Los logs solo están en filesystem local, imposibilitando queries across múltiples instancias y análisis centralizado.

**Archivos Afectados:**
- `src/utils/logger.ts`
- `docker-compose.production.yml`
- `.github/workflows/deploy.yml`

**Solución Propuesta (Opción A - Datadog):**
```typescript
// src/utils/logger.ts
import { DatadogWinston } from 'winston-datadog-logger';

const transports: winston.transport[] = [
  // ... existing transports
];

if (config.datadogApiKey) {
  transports.push(
    new DatadogWinston({
      apiKey: config.datadogApiKey,
      hostname: config.hostname,
      service: 'bcv-service',
      ddsource: 'nodejs',
      ddtags: `env:${config.nodeEnv},version:${process.env.npm_package_version}`,
    })
  );
  console.log('Datadog logging enabled');
}
```

**Solución Propuesta (Opción B - ELK Stack):**
```yaml
# docker-compose.elk.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - ./logs:/logs
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

**Criterios de Aceptación:**
- [ ] Decisión: Datadog vs ELK Stack
- [ ] Transport de Winston configurado
- [ ] Logs fluyendo a sistema centralizado
- [ ] Dashboards básicos creados
- [ ] Alertas configuradas para errores
- [ ] Retención de logs configurada (30 días)
- [ ] Documentación de queries comunes
- [ ] Runbook para troubleshooting

---

#### **Ticket #021: Framework de Migraciones de Base de Datos**
**Branch:** `feat/database-migrations`
**Prioridad:** 🟡 BAJA
**Esfuerzo:** 3-4 días
**Tipo:** Infrastructure

**Descripción:**
No hay sistema de migraciones, dificultando evolución del schema y rollback de cambios.

**Archivos Afectados:**
- `src/migrations/framework.ts` (nuevo)
- `src/migrations/001_example.ts` (nuevo)
- `src/services/migration.service.ts` (nuevo)
- `scripts/run-migrations.ts` (nuevo)

**Solución Propuesta:**
```typescript
// src/migrations/framework.ts
import type { Db } from 'mongodb';

export interface Migration {
  version: number;
  name: string;
  description: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
}

export interface MigrationRecord {
  version: number;
  name: string;
  description: string;
  appliedAt: Date;
  executionTime: number;
}

// src/services/migration.service.ts
export class MigrationService {
  private migrationsCollection: Collection<MigrationRecord>;
  private migrations: Migration[] = [];

  constructor(private db: Db) {
    this.migrationsCollection = db.collection('_migrations');
  }

  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    return await this.migrationsCollection
      .find()
      .sort({ version: 1 })
      .toArray();
  }

  async getCurrentVersion(): Promise<number> {
    const applied = await this.getAppliedMigrations();
    return applied.length > 0 ? applied[applied.length - 1].version : 0;
  }

  async migrate(targetVersion?: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const target = targetVersion ?? Math.max(...this.migrations.map(m => m.version));

    log.info('Starting migrations', {
      from: currentVersion,
      to: target,
    });

    for (const migration of this.migrations) {
      if (migration.version <= currentVersion) continue;
      if (migration.version > target) break;

      log.info('Applying migration', {
        version: migration.version,
        name: migration.name,
      });

      const startTime = Date.now();

      try {
        await migration.up(this.db);

        await this.migrationsCollection.insertOne({
          version: migration.version,
          name: migration.name,
          description: migration.description,
          appliedAt: new Date(),
          executionTime: Date.now() - startTime,
        });

        log.info('Migration applied successfully', {
          version: migration.version,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        log.error('Migration failed', {
          version: migration.version,
          error,
        });
        throw error;
      }
    }

    log.info('Migrations completed');
  }

  async rollback(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      throw new Error('Target version must be less than current version');
    }

    log.info('Starting rollback', {
      from: currentVersion,
      to: targetVersion,
    });

    const migrationsToRollback = this.migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    for (const migration of migrationsToRollback) {
      log.info('Rolling back migration', {
        version: migration.version,
        name: migration.name,
      });

      try {
        await migration.down(this.db);

        await this.migrationsCollection.deleteOne({
          version: migration.version,
        });

        log.info('Migration rolled back successfully', {
          version: migration.version,
        });
      } catch (error) {
        log.error('Rollback failed', {
          version: migration.version,
          error,
        });
        throw error;
      }
    }

    log.info('Rollback completed');
  }
}

// src/migrations/001_add_metadata_field.ts
export const migration: Migration = {
  version: 1,
  name: 'add_metadata_field',
  description: 'Add metadata field to rates collection for tracking data source and quality',

  async up(db: Db) {
    await db.collection('rates').updateMany(
      { metadata: { $exists: false } },
      {
        $set: {
          metadata: {
            migrated: true,
            migratedAt: new Date(),
          },
        },
      }
    );
  },

  async down(db: Db) {
    await db.collection('rates').updateMany(
      {},
      { $unset: { metadata: '' } }
    );
  },
};

// scripts/run-migrations.ts
async function main() {
  const client = new MongoClient(config.mongoUri, config.mongodb);
  await client.connect();
  const db = client.db(config.database);

  const migrationService = new MigrationService(db);

  // Register all migrations
  migrationService.registerMigration(migration001);
  // ... register other migrations

  const command = process.argv[2];

  switch (command) {
    case 'up':
      await migrationService.migrate();
      break;
    case 'down':
      const version = Number.parseInt(process.argv[3]);
      if (Number.isNaN(version)) {
        console.error('Please provide target version');
        process.exit(1);
      }
      await migrationService.rollback(version);
      break;
    case 'status':
      const current = await migrationService.getCurrentVersion();
      const applied = await migrationService.getAppliedMigrations();
      console.log(`Current version: ${current}`);
      console.log('Applied migrations:');
      for (const m of applied) {
        console.log(`  ${m.version} - ${m.name} (${m.appliedAt})`);
      }
      break;
    default:
      console.log('Usage: npm run migrate [up|down <version>|status]');
  }

  await client.close();
}
```

**Criterios de Aceptación:**
- [ ] Framework de migraciones implementado
- [ ] Collection _migrations para tracking
- [ ] Scripts de up/down/status
- [ ] Al menos 1 migración de ejemplo
- [ ] Tests de migraciones
- [ ] Integración en startup (opcional)
- [ ] Documentación de cómo crear migraciones
- [ ] CI/CD actualizado para correr migraciones

---

#### **Ticket #022: Automatizar Backups con Encriptación**
**Branch:** `feat/automated-encrypted-backups`
**Prioridad:** 🟡 BAJA
**Esfuerzo:** 1 día
**Tipo:** Data Management

**Descripción:**
Los backups son manuales y sin encriptar. Necesitamos backups automáticos, encriptados y almacenados off-site.

**Archivos Afectados:**
- `scripts/backup-database.ts`
- `scripts/restore-database.ts` (nuevo)
- `.github/workflows/backup.yml` (nuevo)
- `src/services/backup.service.ts` (nuevo)

**Solución Propuesta:**
```typescript
// src/services/backup.service.ts
import crypto from 'crypto';
import fs from 'fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class BackupService {
  private s3Client: S3Client;

  constructor(
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.MetricsService) private metricsService: IMetricsService
  ) {
    this.s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
  }

  async createBackup(): Promise<string> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `bcv-backup-${timestamp}.json`;

    try {
      log.info('Creating database backup', { filename });

      // Export data
      const collection = this.cacheService.getCollection('rates');
      const rates = await collection.find({}).toArray();

      const backupData = {
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version,
        collectionCount: rates.length,
        data: rates,
      };

      const jsonData = JSON.stringify(backupData, null, 2);

      // Encrypt
      const encryptedData = this.encrypt(jsonData);

      // Calculate checksum
      const checksum = crypto
        .createHash('sha256')
        .update(jsonData)
        .digest('hex');

      // Save locally
      const localPath = `backups/${filename}`;
      await fs.writeFile(localPath, encryptedData);
      await fs.writeFile(`${localPath}.sha256`, checksum);

      // Upload to S3
      if (config.aws.backupBucket) {
        await this.uploadToS3(filename, encryptedData, checksum);
      }

      const duration = Date.now() - startTime;
      log.info('Backup created successfully', {
        filename,
        size: encryptedData.length,
        duration,
        checksum,
      });

      this.metricsService.recordBackupCreated(duration, encryptedData.length);

      return filename;
    } catch (error) {
      log.error('Backup failed', { error });
      this.metricsService.recordBackupFailed();
      throw error;
    }
  }

  async restoreBackup(filename: string): Promise<void> {
    log.info('Restoring backup', { filename });

    try {
      // Read and decrypt
      const encryptedData = await fs.readFile(`backups/${filename}`);
      const decryptedData = this.decrypt(encryptedData);

      // Verify checksum
      const checksumFile = await fs.readFile(`backups/${filename}.sha256`, 'utf8');
      const calculatedChecksum = crypto
        .createHash('sha256')
        .update(decryptedData)
        .digest('hex');

      if (checksumFile.trim() !== calculatedChecksum) {
        throw new Error('Checksum verification failed');
      }

      // Parse and restore
      const backup = JSON.parse(decryptedData);

      log.info('Backup verified', {
        timestamp: backup.timestamp,
        version: backup.version,
        count: backup.collectionCount,
      });

      // Restore to database
      const collection = this.cacheService.getCollection('rates');

      // Create backup of current data before restore
      await this.createBackup();

      // Clear and restore
      await collection.deleteMany({});
      if (backup.data.length > 0) {
        await collection.insertMany(backup.data);
      }

      log.info('Backup restored successfully', {
        restoredCount: backup.data.length,
      });
    } catch (error) {
      log.error('Restore failed', { error });
      throw error;
    }
  }

  private encrypt(data: string): Buffer {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(config.backupEncryptionKey, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Prepend IV and auth tag to encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private decrypt(encryptedData: Buffer): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(config.backupEncryptionKey, 'hex');

    // Extract IV, auth tag, and encrypted data
    const iv = encryptedData.subarray(0, 16);
    const authTag = encryptedData.subarray(16, 32);
    const encrypted = encryptedData.subarray(32);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  private async uploadToS3(
    filename: string,
    data: Buffer,
    checksum: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: config.aws.backupBucket,
      Key: `backups/${filename}`,
      Body: data,
      ServerSideEncryption: 'AES256',
      Metadata: {
        checksum,
        version: process.env.npm_package_version || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);
    log.info('Backup uploaded to S3', { filename });
  }
}

// .github/workflows/backup.yml
name: Automated Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Create backup
        run: pnpm backup:database
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          BACKUP_ENCRYPTION_KEY: ${{ secrets.BACKUP_ENCRYPTION_KEY }}

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Database backup failed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Criterios de Aceptación:**
- [ ] Servicio de backup con encriptación
- [ ] Script de restore implementado
- [ ] Upload a S3 automático
- [ ] Verificación de checksum
- [ ] GitHub Action para backup diario
- [ ] Notificaciones en caso de fallo
- [ ] Tests de backup/restore
- [ ] Documentación de disaster recovery

---

#### **Ticket #023: Validación de Webhook URLs**
**Branch:** `feat/webhook-url-validation`
**Prioridad:** 🟡 BAJA
**Esfuerzo:** 1 hora
**Tipo:** Security

**Descripción:**
Los webhooks aceptan cualquier URL sin validación, permitiendo potenciales misconfigurations o ataques SSRF.

**Archivos Afectados:**
- `src/services/webhook.service.ts`
- `src/services/discord-status.service.ts`
- `src/services/discord-deployment.service.ts`

**Solución Propuesta:**
```typescript
// src/utils/webhook-validator.ts
export class WebhookValidator {
  private static readonly DISCORD_WEBHOOK_PATTERN =
    /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;

  private static readonly ALLOWED_PROTOCOLS = ['https:'];

  private static readonly BLOCKED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254', // AWS metadata endpoint
    '::1',
  ];

  static validateDiscordWebhook(url: string): void {
    if (!this.DISCORD_WEBHOOK_PATTERN.test(url)) {
      throw new Error(
        'Invalid Discord webhook URL format. ' +
        'Expected: https://discord.com/api/webhooks/{id}/{token}'
      );
    }
  }

  static validateGenericWebhook(url: string): void {
    try {
      const parsed = new URL(url);

      // Check protocol
      if (!this.ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        throw new Error(
          `Invalid protocol: ${parsed.protocol}. Only HTTPS is allowed.`
        );
      }

      // Check for blocked hosts (SSRF protection)
      const hostname = parsed.hostname.toLowerCase();
      if (this.BLOCKED_HOSTS.some(blocked => hostname.includes(blocked))) {
        throw new Error(
          `Blocked hostname: ${parsed.hostname}. ` +
          'Internal/localhost URLs are not allowed.'
        );
      }

      // Check for private IP ranges (basic check)
      if (this.isPrivateIP(parsed.hostname)) {
        throw new Error(
          `Private IP address not allowed: ${parsed.hostname}`
        );
      }

    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid URL format: ${url}`);
      }
      throw error;
    }
  }

  private static isPrivateIP(hostname: string): boolean {
    // Check for private IPv4 ranges
    const privateIPv4Patterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
    ];

    return privateIPv4Patterns.some(pattern => pattern.test(hostname));
  }
}

// Actualizar DiscordStatusService
export class DiscordStatusService implements IDiscordStatusService {
  constructor() {
    this.webhookUrl = config.serviceStatusWebhookUrl || '';
    this.enabled = !!this.webhookUrl;

    if (this.enabled) {
      try {
        WebhookValidator.validateDiscordWebhook(this.webhookUrl);
        logger.info('Discord status webhook validated and enabled');
      } catch (error) {
        logger.error('Invalid Discord webhook URL', { error });
        this.enabled = false;
      }
    } else {
      logger.warn('Discord status webhook not configured');
    }
  }
}

// Actualizar WebhookService
async sendWebhook(url: string, payload: unknown): Promise<void> {
  try {
    WebhookValidator.validateGenericWebhook(url);
    // ... rest of send logic
  } catch (error) {
    log.error('Webhook URL validation failed', { url, error });
    throw error;
  }
}
```

**Criterios de Aceptación:**
- [ ] Validador de URLs creado
- [ ] Validación de Discord webhooks
- [ ] Validación de webhooks genéricos
- [ ] Protección contra SSRF
- [ ] Bloqueo de IPs privadas
- [ ] Solo HTTPS permitido
- [ ] Tests de validación
- [ ] Documentación de URLs permitidas

---

#### **Ticket #024: Configurar Dependabot**
**Branch:** `chore/setup-dependabot`
**Prioridad:** 🟡 BAJA
**Esfuerzo:** 10 minutos
**Tipo:** Maintenance

**Descripción:**
No hay actualización automática de dependencias, requiriendo revisión manual semanal.

**Archivos Afectados:**
- `.github/dependabot.yml` (nuevo)

**Solución Propuesta:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "bcv-team"
    assignees:
      - "bcv-team"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"
    labels:
      - "dependencies"
      - "automated"
    ignore:
      # Ignore major version updates for now
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
    groups:
      # Group dev dependencies together
      dev-dependencies:
        patterns:
          - "@types/*"
          - "@vitest/*"
          - "vitest"
          - "typescript"
          - "@biomejs/*"
        update-types:
          - "minor"
          - "patch"

      # Group testing dependencies
      testing:
        patterns:
          - "*test*"
          - "*mock*"
        update-types:
          - "minor"
          - "patch"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "chore(ci)"
    labels:
      - "ci"
      - "automated"

  # Docker
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "chore(docker)"
    labels:
      - "docker"
      - "automated"
```

**Criterios de Aceptación:**
- [ ] dependabot.yml configurado
- [ ] Updates semanales los lunes
- [ ] Máximo 5 PRs abiertos
- [ ] Grouping de dependencias relacionadas
- [ ] Ignora major version updates
- [ ] Labels apropiados
- [ ] Reviewers asignados
- [ ] Documentación de proceso

---

#### **Ticket #025: Build Multi-Stage para Docker**
**Branch:** `perf/multi-stage-docker-build`
**Prioridad:** 🟡 BAJA
**Esfuerzo:** 1 hora
**Tipo:** Performance

**Descripción:**
El Dockerfile actual incluye dev dependencies en la imagen final, resultando en imágenes ~60% más grandes de lo necesario.

**Archivos Afectados:**
- `Dockerfile`
- `.dockerignore` (nuevo)

**Solución Propuesta:**
```dockerfile
# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production stage
FROM node:24-alpine

# Install system dependencies
RUN apk add --no-cache ca-certificates wget && \
    npm install -g pnpm

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install ONLY production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Change to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/app.js"]
```

```dockerignore
# .dockerignore
node_modules
dist
coverage
.coverage
.git
.github
.vscode
.env
.env.*
*.log
*.md
!README.md
test
tests
**/*.test.ts
**/*.spec.ts
.eslintrc.*
.prettierrc.*
vitest.config.ts
tsconfig.json
backups
scripts
load-tests
docker-compose*.yml
Dockerfile
.dockerignore
```

**Criterios de Aceptación:**
- [ ] Multi-stage build implementado
- [ ] Builder stage con todas las deps
- [ ] Production stage solo con deps de prod
- [ ] .dockerignore creado
- [ ] Usuario no-root configurado
- [ ] Health check funciona
- [ ] Imagen resultante 60% más pequeña
- [ ] Tests de imagen pasan
- [ ] Documentación actualizada

---

## Resumen de Prioridades

### Crítico (1 ticket - 1 hora)
1. CI Automated Tests (#002) - 1 hora

### Alta Prioridad (7 tickets - 6-7 días)
3. Per-Key Rate Limiting (#003) - 1 día
4. Regex Injection Fix (#004) - 30 min
5. Dependency Audit CI (#005) - 15 min
6. Config Validation Zod (#006) - 1 día
7. Standardize Error Responses (#007) - 4 horas
8. Request ID Tracing (#008) - 2 horas
9. Docker Non-Root (#009) - 15 min

### Media Prioridad (9 tickets - 9-11 días)
10. Integration Tests (#010) - 2 días
11. MongoDB Projections (#011) - 2 horas
12. Distributed Locking (#012) - 1 día
13. Performance Metrics (#013) - 4 horas
14. Circuit Breaker (#014) - 4 horas
15. MongoDB Schema Validation (#015) - 2 horas
16. Scheduler Health Check (#016) - 2 horas
17. CI Linting (#017) - 30 min
18. Increase Coverage (#018) - 3-4 días

### Baja Prioridad (7 tickets - 9-12 días)
19. Sentry Integration (#019) - 1 día
20. Log Aggregation (#020) - 2-3 días
21. Database Migrations (#021) - 3-4 días
22. Automated Backups (#022) - 1 día
23. Webhook Validation (#023) - 1 hora
24. Dependabot Setup (#024) - 10 min
25. Multi-Stage Docker (#025) - 1 hora

---

## Estrategia de Implementación Recomendada

### Sprint 1 (Semana 1) - Seguridad y CI/CD
- Tickets #002, #004, #005, #009
- **Objetivo:** Habilitar CI/CD y resolver vulnerabilidades de seguridad

### Sprint 2 (Semana 2) - API & Config
- Tickets #003, #006, #007, #008
- **Objetivo:** Mejorar robustez de API y configuración

### Sprint 3 (Semana 3) - Performance & Testing
- Tickets #010, #011, #012, #013
- **Objetivo:** Optimizar performance y coverage de tests

### Sprint 4 (Semana 4) - Observability
- Tickets #014, #015, #016, #017, #018
- **Objetivo:** Completar sistema de monitoreo

### Mes 2 - Infraestructura
- Tickets #019-#025
- **Objetivo:** Mejorar tooling y procesos

---

## Métricas de Éxito

Al completar todas las mejoras:

- ✅ **Seguridad:** 0 vulnerabilidades críticas, score 8.5/10
- ✅ **Performance:** P95 response time < 200ms
- ✅ **Testing:** Coverage > 70%
- ✅ **Observability:** Logs centralizados, APM integrado
- ✅ **DevOps:** CI/CD completo con tests automáticos
- ✅ **Escalabilidad:** Horizontal scaling habilitado
- ✅ **Calificación General:** A (Excelente)

**Nota sobre SSL:** El SSL deshabilitado es una limitación conocida debido a problemas de certificado en el sitio web del BCV. Esta configuración se mantiene intencionalmente para permitir el scraping.
