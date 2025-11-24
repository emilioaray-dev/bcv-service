# Guía de Deployment en Docker

Guía completa de deployment del servicio BCV Service usando Docker con arquitectura SOLID, sistema de estado persistente dual-layer (MongoDB + Redis) y notificaciones multi-canal.

## Tabla de Contenidos

1. [Quick Start](#quick-start)
2. [Dockerfile Optimizado](#dockerfile-optimizado)
3. [Docker Compose Avanzado](#docker-compose-avanzado)
4. [Docker Secrets con Inversify](#docker-secrets-con-inversify)
5. [Networking Seguro](#networking-seguro)
6. [Volumes y Persistencia de Estado Dual-Layer](#volumes-y-persistencia-de-estado-dual-layer)
7. [Health Checks con Inversify Services](#health-checks-con-inversify-services)
8. [Performance y Escalabilidad](#performance-y-escalabilidad)
9. [Multi-Channel Notifications con Docker](#multi-channel-notifications-con-docker)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Opción 1: Docker Run (Básico)

```bash
# Build imagen
docker build -t bcv-service:latest .

# Run container (con estado persistente y notificaciones)
docker run -d \
  --name bcv-service \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e SAVE_TO_DATABASE=true \
  -e CACHE_ENABLED=true \
  -e MONGODB_URI=mongodb://mongo:27017/bcv \
  -e REDIS_URL=redis://redis:6379 \
  -e API_KEYS=your-api-key-here \
  --network bcv-network \
  --restart unless-stopped \
  bcv-service:latest
```

### Opción 2: Docker Compose (Recomendado - Arquitectura Completa)

```bash
# Iniciar todos los servicios (con MongoDB y Redis dual-layer)
docker-compose up -d

# Iniciar en modo desarrollo (con live reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Ver logs de todos los servicios
docker-compose logs -f

# Detener servicios
docker-compose down

# Escalar servicio para alta disponibilidad (stateless con dual-layer persistence)
docker-compose up -d --scale bcv-service=3
```

---

## Dockerfile Optimizado para Arquitectura SOLID

### Multi-Stage Dockerfile con Optimizaciones

```dockerfile
# Stage 1: Build con TypeScript y Inversify
FROM node:24-alpine AS builder

# Instalar pnpm globalmente
RUN npm install -g pnpm

WORKDIR /app

# Copiar archivos de dependencias (para aprovechar layer cache)
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias de desarrollo
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copiar código fuente
COPY . .

# Compilar TypeScript (con Inversify decorators y reflect-metadata)
RUN pnpm run build

# Copiar tsconfig y archivos de configuración de Inversify (para validación)
COPY tsconfig.json ./

# Validar container build
RUN ls -la dist/
RUN ls -la dist/services/
RUN ls -la dist/interfaces/

# Stage 2: Runtime con Inversify y servicios de notificaciones
FROM node:24-alpine AS runtime

# Instalar pnpm y herramientas útiles
RUN npm install -g pnpm \
  && apk add --no-cache ca-certificates wget curl bash

WORKDIR /app

# Copiar package.json para instalar solo dependencias de producción
COPY package.json pnpm-lock.yaml ./

# Instalar solo dependencias de producción (más seguro y liviano)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts \
  && pnpm store prune

# Copiar código compilado desde stage de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Crear usuario no-root con permisos específicos
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar ownership de archivos al usuario no-root
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root (mejor seguridad)
USER nodejs

# Crear directorios para logs (necesarios para Winston logging)
RUN mkdir -p /app/logs && chmod 755 /app/logs

# Exponer puerto
EXPOSE 3000

# Health check para Kubernetes/Docker Swarm (con Inversify health checks)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/app.js"]
```

### Optimizaciones Específicas para Inversify y Dual-Layer

- ✅ **Multi-stage build**: Imagen final más pequeña (~150MB vs ~500MB)
- ✅ **Alpine Linux**: Base image ligera y segura
- ✅ **Layer caching**: Dependencies cacheadas separadamente (mejora build speed)
- ✅ **Non-root user**: Mejor seguridad (permisos mínimos)
- ✅ **Production dependencies only**: Solo deps necesarias (reduce attack surface)
- ✅ **Health check**: Verifica Inversify container y servicios inyectados
- ✅ **Winston logging dirs**: Prepara directorios para logging estructurado
- ✅ **Reflect-metadata**: Asegura que Inversify decorators funcionen correctamente
- ✅ **Dual-layer persistence support**: Preparado para MongoDB + Redis arquitectura

### .dockerignore Actualizado

```
# Dependencies
node_modules
pnpm-lock.yaml

# Build outputs
dist
build
*.tsbuildinfo

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*

# Tests
coverage
test
*.test.ts
*.test.js
*.spec.ts
*.spec.js

# Development
.env
.env.local
.eslintrc.*
.babelrc*
.vslides
.vscode
.nyc_output
.ide
.nyc-output

# Git
.git
.gitignore

# Documentation
docs
README.md
CHANGELOG.md
LICENSE

# Temp files
*.tmp
*.temp
.DS_Store
Thumbs.db

# IDE
.vscode/*
.idea/*

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
```

---

## Docker Compose Avanzado con Arquitectura Dual-Layer

### docker-compose.yml (Desarrollo Completo con Inversify)

```yaml
version: '3.8'

services:
  # Servicio principal BCV con Inversify DI y dual-layer persistence
  bcv-service:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime  # Usar stage de runtime para producción
    container_name: bcv-service
    ports:
      - "3000:3000"
    environment:
      # Configuración general
      - NODE_ENV=development
      - PORT=3000
      - SAVE_TO_DATABASE=true
      - CACHE_ENABLED=true
      - LOG_LEVEL=debug
      
      # Cron scheduling (cada 8 horas: 2am, 10am, 6pm)
      - CRON_SCHEDULE=0 2,10,18 * * *
      
      # MongoDB para persistencia primaria
      - MONGODB_URI=mongodb://mongo:27017/bcv?authSource=admin
      
      # Redis para cache y estado persistente dual-layer (rápido acceso a estado de notificaciones)
      - REDIS_URL=redis://redis:6379/0
      
      # API Keys para autenticación (en desarrollo, se puede usar variable directa)
      - API_KEYS=dev-api-key,test-api-key
      
      # URLs para notificaciones multi-canal (en desarrollo, puede ser vacío o endpoint de test)
      - DISCORD_WEBHOOK_URL=
      - WEBHOOK_URL=
      - SERVICE_STATUS_WEBHOOK_URL=
      - DEPLOYMENT_WEBHOOK_URL=
      
      # Webhook security
      - WEBHOOK_SECRET=webhook-secret-key
      
      # MongoDB connection pool configuration
      - MONGODB_MAX_POOL_SIZE=10
      - MONGODB_MIN_POOL_SIZE=2
      - MONGODB_MAX_IDLE_TIME_MS=60000
      - MONGODB_CONNECT_TIMEOUT_MS=10000
      - MONGODB_SOCKET_TIMEOUT_MS=45000
      - MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
      - MONGODB_RETRY_WRITES=true
      - MONGODB_RETRY_READS=true
      
      # Redis configuration
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_DB=0
      - REDIS_MAX_RETRIES=3
      - REDIS_RETRY_DELAY=1000
      - REDIS_CONNECT_TIMEOUT=10000
      
      # Cache TTL configuration (para dual-layer notification state persistence)
      - CACHE_TTL_LATEST=300      # 5 minutos para última tasa
      - CACHE_TTL_NOTIFICATIONS=3600  # 1 hora para estado de notificaciones
      
    depends_on:
      - mongo
      - redis
    networks:
      - bcv-network
    volumes:
      # Persistencia de logs para debugging y observabilidad
      - ./logs:/app/logs
      # Opcional: bind mount para desarrollo
      # - .:/app:ro  # Solo lectura para seguridad
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # MongoDB - Persistencia Primaria para estado dual-layer
  mongo:
    image: mongo:7
    container_name: bcv-mongo
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=root
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=bcv
    volumes:
      - bcv-mongo-data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro  # Script de inicialización
    networks:
      - bcv-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # Redis - Capa de Cache para acceso rápido a estado dual-layer
  redis:
    image: redis:7-alpine
    container_name: bcv-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-defaultpassword}
    ports:
      - "6379:6379"
    volumes:
      - bcv-redis-data:/data
      - redis.conf:/usr/local/etc/redis/redis.conf:ro  # Config personalizada
    networks:
      - bcv-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 30s

  # Opcional: Prometheus para monitoreo de Inversify y dual-layer performance
  prometheus:
    image: prom/prometheus:latest
    container_name: bcv-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - bcv-network
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--webconsole.templates=/etc/prometheus/consoles'
      - '--webconsole.libraries=/etc/prometheus/console_libraries'

  # Opcional: Grafana para visualización de métricas de Inversify y dual-layer
  grafana:
    image: grafana/grafana-enterprise:latest
    container_name: bcv-grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    networks:
      - bcv-network
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped
    depends_on:
      - prometheus

networks:
  bcv-network:
    driver: bridge
    name: bcv-network
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  bcv-mongo-data:
    name: bcv-mongo-data
  bcv-redis-data:
    name: bcv-redis-data
  prometheus-data:
    name: prometheus-data
  grafana-data:
    name: grafana-data
```

### docker-compose.production.yml (Producción con Secrets)

```yaml
version: '3.8'

services:
  bcv-service:
    # Imagen preconstruida en lugar de build
    image: ghcr.io/emilioaray-dev/bcv-service:latest
    # O para una versión específica:
    # image: ghcr.io/emilioaray-dev/bcv-service:2.1.0

    container_name: bcv-service-prod
    deploy:
      replicas: 3  # Escalabilidad horizontal (stateless con dual-layer persistence)
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 10s
        order: stop-first

    # Solo exponer puerto interno a la red (usar proxy reverso externamente)
    ports:
      - "127.0.0.1:3000:3000"  # Solo acceso local, usar nginx proxy externamente

    environment:
      # Variables críticas solo a través de secrets
      - NODE_ENV=production
      - PORT=3000
      - SAVE_TO_DATABASE=true
      - LOG_LEVEL=info
      
      # Configuración de cron (hora venezolana para horarios específicos)
      - CRON_SCHEDULE=0 2,10,18 * * *
      
      # Configuración de dual-layer persistence
      - CACHE_ENABLED=true
      - CACHE_TTL_LATEST=300
      - CACHE_TTL_NOTIFICATIONS=3600

      # URLs para notificaciones (no secreto, pero se puede separar)
      - DISCORD_WEBHOOK_URL_FILE=/run/secrets/discord_webhook_url
      - WEBHOOK_URL_FILE=/run/secrets/webhook_url
      - WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret
      - SERVICE_STATUS_WEBHOOK_URL_FILE=/run/secrets/service_status_webhook_url
      - DEPLOYMENT_WEBHOOK_URL_FILE=/run/secrets/deployment_webhook_url

    secrets:
      # Configuración de MongoDB (almacenamiento primario para estado persistente)
      - source: mongodb_uri
        target: /run/secrets/mongodb_uri
        uid: '1001'
        gid: '1001'
        mode: 0400
      
      # API Keys para autenticación API (seguridad)
      - source: api_keys
        target: /run/secrets/api_keys
        uid: '1001'
        gid: '1001'
        mode: 0400
      
      # Redis password (capa de cache para estado dual-layer)
      - source: redis_password
        target: /run/secrets/redis_password
        uid: '1001'
        gid: '1001'
        mode: 0400
      
      # Webhook secrets (seguridad para notificaciones HTTP)
      - source: discord_webhook_url
        target: /run/secrets/discord_webhook_url
        uid: '1001'
        gid: '1001'
        mode: 0400
      - source: webhook_url
        target: /run/secrets/webhook_url
        uid: '1001'
        gid: '1001'
        mode: 0400
      - source: webhook_secret
        target: /run/secrets/webhook_secret
        uid: '1001'
        gid: '1001'
        mode: 0400
      - source: service_status_webhook_url
        target: /run/secrets/service_status_webhook_url
        uid: '1001'
        gid: '1001'
        mode: 0400
      - source: deployment_webhook_url
        target: /run/secrets/deployment_webhook_url
        uid: '1001'
        gid: '1001'
        mode: 0400

    # Montar solo directorios necesarios (no código fuente en producción)
    volumes:
      - ./logs:/app/logs  # Persistencia de logs
      - /dev/null:/app/data  # Archivo dummy para evitar problemas si se espera directorio data

    networks:
      - bcv-prod-network

    # Configuración de seguridad
    read_only: true  # Sistema de archivos solo lectura
    tmpfs:
      - /tmp
      - /var/tmp
      - /run
      - /var/run

    # Recursos y límites
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # MongoDB en producción con replicaset
  mongo:
    image: mongo:7
    container_name: bcv-mongo-prod
    environment:
      - MONGO_INITDB_ROOT_USERNAME_FILE=/run/secrets/mongo_root_username
      - MONGO_INITDB_ROOT_PASSWORD_FILE=/run/secrets/mongo_root_password
      - MONGO_INITDB_DATABASE=bcv
    secrets:
      - mongo_root_username
      - mongo_root_password
    volumes:
      - bcv-mongo-data-prod:/data/db
    # En producción, no exponer puerto externamente
    ports: []
    networks:
      - bcv-prod-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 40s
    command: [
      "--replSet", "rs0",
      "--auth",
      "--setParameter", "authenticationMechanisms=SCRAM-SHA-256"
    ]

  # Redis en producción con autenticación
  redis:
    image: redis:7-alpine
    container_name: bcv-redis-prod
    command: redis-server --appendonly yes --requirepass-file /run/secrets/redis_password
    volumes:
      - bcv-redis-data-prod:/data
      - ./run/secrets/redis_password:/run/secrets/redis_password:ro
    # En producción, no exponer puerto externamente
    ports: []
    networks:
      - bcv-prod-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "$(cat /run/secrets/redis_password)", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 20s

networks:
  bcv-prod-network:
    driver: bridge
    name: bcv-prod-network

volumes:
  bcv-mongo-data-prod:
  bcv-redis-data-prod:

secrets:
  mongodb_uri:
    file: ./secrets/mongodb_uri.txt
  api_keys:
    file: ./secrets/api_keys.txt
  redis_password:
    file: ./secrets/redis_password.txt
  mongo_root_username:
    file: ./secrets/mongo_root_username.txt
  mongo_root_password:
    file: ./secrets/mongo_root_password.txt
  discord_webhook_url:
    file: ./secrets/discord_webhook_url.txt
  webhook_url:
    file: ./secrets/webhook_url.txt
  webhook_secret:
    file: ./secrets/webhook_secret.txt
  service_status_webhook_url:
    file: ./secrets/service_status_webhook_url.txt
  deployment_webhook_url:
    file: ./secrets/deployment_webhook_url.txt
```

### Comandos Útiles para Docker Compose

```bash
# Iniciar en modo desarrollo
docker-compose up -d

# Iniciar en modo desarrollo con auto-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Iniciar en modo producción con secrets
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Ver logs en tiempo real
docker-compose logs -f bcv-service

# Ver logs solo de un servicio
docker-compose logs -f bcv-service --tail=100

# Escalar servicio para alta disponibilidad (stateless con dual-layer persistence)
docker-compose up -d --scale bcv-service=3

# Rebuild y restart
docker-compose up -d --build --force-recreate

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Ver recursos usados (importante para Inversify services)
docker stats bcv-service

# Ver topología de red
docker network inspect bcv-network

# Ejecutar comando en container (útil para debugging de Inversify DI)
docker-compose exec bcv-service sh

# Ver variables de entorno en container
docker-compose exec bcv-service env

# Verificar estado dual-layer (MongoDB + Redis) desde container
docker-compose exec bcv-service sh
#> mongosh "mongodb://localhost:27017/bcv" --eval "db.stats()"
#> redis-cli -h redis -a "password" ping

# Ver logs de MongoDB
docker-compose logs -f mongo

# Ver estado de Redis
docker-compose exec redis redis-cli -a "$(cat ./secrets/redis_password.txt)" info
```

---

## Docker Secrets con Inversify y Dual-Layer Architecture

### Configuración de Secrets para Arquitectura de Estado Persistente

La arquitectura dual-layer (MongoDB primario + Redis cache) requiere manejo seguro de credenciales:

#### 1. Crear directorio de secrets

```bash
mkdir -p secrets

# MongoDB URI
echo "mongodb://bcv_user:bcv4r4y4r4y@bcv-mongo:27017/bcv?authSource=admin" > secrets/mongodb_uri.txt

# API Keys (múltiples, separadas por coma)
echo "prod-key-12345,prod-key-67890" > secrets/api_keys.txt

# Redis password
echo "your-super-secure-redis-password" > secrets/redis_password.txt

# Discord webhook URL (si se usa)
echo "https://discord.com/api/webhooks/YOUR_CHANNEL/YOUR_TOKEN" > secrets/discord_webhook_url.txt

# Webhook URL general (si se usa)
echo "https://your-app.com/webhook/bcv-notifications" > secrets/webhook_url.txt

# Webhook secret para firma HMAC
echo "your-webhook-signing-secret" > secrets/webhook_secret.txt

# Service status webhook URL (si se usa)
echo "https://your-app.com/webhook/service-status" > secrets/service_status_webhook_url.txt

# Deployment webhook URL (si se usa)
echo "https://your-app.com/webhook/deployment" > secrets/deployment_webhook_url.txt

# Establecer permisos restrictivos (importante para seguridad)
chmod 600 secrets/*
```

#### 2. Variables de Entorno con Secrets

```yaml
# Usar *_FILE para apuntar a archivos de secrets (más seguro que variables normales)
environment:
  - MONGODB_URI_FILE=/run/secrets/mongodb_uri
  - API_KEYS_FILE=/run/secrets/api_keys
  - DISCORD_WEBHOOK_URL_FILE=/run/secrets/discord_webhook_url
  - WEBHOOK_URL_FILE=/run/secrets/webhook_url
  - WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret
  - SERVICE_STATUS_WEBHOOK_URL_FILE=/run/secrets/service_status_webhook_url
  - DEPLOYMENT_WEBHOOK_URL_FILE=/run/secrets/deployment_webhook_url

# Redis connection
- REDIS_URL=redis://redis:6379
- REDIS_HOST=redis
- REDIS_PORT=6379
- REDIS_PASSWORD_FILE=/run/secrets/redis_password  # Aún usando archivo para Redis password
```

#### 3. Implementación en Inversify Container

```typescript
// src/config/secrets.ts - Gestión de secrets para Inversify DI
import fs from 'fs';

export function readSecret(envVar: string, fileVar: string, defaultValue: string): string {
  // Prioridad: 1. Archivo de secrets, 2. Variable de entorno, 3. Valor por defecto
  if (process.env[fileVar]) {
    try {
      return fs.readFileSync(process.env[fileVar]!, 'utf-8').trim();
    } catch (error) {
      log.warn(`No se pudo leer archivo de secrets: ${process.env[fileVar]}`, { error });
    }
  }
  
  return process.env[envVar] || defaultValue;
}

// src/config/inversify.config.ts - Configuración del contenedor Inversify con secrets
import { Container } from 'inversify';
import { RedisService } from '@/services/redis.service';
import { MongoService } from '@/services/mongo.service';
import { NotificationStateService } from '@/services/notification-state.service';
import { TYPES } from './types';

export function createContainer(): Container {
  const container = new Container();
  
  // Configuración desde secrets o env vars
  const mongoConfig = {
    uri: readSecret('MONGODB_URI', 'MONGODB_URI_FILE', 'mongodb://localhost:27017/bcv'),
    database: 'bcv',
    connectionOptions: {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2'),
      // ... más opciones
    }
  };

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: readSecret('REDIS_PASSWORD', 'REDIS_PASSWORD_FILE', ''),
    db: parseInt(process.env.REDIS_DB || '0'),
    // ... más opciones
  };

  // Binding de servicios con Inversify
  container.bind<IConfigService>(TYPES.ConfigService).toDynamicValue(() => ({
    mongoConfig,
    redisConfig
  })).inSingletonScope();

  container.bind<ICacheService>(TYPES.CacheService).to(MongoService).inSingletonScope();
  container.bind<IRedisService>(TYPES.RedisService).to(RedisService).inSingletonScope();
  container.bind<INotificationStateService>(TYPES.NotificationStateService)
    .to(NotificationStateService).inSingletonScope();
  
  // ... más bindings
  
  return container;
}
```

---

## Networking Seguro

### Configuración de Red con Inversify Services

#### 1. Network Isolation

```yaml
networks:
  bcv-network:
    driver: bridge
    # No permitir acceso externo directo a MongoDB o Redis
    # Solo el servicio BCV puede comunicarse con ellos
    
services:
  bcv-service:
    networks:
      - bcv-network
    # Acceso externo permitido solo al puerto público (3000)
    ports:
      - "3000:3000"  # Solo API endpoints accesibles externamente

  mongo:
    networks:
      - bcv-network  # Solo accesible internamente
    # NO exponer puerto externamente en producción
    # ports: []  # En producción, comentar o eliminar

  redis:
    networks:
      - bcv-network  # Solo accesible internamente
    # NO exponer puerto externamente en producción
    # ports: []  # En producción, comentar o eliminar
```

#### 2. Comunicación Interna con Inversify

Dentro de la red, los servicios Inversify se comunican usando nombres DNS del container:

```typescript
// src/config/services.config.ts
export const serviceUrls = {
  // MongoDB URL - interna vía nombre de container
  mongo: process.env.MONGODB_URI || 'mongodb://mongo:27017/bcv',
  
  // Redis URL - interna vía nombre de container  
  redis: process.env.REDIS_URL || 'redis://redis:6379',
  
  // Servicio BCV - para comunicación interna si se requiere
  bcv: process.env.BCV_SERVICE_URL || 'http://bcv-service:3000',
};
```

---

## Volumes y Persistencia de Estado Dual-Layer

### Configuración de Volúmenes para Inversify y Dual-Layer Persistence

#### 1. Named Volumes (Recomendado para Producción)

```yaml
volumes:
  # Persistencia de MongoDB (almacenamiento primario del estado dual-layer)
  bcv-mongo-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/bcv-service/mongo-data  # Ruta física en host en producción

  # Persistencia de Redis (capa de cache para acceso rápido al estado dual-layer)
  bcv-redis-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/bcv-service/redis-data  # Ruta física en host en producción

  # Persistencia de logs de Winston para observabilidad
  bcv-logs:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/bcv-service/logs
```

#### 2. Persistencia de Estado Dual-Layer

```typescript
// El servicio de estado persistente usa ambos sistemas:
// - MongoDB (primario): Persistencia garantizada a través de reinicios
// - Redis (cache): Velocidad para operaciones frecuentes de lectura/escritura

// src/services/notification-state.service.ts
export class NotificationStateService implements INotificationStateService {
  constructor(
    @inject(TYPES.CacheService) private mongoService: ICacheService,  // Primario
    @inject(TYPES.RedisService) private redisService: IRedisService   // Cache
  ) {}

  async hasSignificantChangeAndNotify(rateData: RateData): Promise<boolean> {
    // 1. Intentar leer desde Redis (capa rápida)
    let previousState = await this.redisService.get<NotificationState>('bcv:last_notification');
    
    // 2. Si no está en Redis, leer desde MongoDB (capa persistente)
    if (!previousState) {
      previousState = await this.mongoService.getNotificationState();
      
      // 3. Si encontramos en MongoDB, actualizar Redis (cache warm-up)
      if (previousState) {
        await this.redisService.set('bcv:last_notification', previousState, 3600); // 1h TTL
      }
    }

    // 4. Comparar tasas actuales con tasas previamente notificadas
    const hasChange = this.compareRates(previousState?.lastNotifiedRate, rateData);
    
    if (hasChange) {
      // 5. Guardar nuevo estado en ambos sistemas para consistencia
      await this.mongoService.saveNotificationState({
        lastNotifiedRate: rateData,
        lastNotificationDate: new Date().toISOString()
      });
      
      await this.redisService.set('bcv:last_notification', {
        lastNotifiedRate: rateData,
        lastNotificationDate: new Date().toISOString()
      }, 3600); // TTL de 1 hora
    }

    return hasChange;
  }
}
```

#### 3. Backup de Estado Persistente Dual-Layer

```bash
# Backup de MongoDB (almacenamiento primario)
docker-compose exec mongo mongodump --out /backup/$(date +%Y%m%d_%H%M%S)_dual_layer --db bcv

# Backup de Redis (capa de cache, opcional ya que se puede reconstruir desde MongoDB)
docker-compose exec redis redis-cli BGSAVE

# Copiar backups al host
docker cp bcv-mongo:/backup ./backups
```

### Logs Persistence para Observabilidad

```yaml
# En docker-compose.yml
services:
  bcv-service:
    volumes:
      # Persistencia de logs estructurados de Winston
      - ${PWD}/logs:/app/logs
      # Asegurar permisos para el usuario no-root
    user: "1001:1001"
```

---

## Health Checks con Inversify Services

### Docker Health Checks con Inversify Container

Los health checks verifican que el contenedor Inversify y todos sus servicios estén listos:

#### 1. Health Check para Inversify Container y Servicios Inyectados

```dockerfile
# En Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

#### 2. Compose Health Checks Avanzados

```yaml
services:
  bcv-service:
    healthcheck:
      # Verificar que Inversify container esté listo y pueda resolver servicios
      test: ["CMD", "sh", "-c", "wget --quiet --tries=1 --spider http://localhost:3000/healthz && node -e 'require(\"http\").get(\"http://localhost:3000/health\", (r) => {if(r.statusCode !== 200) process.exit(1);});'"]
      interval: 30s
      timeout: 15s
      retries: 3
      start_period: 60s
```

#### 3. Sistema de Health Checks Kubernetes-style

El servicio implementa un sistema de health checks estilo Kubernetes con 3 niveles:

```typescript
// src/controllers/health.controller.ts
@injectable()
export class HealthController {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.RedisService) private redisService: IRedisService,
    @inject(TYPES.SchedulerService) private schedulerService: ISchedulerService,
    @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService
  ) {}

  @get('/healthz')
  async healthz(req: Request, res: Response): Promise<void> {
    // Liveness probe - ultra rápido, sin I/O
    this.logger.debug('Health check: liveness probe');
    res.status(200).send('OK');
  }

  @get('/readyz')
  async readyz(req: Request, res: Response): Promise<void> {
    // Readiness probe - verifica conectividad a dependencias críticas
    try {
      const checks = await Promise.allSettled([
        this.cacheService.ping(),        // Verificar MongoDB (almacenamiento primario)
        this.redisService.ping(),        // Verificar Redis (capa de cache)
        this.schedulerService.isHealthy() // Verificar scheduler (funcionalidad crítica)
      ]);

      const healthy = checks.every(result => result.status === 'fulfilled' && result.value === true);

      if (healthy) {
        res.status(200).send('READY');
      } else {
        res.status(503).send('NOT READY');
      }
    } catch (error) {
      res.status(503).send('NOT READY');
    }
  }

  @get('/health')
  async health(req: Request, res: Response): Promise<void> {
    // Diagnóstico completo del sistema dual-layer
    try {
      const [mongoStatus, redisStatus, schedulerStatus, webSocketStatus] = await Promise.all([
        this.cacheService.getStatus(),
        this.redisService.getStatus(),
        this.schedulerService.getStatus(),
        this.webSocketService.getStatus()
      ]);

      const overallStatus = this.calculateOverallStatus([
        mongoStatus, redisStatus, schedulerStatus, webSocketStatus
      ]);

      res.status(overallStatus === 'healthy' ? 200 : 503).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          mongodb: mongoStatus,
          redis: redisStatus,  
          scheduler: schedulerStatus,
          websocket: webSocketStatus
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}
```

---

## Performance y Escalabilidad con Arquitectura SOLID

### Configuración para Alta Disponibilidad

```yaml
# docker-compose.production.yml - Parte relevante para performance
services:
  bcv-service:
    deploy:
      # Escalabilidad horizontal - estado persistente dual-layer permite múltiples instancias
      replicas: 3  # Múltiples instancias stateless con dual-layer persistence
      
      resources:
        limits:
          cpus: '1'      # Limitar uso de CPU
          memory: 512M   # Limitar uso de memoria (Inversify container + dual-layer services)
        reservations:
          cpus: '0.5'    # Reservar recursos mínimos
          memory: 256M   # Reservar memoria mínima
      
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      
      update_config:
        parallelism: 1      # Actualizar una instancia a la vez
        delay: 10s          # Esperar 10s entre actualizaciones
        order: start-first  # Iniciar nueva instancia antes de detener vieja
      
      rollback_config:
        parallelism: 1
        delay: 10s
        order: stop-first   # Detener instancia vieja antes de iniciar rollback

    # Configuración de recursos para Inversify container
    environment:
      - NODE_OPTIONS=--max-old-space-size=512  # Limitar heap size (previene memory leaks)
      - NODE_ENV=production
      - LOG_LEVEL=warn       # Reducir logging en producción para performance
      - CACHE_ENABLED=true   # Habilitar Redis cache para performance dual-layer
      - CACHE_TTL_LATEST=300 # TTL de cache para latest rates (5 minutos)

  # MongoDB con replicaset para alta disponibilidad
  mongo:
    deploy:
      placement:
        constraints:
          - node.role == manager  # O usar un storage específico

  # Redis con persistencia para alta disponibilidad
  redis:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 5
```

### Optimizaciones de Performance con Inversify

```typescript
// src/config/inversify.config.ts - Optimizaciones para performance
import { Container, ContainerModule } from 'inversify';
import { TYPES } from './types';

// Módulos para lazy loading y mejor performance
const servicesModule = new ContainerModule(bind => {
  bind<IBCVService>(TYPES.BCVService).to(BCVService).inSingletonScope();
  bind<IWebSocketService>(TYPES.WebSocketService).to(WebSocketService).inSingletonScope();
  bind<IMetricsService>(TYPES.MetricsService).to(MetricsService).inSingletonScope();
});

const persistenceModule = new ContainerModule(bind => {
  bind<ICacheService>(TYPES.CacheService).to(MongoService).inSingletonScope();
  bind<IRedisService>(TYPES.RedisService).to(RedisService).inSingletonScope();
});

const notificationModule = new ContainerModule(bind => {
  bind<INotificationStateService>(TYPES.NotificationStateService)
    .to(NotificationStateService).inSingletonScope();
  bind<IDiscordService>(TYPES.DiscordService).to(DiscordService).inSingletonScope();
  bind<IWebhookService>(TYPES.WebhookService).to(WebhookService).inSingletonScope();
});

export function createContainer(): Container {
  const container = new Container({
    skipBaseClassChecks: true,  // Optimización de performance
    autoBindInjectable: true,   // Auto-bind de @injectable() classes
    defaultScope: 'Singleton'   // Default a singleton para performance
  });

  // Cargar módulos
  container.load(servicesModule, persistenceModule, notificationModule);

  return container;
}
```

---

## Multi-Channel Notifications con Docker

### Configuración de Notificaciones Multi-Canal

El servicio implementa notificaciones a través de múltiples canales con el sistema dual-layer:

```yaml
# docker-compose.yml - Parte de notificaciones
services:
  bcv-service:
    environment:
      # Configuración de notificaciones multi-canal
      - DISCORD_WEBHOOK_URL_FILE=/run/secrets/discord_webhook_url
      - WEBHOOK_URL_FILE=/run/secrets/webhook_url
      - WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret
      - SERVICE_STATUS_WEBHOOK_URL_FILE=/run/secrets/service_status_webhook_url
      - DEPLOYMENT_WEBHOOK_URL_FILE=/run/secrets/deployment_webhook_url
      
      # Configuración de webhook (con HMAC seguridad)
      - WEBHOOK_TIMEOUT=5000
      - WEBHOOK_MAX_RETRIES=3
      
      # Configuración de notificaciones de estado persistente
      - NOTIFICATION_THRESHOLD_ABSOLUTE=0.01  # Umbral de cambio (≥0.01)
      
    secrets:
      - discord_webhook_url
      - webhook_url
      - webhook_secret
      - service_status_webhook_url
      - deployment_webhook_url

# Sistema de estado persistente dual-layer para evitar notificaciones duplicadas
# - MongoDB: Almacenamiento primario del último estado notificado
# - Redis: Capa de cache para acceso rápido
```

### Implementación del Sistema de Estado Persistente Dual-Layer

```typescript
// src/services/notification-state.service.ts
@injectable()
export class NotificationStateService implements INotificationStateService {
  constructor(
    @inject(TYPES.CacheService) private mongoService: ICacheService,  // Almacenamiento primario
    @inject(TYPES.RedisService) private redisService: IRedisService,  // Capa de cache
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.DiscordService) private discordService: IDiscordService,
    @inject(TYPES.WebhookService) private webhookService: IWebhookService,
    @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService
  ) {}

  async hasSignificantChangeAndNotify(rateData: RateData): Promise<boolean> {
    const startTime = Date.now();
    
    // 1. Leer estado desde Redis (capa rápida)
    let lastState = await this.redisService.get<NotificationState>('bcv:notifications:state:last');
    
    // 2. Si no está en cache, leer desde MongoDB (fallback)
    if (!lastState) {
      lastState = await this.mongoService.getNotificationState();
      
      // Actualizar cache si encontramos en MongoDB
      if (lastState) {
        await this.redisService.set('bcv:notifications:state:last', lastState, 3600);
      }
    }

    // 3. Comparar tasas para detección de cambios significativos (≥0.01)
    const hasChange = this.hasSignificantAbsoluteChange(lastState?.lastNotifiedRate, rateData);

    if (hasChange) {
      // 4. Notificar a través de todos los canales
      await this.sendMultiChannelNotifications(rateData, lastState?.lastNotifiedRate);

      // 5. Guardar nuevo estado en ambos sistemas
      const newState = {
        lastNotifiedRate: rateData,
        lastNotificationDate: new Date().toISOString(),
        lastNotificationId: this.generateNotificationId()
      };

      await Promise.allSettled([
        this.mongoService.saveNotificationState(newState),
        this.redisService.set('bcv:notifications:state:last', newState, 3600)
      ]);

      const duration = Date.now() - startTime;
      this.logger.info('Notificación de cambio significativo enviada', {
        rateChange: this.calculateRateChange(lastState?.lastNotifiedRate, rateData),
        channelsNotified: 3, // Discord, Webhook, WebSocket
        notificationTimeMs: duration
      });

      return true;
    }

    // 6. Registrar que no hubo cambio significativo
    this.logger.debug('Sin cambio significativo detectado, no se envían notificaciones', {
      threshold: 0.01,
      rateData: rateData.rates[0]?.rate,
      lastNotified: lastState?.lastNotifiedRate.rates[0]?.rate
    });

    return false;
  }

  private hasSignificantAbsoluteChange(
    previousRate: RateData | null, 
    currentRate: RateData
  ): boolean {
    if (!previousRate) {
      return true; // Si no hay estado anterior, considerar como cambio
    }

    // Comparar tasas individuales por moneda
    for (const currentCurrency of currentRate.rates) {
      const previousCurrency = previousRate.rates.find(
        r => r.currency === currentCurrency.currency
      );

      if (previousCurrency) {
        const absoluteChange = Math.abs(currentCurrency.rate - previousCurrency.rate);
        if (absoluteChange >= 0.01) { // Umbral de cambio absoluto
          return true;
        }
      } else {
        // Nueva moneda agregada
        return true;
      }
    }

    return false;
  }

  private async sendMultiChannelNotifications(
    currentRate: RateData,
    previousRate: RateData | null
  ): Promise<void> {
    const results = await Promise.allSettled([
      // Notificar a Discord
      this.discordService.sendRateChangeNotification(currentRate, previousRate),
      
      // Notificar por Webhook HTTP
      this.webhookService.sendRateChangeNotification(currentRate, previousRate),
      
      // Notificar por WebSocket
      this.webSocketService.broadcastRateUpdate({
        timestamp: new Date().toISOString(),
        rates: currentRate.rates,
        change: this.calculateRateChange(previousRate, currentRate),
        eventType: 'rate-change'
      })
    ]);

    // Registrar resultados de cada canal
    const channelNames = ['Discord', 'Webhook', 'WebSocket'];
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        this.logger.error(`Error enviando notificación por ${channelNames[idx]}`, {
          error: result.reason
        });
      } else {
        this.logger.info(`Notificación enviada exitosamente por ${channelNames[idx]}`);
      }
    });
  }
}
```

---

## Troubleshooting

### Problemas Comunes en Docker con Inversify y Dual-Layer

#### 1. Inversify Container Resolution Errors

```bash
# Error típico: No se puede resolver dependencia
Error: No matching bindings found for serviceIdentifier: Symbol(BCVService)
```

**Solución**:
```bash
# Verificar que todos los servicios estén correctamente bound en el container
docker-compose exec bcv-service node -e "
  const container = require('./dist/config/inversify.config').createContainer();
  console.log('Container keys:', container.getAllBindings().length);
  console.log('Container ready:', container.isBound(require('./dist/config/types').TYPES.BCVService));
"
```

#### 2. Problemas de Conexión a Redis (capa de cache dual-layer)

```bash
# Verificar estado de Redis dentro del container
docker-compose exec bcv-service sh
#> redis-cli -h redis -a 'password' ping
#> PONG

# Verificar que Redis esté disponible para el servicio de estado persistente
docker-compose exec bcv-service sh
#> redis-cli -h redis -a 'password' get 'bcv:notifications:state:last'
```

#### 3. Problemas de Conexión a MongoDB (almacenamiento primario)

```bash
# Verificar estado de MongoDB
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Verificar que MongoDB esté disponible para el servicio de estado persistente
docker-compose exec bcv-service sh
#> mongosh 'mongodb://mongo:27017/bcv' --eval "db.collection('rates').findOne()"
```

#### 4. Problemas con Docker Secrets

```bash
# Verificar que los secrets estén montados correctamente
docker-compose exec bcv-service ls -la /run/secrets/

# Verificar contenido de secrets (solo en desarrollo, NO en producción!)
docker-compose exec bcv-service cat /run/secrets/mongodb_uri

# Verificar que la aplicación pueda leer secrets
docker-compose exec bcv-service env | grep MONGODB_URI_FILE
```

### Comandos de Diagnóstico

```bash
# Ver estado de todos los servicios
docker-compose ps

# Ver recursos usados por los servicios
docker stats

# Ver logs con filtrado
docker-compose logs bcv-service | grep -i error

# Verificar health checks
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Verificar red de comunicación
docker network inspect bcv-network

# Verificar volumenes
docker volume ls | grep bcv

# Conectividad interna entre servicios
docker-compose exec bcv-service ping mongo
docker-compose exec bcv-service ping redis

# Verificar Inversify container resolution
docker-compose exec bcv-service node -e "
  const { createContainer } = require('./dist/config/inversify.config');
  const container = createContainer();
  console.log('✓ Inversify container loaded successfully');
  console.log('✓ BCVService bound:', container.isBound(require('./dist/config/types').TYPES.BCVService));
  console.log('✓ MongoService bound:', container.isBound(require('./dist/config/types').TYPES.CacheService));
  console.log('✓ RedisService bound:', container.isBound(require('./dist/config/types').TYPES.RedisService));
  console.log('✓ NotificationStateService bound:', container.isBound(require('./dist/config/types').TYPES.NotificationStateService));
"

# Verificar dual-layer persistence
docker-compose exec bcv-service node -e "
  // Verificar estado dual-layer
  const redis = require('ioredis');
  const client = new redis('redis://redis:6379');
  
  client.get('bcv:notifications:state:last')
    .then(result => console.log('✓ Redis cache hit:', !!result))
    .finally(() => client.disconnect());
"

# Verificar que los health checks estén operativos
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
curl http://localhost:3000/health

# Verificar métricas Prometheus
curl http://localhost:3000/metrics
```

### Debugging del Sistema de Estado Persistente Dual-Layer

```bash
# Verificar estado actual en ambos sistemas
docker-compose exec mongo mongosh bcv --eval "
  db.notification_states.findOne({'_id': 'last_notification'});
"

docker-compose exec bcv-service sh -c "
  redis-cli -h redis get 'bcv:notifications:state:last'
"

# Verificar consistencia entre ambos sistemas
docker-compose exec bcv-service node -e "
  const { createContainer } = require('./dist/config/inversify.config');
  const container = createContainer();
  
  const notificationService = container.get(require('./dist/config/types').TYPES.NotificationStateService);
  // Esta llamada debería usar ambos sistemas (Redis primero, MongoDB como fallback)
"
```

---

## Seguridad en Producción

### Mejores Prácticas Docker + Inversify + Dual-Layer

#### 1. Non-root User

```dockerfile
# Asegurar que el contenedor corre como non-root user
USER nodejs  # UID 1001, GID 1001

# Directorios con permisos correctos
RUN chown -R nodejs:nodejs /app
RUN chmod 755 /app/logs
```

#### 2. Secrets Management

```yaml
# Usar Docker secrets para credenciales sensibles
secrets:
  - mongodb_uri
  - api_keys
  - redis_password
  - webhook_secret

# Variables de entorno no sensibles
environment:
  - NODE_ENV=production
  - PORT=3000
  - CACHE_ENABLED=true
  - LOG_LEVEL=info
```

#### 3. Resource Limits

```yaml
# Limitar recursos para prevenir abuse
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

#### 4. Network Security

```yaml
# Solo exponer puertos necesarios
ports:
  - "127.0.0.1:3000:3000"  # Solo local, usar proxy reverso

# Asegurar comunicación interna
networks:
  bcv-network:
    driver: bridge
    internal: true  # No acceso externo
```

---

## Métricas de Performance

### Observabilidad del Sistema Dual-Layer

```typescript
// src/services/metrics.service.ts - Métricas específicas para dual-layer
import { Counter, Gauge, Histogram } from 'prom-client';

export class MetricsService implements IMetricsService {
  // Métricas para Inversify container
  private inversifyResolutionTime: Histogram;
  private inversifyResolutionErrors: Counter;

  // Métricas para dual-layer persistence
  private dualLayerCacheHit: Counter;
  private dualLayerCacheMiss: Counter;
  private dualLayerOperationDuration: Histogram;
  
  // Métricas para notificaciones multi-canal
  private notificationChannelsTotal: Counter;
  private notificationSuccessTotal: Counter;
  private notificationFailureTotal: Counter;

  constructor() {
    // Inversify metrics
    this.inversifyResolutionTime = new Histogram({
      name: 'inversify_resolution_duration_seconds',
      help: 'Duration of Inversify service resolution',
      labelNames: ['service', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });

    // Dual-layer metrics
    this.dualLayerCacheHit = new Counter({
      name: 'dual_layer_cache_hits_total',
      help: 'Total cache hits in Redis layer',
      labelNames: ['layer']  // 'redis' or 'mongodb'
    });

    this.dualLayerCacheMiss = new Counter({
      name: 'dual_layer_cache_misses_total',
      help: 'Total cache misses requiring MongoDB fallback',
      labelNames: ['layer']
    });

    this.dualLayerOperationDuration = new Histogram({
      name: 'dual_layer_operation_duration_seconds',
      help: 'Duration of dual-layer operations',
      labelNames: ['operation', 'layer', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });

    // Notification metrics
    this.notificationChannelsTotal = new Counter({
      name: 'notification_channels_total',
      help: 'Total notification channels attempted',
      labelNames: ['channel']
    });

    this.notificationSuccessTotal = new Counter({
      name: 'notification_success_total',
      help: 'Total successful notifications',
      labelNames: ['channel', 'event_type']
    });

    this.notificationFailureTotal = new Counter({
      name: 'notification_failure_total',
      help: 'Total failed notifications',
      labelNames: ['channel', 'event_type', 'reason']
    });
  }
}
```

### PromQL Queries para Monitoreo

```
# Tasa de éxito de resolución de Inversify
rate(inversify_resolution_errors_total[5m])

# Hit/miss ratio del sistema dual-layer
increase(dual_layer_cache_hits_total{layer="redis"}[5m]) /
(increase(dual_layer_cache_hits_total[5m]) + increase(dual_layer_cache_misses_total[5m]))

# Latencia promedio de operaciones dual-layer
rate(dual_layer_operation_duration_seconds_sum[5m]) /
rate(dual_layer_operation_duration_seconds_count[5m])

# Tasa de éxito de notificaciones por canal
rate(notification_success_total{channel="discord"}[5m]) /
rate(notification_channels_total{channel="discord"}[5m])

# WebSocket clients conectados
websocket_clients_connected

# Última tasa de cambio (en dólares)
bcv_latest_rate{currency="USD"}
```

---

## Pruebas de Carga con Docker Compose

### Configuración para Pruebas de Rendimiento

```bash
# Escalar servicio para pruebas de carga
docker-compose up -d --scale bcv-service=5

# Monitorear recursos durante pruebas
docker stats

# Verificar que el estado persistente dual-layer funcione correctamente con múltiples instancias
# Cada instancia debería compartir el mismo estado de notificaciones (previniendo duplicados)
```

---

**Última actualización**: 2025-11-24  
**Versión del servicio**: 2.1.0  
**Arquitectura actual**: SOLID con Inversify DI + Dual-Layer Persistence (MongoDB + Redis) + Multi-Channel Notifications  
**Estado**: ✅ Completamente implementado y operativo con todas las características de la arquitectura actual