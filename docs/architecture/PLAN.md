# Plan de Desarrollo - Microservicio BCV Tasa de Cambio

## Descripción General

Microservicio en Node.js con TypeScript que consulta periódicamente la tasa oficial de cambio del Banco Central de Venezuela, almacenando los datos localmente y notificando a servicios suscriptores mediante WebSockets cuando hay cambios.

## Objetivos

1. Consultar la tasa de cambio cada 8 horas
2. Almacenar datos en caché/localmente
3. Notificar mediante WebSockets a servicios suscriptores
4. Usar Biome para formateo y calidad de código
5. Usar pnpm para gestión de paquetes
6. Crear Dockerfile y docker-compose.yml
7. Diseñar arquitectura modular y escalable

## Tecnologías y Herramientas

- **Lenguaje**: TypeScript
- **Runtime**: Node.js
- **Gestor de paquetes**: pnpm
- **Formato y calidad de código**: Biome
- **Base de datos**: SQLite (para persistencia local) o Redis (para caché)
- **WebSockets**: socket.io o ws
- **Tareas programadas**: node-cron o similar
- **Contenedores**: Docker y Docker Compose

## Estructura de Proyecto

```
bcv-service/
├── src/
│   ├── __tests__/              # Pruebas unitarias e integración
│   ├── config/                 # Configuración de aplicación
│   │   └── index.ts
│   ├── services/               # Lógica de negocio
│   │   ├── bcv.service.ts     # Servicio de consulta al BCV
│   │   ├── cache.service.ts   # Servicio de caché
│   │   └── websocket.service.ts # Servicio de WebSockets
│   ├── controllers/            # Controladores para la API
│   ├── models/                 # Modelos de datos
│   ├── routes/                 # Rutas para la API
│   ├── utils/                  # Utilidades
│   └── app.ts                  # Configuración principal de la app
├── migrations/                 # Archivos de migración de base de datos
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── public/                     # Recursos estáticos (opcional)
├── data/                       # Datos locales si se usa SQLite
├── .env                        # Variables de entorno
├── .gitignore
├── biome.json                  # Configuración de Biome
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── README.md
└── tests/                      # Configuración de pruebas
```

## Funcionalidades

### 1. Consulta de Tasa de Cambio

- **Frecuencia**: Cada 8 horas
- **Fuente**: API oficial del BCV o scraping de página web
- **Tipo de cambio**: Tasa representativa del mercado interbancario (TRM) u otras tasas oficiales

### 2. Almacenamiento de Datos

- **Persistencia**: SQLite para almacenamiento local
- **Caché**: Redis opcional para alto rendimiento
- **Formato de datos**: 
  ```json
  {
    "id": "timestamp",
    "rate": 36.1500,
    "date": "YYYY-MM-DDTHH:mm:ssZ",
    "source": "bcv",
    "createdAt": "YYYY-MM-DDTHH:mm:ssZ"
  }
  ```

### 3. Sistema de Notificaciones por WebSocket

- **Protocolo**: WebSocket usando socket.io o librería ws
- **Eventos**: 
  - `rate-update`: cuando hay un cambio en la tasa
  - `connection`: para nuevos suscriptores
- **Formato de mensaje**: 
  ```json
  {
    "timestamp": "YYYY-MM-DDTHH:mm:ssZ",
    "rate": 36.1500,
    "change": 0.0050,
    "eventType": "rate-update"
  }
  ```

### 4. API REST

Endpoints básicos para consultas:

- `GET /api/rate/latest` - Obtener la tasa más reciente
- `GET /api/rate/history` - Obtener historial de tasas (últimos 30 días)
- `GET /api/rate/:date` - Obtener tasa para una fecha específica

### 5. Configuración de Tareas Programadas

- **Biblioteca**: node-cron o similar
- **Programación**: Cada 8 horas (ej. 02:00, 10:00, 18:00)
- **Lógica**: 
  - Consultar tasa actual
  - Comparar con la almacenada
  - Si hay cambio, almacenar y notificar via WebSocket

## Arquitectura Modular

### Servicios

- **BCVService**: Consulta la tasa de cambio
- **CacheService**: Gestión de almacenamiento y recuperación de datos
- **WebSocketService**: Gestión de conexiones WebSocket y envío de notificaciones

### Controladores

- **RateController**: Gestión de endpoints de tasa de cambio
- **SubscriptionController**: Gestión de suscripciones WebSocket

### Modelos

- **RateModel**: Estructura de datos para tasas de cambio
- **SubscriptionModel**: Estructura para gestionar suscriptores WebSocket

## Dockerización

### Dockerfile

- Base: node:alpine
- Instalación de pnpm
- Copia de package.json
- Instalación de dependencias
- Copia de código fuente
- Compilación de TypeScript
- Exposición de puerto
- Comando de inicio

### docker-compose.yml

- Servicio principal con Redis opcional
- Servicio de base de datos SQLite (si se usa PostgreSQL)
- Volumes para persistencia de datos
- Configuración de red

## Configuración de Biome

- Formateo de código
- Reglas de linting
- Reglas de importación
- Configuración para TypeScript

## Variables de Entorno

- `PORT` - Puerto para el servidor
- `BCV_API_URL` - URL para consultar tasa de cambio
- `DATABASE_URL` - URL conexión base de datos
- `REDIS_URL` - URL conexión Redis (opcional)
- `CRON_SCHEDULE` - Programación para tareas periódicas

## Estrategia de Pruebas

- Pruebas unitarias para servicios y utilidades
- Pruebas de integración para API y WebSocket
- Mock de servicios externos
- Pruebas de rendimiento para WebSocket

## Seguridad

- Validación de entrada de datos
- Limitación de peticiones (rate limiting)
- Manejo seguro de variables de entorno
- Autenticación opcional para endpoints críticos

## Monitoreo y Logging

- Logging estructurado
- Métricas de rendimiento
- Monitoreo de tareas programadas
- Notificación de errores

## Despliegue

- Docker Compose para entornos de desarrollo
- Configuración para entornos de staging y producción
- Estrategia de backup para datos locales
- Actualización automática con GitHub Actions (opcional)

## Consideraciones Adicionales

- Gestión de errores y reintentos en consultas al BCV
- Validación de formato de tasa de cambio
- Configuración de timeouts para consultas externas
- Manejo de errores de red y conexión
- Posibilidad de fallback a fuentes alternativas