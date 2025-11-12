# Guía de Deployment en Docker

Esta guía cubre el deployment del BCV Service usando Docker en diferentes escenarios.

## Tabla de Contenidos

1. [Quick Start](#quick-start)
2. [Dockerfile](#dockerfile)
3. [Docker Compose](#docker-compose)
4. [Docker Secrets](#docker-secrets)
5. [Networking](#networking)
6. [Volumes y Persistencia](#volumes-y-persistencia)
7. [Health Checks](#health-checks)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Opción 1: Docker Run (Básico)

```bash
# Build imagen
docker build -t bcv-service:latest .

# Run container
docker run -d \
  --name bcv-service \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e SAVE_TO_DATABASE=false \
  bcv-service:latest
```

### Opción 2: Docker Compose (Recomendado)

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f bcv-service

# Detener servicios
docker-compose down
```

---

## Dockerfile

### Multi-Stage Dockerfile Optimizado

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

# Instalar pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Build TypeScript
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Instalar pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar solo dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar ownership
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/index.js"]
```

### Optimizaciones Aplicadas

- ✅ **Multi-stage build**: Imagen final más pequeña (~150MB vs ~500MB)
- ✅ **Alpine Linux**: Base image ligera
- ✅ **Layer caching**: Dependencies cacheadas separadamente
- ✅ **Non-root user**: Mejor seguridad
- ✅ **Production dependencies only**: Solo deps necesarias
- ✅ **Health check**: Docker health monitoring

### .dockerignore

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
*.spec.ts

# Development
.env
.env.local
.vscode
.idea

# Git
.git
.gitignore

# Documentation
docs
README.md

# Misc
.DS_Store
*.swp
*.swo
```

---

## Docker Compose

### docker-compose.yml (Desarrollo)

```yaml
version: '3.8'

services:
  bcv-service:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bcv-service
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - SAVE_TO_DATABASE=true
      - MONGODB_URI=mongodb://mongo:27017/bcv
      - LOG_LEVEL=debug
      - CRON_SCHEDULE=*/30 * * * *
    depends_on:
      - mongo
    networks:
      - bcv-network
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  mongo:
    image: mongo:7
    container_name: bcv-mongo
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=bcv
    volumes:
      - mongo-data:/data/db
    networks:
      - bcv-network
    restart: unless-stopped

networks:
  bcv-network:
    driver: bridge

volumes:
  mongo-data:
    driver: local
```

### docker-compose.prod.yml (Producción)

```yaml
version: '3.8'

services:
  bcv-service:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: bcv-service
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SAVE_TO_DATABASE=true
      - LOG_LEVEL=info
      - CRON_SCHEDULE=*/30 * * * *
    secrets:
      - mongodb_uri
      - api_keys
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - bcv-network
    volumes:
      - ./logs:/app/logs
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  mongo:
    image: mongo:7
    container_name: bcv-mongo
    environment:
      - MONGO_INITDB_ROOT_USERNAME_FILE=/run/secrets/mongo_root_username
      - MONGO_INITDB_ROOT_PASSWORD_FILE=/run/secrets/mongo_root_password
      - MONGO_INITDB_DATABASE=bcv
    secrets:
      - mongo_root_username
      - mongo_root_password
    volumes:
      - mongo-data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    networks:
      - bcv-network
    restart: always
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M

  # Opcional: Prometheus para métricas
  prometheus:
    image: prom/prometheus:latest
    container_name: bcv-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - bcv-network
    restart: always
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'

  # Opcional: Grafana para visualización
  grafana:
    image: grafana/grafana:latest
    container_name: bcv-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - bcv-network
    restart: always
    depends_on:
      - prometheus

networks:
  bcv-network:
    driver: bridge

volumes:
  mongo-data:
  prometheus-data:
  grafana-data:

secrets:
  mongodb_uri:
    file: ./secrets/mongodb_uri.txt
  api_keys:
    file: ./secrets/api_keys.txt
  mongo_root_username:
    file: ./secrets/mongo_root_username.txt
  mongo_root_password:
    file: ./secrets/mongo_root_password.txt
```

### Comandos Útiles

```bash
# Iniciar en modo desarrollo
docker-compose up -d

# Iniciar en modo producción
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Ver logs en tiempo real
docker-compose logs -f bcv-service

# Escalar servicio (múltiples instancias)
docker-compose up -d --scale bcv-service=3

# Rebuild y restart
docker-compose up -d --build --force-recreate

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Ver recursos usados
docker stats bcv-service

# Ejecutar comando en container
docker-compose exec bcv-service sh

# Ver logs de MongoDB
docker-compose logs -f mongo
```

---

## Docker Secrets

### Configuración de Secrets

#### 1. Crear archivos de secrets

```bash
# Crear directorio de secrets
mkdir -p secrets

# MongoDB URI
echo "mongodb://user:password@mongo:27017/bcv" > secrets/mongodb_uri.txt

# API Keys (array JSON)
echo '["key-12345", "key-67890"]' > secrets/api_keys.txt

# MongoDB root credentials
echo "admin" > secrets/mongo_root_username.txt
echo "SecurePassword123!" > secrets/mongo_root_password.txt

# Establecer permisos restrictivos
chmod 600 secrets/*
```

#### 2. Configurar .gitignore

```bash
# Agregar a .gitignore
echo "secrets/" >> .gitignore
```

#### 3. Variables de Entorno para Secrets

En el container:

```yaml
environment:
  - MONGODB_URI_FILE=/run/secrets/mongodb_uri
  - API_KEYS_FILE=/run/secrets/api_keys
```

El código automáticamente lee desde archivos si existen variables `*_FILE`.

---

## Networking

### Network Configuration

**Bridge Network (Default)**:
```yaml
networks:
  bcv-network:
    driver: bridge
```

**Acceso entre containers**:
- BCV Service → MongoDB: `mongodb://mongo:27017/bcv`
- Prometheus → BCV Service: `http://bcv-service:3000/metrics`

### Port Mapping

| Service | Internal Port | External Port | Descripción |
|---------|---------------|---------------|-------------|
| BCV Service | 3000 | 3000 | API + WebSocket |
| MongoDB | 27017 | 27017 (dev) | Database |
| Prometheus | 9090 | 9090 (opcional) | Metrics |
| Grafana | 3000 | 3001 (opcional) | Dashboards |

### Firewall Rules (Producción)

```bash
# Permitir solo puerto 3000 externamente
ufw allow 3000/tcp

# MongoDB solo accesible internamente (no exponer puerto)
# En docker-compose.prod.yml, remover ports de mongo

# Prometheus/Grafana solo accesibles via reverse proxy
# O usar autenticación básica
```

---

## Volumes y Persistencia

### Volumes Configurados

**Named Volumes** (Recomendado producción):
```yaml
volumes:
  mongo-data:
    driver: local
  logs:
    driver: local
```

**Bind Mounts** (Desarrollo):
```yaml
volumes:
  - ./logs:/app/logs                    # Logs
  - ./mongo-data:/data/db               # MongoDB data
```

### Backup de MongoDB

```bash
# Backup
docker-compose exec mongo mongodump \
  --out /backup/$(date +%Y%m%d_%H%M%S) \
  --db bcv

# Copiar backup al host
docker cp bcv-mongo:/backup ./backups

# Restore
docker-compose exec mongo mongorestore \
  --db bcv \
  /backup/20250112_100000
```

### Logs Persistence

```yaml
# En docker-compose.yml
volumes:
  - ./logs:/app/logs

# Rotación automática con Winston
# Ver docs/guides/LOGGING.md
```

---

## Health Checks

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### Docker Compose Health Check

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Verificar Health

```bash
# Ver health status
docker ps

# Detalle de health check
docker inspect --format='{{json .State.Health}}' bcv-service | jq

# Logs de health checks
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' bcv-service
```

---

## Troubleshooting

### Container no inicia

```bash
# Ver logs detallados
docker-compose logs -f bcv-service

# Ver últimas 100 líneas
docker-compose logs --tail=100 bcv-service

# Verificar configuración
docker-compose config

# Inspeccionar container
docker inspect bcv-service
```

### Errores comunes

#### 1. MongoDB connection failed

```bash
# Verificar que mongo esté healthy
docker-compose ps

# Verificar network
docker network inspect bcv-network

# Verificar variables de entorno
docker-compose exec bcv-service env | grep MONGODB

# Probar conexión manualmente
docker-compose exec bcv-service sh
> node
> require('mongodb').MongoClient.connect('mongodb://mongo:27017/bcv', console.log)
```

#### 2. Port already in use

```bash
# Encontrar proceso usando puerto 3000
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O cambiar puerto en docker-compose.yml
ports:
  - "3001:3000"  # external:internal
```

#### 3. Permission denied en volumes

```bash
# Verificar ownership
ls -la ./logs

# Cambiar ownership (user 1001 es el nodejs user del container)
sudo chown -R 1001:1001 ./logs

# O dar permisos amplios (solo desarrollo)
chmod 777 ./logs
```

#### 4. Out of memory

```bash
# Ver uso de recursos
docker stats

# Aumentar límites en docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
```

### Debugging

```bash
# Acceder al container
docker-compose exec bcv-service sh

# Ver variables de entorno
docker-compose exec bcv-service env

# Ver archivos de secrets
docker-compose exec bcv-service cat /run/secrets/mongodb_uri

# Ver procesos
docker-compose exec bcv-service ps aux

# Test de endpoint
docker-compose exec bcv-service wget -O- http://localhost:3000/health

# Ver conectividad a MongoDB
docker-compose exec bcv-service nc -zv mongo 27017
```

---

## Optimización de Imágenes

### Reducir tamaño de imagen

```dockerfile
# 1. Usar Alpine
FROM node:20-alpine

# 2. Multi-stage build
FROM node:20-alpine AS builder
# ... build ...
FROM node:20-alpine AS production
# ... solo runtime ...

# 3. Limpiar cache de pnpm
RUN pnpm install --frozen-lockfile && \
    pnpm store prune

# 4. Remover archivos innecesarios
RUN rm -rf /usr/share/man/* \
           /usr/share/doc/* \
           /tmp/*
```

### Tamaños típicos

| Stage | Tamaño |
|-------|--------|
| node:20 (full) | ~1.1GB |
| node:20-alpine | ~170MB |
| Multi-stage final | ~150MB |
| Con optimizaciones | ~120MB |

---

## CI/CD con Docker

### GitHub Actions

```yaml
name: Docker Build & Push

on:
  push:
    branches: [main]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            user/bcv-service:latest
            user/bcv-service:${{ github.sha }}
          cache-from: type=registry,ref=user/bcv-service:buildcache
          cache-to: type=registry,ref=user/bcv-service:buildcache,mode=max
```

---

## Monitoreo en Docker

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'bcv-service'
    static_configs:
      - targets: ['bcv-service:3000']
    metrics_path: '/metrics'
```

### Container Metrics

```bash
# Ver métricas de containers
docker stats --no-stream

# Exportar a Prometheus
docker run -d \
  --net=host \
  prom/node-exporter
```

---

## Seguridad

### Mejores Prácticas

1. **No ejecutar como root**:
   ```dockerfile
   USER nodejs
   ```

2. **Secrets management**:
   - Usar Docker secrets, no variables de entorno
   - No commitear secrets en git

3. **Network isolation**:
   - MongoDB solo accesible en red interna
   - Usar firewall para puerto externo

4. **Read-only filesystem**:
   ```yaml
   read_only: true
   tmpfs:
     - /tmp
   ```

5. **Resource limits**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 512M
   ```

6. **Security scanning**:
   ```bash
   # Escanear imagen
   docker scan bcv-service:latest

   # Con Trivy
   trivy image bcv-service:latest
   ```

---

## Referencias

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
