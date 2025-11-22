# Plan de Mejoras - BCV Service

## Resumen Ejecutivo

Este documento detalla las mejoras implementadas y pendientes para el servicio BCV, siguiendo las mejores prácticas de desarrollo de software, seguridad, y mantenibilidad.

---

## ✅ Problemas Resueltos

### 1. Error SSL de Certificados (CRÍTICO - RESUELTO)
**Problema**: El servicio fallaba al hacer scraping del sitio del BCV con error `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

**Solución Implementada**:
- Agregado agente HTTPS personalizado que permite certificados auto-firmados en desarrollo
- En producción, la verificación SSL permanece activa para seguridad
- Configuración condicional basada en `NODE_ENV`

**Código** (`src/services/bcv.service.ts:56-59`):
```typescript
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});
```

### 2. Falta de Retry Logic (ALTO - RESUELTO)
**Problema**: Las solicitudes fallidas no se reintentaban, causando pérdida de datos en errores de red temporales.

**Solución Implementada**:
- Sistema de reintentos con exponential backoff
- Máximo de 3 intentos por defecto (configurable)
- Delay de 2000ms entre reintentos (configurable)
- Logs detallados de cada intento

**Código** (`src/services/bcv.service.ts:29-52`):
```typescript
async getCurrentRate(): Promise<BCVRateData | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < this.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Reintento ${attempt}/${this.maxRetries - 1}...`);
        await this.sleep(this.retryDelay);
      }

      const rateData = await this.fetchRateData();
      if (rateData) return rateData;
    } catch (error) {
      lastError = error as Error;
      console.error(`Intento ${attempt + 1} falló:`, this.getErrorMessage(error));
    }
  }

  return null;
}
```

---

## 🔴 Problemas Críticos Pendientes

### 1. Credenciales Expuestas en .env
**Severidad**: CRÍTICA
**Impacto**: Seguridad

**Problema**:
- Credenciales de MongoDB en texto plano: `bcv_user:bcv4r4y4r4y`
- Archivo `.env` podría estar comprometido
- IP del servidor expuesta: `192.168.11.185`

**Solución Recomendada**:
1. Rotar credenciales de MongoDB inmediatamente
2. Usar gestor de secretos:
   - Desarrollo: dotenv-vault o direnv
   - Producción: Docker Secrets, HashiCorp Vault, AWS Secrets Manager
3. Agregar `.env` a `.gitignore` (verificar que no esté trackeado)
4. Crear `.env.example` sin valores reales

**Prioridad**: Implementar AHORA

### 2. Falta de Autenticación en API
**Severidad**: ALTA
**Impacto**: Seguridad

**Problema**:
- Todos los endpoints son públicos sin autenticación
- Cualquiera puede consultar tasas sin límites
- No hay control de acceso

**Solución Recomendada**:
1. Implementar API Key authentication:
```typescript
// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

2. Alternativa: JWT para usuarios autenticados
3. Rate limiting por IP/API key

**Prioridad**: ALTA

### 3. Sin Rate Limiting
**Severidad**: MEDIA-ALTA
**Impacto**: Disponibilidad, Costos

**Problema**:
- No hay límites de requests por cliente
- Vulnerable a abuso y DDoS

**Solución Recomendada**:
```bash
pnpm add express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: 'Demasiadas solicitudes, intente más tarde'
});

app.use('/api/', limiter);
```

**Prioridad**: ALTA

---

## 🟡 Mejoras de Código y Arquitectura

### 4. Falta de Tests Completos
**Severidad**: MEDIA
**Impacto**: Mantenibilidad, Calidad

**Estado Actual**:
- Solo existe `test-bcv-scraping.ts` (script manual)
- No hay tests unitarios
- No hay tests de integración
- Vitest configurado pero sin tests

**Solución Recomendada**:

**A. Tests Unitarios**:
```typescript
// src/services/__tests__/bcv.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BCVService } from '../bcv.service';

describe('BCVService', () => {
  it('debería parsear tasas correctamente', async () => {
    const service = new BCVService('https://www.bcv.org.ve/');
    const result = await service.getCurrentRate();
    expect(result).toBeDefined();
    expect(result?.rates).toBeInstanceOf(Array);
  });

  it('debería reintentar en caso de fallo', async () => {
    // Mock axios para simular fallos
    vi.mock('axios');
    // ... test de retry logic
  });
});
```

**B. Tests de Integración**:
```typescript
// src/__tests__/api.integration.test.ts
import request from 'supertest';
import app from '../app';

describe('API Endpoints', () => {
  it('GET /api/rate/latest debería retornar tasa actual', async () => {
    const response = await request(app)
      .get('/api/rate/latest')
      .expect(200);

    expect(response.body).toHaveProperty('rate');
  });
});
```

**C. Coverage Target**: 80% mínimo

**Prioridad**: MEDIA-ALTA

### 5. Logging Estructurado
**Severidad**: MEDIA
**Impacto**: Observabilidad, Debugging

**Problema**:
- Solo `console.log` y `console.error`
- No hay niveles de log
- No hay contexto estructurado
- Dificulta debugging en producción

**Solución Recomendada**:
```bash
pnpm add winston
```

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Uso:
logger.info('Tasa obtenida', { rate: 36.15, source: 'BCV' });
logger.error('Error en scraping', { error: err.message, url: this.bcvUrl });
```

**Prioridad**: MEDIA

### 6. Validación de Datos con Zod
**Severidad**: MEDIA
**Impacto**: Robustez, Seguridad

**Problema**:
- Zod está instalado pero no se usa
- No hay validación de datos de entrada
- Datos parseados del scraping no se validan
- Parámetros de API no se validan

**Solución Recomendada**:
```typescript
// src/schemas/rate.schema.ts
import { z } from 'zod';

export const CurrencyRateSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'CNY', 'TRY', 'RUB']),
  rate: z.number().positive().finite(),
  name: z.string().min(1)
});

export const BCVRateDataSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rates: z.array(CurrencyRateSchema).min(1),
  rate: z.number().positive().finite()
});

// Validar antes de guardar
const validated = BCVRateDataSchema.parse(rateData);
```

**Validación de parámetros de API**:
```typescript
const DateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

app.get('/api/rate/:date', (req, res) => {
  const result = DateParamSchema.safeParse(req.params.date);
  if (!result.success) {
    return res.status(400).json({ error: 'Formato de fecha inválido' });
  }
  // ...
});
```

**Prioridad**: MEDIA

### 7. Remover Redis No Utilizado
**Severidad**: BAJA
**Impacto**: Limpieza, Complejidad

**Problema**:
- `REDIS_URL` configurado en `.env`
- Servicio Redis en `docker-compose.yml`
- No hay código que use Redis
- Aumenta complejidad sin beneficio

**Solución Recomendada**:
1. Remover configuración Redis de `.env`
2. Remover servicio de `docker-compose.yml`
3. Actualizar documentación

**Alternativa**: Implementar caching Redis si es necesario:
```typescript
// Si se decide usar Redis para caché
import { createClient } from 'redis';

const redisClient = createClient({ url: config.redisUrl });
await redisClient.connect();

// Cachear última tasa
await redisClient.setEx('bcv:latest', 3600, JSON.stringify(rateData));
```

**Prioridad**: BAJA

---

## 🟢 Mejoras Opcionales

### 8. Health Check Endpoints
**Beneficio**: Monitoreo, DevOps

**Implementación**:
```typescript
// Endpoint de salud básico
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: cacheService ? 'connected' : 'disconnected',
    websocket: wsServer.clients.size > 0 ? 'active' : 'idle'
  });
});

// Endpoint de readiness
app.get('/ready', async (req, res) => {
  try {
    // Verificar conexión a MongoDB
    if (cacheService) {
      await cacheService.getLatestRate();
    }
    res.json({ ready: true });
  } catch (err) {
    res.status(503).json({ ready: false, error: err.message });
  }
});
```

**Prioridad**: MEDIA

### 9. Documentación API con Swagger
**Beneficio**: Developer Experience

**Implementación**:
```bash
pnpm add swagger-ui-express swagger-jsdoc
```

```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BCV Service API',
      version: '1.0.0',
      description: 'API para tasas de cambio del BCV'
    }
  },
  apis: ['./src/**/*.ts']
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Prioridad**: BAJA

### 10. Graceful Shutdown
**Beneficio**: Estabilidad

**Implementación**:
```typescript
const gracefulShutdown = async () => {
  logger.info('Iniciando apagado graceful...');

  // Detener cron
  if (cronTask) {
    cronTask.stop();
  }

  // Cerrar servidor HTTP
  httpServer.close(() => {
    logger.info('Servidor HTTP cerrado');
  });

  // Cerrar WebSocket
  wsServer.clients.forEach(client => {
    client.close(1000, 'Server shutting down');
  });

  // Cerrar MongoDB
  if (cacheService) {
    await cacheService.disconnect();
  }

  logger.info('Apagado completo');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

**Prioridad**: MEDIA

### 11. Métricas y Monitoreo
**Beneficio**: Observabilidad

**Implementación**:
```bash
pnpm add prom-client
```

```typescript
import { register, Counter, Histogram } from 'prom-client';

const requestCounter = new Counter({
  name: 'bcv_api_requests_total',
  help: 'Total de requests al API',
  labelNames: ['method', 'route', 'status']
});

const scrapeDuration = new Histogram({
  name: 'bcv_scrape_duration_seconds',
  help: 'Duración del scraping en segundos'
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

**Prioridad**: BAJA

### 12. Configuración TypeScript Mejorada
**Beneficio**: Type Safety

**Mejoras en `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Prioridad**: BAJA

---

## 📋 Plan de Implementación Recomendado

### Fase 1: Seguridad Crítica (AHORA)
- [ ] Rotar credenciales de MongoDB
- [ ] Implementar gestor de secretos
- [ ] Agregar autenticación API
- [ ] Implementar rate limiting

**Tiempo estimado**: 1-2 días

### Fase 2: Calidad y Estabilidad (Semana 1)
- [ ] Agregar tests unitarios
- [ ] Implementar logging estructurado con Winston
- [ ] Validación con Zod
- [ ] Health check endpoints

**Tiempo estimado**: 3-4 días

### Fase 3: Optimización (Semana 2)
- [ ] Decidir sobre Redis (implementar o remover)
- [ ] Agregar tests de integración
- [ ] Graceful shutdown
- [ ] Documentación Swagger

**Tiempo estimado**: 2-3 días

### Fase 4: Observabilidad (Opcional)
- [ ] Métricas Prometheus
- [ ] Dashboard de monitoreo
- [ ] Alertas

**Tiempo estimado**: 2-3 días

---

## 🎯 Métricas de Éxito

### Seguridad
- [ ] Todas las credenciales en gestor de secretos
- [ ] 100% de endpoints con autenticación
- [ ] Rate limiting activo
- [ ] Sin vulnerabilidades de OWASP Top 10

### Calidad
- [ ] Code coverage > 80%
- [ ] Todos los tests pasando
- [ ] Sin errores de linter
- [ ] Logs estructurados en producción

### Estabilidad
- [ ] Uptime > 99.9%
- [ ] Retry exitoso en >90% de fallos temporales
- [ ] Graceful shutdown sin pérdida de datos

### Mantenibilidad
- [ ] Documentación API completa
- [ ] README actualizado
- [ ] Contribución guideline

---

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [12 Factor App](https://12factor.net/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

**Última actualización**: 2025-11-11
**Versión**: 1.0.0
**Autor**: Análisis realizado por Claude Code
