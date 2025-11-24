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
5. **Consistencia de Estado**: Sistema persistente de notificaciones que sobrevive a reinicios

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
      - REDIS_URL=redis://redis:6379
      - CACHE_ENABLED=true
      - CACHE_TTL_LATEST=300  # 5 minutos
      - CACHE_TTL_HISTORY=86400  # 24 horas
      - NODE_ENV=production
      - SAVE_TO_DATABASE=true
    depends_on:
      - redis
      - mongo
    restart: unless-stopped
    deploy:
      replicas: 3  # Múltiples instancias stateless

  # Redis - Caché compartido para estado persistente de notificaciones
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MongoDB - Base de datos persistente
  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGODB_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_ROOT_PASSWORD}
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
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost  # "redis" en Docker Compose
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password_here
REDIS_DB=0

# Cache Configuration
CACHE_ENABLED=true         # Habilitar/deshabilitar cache
CACHE_TTL_LATEST=300       # 5 minutos para última tasa
CACHE_TTL_HISTORY=86400    # 24 horas para tasas históricas
CACHE_TTL_NOTIFICATIONS=3600 # 1 hora para estado de notificaciones

# Redis Connection Pool
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000     # ms
REDIS_CONNECT_TIMEOUT=10000  # ms
REDIS_MAX_CONNECTIONS=20
REDIS_MIN_CONNECTIONS=5

# MongoDB Configuration
MONGODB_URI=mongodb://bcv_user:bcv4r4y4r4y@192.168.11.185:27017/bcv?authSource=admin
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_MAX_IDLE_TIME_MS=60000
MONGODB_CONNECT_TIMEOUT_MS=10000
MONGODB_SOCKET_TIMEOUT_MS=45000
MONGODB_RETRY_WRITES=true
MONGODB_RETRY_READS=true
```

---

## Implementación del Servicio Redis

### 3. Dependencias ya instaladas

```bash
# Ya instaladas en el proyecto
pnpm add ioredis
pnpm add -D @types/ioredis
```

### 4. Estructura de Archivos

```
src/
├── services/
│   ├── redis.service.ts       # Servicio de Redis
│   ├── mongo.service.ts       # Servicio de MongoDB
│   └── notification-state.service.ts  # Servicio de estado persistente
├── interfaces/
│   └── IRedisService.ts       # Interface de Redis
├── config/
│   ├── redis.config.ts        # Configuración de Redis
│   └── inversify.config.ts    # Inversify IoC container
└── utils/
    └── logger.ts              # Logger con Winston
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
  
  // Batch operations
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(pairs: [string, any][]): Promise<void>;

  // Health check
  ping(): Promise<boolean>;
  
  // Pub/Sub
  subcribe(channel: string): Promise<void>;
  publish(channel: string, message: string): Promise<number>;
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
  username: process.env.REDIS_USERNAME,
  
  // Connection pool
  maxRetriesPerRequest: Number(process.env.REDIS_MAX_RETRIES) || 3,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 100,
  retryDelayOnTimeout: 100,
  maxLoadingTimeout: 10000,
  enableReadyCheck: true,
  
  // Timeouts
  connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
  lazyConnect: true,
  
  // Connection pool settings
  max: Number(process.env.REDIS_MAX_CONNECTIONS) || 20,
  min: Number(process.env.REDIS_MIN_CONNECTIONS) || 5,
  
  // Cache TTLs
  cacheTTL: {
    latest: Number(process.env.CACHE_TTL_LATEST) || 300,        // 5 minutos
    history: Number(process.env.CACHE_TTL_HISTORY) || 86400,    // 24 horas
    notifications: Number(process.env.CACHE_TTL_NOTIFICATIONS) || 3600, // 1 hora
  },
};
```

---

## Sistema de Estado Persistente de Notificaciones con Redis

### 7. Cache Keys para Estado de Notificaciones

```typescript
// src/services/notification-state.service.ts
// Namespace para evitar colisiones
const STATE_PREFIX = 'bcv:notifications';

// Keys patterns específicos para estado persistente
export const NotificationStateKeys = {
  // Último estado de notificaciones: bcv:notifications:last_state
  LAST_NOTIFIED_STATE: `${STATE_PREFIX}:last_state`,

  // Última tasa notificada: bcv:notifications:last_rate
  LAST_NOTIFIED_RATE: `${STATE_PREFIX}:last_rate`,

  // Timestamp de última notificación: bcv:notifications:last_timestamp
  LAST_NOTIFICATION_TIMESTAMP: `${STATE_PREFIX}:last_timestamp`,

  // Contador de notificaciones: bcv:notifications:counter
  NOTIFICATION_COUNTER: `${STATE_PREFIX}:counter`,

  // Índice de tasas notificadas (por fecha): bcv:notifications:index:YYYY-MM-DD
  NOTIFICATION_INDEX_BY_DATE: (date: string) => `${STATE_PREFIX}:index:${date}`,
};
```

### 8. Arquitectura Dual-Layer: MongoDB + Redis

```typescript
// Arquitectura de Estado Persistente Dual-Layer
//
// ┌─────────────────┐    ┌─────────────────┐
// │  MongoDB        │    │   Redis         │
// │ (Persistence)   │◄──►│   (Cache)       │
// │ (Primary)       │    │ (Secondary)     │
// │   Storage       │    │   Fast R/W      │
// │   Reliable      │    │   High Perf     │
// └─────────────────┘    └─────────────────┘
//
// 1. MongoDB: Almacenamiento primario y persistente
// 2. Redis: Caché para lectura/escritura rápida
// 3. Fallback: Si Redis falla, el sistema sigue operando con MongoDB

// Implementación en NotificationStateService
async function hasSignificantChangeAndNotify(rateData: BCVRateData): Promise<boolean> {
  // 1. Leer estado desde Redis (cache) primero
  let lastNotifiedState = await this.redisService.get<NotificationState>(
    NotificationStateKeys.LAST_NOTIFIED_STATE
  );

  // 2. Si no está en cache, leer desde MongoDB (fallback)
  if (!lastNotifiedState) {
    lastNotifiedState = await this.getFromMongoDB();
    
    // 3. Si encontramos en MongoDB, actualizar Redis (cache warm-up)
    if (lastNotifiedState) {
      await this.redisService.set(
        NotificationStateKeys.LAST_NOTIFIED_STATE,
        lastNotifiedState,
        redisConfig.cacheTTL.notifications
      );
    }
  }

  // 4. Comparar con estado persistente
  const hasChange = this.hasSignificantChange(lastNotifiedState?.lastNotifiedRate, rateData);

  if (hasChange) {
    // 5. Guardar nuevo estado en ambos sistemas
    const newState = {
      lastNotifiedRate: rateData,
      lastNotificationDate: new Date().toISOString(),
      change: this.calculateChange(lastNotifiedState?.lastNotifiedRate, rateData)
    };

    // 5a. Guardar en MongoDB (persistent storage)
    await this.saveToMongoDB(newState);

    // 5b. Actualizar cache en Redis
    await this.redisService.set(
      NotificationStateKeys.LAST_NOTIFIED_STATE,
      newState,
      redisConfig.cacheTTL.notifications
    );
  }

  return hasChange;
}
```

### 9. Cache Strategy: Read/Write Through Pattern

```typescript
// Patrón Read/Write Through para estado persistente
async function saveNotificationState(state: NotificationState): Promise<void> {
  try {
    // 1. Escribir en MongoDB (almacenamiento primario)
    await this.mongoService.saveNotificationState(state);

    // 2. Escribir en Redis (cache)
    await this.redisService.set(
      NotificationStateKeys.LAST_NOTIFIED_STATE,
      state,
      redisConfig.cacheTTL.notifications
    );

    log.info('Estado de notificaciones actualizado en MongoDB y Redis', {
      date: state.lastNotifiedRate.date,
      rate: state.lastNotifiedRate.rates[0].rate
    });
  } catch (error) {
    // 3. Si Redis falla, continuar solo con MongoDB
    log.warn('Error actualizando cache de Redis, actualizando solo MongoDB', {
      error: error.message
    });

    await this.mongoService.saveNotificationState(state);
  }
}
```

### 10. Gestión de Fallos y Fallback

```typescript
// Manejo de errores y fallback a MongoDB-only
async function readNotificationState(): Promise<NotificationState | null> {
  try {
    // Intentar leer desde Redis
    const cachedState = await this.redisService.get<NotificationState>(
      NotificationStateKeys.LAST_NOTIFIED_STATE
    );

    if (cachedState) {
      return cachedState;
    }

    // Fallback a MongoDB si cache está vacía o falla
    return await this.mongoService.getNotificationState();
  } catch (error) {
    log.warn('Error leyendo de Redis, usando MongoDB solo', {
      error: error.message
    });

    // Retornar estado desde MongoDB
    return await this.mongoService.getNotificationState();
  }
}
```

---

## Implementación Actual en el Proyecto

### 11. Servicio Redis Real

```typescript
// src/services/redis.service.ts
import Redis from 'ioredis';
import { IRedisService } from '@/interfaces/IRedisService';
import { redisConfig } from '@/config/redis.config';
import log from '@/utils/logger';

export class RedisService implements IRedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      lazyConnect: true,
      
      // Timeouts
      connectTimeout: redisConfig.connectTimeout,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      
      // Connection pool
      max: redisConfig.cacheTTL.max,
      min: redisConfig.cacheTTL.min,
    });

    // Event listeners para monitoreo
    this.client.on('connect', () => {
      log.info('Conectado a Redis');
    });

    this.client.on('error', (error) => {
      log.error('Error de conexión a Redis', { error });
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      log.info('Cliente Redis conectado exitosamente');
    } catch (error) {
      log.error('Error conectando a Redis', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    log.info('Cliente Redis desconectado');
  }

  isConnected(): boolean {
    return this.client.status === 'ready';
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await this.client.get(key);
    return result ? JSON.parse(result) : null;
  }

  async set(key: string, value: any, ttl: number = redisConfig.cacheTTL.latest): Promise<void> {
    await this.client.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      log.error('Ping a Redis falló', { error });
      return false;
    }
  }
}
```

### 12. Integración con Inversify

```typescript
// src/config/inversify.config.ts
import { Container } from 'inversify';
import { TYPES } from './types';
import { RedisService } from '@/services/redis.service';
import { IRedisService } from '@/interfaces/IRedisService';
import { NotificationStateService } from '@/services/notification-state.service';
import { INotificationStateService } from '@/interfaces/INotificationStateService';

export function createContainer(): Container {
  const container = new Container();

  // Redis service binding
  container.bind<IRedisService>(TYPES.IRedisService)
    .to(RedisService)
    .inSingletonScope();

  // Notification state service binding (usa Redis como cache)
  container.bind<INotificationStateService>(TYPES.INotificationStateService)
    .to(NotificationStateService)
    .inSingletonScope();

  return container;
}
```

### 13. Integración con BCV Service

```typescript
// src/services/bcv.service.ts
import { inject, injectable } from 'inversify';
import { TYPES } from '@/config/types';
import { INotificationStateService } from '@/interfaces/INotificationStateService';
import { IRedisService } from '@/interfaces/IRedisService';

@injectable()
export class BCVService {
  constructor(
    @inject(TYPES.INotificationStateService)
    private notificationStateService: INotificationStateService,
    
    @inject(TYPES.IRedisService)
    private redisService: IRedisService
  ) {}

  async getCurrentRate(): Promise<BCVRateData | null> {
    // ... scraping lógica ...

    if (rateData) {
      // Verificar cambios usando el estado persistente (MongoDB + Redis)
      const hasSignificantChange = 
        await this.notificationStateService.hasSignificantChangeAndNotify(rateData);

      if (hasSignificantChange) {
        // Enviar notificaciones a través de todos los canales
        await this.sendNotifications(rateData);
      }
    }

    return rateData;
  }
}
```

---

## Health Checks y Monitorización

### 14. Redis Health Check

```typescript
// src/services/health-check.service.ts
async function checkRedis(): Promise<HealthStatus> {
  try {
    const isConnected = await redisService.isConnected();
    const canPing = await redisService.ping();

    if (!isConnected || !canPing) {
      return {
        status: 'unhealthy',
        message: 'Redis connection failed',
      };
    }

    // Test write/read
    const testKey = 'health:test:redis:' + Date.now();
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
      details: {
        connected: isConnected,
        ping: canPing,
        enabled: config.redis.enabled
      }
    };
  } catch (error) {
    log.error('Error checking Redis health', { error });
    return {
      status: 'unhealthy',
      message: `Redis error: ${error.message}`,
    };
  }
}
```

---

## Performance y Beneficios

### 15. Ventajas del Sistema Dual-Layer

1. **Alta Performance**: Lectura/escritura rápida de estado de notificaciones con Redis
2. **Persistencia**: Estado sobrevive a reinicios de servicio con MongoDB
3. **Escalabilidad Horizontal**: Múltiples instancias comparten estado persistente
4. **Tolerancia a Fallos**: Si Redis falla, el sistema sigue operando con MongoDB
5. **Consistencia**: Un solo estado de verdad compartido por todas las instancias
6. **Prevención de Duplicados**: Notificaciones se envían solo una vez por cambio significativo

### 16. Métricas de Performance

```typescript
// src/services/metrics.service.ts - Ejemplo de métricas de Redis
import { Histogram, Gauge } from 'prom-client';

export class MetricsService {
  private redisOperationDuration: Histogram;
  private redisConnections: Gauge;

  constructor() {
    this.redisOperationDuration = new Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Duration of Redis operations',
      labelNames: ['operation', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    this.redisConnections = new Gauge({
      name: 'redis_connected_clients',
      help: 'Number of connected Redis clients',
    });
  }
}
```

---

## Testing

### 17. Tests del Sistema de Estado con Redis

```typescript
// test/unit/services/notification-state.service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationStateService } from '@/services/notification-state.service';
import { RedisService } from '@/services/redis.service';
import { MongoService } from '@/services/mongo.service';

describe('NotificationStateService with Redis', () => {
  let notificationStateService: NotificationStateService;
  let redisService: RedisService;
  let mongoService: MongoService;

  beforeEach(async () => {
    redisService = new RedisService();
    mongoService = new MongoService();
    notificationStateService = new NotificationStateService(redisService, mongoService);
    
    await redisService.connect();
    await mongoService.connect();
  });

  afterEach(async () => {
    await redisService.disconnect();
    await mongoService.disconnect();
  });

  it('should detect significant changes using dual-layer architecture', async () => {
    // Setup: Previous rate
    const previousRate = {
      date: '2025-11-24',
      rates: [{ currency: 'USD', rate: 36.50, name: 'Dólar de los Estados Unidos' }],
    };

    // Save previous state to both systems
    await notificationStateService.saveNotificationState({
      lastNotifiedRate: previousRate,
      lastNotificationDate: new Date().toISOString()
    });

    // Test: Current rate with significant change
    const currentRate = {
      date: '2025-11-24',
      rates: [{ currency: 'USD', rate: 36.55, name: 'Dólar de los Estados Unidos' }], // +0.05 > 0.01 threshold
    };

    const hasChange = await notificationStateService.hasSignificantChangeAndNotify(currentRate);
    expect(hasChange).toBe(true);
  });

  it('should not detect non-significant changes', async () => {
    // Setup: Previous rate
    const previousRate = {
      date: '2025-11-24',
      rates: [{ currency: 'USD', rate: 36.50, name: 'Dólar de los Estados Unidos' }],
    };

    // Save previous state
    await notificationStateService.saveNotificationState({
      lastNotifiedRate: previousRate,
      lastNotificationDate: new Date().toISOString()
    });

    // Test: Current rate with non-significant change
    const currentRate = {
      date: '2025-11-24',
      rates: [{ currency: 'USD', rate: 36.505, name: 'Dólar de los Estados Unidos' }], // +0.005 < 0.01 threshold
    };

    const hasChange = await notificationStateService.hasSignificantChangeAndNotify(currentRate);
    expect(hasChange).toBe(false);
  });
});
```

---

## Deployment y Seguridad

### 18. Docker Compose para Producción

```yaml
version: '3.8'

services:
  bcv-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SAVE_TO_DATABASE=true
      - CACHE_ENABLED=true
      # Redis via secrets
      - REDIS_URL_FILE=/run/secrets/redis_url
      - REDIS_PASSWORD_FILE=/run/secrets/redis_password
      # MongoDB via secrets
      - MONGODB_URI_FILE=/run/secrets/mongodb_uri
      # API Keys via secrets
      - API_KEYS_FILE=/run/secrets/api_keys
    secrets:
      - redis_url
      - redis_password
      - mongodb_uri
      - api_keys
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass-file /run/secrets/redis_password
    volumes:
      - redis-data:/data
      - /run/secrets/redis_password:/run/secrets/redis_password:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

secrets:
  redis_url:
    file: ./secrets/redis_url
  redis_password:
    file: ./secrets/redis_password
  mongodb_uri:
    file: ./secrets/mongodb_uri
  api_keys:
    file: ./secrets/api_keys

volumes:
  redis-data:
```

### 19. Consideraciones de Seguridad

1. **Password fuerte**: Usar `REDIS_PASSWORD` complejo en producción
2. **Network isolation**: Redis solo accesible dentro de la red Docker
3. **TLS/SSL**: Habilitar en producción (Redis TLS/SSL)
4. **Comandos peligrosos**: Deshabilitar comandos potencialmente peligrosos
5. **Docker Secrets**: Usar secrets para credenciales en producción
6. **Firewall**: Restringir acceso a puertos de Redis solo a servicios internos

---

## Resumen

✅ **Arquitectura Stateless**: Todas las instancias del servicio son idénticas  
✅ **Caché Externo**: Redis maneja el estado compartido  
✅ **Escalabilidad**: Horizontal scaling fácil (agregar más instancias)  
✅ **Performance**: Reducción de carga en MongoDB con cache de Redis  
✅ **Estado Persistente**: Sistema dual-layer (MongoDB + Redis) para notificaciones  
✅ **Prevención de Duplicados**: Notificaciones únicas por cada cambio significativo  
✅ **Health Checks**: Monitoreo de Redis incluido  
✅ **Seguridad**: Uso de secrets para credenciales en producción  

## Estado Actual en el Proyecto

El sistema de estado persistente de notificaciones con arquitectura dual-layer (MongoDB + Redis) está completamente implementado y operativo:

- ✅ `NotificationStateService`: Implementación completa con Redis cache
- ✅ `RedisService`: Servicio completo con Inversify integration
- ✅ Sistema de estado persistente previene notificaciones duplicadas
- ✅ Umbral de cambio ≥0.01 para detección de cambios significativos
- ✅ Integración con WebSocket, Discord y Webhook notifications
- ✅ Docker Compose con Redis service
- ✅ Variables de entorno y secrets para Redis
- ✅ Health checks de Redis
- ✅ Logging estructurado para Redis operations
- ✅ Tests unitarios completos

---

## Próximos Pasos

1. ✅ **Implementado**: Sistema dual-layer con Redis cache
2. ✅ **Implementado**: Prevención de notificaciones duplicadas
3. ✅ **Implementado**: Detección de cambios significativos (≥0.01)
4. ⏸️ **Opcional**: Redis Cluster para alta disponibilidad
5. ⏸️ **Opcional**: Redis Sentinel para failover automático
6. ⏸️ **Opcional**: Configuración avanzada de cache TTL por tipo de dato

---

**Última actualización**: 2025-11-24  
**Versión del servicio**: 2.1.0  
**Estado**: ✅ Completamente implementado y operativo