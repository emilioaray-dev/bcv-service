# Redis Caching - Guía de Implementación

## Objetivo

Implementar Redis como sistema de caché externo para mantener el microservicio BCV **stateless** (sin estado interno), permitiendo escalabilidad horizontal y mejor rendimiento.

---

## Arquitectura Stateless

### Por qué Stateless?

1. **Escalabilidad Horizontal**: Múltiples instancias del servicio pueden correr simultáneamente
2. **Load Balancing**: Distribuir tráfico entre instancias sin preocupación de sesiones
3. **Fault Tolerance**: Si una instancia falla, otras continúan funcionando
4. **Zero Downtime Deployments**: Actualizar instancias sin interrumpir el servicio

### Diseño

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
└─────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │  BCV SVC  │    │  BCV SVC  │    │  BCV SVC  │
    │ Instance1 │    │ Instance2 │    │ Instance3 │
    │ STATELESS │    │ STATELESS │    │ STATELESS │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                 │
          └────────────────┼─────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐   ┌─────▼─────┐
    │   Redis   │    │  MongoDB  │   │  Discord  │
    │  (Cache)  │    │   (DB)    │   │ (Webhook) │
    └───────────┘    └───────────┘   └───────────┘
```

---

## Implementación con Docker Compose

### 1. Estructura del docker-compose.yml

```yaml
version: '3.8'

services:
  # Servicio BCV (stateless)
  bcv-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/bcv
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - CACHE_TTL_LATEST=300  # 5 minutos
      - CACHE_TTL_HISTORY=86400  # 24 horas
    depends_on:
      - redis
      - mongo
    restart: unless-stopped
    deploy:
      replicas: 3  # Múltiples instancias stateless

  # Redis - Caché compartido
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MongoDB - Base de datos
  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

volumes:
  redis-data:
  mongo-data:
```

### 2. Variables de Entorno (.env)

```bash
# Redis Configuration
REDIS_HOST=localhost  # "redis" en Docker Compose
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password_here
REDIS_DB=0

# Cache TTL Configuration (en segundos)
CACHE_TTL_LATEST=300       # 5 minutos para última tasa
CACHE_TTL_HISTORY=86400    # 24 horas para tasas históricas
CACHE_ENABLED=true         # Habilitar/deshabilitar cache

# Redis Connection Pool
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000     # ms
REDIS_CONNECT_TIMEOUT=10000  # ms
```

---

## Implementación del Servicio Redis

### 3. Dependencias

```bash
pnpm add ioredis
pnpm add -D @types/ioredis
```

### 4. Estructura de Archivos

```
src/
├── services/
│   ├── redis.service.ts       # Servicio de Redis
│   └── cache.interface.ts     # Interface de caché
├── interfaces/
│   └── IRedisService.ts       # Interface de Redis
└── config/
    └── redis.config.ts        # Configuración de Redis
```

### 5. Interface IRedisService

```typescript
// src/interfaces/IRedisService.ts
export interface IRedisService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Cache operations
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;

  // Health check
  ping(): Promise<boolean>;
}
```

### 6. Configuración de Redis

```typescript
// src/config/redis.config.ts
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB) || 0,

  // Connection pool
  maxRetriesPerRequest: Number(process.env.REDIS_MAX_RETRIES) || 3,
  retryStrategy: (times: number) => {
    const delay = Number(process.env.REDIS_RETRY_DELAY) || 1000;
    return Math.min(times * delay, 3000);
  },

  // Timeouts
  connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000,

  // Cache TTLs
  cacheTTL: {
    latest: Number(process.env.CACHE_TTL_LATEST) || 300,
    history: Number(process.env.CACHE_TTL_HISTORY) || 86400,
  },
};
```

---

## Patrones de Cache

### 7. Cache Keys

```typescript
// Namespace para evitar colisiones
const CACHE_PREFIX = 'bcv';

// Keys patterns
export const CacheKeys = {
  // Última tasa: bcv:latest_rate
  LATEST_RATE: `${CACHE_PREFIX}:latest_rate`,

  // Tasa por fecha: bcv:history:2024-01-15
  HISTORY_BY_DATE: (date: string) => `${CACHE_PREFIX}:history:${date}`,

  // Todas las tasas: bcv:all_rates
  ALL_RATES: `${CACHE_PREFIX}:all_rates`,

  // Moneda específica: bcv:currency:USD
  CURRENCY: (currency: string) => `${CACHE_PREFIX}:currency:${currency}`,
};
```

### 8. Cache Strategy: Cache-Aside Pattern

```typescript
// Patrón Cache-Aside (Lazy Loading)
async function getLatestRate(): Promise<Rate | null> {
  // 1. Intentar leer del cache
  const cached = await redisService.get<Rate>(CacheKeys.LATEST_RATE);
  if (cached) {
    logger.debug('Cache hit: latest_rate');
    return cached;
  }

  // 2. Cache miss - consultar MongoDB
  logger.debug('Cache miss: latest_rate');
  const rate = await mongoService.getLatestRate();

  // 3. Guardar en cache para próximas consultas
  if (rate) {
    await redisService.set(
      CacheKeys.LATEST_RATE,
      rate,
      redisConfig.cacheTTL.latest
    );
  }

  return rate;
}
```

### 9. Cache Invalidation

```typescript
// Invalidar cache cuando se actualiza la tasa
async function updateRate(rate: Rate): Promise<void> {
  // 1. Guardar en MongoDB
  await mongoService.saveRate(rate);

  // 2. Invalidar cache de última tasa
  await redisService.del(CacheKeys.LATEST_RATE);

  // 3. Actualizar cache con nueva tasa
  await redisService.set(
    CacheKeys.LATEST_RATE,
    rate,
    redisConfig.cacheTTL.latest
  );

  // 4. Invalidar cache de fecha específica si existe
  const dateKey = CacheKeys.HISTORY_BY_DATE(rate.date);
  await redisService.del(dateKey);

  logger.info('Cache invalidated and updated with new rate');
}
```

---

## Health Checks

### 10. Redis Health Check

```typescript
// src/services/health-check.service.ts
async function checkRedis(): Promise<HealthStatus> {
  try {
    const isConnected = await redisService.ping();

    if (!isConnected) {
      return {
        status: 'unhealthy',
        message: 'Redis connection failed',
      };
    }

    // Test write/read
    const testKey = 'health:check';
    await redisService.set(testKey, 'ok', 10);
    const testValue = await redisService.get(testKey);
    await redisService.del(testKey);

    if (testValue !== 'ok') {
      return {
        status: 'degraded',
        message: 'Redis read/write test failed',
      };
    }

    return {
      status: 'healthy',
      message: 'Redis is operational',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Redis error: ${error.message}`,
    };
  }
}
```

---

## Monitoring y Métricas

### 11. Prometheus Metrics para Cache

```typescript
import { Counter, Gauge, Histogram } from 'prom-client';

// Cache hit/miss ratio
const cacheHits = new Counter({
  name: 'bcv_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['key_pattern'],
});

const cacheMisses = new Counter({
  name: 'bcv_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['key_pattern'],
});

// Cache operation duration
const cacheOpDuration = new Histogram({
  name: 'bcv_cache_operation_duration_seconds',
  help: 'Duration of cache operations',
  labelNames: ['operation', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Redis connection status
const redisConnected = new Gauge({
  name: 'bcv_redis_connected',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
});
```

---

## Testing

### 12. Unit Tests para Redis Service

```typescript
// test/unit/services/redis.service.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedisService } from '@/services/redis.service';

describe('RedisService', () => {
  let redisService: RedisService;

  beforeEach(async () => {
    redisService = new RedisService();
    await redisService.connect();
  });

  afterEach(async () => {
    await redisService.disconnect();
  });

  it('should connect to Redis', async () => {
    expect(redisService.isConnected()).toBe(true);
  });

  it('should set and get values', async () => {
    await redisService.set('test:key', { value: 'test' }, 60);
    const result = await redisService.get('test:key');
    expect(result).toEqual({ value: 'test' });
  });

  it('should delete keys', async () => {
    await redisService.set('test:key', 'value', 60);
    await redisService.del('test:key');
    const exists = await redisService.exists('test:key');
    expect(exists).toBe(false);
  });

  it('should handle TTL expiration', async () => {
    await redisService.set('test:ttl', 'value', 1);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const result = await redisService.get('test:ttl');
    expect(result).toBeNull();
  });
});
```

---

## Deployment

### 13. Producción con Redis Sentinel (Alta Disponibilidad)

Para producción, considerar Redis Sentinel para alta disponibilidad:

```yaml
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf

  redis-sentinel-2:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf

  redis-sentinel-3:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
```

### 14. Consideraciones de Seguridad

1. **Password fuerte**: Usar `REDIS_PASSWORD` complejo
2. **Network isolation**: Redis solo accesible dentro de la red Docker
3. **TLS/SSL**: Habilitar en producción
4. **Comandos peligrosos**: Deshabilitar `FLUSHALL`, `FLUSHDB`, etc.

---

## Resumen

✅ **Arquitectura Stateless**: Todas las instancias del servicio son idénticas
✅ **Caché Externo**: Redis maneja el estado compartido
✅ **Escalabilidad**: Horizontal scaling fácil (agregar más instancias)
✅ **Performance**: Reducción de carga en MongoDB
✅ **Health Checks**: Monitoreo de Redis incluido
✅ **Metrics**: Prometheus metrics para cache hit/miss

## Próximos Pasos

1. Implementar `RedisService` con `ioredis`
2. Crear `docker-compose.yml` con Redis
3. Integrar cache en `BCVService`
4. Agregar health checks de Redis
5. Implementar métricas de cache
6. Documentar deployment con Redis
