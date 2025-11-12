# BCV Service - Arquitectura del Sistema

## Tabla de Contenidos

1. [Vista General](#vista-general)
2. [Diagrama de Arquitectura](#diagrama-de-arquitectura)
3. [Componentes del Sistema](#componentes-del-sistema)
4. [Flujo de Datos](#flujo-de-datos)
5. [Patrones de Diseño](#patrones-de-diseño)
6. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
7. [Escalabilidad y Rendimiento](#escalabilidad-y-rendimiento)

---

## Vista General

BCV Service es un microservicio Node.js/TypeScript que implementa una arquitectura SOLID con Inversión de Dependencias (DI) usando Inversify. El sistema obtiene y distribuye tasas de cambio del Banco Central de Venezuela en tiempo real.

### Características Arquitectónicas Principales

- **Arquitectura SOLID**: Implementación completa de los 5 principios SOLID
- **Dependency Injection**: Gestión de dependencias con Inversify IoC container
- **Real-time Communication**: WebSocket bidireccional para actualizaciones en tiempo real
- **Scheduled Jobs**: Cron jobs para actualización periódica de tasas
- **Observability**: Prometheus metrics + Health checks
- **Structured Logging**: Winston para logging estructurado
- **Type Safety**: TypeScript estricto en toda la aplicación

---

## Diagrama de Arquitectura

### Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ REST Clients │  │   WebSocket  │  │  Prometheus  │          │
│  │   (HTTP/S)   │  │   Clients    │  │   Scraper    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Express    │  │  WebSocket   │  │   Swagger    │          │
│  │  REST API    │  │    Server    │  │   UI Docs    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  Middleware: Auth, Rate Limiting, Metrics, Error Handling       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Health    │  │   Metrics    │  │    Routes    │          │
│  │  Controller  │  │  Controller  │  │   Handler    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   BCV Web    │  │  Scheduler   │  │  WebSocket   │          │
│  │   Scraper    │  │   Service    │  │   Service    │          │
│  │   Service    │  │  (Cron Job)  │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │    Cache     │  │   Metrics    │                            │
│  │   Service    │  │   Service    │                            │
│  │  (MongoDB)   │  │ (Prometheus) │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   MongoDB    │  │     HTTP     │  │   Winston    │          │
│  │   Database   │  │    Client    │  │    Logger    │          │
│  │              │  │   (Axios)    │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │    Docker    │  │     Config   │                            │
│  │   Secrets    │  │    Manager   │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### Diagrama de Componentes

```
                    ┌─────────────────────┐
                    │    Application      │
                    │   (Bootstrap)       │
                    └──────────┬──────────┘
                               │
                               │ creates & configures
                               ▼
                    ┌─────────────────────┐
                    │  Inversify IoC      │
                    │    Container        │
                    └──────────┬──────────┘
                               │
                               │ resolves dependencies
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   BCV       │  │  Scheduler  │  │  WebSocket  │
     │  Service    │  │   Service   │  │   Service   │
     └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
            │                │                │
            │ uses           │ uses           │ uses
            ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   Cache     │  │   Metrics   │  │   Logger    │
     │  Service    │  │   Service   │  │   Service   │
     └─────────────┘  └─────────────┘  └─────────────┘
```

---

## Componentes del Sistema

### 1. Application (Bootstrap)

**Responsabilidad**: Inicializar y configurar la aplicación

**Archivo**: `src/Application.ts`

**Funciones**:
- Crear el contenedor IoC de Inversify
- Configurar middleware de Express
- Registrar rutas y controladores
- Iniciar el servidor HTTP y WebSocket
- Gestionar el ciclo de vida de la aplicación
- Implementar graceful shutdown

**Principios SOLID**:
- ✅ **SRP**: Responsabilidad única de bootstrap
- ✅ **DIP**: Depende de abstracciones (interfaces)
- ✅ **OCP**: Abierto a extensión (nuevos servicios)

### 2. BCV Service

**Responsabilidad**: Web scraping de tasas de cambio del BCV

**Archivo**: `src/services/bcv.service.ts`

**Funciones**:
- Realizar scraping del sitio web del BCV
- Parsear HTML y extraer datos de tasas
- Convertir fechas en español a formato ISO
- Implementar reintentos en caso de fallos
- Validar y estructurar datos

**Dependencias**:
- Axios (HTTP client)
- Cheerio (HTML parsing)
- Logger (Winston)

**Métricas**:
- `bcv_scrape_success_total`: Contador de scraping exitoso
- `bcv_scrape_failure_total`: Contador de scraping fallido
- `bcv_latest_rate`: Gauge con la última tasa obtenida

### 3. Scheduler Service

**Responsabilidad**: Ejecutar tareas programadas (cron jobs)

**Archivo**: `src/services/scheduler.service.ts`

**Funciones**:
- Programar actualización periódica de tasas
- Ejecutar jobs según configuración de cron
- Gestionar el estado del scheduler
- Permitir ejecución manual inmediata

**Configuración**:
- `CRON_SCHEDULE`: Expresión cron (default: `*/30 * * * *` - cada 30 min)

### 4. WebSocket Service

**Responsabilidad**: Comunicación bidireccional en tiempo real

**Archivo**: `src/services/websocket.service.ts`

**Funciones**:
- Gestionar conexiones WebSocket
- Broadcast de actualizaciones de tasas
- Mantener registro de clientes conectados
- Implementar heartbeat/ping-pong
- Gestionar desconexiones

**Eventos**:
- `connection`: Cliente conectado
- `rate-update`: Nueva tasa disponible
- `disconnect`: Cliente desconectado

**Métricas**:
- `websocket_clients_connected`: Gauge de clientes conectados

### 5. Cache Service (MongoDB)

**Responsabilidad**: Persistencia de datos históricos

**Archivo**: `src/services/mongo.service.ts`

**Funciones**:
- Conectar a MongoDB
- Guardar tasas históricas
- Consultar última tasa
- Consultar tasas por rango de fechas
- Gestionar índices y optimización

**Configuración**:
- `MONGODB_URI`: URI de conexión (o `MONGODB_URI_FILE` para Docker secrets)
- `SAVE_TO_DATABASE`: Flag para habilitar/deshabilitar persistencia

### 6. Metrics Service

**Responsabilidad**: Recolección y exposición de métricas Prometheus

**Archivo**: `src/services/metrics.service.ts`

**Funciones**:
- Registrar métricas custom
- Middleware para tracking de requests HTTP
- Exponer endpoint `/metrics` para Prometheus
- Recolectar métricas default de Node.js

**Métricas Incluidas**:
- Request counters por endpoint
- Request duration histograms
- WebSocket connections
- BCV scraping success/failure
- Node.js process metrics

### 7. Logger Service

**Responsabilidad**: Logging estructurado y centralizado

**Archivo**: `src/utils/logger.ts`

**Funciones**:
- Logging multi-nivel (error, warn, info, http, debug)
- Formato JSON para producción
- Formato colorizado para desarrollo
- Rotación diaria de archivos
- Retención configurable

**Niveles**:
- `error`: Errores críticos
- `warn`: Advertencias
- `info`: Información general
- `http`: Requests HTTP
- `debug`: Debugging detallado

---

## Flujo de Datos

### Flujo de Actualización de Tasas

```
┌─────────────┐
│   Cron Job  │ triggers every 30 min
│  Scheduler  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ BCV Service │ scrapes bcv.org.ve
│   Scraper   │
└──────┬──────┘
       │
       ├─ SUCCESS ──┐
       │            │
       ▼            ▼
┌─────────────┐  ┌─────────────┐
│   Logger    │  │    Cache    │ saves to MongoDB
│   Service   │  │   Service   │
└─────────────┘  └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │  WebSocket  │ broadcasts to all clients
                 │   Service   │
                 └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │  Connected  │ receive rate-update event
                 │   Clients   │
                 └─────────────┘
```

### Flujo de Request HTTP

```
┌─────────────┐
│   Client    │ HTTP Request
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Express    │
│ Middleware  │
└──────┬──────┘
       │
       ├─ Metrics Middleware (track request)
       ├─ Rate Limiting (check limits)
       ├─ API Key Auth (validate X-API-Key header)
       │
       ▼
┌─────────────┐
│  Route      │ /api/rate/latest
│  Handler    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Cache     │ query MongoDB
│   Service   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Response   │ JSON response
│  (200 OK)   │
└─────────────┘
```

### Flujo de WebSocket

```
┌─────────────┐
│   Client    │ WebSocket Handshake
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  WebSocket  │ upgrade HTTP to WebSocket
│   Server    │
└──────┬──────┘
       │
       ├─ connection event
       │
       ▼
┌─────────────┐
│  WebSocket  │ register client
│   Service   │
└──────┬──────┘
       │
       │ (on rate update)
       │
       ▼
┌─────────────┐
│  Broadcast  │ emit 'rate-update' to all clients
│  to Clients │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Client    │ receives rate-update event
│  (Browser)  │
└─────────────┘
```

---

## Patrones de Diseño

### 1. Dependency Injection (DI)

**Implementación**: Inversify IoC Container

**Beneficios**:
- Bajo acoplamiento entre componentes
- Fácil testing con mocks
- Configuración centralizada de dependencias
- Facilita el cambio de implementaciones

**Ejemplo**:
```typescript
// Container configuration
container.bind<IBCVService>(TYPES.BCVService).to(BCVService);
container.bind<ICacheService>(TYPES.CacheService).to(MongoService);

// Dependency injection in constructor
@injectable()
class SchedulerService {
  constructor(
    @inject(TYPES.BCVService) private bcvService: IBCVService,
    @inject(TYPES.CacheService) private cacheService: ICacheService
  ) {}
}
```

### 2. Repository Pattern

**Implementación**: Cache Service como repository

**Beneficios**:
- Abstracción de la capa de datos
- Fácil cambio de base de datos
- Testing sin base de datos real

**Ejemplo**:
```typescript
interface ICacheService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  saveRate(rateData: RateData): Promise<void>;
  getLatestRate(): Promise<RateData | null>;
}
```

### 3. Singleton Pattern

**Implementación**: Container IoC gestiona instancias únicas

**Servicios Singleton**:
- BCVService
- CacheService
- SchedulerService
- WebSocketService
- MetricsService
- Logger

### 4. Observer Pattern

**Implementación**: WebSocket para broadcast de eventos

**Beneficios**:
- Comunicación desacoplada
- Múltiples clientes pueden suscribirse
- Notificaciones en tiempo real

### 5. Strategy Pattern

**Implementación**: Diferentes estrategias de configuración

**Ejemplo**:
- Docker Secrets vs Environment Variables
- File logging vs Console logging
- Development vs Production mode

---

## Decisiones Arquitectónicas

### ADR-001: Arquitectura SOLID con Inversify

**Fecha**: 2025-01

**Estado**: Aceptado

**Contexto**:
El código original estaba en un solo archivo sin separación de responsabilidades, dificultando el mantenimiento y testing.

**Decisión**:
Implementar arquitectura SOLID con Inversify para Dependency Injection.

**Consecuencias**:
- ✅ Código más mantenible y testeable
- ✅ Bajo acoplamiento entre componentes
- ✅ Facilita extensiones futuras
- ⚠️ Mayor complejidad inicial
- ⚠️ Curva de aprendizaje para nuevos desarrolladores

### ADR-002: Winston para Structured Logging

**Fecha**: 2025-01

**Estado**: Aceptado

**Contexto**:
El logging original usaba `console.log` sin estructura ni niveles.

**Decisión**:
Migrar a Winston con logging estructurado y rotación de archivos.

**Consecuencias**:
- ✅ Logs estructurados en JSON para parsing
- ✅ Rotación automática de archivos
- ✅ Niveles de log configurables
- ✅ Mejor debugging en producción
- ⚠️ Overhead mínimo de rendimiento

### ADR-003: Prometheus para Métricas

**Fecha**: 2025-01

**Estado**: Aceptado

**Contexto**:
No había observabilidad del sistema en producción.

**Decisión**:
Implementar métricas Prometheus y health checks.

**Consecuencias**:
- ✅ Visibilidad completa del sistema
- ✅ Integración con Grafana
- ✅ Alertas automáticas posibles
- ✅ Standard de la industria
- ⚠️ Requiere infraestructura de monitoreo

### ADR-004: MongoDB para Persistencia

**Fecha**: 2025-01

**Estado**: Aceptado

**Contexto**:
Se necesita almacenar tasas históricas para análisis.

**Decisión**:
Usar MongoDB como base de datos principal.

**Consecuencias**:
- ✅ Schema flexible para datos de tasas
- ✅ Alto rendimiento en queries
- ✅ Fácil escalabilidad
- ⚠️ Requiere gestión de MongoDB
- ⚠️ Consumo de recursos adicional

### ADR-005: WebSocket para Real-time

**Fecha**: 2025-01

**Estado**: Aceptado

**Contexto**:
Los clientes necesitan actualizaciones en tiempo real.

**Decisión**:
Implementar WebSocket bidireccional con ws library.

**Consecuencias**:
- ✅ Actualizaciones instantáneas
- ✅ Bajo overhead de red
- ✅ Compatible con Socket.io
- ⚠️ Requiere gestión de conexiones
- ⚠️ Consideraciones de escalabilidad

---

## Escalabilidad y Rendimiento

### Estrategias de Escalabilidad

#### Escalabilidad Horizontal

**Estado Actual**: Stateless con gestión de estado en MongoDB

**Consideraciones**:
- ✅ La aplicación es stateless (excepto WebSocket connections)
- ✅ Múltiples instancias pueden ejecutarse en paralelo
- ⚠️ WebSocket connections están en memoria local
- ⚠️ Necesita sticky sessions o Redis pub/sub para WebSocket

**Solución Futura**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Instance 1  │     │ Instance 2  │     │ Instance 3  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │ pub/sub for WebSocket
                    │   Pub/Sub   │
                    └─────────────┘
```

#### Escalabilidad Vertical

**Límites Actuales**:
- Node.js single-threaded
- WebSocket connections limitadas por memoria
- MongoDB queries optimizadas con índices

**Optimizaciones**:
- Cluster mode de Node.js (futuro)
- Worker threads para tareas CPU-intensive
- Connection pooling en MongoDB

### Métricas de Rendimiento

**Objetivos**:
- Request latency: < 100ms (p95)
- WebSocket message latency: < 50ms
- Scraping duration: < 5s
- Memory usage: < 512MB por instancia

**Monitoreo**:
- Prometheus metrics
- Grafana dashboards
- Health checks cada 30s

### Caching Strategy

**Actual**:
- MongoDB como cache persistente
- TTL no implementado

**Futuro** (Fase 7):
- Redis para cache en memoria
- TTL de 30 minutos
- Invalidación automática
- Fallback a MongoDB

---

## Seguridad

### Autenticación

- API Key authentication via `X-API-Key` header
- Múltiples API keys soportadas
- Modo development sin autenticación

### Rate Limiting

- 100 requests por 15 minutos por IP
- Solo aplica a rutas `/api/*`
- Headers estándar de rate limiting

### Docker Secrets

- Soporte para secretos en archivos
- Variables: `MONGODB_URI_FILE`, `API_KEYS_FILE`
- Fallback a environment variables

### HTTPS

- Recomendado en producción
- Reverse proxy (nginx/Caddy) para TLS termination

---

## Deployment

### Modos de Deployment

1. **Docker Standalone**
   - Single container
   - MongoDB externo
   - Adecuado para desarrollo y staging

2. **Docker Compose**
   - Multi-container (app + MongoDB)
   - Secrets management
   - Adecuado para producción pequeña

3. **Kubernetes** (Futuro)
   - Horizontal autoscaling
   - Rolling updates
   - Health checks integrados
   - Production-ready

### Configuración Requerida

**Mínima**:
- `PORT`: Puerto del servidor
- `MONGODB_URI`: URI de MongoDB (si `SAVE_TO_DATABASE=true`)

**Recomendada Producción**:
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `API_KEYS`: Lista de API keys
- `CRON_SCHEDULE`: Expresión cron personalizada
- Docker secrets para credenciales

---

## Testing

### Estrategia de Testing

- **Unit Tests**: Vitest para todos los servicios
- **Coverage**: > 50% líneas, > 45% funciones
- **Mocking**: Interfaces para fácil mocking
- **CI/CD**: Tests automáticos en cada commit

### Testing de Componentes

| Componente | Coverage | Tests |
|------------|----------|-------|
| BCVService | 98.75% | 13 tests |
| MongoService | 100% | 17 tests |
| WebSocketService | 100% | 8 tests |
| AuthMiddleware | 86.95% | 6 tests |
| Logger | 100% | 11 tests |

---

## Próximas Mejoras

### Fase 5: CI/CD
- GitHub Actions workflows
- Automated testing
- Docker image building

### Fase 7: Performance
- Redis caching layer
- Load testing
- Query optimization

### Fase 8: Advanced Features
- Multi-source rate aggregation
- GraphQL API
- Advanced monitoring
