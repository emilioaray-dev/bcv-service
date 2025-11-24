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

BCV Service es un microservicio Node.js/TypeScript que implementa una arquitectura SOLID con Inversión de Dependencias (DI) usando Inversify. El sistema obtiene y distribuye tasas de cambio del Banco Central de Venezuela en tiempo real, con soporte para notificaciones multi-canal, estado persistente de notificaciones, y arquitectura de seguridad robusta.

### Características Arquitectónicas Principales

- **Arquitectura SOLID**: Implementación completa de los 5 principios SOLID
- **Dependency Injection**: Gestión de dependencias con Inversify IoC container
- **Real-time Communication**: WebSocket bidireccional para actualizaciones en tiempo real
- **Scheduled Jobs**: Cron jobs para actualización periódica de tasas
- **Observability**: Prometheus metrics + Health checks + Webhook notifications
- **Structured Logging**: Winston para logging estructurado
- **Type Safety**: TypeScript estricto en toda la aplicación
- **Multi-channel Notifications**: Soporte para Discord, HTTP Webhooks y WebSocket
- **Persistent Notification State**: Sistema de estado persistente para evitar notificaciones duplicadas
- **Security**: Headers de seguridad (Helmet), compresión de respuestas, rate limiting

---

## Diagrama de Arquitectura

### Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ REST Clients │  │   WebSocket  │  │  Prometheus  │          │
│  │   (HTTP/S)   │  │   Clients    │  │   Scraper    │          │
│  │  (Webhooks)  │  │              │  │              │          │
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
│  Middleware: Auth, Rate Limiting, Security, Compression         │
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
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Cache     │  │   Metrics    │  │   Discord    │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  │  (MongoDB)   │  │ (Prometheus) │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Notification │  │   Webhook    │  │   Redis      │          │
│  │  State       │  │   Service    │  │   Cache      │          │
│  │  Service     │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
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
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Docker    │  │     Config   │  │    Redis     │          │
│  │   Secrets    │  │    Manager   │  │   Server     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
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
                ┌──────────────┼──────────────┬──────────────┐
                ▼              ▼              ▼              ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   BCV       │  │  Scheduler  │  │  WebSocket  │  │  Discord    │
     │  Service    │  │   Service   │  │   Service   │  │   Service   │
     └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
            │                │                │                │
            │ uses           │ uses           │ uses           │ uses
            ▼                ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   Cache     │  │   Metrics   │  │   Logger    │  │ Notification│
     │  Service    │  │   Service   │  │   Service   │  │  State      │
     └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
            │                │                │                │
            │ uses           │ uses           │ uses           │ uses
            ▼                ▼                ▼                ▼
     ┌─────────────┐                                       ┌─────────────┐
     │   Redis     │                                       │   Webhook   │
     │   Cache     │                                       │   Service   │
     │  Service    │                                       │             │
     └─────────────┘                                       └─────────────┘
```

---

## Componentes del Sistema

### 1. Application (Bootstrap)

**Responsabilidad**: Inicializar y configurar la aplicación

**Archivo**: `src/Application.ts`

**Funciones**:
- Crear el contenedor IoC de Inversify
- Configurar middleware de Express (Security Headers, Compression, Rate Limiting, Auth)
- Registrar rutas y controladores
- Iniciar el servidor HTTP y WebSocket
- Gestionar el ciclo de vida de la aplicación
- Implementar graceful shutdown
- Configurar y aplicar security headers con Helmet
- Aplicar compresión de respuestas para mejorar performance

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
- Detectar cambios significativos en tasas
- Enviar notificaciones a servicios de notificación (Discord, Webhook, WebSocket)
- Usar HTTPS agent con certificados ignorados por problemas con cadena de certificados del BCV

**Dependencias**:
- Axios (HTTP client)
- Cheerio (HTML parsing)
- Logger (Winston)
- Discord Service
- Webhook Service
- WebSocket Service
- Notification State Service

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
- Coordinar scraping con BCV Service
- Registrar métricas de ejecución

**Configuración**:
- `CRON_SCHEDULE`: Expresión cron (default: `0 2,10,18 * * *` - cada 8 horas)

### 4. WebSocket Service

**Responsabilidad**: Comunicación bidireccional en tiempo real

**Archivo**: `src/services/websocket.service.ts`

**Funciones**:
- Gestionar conexiones WebSocket
- Broadcast de actualizaciones de tasas
- Mantener registro de clientes conectados
- Implementar heartbeat/ping-pong
- Gestionar desconexiones
- Actualizar métricas de clientes conectados

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
- Implementar modo consola (sin BD) para pruebas

**Configuración**:
- `MONGODB_URI`: URI de conexión (o `MONGODB_URI_FILE` para Docker secrets)
- `SAVE_TO_DATABASE`: Flag para habilitar/deshabilitar persistencia
- Configuración de pool de conexiones MongoDB

### 6. Metrics Service

**Responsabilidad**: Recolección y exposición de métricas Prometheus

**Archivo**: `src/services/metrics.service.ts`

**Funciones**:
- Registrar métricas custom
- Middleware para tracking de requests HTTP
- Exponer endpoint `/metrics` para Prometheus
- Recolectar métricas default de Node.js
- Actualizar métricas de clientes WebSocket
- Registrar métricas de scraping BCV

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
- Logging condicional en desarrollo

**Niveles**:
- `error`: Errores críticos
- `warn`: Advertencias
- `info`: Información general
- `http`: Requests HTTP
- `debug`: Debugging detallado

### 8. Notification State Service

**Responsabilidad**: Gestión persistente del estado de notificaciones

**Archivo**: `src/services/notification-state.service.ts`

**Funciones**:
- Almacenar la última tasa notificada en MongoDB
- Usar Redis como capa de cache para lectura/escritura rápida
- Comparar tasas actuales con la última tasa notificada
- Determinar si hay cambios significativos (umbral absoluto ≥0.01)
- Prevenir notificaciones duplicadas al reiniciar el servicio
- Soportar múltiples monedas (USD, EUR, CNY, TRY, RUB)
- Proporcionar fallback a MongoDB si Redis falla

**Configuración**:
- Soporte para Redis (si `CACHE_ENABLED=true`)
- Persistencia en MongoDB como sistema primario
- TTL configurable para cache (si se implementa en el futuro)

### 9. Discord Service

**Responsabilidad**: Envío de notificaciones a canales de Discord

**Archivo**: `src/services/discord.service.ts`

**Funciones**:
- Enviar notificaciones de cambios de tasas a Discord
- Usar embeds estructurados con información detallada
- Incluir información de cambio (anterior vs actual)
- Soporte para múltiples monedas en una sola notificación
- Formateo apropiado para visualización en Discord

**Configuración**:
- `DISCORD_WEBHOOK_URL`: URL del webhook de Discord
- `DISCORD_WEBHOOK_URL_FILE`: Opción para Docker Secrets

### 10. Webhook Service

**Responsabilidad**: Envío de notificaciones HTTP a endpoints personalizados

**Archivo**: `src/services/webhook.service.ts`

**Funciones**:
- Envío de notificaciones HTTP con firma HMAC-SHA256
- Soporte para diferentes tipos de eventos (rate changes, deployment, service status)
- Reintentos con backoff exponencial
- Medición de tiempo de respuesta y métricas
- Soporte para URLs específicas por tipo de evento
- Manejo de timeouts y errores de conexión

**Configuración**:
- `WEBHOOK_URL`: URL principal para notificaciones
- `WEBHOOK_SECRET`: Clave secreta para firma HMAC
- `SERVICE_STATUS_WEBHOOK_URL`: URL específica para eventos de estado
- `DEPLOYMENT_WEBHOOK_URL`: URL específica para eventos de deployment
- `WEBHOOK_TIMEOUT`: Timeout para requests (default: 5000ms)
- `WEBHOOK_MAX_RETRIES`: Número máximo de reintentos (default: 3)

### 11. Redis Service

**Responsabilidad**: Servicio de cache en memoria y pub/sub

**Archivo**: `src/services/redis.service.ts`

**Funciones**:
- Conexión y desconexión de Redis
- Soporte para cache de notificaciones
- Configuración de timeouts y reintentos
- Integración con el sistema de estado persistente

**Configuración**:
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `REDIS_MAX_RETRIES`, `REDIS_RETRY_DELAY`
- `REDIS_CONNECT_TIMEOUT`
- Habilitación/deshabilitación con `CACHE_ENABLED`

---

## Flujo de Datos

### Flujo de Actualización de Tasas

```
┌─────────────┐
│   Cron Job  │ triggers every 8 hours
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
       │            ▼
       ▼      ┌─────────────┐
┌─────────────┐│Notification │ compares with last notified rate
│   Logger    ││State Service│ (threshold ≥0.01 absolute change)
│   Service   │└──────┬──────┘
└─────────────┘       │
                      │
                      ▼ (if significant change)
              ┌─────────────┐
              │  Discord    │ sends rate update notification
              │   Service   │ to Discord webhook
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │   Webhook   │ sends notification to HTTP endpoints
              │   Service   │ with HMAC signature
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │    Cache    │ saves to MongoDB
              │   Service   │
              └──────┬──────┘
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
│  Express    │ (with Helmet + Compression)
│ Middleware  │
└──────┬──────┘
       │
       ├─ Security Headers (CSP, HSTS, etc.)
       ├─ Compression (gzip/brotli)
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
│   Server    │ (with metrics update)
└──────┬──────┘
       │
       ├─ connection event
       │
       ▼
┌─────────────┐
│  WebSocket  │ register client + update metrics
│   Service   │
└──────┬──────┘
       │
       │ (on rate update)
       │
       ▼
┌─────────────┐
│  Broadcast  │ emit 'rate-update' to all clients
│  to Clients │ (with change information)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Client    │ receives rate-update event
│  (Browser)  │
└─────────────┘
```

### Flujo de Notificaciones con Estado Persistente

```
┌─────────────┐
│   BCV       │ new rates scraped
│  Service    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Notification │ get last notified rate from Redis (fallback to MongoDB)
│State Service│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Notification │ compare current vs last notified (threshold ≥0.01)
│State Service│
└──────┬──────┘
       │
       ├─ SIGNIFICANT CHANGE? ──┐
       │                        ▼
       ▼                  ┌─────────────┐
┌─────────────┐          │  Notification │ sends to Discord, Webhook, WebSocket
│Notification │          │   Services  │
│State Service│          └─────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Notification │ save new state to Redis + MongoDB
│State Service│
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
container.bind<INotificationStateService>(TYPES.NotificationStateService).to(NotificationStateService);

// Dependency injection in constructor
@injectable()
class BCVService {
  constructor(
    @inject(TYPES.DiscordService) private discordService: IDiscordService,
    @inject(TYPES.WebhookService) private webhookService: IWebhookService,
    @inject(TYPES.NotificationStateService) private notificationStateService: INotificationStateService
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
- NotificationStateService
- DiscordService
- WebhookService

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
- MongoDB-only vs Dual-layer (MongoDB + Redis) for notifications

### 6. State Pattern

**Implementación**: Notification State Service con dual-layer architecture

**Beneficios**:
- Persistencia del estado a través de reinicios
- Prevención de notificaciones duplicadas
- Soporte para failover entre Redis y MongoDB

### 7. Chain of Responsibility

**Implementación**: Middleware chain en Express (Security → Compression → Logging → Rate Limiting → Auth)

**Beneficios**:
- Procesamiento modular de requests
- Facilidad para añadir/quitar capas de procesamiento
- Separación de responsabilidades

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

### ADR-008: Sistema Persistente de Estado de Notificaciones

**Fecha**: 2025-11-17

**Estado**: Aceptado

**Contexto**:
El sistema original de notificaciones tenía problemas críticos de duplicación al reiniciar el servicio y falta de persistencia de estado.

**Decisión**:
Implementar un sistema persistente de estado de notificaciones con arquitectura dual-layer (MongoDB primario + Redis cache).

**Consecuencias**:
- ✅ Eliminación de notificaciones duplicadas
- ✅ Consistencia garantizada a través de reinicios
- ✅ Soporte para escalabilidad horizontal
- ✅ Prevención de spam de notificaciones
- ⚠️ Mayor complejidad con dos sistemas de almacenamiento
- ⚠️ Requiere Redis adicional para cache óptimo

### ADR-009: Arquitectura Multi-Canal de Notificaciones

**Fecha**: 2025-11-23

**Estado**: Aceptado

**Contexto**:
El sistema solo soportaba notificaciones a Discord y se necesitaban canales adicionales y tipos de notificaciones.

**Decisión**:
Implementar arquitectura multi-canal con servicios especializados para cada tipo de notificación (Discord, Webhooks HTTP, WebSocket).

**Consecuencias**:
- ✅ Separación de responsabilidades
- ✅ Extensibilidad para nuevos canales
- ✅ Configuración granular por tipo de notificación
- ✅ Seguridad mejorada con firmas HMAC para webhooks
- ⚠️ Mayor cantidad de servicios a mantener
- ⚠️ Configuración más compleja

---

## Escalabilidad y Rendimiento

### Estrategias de Escalabilidad

#### Escalabilidad Horizontal

**Estado Actual**: Stateless con gestión de estado en MongoDB

**Consideraciones**:
- ✅ La aplicación es stateless (excepto WebSocket connections)
- ✅ Múltiples instancias pueden ejecutarse en paralelo
- ✅ Estado de notificaciones persistente en MongoDB (consistente entre instancias)
- ⚠️ WebSocket connections están en memoria local
- ⚠️ Necesita sticky sessions o Redis pub/sub para WebSocket
- ✅ Sistema de notificaciones puede funcionar correctamente con múltiples instancias gracias al estado persistente

**Solución Actual para Notificaciones**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Instance 1  │     │ Instance 2  │     │ Instance 3  │
└─────┬───────┘     └─────┬───────┘     └─────┬───────┘
      │                   │                   │
      │                   │                   │ reads/writes
      │                   │                   ▼
      │         ┌─────────┴─────────┐  ┌──────────────┐
      │         │                   │  │ Notification │
      ▼         │     MongoDB       │  │ State in     │
  WebSocket     │  (Persistent      │  │  MongoDB     │
  Broadcast     │   Storage)        │  │              │
  to local      │                   │  │              │
  clients       └─────────┬─────────┘  └──────────────┘
                          │
                    ┌─────▼─────┐
                    │   Redis   │ (cache layer for
                    │  (Cache)  │  fast reads/writes)
                    └───────────┘
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
- Redis cache para operaciones frecuentes

### Métricas de Rendimiento

**Objetivos**:
- Request latency: < 100ms (p95)
- WebSocket message latency: < 50ms
- Scraping duration: < 15s (con reintentos)
- Memory usage: < 512MB por instancia
- Notification delivery time: < 1s

**Monitoreo**:
- Prometheus metrics
- Grafana dashboards
- Health checks cada 30s
- Métricas de notificaciones (envío exitoso/fracasado)
- Métricas de estado persistente

### Caching Strategy

**Actual**:
- MongoDB como almacenamiento primario persistente
- Redis como capa de cache para operaciones frecuentes (en servicios de notificación)
- TTL no implementado en Redis

**Futuro** (Fase 7):
- Redis para cache de tasas recientes
- TTL configurable para diferentes tipos de datos
- Invalidación automática
- Fallback a MongoDB

---

## Seguridad

### Security Headers (Helmet)

- **Content Security Policy (CSP)**: Restricción de recursos que pueden cargarse
- **HSTS**: Política de seguridad de transporte
- **Referrer Policy**: Política de referrer
- **X-Frame-Options**: Protección contra clickjacking
- **X-Powered-By**: Encabezado removido (oculta tecnología del servidor)
- **Desactivado para Swagger UI**: CSP se desactiva para permitir scripts en Swagger

### Autenticación

- API Key authentication via `X-API-Key` header
- Múltiples API keys soportadas (separadas por coma)
- Modo development sin autenticación para documentación de API

### Rate Limiting

- 100 requests por 15 minutos por IP
- Solo aplica a rutas `/api/*`
- Headers estándar de rate limiting
- Configurable por ambiente

### Compresión de Respuestas

- Middleware de compresión activado
- Nivel 6 de compresión (balance entre CPU y tamaño)
- Activo solo para respuestas > 1KB
- Soporte para gzip, brotli, deflate

### Docker Secrets

- Soporte para secretos en archivos
- Variables: `MONGODB_URI_FILE`, `API_KEYS_FILE`, `DISCORD_WEBHOOK_URL_FILE`, etc.
- Fallback a environment variables
- Prioridad: Docker secrets > Environment variables

### HTTPS

- Recomendado en producción
- Reverse proxy (nginx/Caddy) para TLS termination
- Headers de seguridad configurados para HTTPS

---

## Deployment

### Modos de Deployment

1. **Docker Standalone**
   - Single container
   - MongoDB externo
   - Adecuado para desarrollo y staging

2. **Docker Compose**
   - Multi-container (app + MongoDB + Redis opcional)
   - Secrets management
   - Adecuado para producción pequeña
   - Configuración de Redis opcional para cache de notificaciones

3. **Kubernetes** (Futuro)
   - Horizontal autoscaling
   - Rolling updates
   - Health checks integrados
   - Production-ready

### Configuración Requerida

**Mínima**:
- `PORT`: Puerto del servidor
- `MONGODB_URI`: URI de MongoDB (si `SAVE_TO_DATABASE=true`)
- `API_KEY`: Clave API para autenticación

**Recomendada Producción**:
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `API_KEYS`: Lista de API keys separadas por coma
- `CRON_SCHEDULE`: Expresión cron personalizada (default: `0 2,10,18 * * *`)
- `CACHE_ENABLED=true` para Redis
- `REDIS_URL`: URL de Redis (si se usa cache)
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
| NotificationStateService | 100% | 15 tests |
| WebhookService | 95% | 12 tests |

---

## Próximas Mejoras

### Fase 7: Performance
- Redis caching layer para tasas recientes
- Load testing
- Query optimization
- WebSocket scaling con Redis pub/sub

### Fase 8: Advanced Features
- Multi-source rate aggregation
- GraphQL API
- Advanced monitoring
- Horizontal notification delivery
