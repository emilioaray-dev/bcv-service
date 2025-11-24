# Plan de Desarrollo - Microservicio BCV Tasa de Cambio

## Descripción General

Microservicio en Node.js con TypeScript que consulta periódicamente la tasa oficial de cambio del Banco Central de Venezuela, almacenando los datos localmente y notificando a servicios suscriptores mediante WebSockets, Discord y Webhooks cuando hay cambios. Implementa arquitectura SOLID con Inversify para inyección de dependencias y sigue prácticas de seguridad y observabilidad modernas.

## Objetivos

1. Consultar la tasa de cambio cada 8 horas
2. Almacenar datos en MongoDB con modo consola opcional
3. Notificar mediante WebSockets, Discord y Webhooks a servicios suscriptores
4. Usar Biome para formateo y calidad de código
5. Usar pnpm para gestión de paquetes
6. Crear Dockerfile y docker-compose.yml
7. Diseñar arquitectura SOLID modular y escalable
8. Implementar sistema persistente de estado de notificaciones
9. Proveer observabilidad con Prometheus y health checks
10. Implementar seguridad web con Helmet y rate limiting

## Tecnologías y Herramientas

- **Lenguaje**: TypeScript
- **Runtime**: Node.js
- **Gestor de paquetes**: pnpm
- **Formato y calidad de código**: Biome
- **Base de datos**: MongoDB (con modo consola alternativo)
- **Caché**: Redis opcional para operaciones rápidas de lectura/escritura
- **WebSockets**: ws para comunicación bidireccional
- **Tareas programadas**: node-cron para tareas periódicas
- **Contenedores**: Docker y Docker Compose con soporte para Docker Secrets
- **Inversify**: Inyección de dependencias y arquitectura SOLID
- **Winston**: Logging estructurado con rotación diaria
- **Prometheus**: Métricas de observabilidad
- **Helmet**: Seguridad web con headers CSP, HSTS, etc.
- **Vitest**: Framework de pruebas unitarias

## Estructura de Proyecto

```
bcv-service/
├── src/
│   ├── Application.ts          # Bootstrap de la aplicación con Inversify
│   ├── __tests__/              # Pruebas unitarias e integración
│   ├── config/                 # Configuración de aplicación e Inversify
│   │   ├── inversify.config.ts # Configuración del contenedor IoC
│   │   ├── types.ts           # Tipos para Inversify
│   │   ├── secrets.ts         # Gestión segura de secretos
│   │   └── index.ts           # Configuración general
│   ├── constants/              # Constantes de la aplicación
│   │   └── routes.ts          # Definición de rutas
│   ├── interfaces/             # Interfaces para Inversify (abstracciones)
│   │   ├── IBCVService.ts     # Interfaz para servicio BCV
│   │   ├── IMongoService.ts   # Interfaz para servicio MongoDB
│   │   ├── IRedisService.ts   # Interfaz para servicio Redis
│   │   ├── IWebSocketService.ts # Interfaz para servicio WebSocket
│   │   ├── ISchedulerService.ts # Interfaz para servicio Scheduler
│   │   ├── IHealthCheckService.ts # Interfaz para servicio Health Check
│   │   └── IMetricsService.ts # Interfaz para servicio Métricas
│   ├── services/               # Implementaciones de servicios
│   │   ├── bcv.service.ts     # Servicio de consulta al BCV
│   │   ├── mongo.service.ts   # Servicio de persistencia MongoDB
│   │   ├── redis.service.ts   # Servicio de caché Redis
│   │   ├── websocket.service.ts # Servicio de WebSockets
│   │   ├── scheduler.service.ts # Servicio de tareas programadas
│   │   ├── health-check.service.ts # Servicio de health checks
│   │   ├── metrics.service.ts # Servicio de métricas Prometheus
│   │   ├── notification-state.service.ts # Servicio de estado persistente de notificaciones
│   │   ├── discord.service.ts # Servicio de notificaciones a Discord
│   │   ├── discord-status.service.ts # Servicio de notificaciones de estado a Discord
│   │   ├── discord-deployment.service.ts # Servicio de notificaciones de deployment a Discord
│   │   └── webhook.service.ts # Servicio de notificaciones por Webhook
│   ├── controllers/            # Controladores para la API
│   │   ├── rate.controller.ts # Controlador de endpoints de tasa
│   │   ├── health.controller.ts # Controlador de health checks
│   │   └── metrics.controller.ts # Controlador de métricas
│   ├── middleware/             # Middleware de Express
│   │   └── auth.middleware.ts # Middleware de autenticación API Key
│   ├── models/                 # Modelos de datos
│   │   └── rate.ts            # Modelo de datos de tasas
│   ├── schemas/                # Esquemas de validación con Zod
│   │   └── rate.schema.ts     # Esquema de validación de tasas
│   ├── utils/                  # Utilidades
│   │   ├── logger.ts          # Logger con Winston
│   │   └── routes.ts          # Utilidad para creación de rutas
│   └── app.ts                  # Punto de entrada de la aplicación
├── docs/                       # Documentación
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── public/                     # Recursos estáticos (opcional)
├── scripts/                    # Scripts de utilidad
├── secrets/                    # Directorio para secretos (si se usan)
├── backups/                    # Directorio para backups
├── logs/                       # Directorio para logs
├── .env                        # Variables de entorno
├── .env.example               # Ejemplo de variables de entorno
├── .gitignore
├── biome.json                 # Configuración de Biome
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vitest.config.ts           # Configuración de Vitest
├── README.md
└── tests/                     # Configuración de pruebas
```

## Funcionalidades

### 1. Consulta de Tasa de Cambio

- **Frecuencia**: Cada 8 horas (configurable por CRON_SCHEDULE)
- **Fuente**: Scraping directo del sitio web oficial del BCV (www.bcv.org.ve)
- **Monedas soportadas**: USD, EUR, CNY, TRY, RUB y otras según disponibilidad en BCV
- **Reintentos**: Sistema con exponential backoff para alta disponibilidad
- **Formato de datos**:
  ```json
  {
    "date": "2025-11-24",
    "rates": [
      {
        "currency": "USD",
        "rate": 36.1500,
        "name": "Dólar de los Estados Unidos de América"
      },
      {
        "currency": "EUR",
        "rate": 39.2000,
        "name": "Euro"
      }
    ],
    "source": "bcv",
    "createdAt": "2025-11-24T10:30:00.000Z",
    "updatedAt": "2025-11-24T10:30:00.000Z"
  }
  ```

### 2. Almacenamiento de Datos

- **Persistencia**: MongoDB para almacenamiento de tasas históricas
- **Caché**: Redis opcional para operaciones rápidas de lectura/escritura de estado de notificaciones
- **Modo consola**: Opción para operar sin base de datos (útil para pruebas)
- **Formato de datos con todas las monedas**:
  ```json
  {
    "_id": "ObjectId(...)",
    "date": "2025-11-24",
    "rates": [
      {
        "currency": "USD",
        "rate": 36.1500,
        "name": "Dólar de los Estados Unidos de América"
      },
      {
        "currency": "EUR",
        "rate": 39.2000,
        "name": "Euro"
      },
      {
        "currency": "CNY",
        "rate": 5.0500,
        "name": "Yuan"
      },
      {
        "currency": "TRY",
        "rate": 1.1500,
        "name": "Lira Turca"
      },
      {
        "currency": "RUB",
        "rate": 0.3800,
        "name": "Rublo Ruso"
      }
    ],
    "source": "bcv",
    "createdAt": "2025-11-24T10:30:00.000Z",
    "updatedAt": "2025-11-24T10:30:00.000Z"
  }
  ```

### 3. Sistema de Notificaciones Multi-Canal

#### 3.1 WebSocket
- **Protocolo**: WebSocket usando librería ws (compatible con Socket.io)
- **Eventos**:
  - `rate-update`: cuando hay cambios significativos en las tasas (umbral ≥0.01)
  - `connection`: para nuevos suscriptores
- **Formato de mensaje**:
  ```json
  {
    "timestamp": "2025-11-24T10:30:00.000Z",
    "rates": [
      {
        "currency": "USD",
        "rate": 36.1500,
        "name": "Dólar de los Estados Unidos de América"
      }
    ],
    "change": 0.0050,
    "eventType": "rate-update"
  }
  ```

#### 3.2 Discord
- **Canal**: Webhook de Discord para notificaciones de cambios de tasa
- **Formato**: Embeds estructurados con información detallada
- **Características**: Incluye valores anterior y actual, porcentaje de cambio, fecha de actualización

#### 3.3 Webhooks HTTP
- **Seguridad**: Firmas HMAC-SHA256 para verificar autenticidad
- **Reintentos**: Con exponential backoff para alta disponibilidad
- **Eventos soportados**: rate.updated, rate.changed, service.healthy, service.unhealthy, deployment.success, deployment.failure
- **Configuración**: URLs específicas por tipo de evento (opcional)

### 4. API REST con Autenticación

Endpoints protegidos con API Key authentication:

- `GET /api/rate/latest` - Obtener la tasa más reciente
- `GET /api/rate/history` - Obtener historial de tasas (parámetro `limit` opcional)
- `GET /api/rate/:date` - Obtener tasa para una fecha específica (formato YYYY-MM-DD)
- `GET /healthz` - Health check de liveness (rápido, sin I/O)
- `GET /readyz` - Health check de readiness (conectividad a BD)
- `GET /health` - Health check completo de todos los componentes
- `GET /health/:component` - Health check individual (mongodb, scheduler, websocket, etc.)
- `GET /metrics` - Métricas de Prometheus para monitoreo
- `GET /docs` - Documentación interactiva de la API (Swagger UI)

### 5. Sistema Persistente de Estado de Notificaciones

- **Arquitectura dual-layer**: MongoDB primario + Redis cache opcional
- **Prevención de duplicados**: No se envían notificaciones repetidas al reiniciar el servicio
- **Detección de cambios**: Umbral absoluto ≥0.01 (no porcentual) para determinar cambios significativos
- **Soporte multi-moneda**: Detección de cambios en USD, EUR, CNY, TRY, RUB
- **Tendencias**: Cálculo de porcentaje de cambio y dirección (subida/bajada)

### 6. Seguridad Web

- **Helmet.js**: Headers de seguridad incluyendo CSP, HSTS, X-XSS-Protection
- **Rate Limiting**: 100 requests por 15 minutos por IP (solo para rutas de API)
- **API Key Authentication**: Headers `X-API-Key` para autenticación
- **Compresión de respuestas**: Middleware de compression para mejor performance
- **Docker Secrets**: Soporte para gestión segura de credenciales

### 7. Observabilidad

- **Métricas Prometheus**: Métricas de requests HTTP, WebSocket, BCV scraping, entre otras
- **Health Checks**: 3 niveles estilo Kubernetes (liveness, readiness, full diagnostic)
- **Logging estructurado**: Winston con niveles (error, warn, info, http, debug) y rotación diaria
- **Traceabilidad**: Contexto estructurado en todos los logs para debugging

### 8. Configuración de Tareas Programadas

- **Biblioteca**: node-cron
- **Programación**: Cada 8 horas por defecto (`0 2,10,18 * * *` - 2am, 10am, 6pm)
- **Lógica**:
  - Consultar tasas actuales del BCV
  - Comparar con la última tasa notificada (no almacenada) usando sistema persistente de estado
  - Si hay cambios significativos (≥0.01), enviar notificaciones por todos los canales
  - Almacenar tasas históricas en MongoDB
  - Actualizar estado persistente de notificaciones

## Arquitectura SOLID con Inversify

### Servicios Principales

- **BCVService**: Consulta y scraping de tasas de cambio del BCV
- **MongoService**: Gestión de almacenamiento y recuperación de datos en MongoDB
- **RedisService**: Servicio de caché en memoria para operaciones rápidas
- **WebSocketService**: Gestión de conexiones WebSocket y envío de notificaciones
- **SchedulerService**: Gestión de tareas programadas con node-cron
- **MetricsService**: Implementación de métricas Prometheus
- **HealthCheckService**: Servicio de health checks para monitoreo
- **NotificationStateService**: Sistema persistente de estado de notificaciones con arquitectura dual-layer
- **DiscordService**: Servicio de notificaciones a Discord para cambios de tasa
- **DiscordStatusService**: Servicio de notificaciones de estado del servicio a Discord
- **DiscordDeploymentService**: Servicio de notificaciones de deployment a Discord
- **WebhookService**: Servicio de notificaciones HTTP con firma HMAC-SHA256

### Controladores

- **RateController**: Gestión de endpoints de tasa de cambio
- **HealthController**: Gestión de endpoints de health checks
- **MetricsController**: Gestión del endpoint de métricas Prometheus

### Interfaces (Abstracciones según DIP)

- **IBCVService**: Interfaz para servicio BCV
- **IMongoService**: Interfaz para servicio MongoDB
- **IRedisService**: Interfaz para servicio Redis
- **IWebSocketService**: Interfaz para servicio WebSocket
- **ISchedulerService**: Interfaz para servicio Scheduler
- **IMetricsService**: Interfaz para servicio Métricas
- **IHealthCheckService**: Interfaz para servicio Health Check
- **INotificationStateService**: Interfaz para servicio de estado de notificaciones
- **IDiscordService**: Interfaz para servicio de Discord
- **IWebhookService**: Interfaz para servicio de Webhook

### Inversify Container Configuration

- Configuración centralizada en `src/config/inversify.config.ts`
- Binding de todas las interfaces a sus implementaciones
- Soporte para singleton y scope por instancia
- Integración con decoradores `@injectable()` y `@inject()`

## Dockerización

### Dockerfile

- Base: node:24-alpine para menor tamaño
- Instalación de herramientas necesarias (pnpm, certificados CA)
- Copia de package.json y pnpm-lock.yaml
- Instalación de dependencias con pnpm
- Copia de código fuente y configuración
- Compilación de TypeScript
- Exposición de puerto 3000
- Comando de inicio del servicio compilado

### docker-compose.yml

- Servicio principal de la aplicación
- Soporte opcional para MongoDB
- Soporte opcional para Redis
- Configuración de redes y volumes
- Soporte para Docker Secrets en producción
- Health checks integrados

## Configuración de Biome

- Formateo de código TypeScript/JavaScript
- Reglas de linting modernas y estrictas
- Reglas de complejidad ciclomática
- Reglas de complejidad cognitiva
- Integración con editorconfig
- Reglas de importación y alias (@ para src/)

## Variables de Entorno y Docker Secrets

- `PORT` - Puerto para el servidor (default: 3000)
- `BCV_WEBSITE_URL` - URL del sitio web del BCV
- `MONGODB_URI` - URI conexión MongoDB (o `MONGODB_URI_FILE` para Docker Secrets)
- `REDIS_URL` - URL conexión Redis (opcional)
- `API_KEYS` - Lista de API keys separadas por coma (o `API_KEYS_FILE` para Docker Secrets)
- `CRON_SCHEDULE` - Programación para tareas periódicas (default: "0 2,10,18 * * *")
- `NODE_ENV` - Entorno de ejecución (development/production)
- `SAVE_TO_DATABASE` - Flag para habilitar/deshabilitar persistencia (default: true)
- `LOG_LEVEL` - Nivel de logging (error/warn/info/http/debug)
- `DISCORD_WEBHOOK_URL` - URL del webhook de Discord (o `DISCORD_WEBHOOK_URL_FILE` para Docker Secrets)
- `WEBHOOK_URL` - URL del webhook HTTP general (o `WEBHOOK_URL_FILE` para Docker Secrets)
- `WEBHOOK_SECRET` - Clave secreta para firma HMAC (o `WEBHOOK_SECRET_FILE` para Docker Secrets)
- `CACHE_ENABLED` - Habilitar/deshabilitar Redis cache (default: true)
- `CACHE_TTL_LATEST` - TTL para cache de última tasa (default: 300 segundos)

## Estrategia de Pruebas

- Pruebas unitarias con Vitest para todos los servicios
- Cobertura actual >66% de líneas de código
- Mocking de dependencias usando interfaces Inversify
- Pruebas de integración para endpoints API
- Pruebas de integración para notificaciones
- Configuración de setup y teardown de pruebas
- Reporte de cobertura en múltiples formatos (text, json, html, lcov)

## Seguridad

- Validación de entrada de datos con Zod
- API Key authentication para endpoints protegidos
- Rate limiting con express-rate-limit
- Helmet.js con CSP, HSTS, X-Frame-Options, X-XSS-Protection
- Docker Secrets para gestión segura de credenciales
- Firmando de webhooks con HMAC-SHA256
- Manejo seguro de errores sin divulgación de información interna

## Monitoreo y Logging

- Logging estructurado con Winston (JSON para producción, colorizado para desarrollo)
- Niveles de log configurables (error, warn, info, http, debug)
- Rotación diaria de archivos de log
- Métricas Prometheus con recolección de datos de:
  - Requests HTTP (contador y duración)
  - Conexiones WebSocket
  - Operaciones de scraping BCV
  - Estado de salud del sistema
- Health checks estilo Kubernetes (liveness, readiness, full diagnostic)
- Integración con sistemas de monitoreo externos

## Despliegue

- Docker Compose para entornos de desarrollo y producción
- Configuración para entornos de staging y producción
- Versionamiento semántico automatizado con Conventional Commits
- CI/CD con GitHub Actions para testing, building, y deployment
- Estrategia de backup para datos de MongoDB
- Actualizaciones automáticas con zero-downtime deployment

## Consideraciones Adicionales

- Gestión de errores y reintentos en consultas al BCV con exponential backoff
- Validación de formato de tasa de cambio con Zod
- Configuración de timeouts para consultas externas
- Manejo de errores de red y conexión
- Sistema de estado persistente para evitar notificaciones duplicadas
- Soporte para múltiples monedas (USD, EUR, CNY, TRY, RUB)
- Sistema multi-canal de notificaciones (WebSocket, Discord, Webhook)
- Compresión de respuestas para mejor performance
- Configuración de seguridad web con encabezados apropiados
- Gestión de dependencias con Inversify para alta testabilidad

## Mejoras Implementadas

- ✅ Arquitectura SOLID completa con Inversify
- ✅ Sistema persistente de estado de notificaciones
- ✅ Notificaciones multi-canal (WebSocket, Discord, Webhook)
- ✅ Observabilidad completa con Prometheus
- ✅ Seguridad web con Helmet y rate limiting
- ✅ Logging estructurado con Winston
- ✅ Configuración de Docker y Docker Compose
- ✅ Health checks estilo Kubernetes
- ✅ API REST con autenticación
- ✅ Sistema de notificaciones sin duplicados
- ✅ Compresión de respuestas
- ✅ Apagado gracioso (graceful shutdown)
- ✅ Versionamiento semántico automatizado
- ✅ Validación de datos con Zod

## Estado Actual

El plan de desarrollo se ha completado exitosamente, implementando todas las funcionalidades previstas y muchas adicionales que surgieron durante el desarrollo. El microservicio BCV está completamente funcional con arquitectura robusta, seguridad adecuada y observabilidad completa.