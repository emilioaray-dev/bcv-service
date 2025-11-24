# Gestión de Secretos con Docker Secrets

Guía para implementar y usar Docker Secrets en el servicio BCV.

## 🔒 ¿Por qué Docker Secrets?

Docker Secrets proporciona:
- **Seguridad**: Credenciales encriptadas en reposo y en tránsito
- **Separación**: Secretos separados del código y configuración
- **Rotación**: Fácil actualización sin rebuild de imágenes
- **Auditoría**: Control de acceso granular
- **Soporte para múltiples secretos**: MongoDB, API keys, Discord webhooks, etc.

## 📋 Archivos y Configuraciones

```
bcv-service/
├── docker-compose.yml           # Docker Compose con soporte para secrets
├── docker-compose.production.yml # Docker Compose para producción
├── secrets/                     # Directorio para archivos de secretos (no en git)
│   ├── .gitkeep                 # Mantiene el directorio en git
├── src/config/
│   ├── secrets.ts              # Utilidad para leer secretos
│   └── index.ts                # Configuración central de variables
└── src/middleware/
    └── auth.middleware.ts      # Middleware de autenticación API Key
```

## 🚀 Paso 1: Rotar Credenciales de MongoDB

### En tu servidor MongoDB:

```bash
# Conectar a MongoDB
mongosh admin -u admin -p admin123

# Crear nuevo usuario con credenciales seguras
use bcv
db.createUser({
  user: "bcv_user_new",
  pwd: "TU_PASSWORD_SEGURO_GENERADO",
  roles: [
    { role: "readWrite", db: "bcv" }
  ]
})

# Verificar que el nuevo usuario funciona
exit

# Probar conexión
mongosh "mongodb://bcv_user_new:TU_PASSWORD@localhost:27017/bcv?authSource=admin"

# Una vez verificado, eliminar el usuario antiguo
mongosh admin -u admin -p admin123
use bcv
db.dropUser("bcv_user")
exit
```

## 🔐 Paso 2: Configurar Variables de Entorno con Secrets

### Variables disponibles para secrets:

```bash
# MongoDB
MONGODB_URI_FILE=/run/secrets/mongodb_uri

# API Keys
API_KEYS_FILE=/run/secrets/api_keys

# Discord Webhook
DISCORD_WEBHOOK_URL_FILE=/run/secrets/discord_webhook_url

# Webhook General
WEBHOOK_URL_FILE=/run/secrets/webhook_url

# Webhook Secret
WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret

# Redis (si se usa)
REDIS_PASSWORD_FILE=/run/secrets/redis_password
```

### Crear archivos de secrets manualmente:

```bash
# Crear directorio de secrets
mkdir -p secrets

# Crear archivo para MongoDB URI
echo "mongodb://bcv_user_new:TU_PASSWORD@host:port/bcv?authSource=admin" > secrets/mongodb_uri

# Crear archivo para API Keys (una por línea o separadas por coma)
echo "key1,key2,key3" > secrets/api_keys

# Crear archivo para Discord Webhook (si aplica)
echo "https://discord.com/api/webhooks/YOUR_WEBHOOK_URL" > secrets/discord_webhook_url

# Crear archivo para Webhook URL (si aplica)
echo "https://your-webhook-endpoint.com/webhook" > secrets/webhook_url

# Crear archivo para Webhook Secret (si aplica)
echo "your-super-secret-key" > secrets/webhook_secret
```

## 🐳 Paso 3: Configurar Docker Compose con Secrets

### docker-compose.production.yml (ejemplo con secrets):

```yaml
version: '3.8'

services:
  bcv-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - SAVE_TO_DATABASE=true
      - BCV_WEBSITE_URL=https://www.bcv.org.ve/
      - CRON_SCHEDULE=0 2,10,18 * * *
      - LOG_LEVEL=info
      - CACHE_ENABLED=true
      # Secrets
      - MONGODB_URI_FILE=/run/secrets/mongodb_uri
      - API_KEYS_FILE=/run/secrets/api_keys
      - DISCORD_WEBHOOK_URL_FILE=/run/secrets/discord_webhook_url
      - WEBHOOK_URL_FILE=/run/secrets/webhook_url
      - WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret
    secrets:
      - mongodb_uri
      - api_keys
      - discord_webhook_url
      - webhook_url
      - webhook_secret
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

secrets:
  mongodb_uri:
    file: ./secrets/mongodb_uri
  api_keys:
    file: ./secrets/api_keys
  discord_webhook_url:
    file: ./secrets/discord_webhook_url
  webhook_url:
    file: ./secrets/webhook_url
  webhook_secret:
    file: ./secrets/webhook_secret
```

### docker-compose.yml (desarrollo sin secrets):

```yaml
version: '3.8'

services:
  bcv-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=development
      - SAVE_TO_DATABASE=true
      - BCV_WEBSITE_URL=https://www.bcv.org.ve/
      - CRON_SCHEDULE=0 2,10,18 * * *
      - LOG_LEVEL=debug
      - MONGODB_URI=mongodb://bcv_user:bcv4r4y4r4y@192.168.11.185:27017/bcv?authSource=admin
      - API_KEYS=your-dev-api-key
      - CACHE_ENABLED=false
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
```

## 🐳 Paso 4: Iniciar el Servicio con Secrets

```bash
# Iniciar en producción con secrets (usa docker-compose.production.yml)
docker-compose -f docker-compose.production.yml up -d

# Ver logs
docker-compose -f docker-compose.production.yml logs -f bcv-service

# Detener
docker-compose -f docker-compose.production.yml down
```

### Desarrollo Local (sin Docker Secrets):

Sigue usando tu `.env` como siempre:
```bash
pnpm dev
```

El código detecta automáticamente si estás usando Secrets o `.env`.

## 🔍 Verificar que Funciona

```bash
# Ver logs del contenedor
docker-compose -f docker-compose.production.yml logs bcv-service

# Si usas secrets, deberías ver:
# 🔐 Modo: Docker Secrets activado
# ✓ Secreto cargado desde archivo: MONGODB_URI_FILE
# Servidor BCV iniciado

# Si usas .env o variables directas, verás:
# ⚙️  Modo: Variables de entorno estándar
# Servidor BCV iniciado
```

## 🔐 API Key Authentication

### Variables para API Keys:

- `API_KEYS`: Una o múltiples keys separadas por coma
- `API_KEYS_FILE`: Ruta a archivo con API keys (cuando se usa Docker Secrets)

### Headers esperados:

Clientes deben incluir el header `X-API-Key`:
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/rate/latest
```

### Soporte para múltiples keys:
- Las keys se pueden separar por coma: `key1,key2,key3`
- O en un archivo de secrets (una por línea o separadas por coma)

## 🔔 Sistema de Notificaciones con Secrets

### Discord Integration:
- `DISCORD_WEBHOOK_URL_FILE`: Ruta al secreto con la URL de Discord webhook

### Webhook General:
- `WEBHOOK_URL_FILE`: Ruta al secreto con URL de webhook general
- `WEBHOOK_SECRET_FILE`: Ruta al secreto con clave para firma HMAC

### Variables de Webhooks Específicos (opcional):
- `SERVICE_STATUS_WEBHOOK_URL_FILE`: Webhook para eventos de estado
- `DEPLOYMENT_WEBHOOK_URL_FILE`: Webhook para eventos de deployment

## 🔄 Cómo Rotar Secretos

```bash
# 1. Actualizar archivos de secretos
echo "nuevo-valor" > secrets/mongodb_uri
echo "nueva-key1,nueva-key2" > secrets/api_keys

# 2. Reiniciar servicio (Docker recargará los secretos)
docker-compose -f docker-compose.production.yml restart bcv-service

# 3. Verificar en logs
docker-compose -f docker-compose.production.yml logs -f bcv-service
```

## 📁 Estructura de Configuración de Secrets

### Código (src/config/secrets.ts)
```typescript
import fs from 'fs';
import log from '../utils/logger';

// Función para leer un secreto desde archivo o variable de entorno
export function readSecret(
  envVar: string,
  fileVar: string,
  defaultValue: string
): string {
  // Prioridad: 1. Archivo de secreto, 2. Variable de entorno, 3. Valor por defecto
  
  if (process.env[fileVar]) {
    try {
      return fs.readFileSync(process.env[fileVar]!, 'utf8').trim();
    } catch (error) {
      log.warn(`Error leyendo archivo de secreto: ${process.env[fileVar]}`, { error });
    }
  }
  
  return process.env[envVar] || defaultValue;
}

// Función para leer una lista de valores desde archivo o variable de entorno
export function readSecretList(
  envVar: string,
  fileVar: string,
  defaultValue: string[]
): string[] {
  const secretValue = readSecret(envVar, fileVar, '');
  
  if (secretValue) {
    return secretValue.split(',').map(key => key.trim()).filter(key => key.length > 0);
  }
  
  return defaultValue;
}
```

## 🔐 Seguridad Best Practices

### ✅ Haz Esto:
- Usa passwords generados con alta entropía
- Rota credenciales cada 90 días
- Usa permisos 600 en archivos de secretos
- Documenta en gestor de passwords
- Usa usuarios diferentes por ambiente (dev/staging/prod)
- Limita el alcance de los usuarios (solo lectura/escritura en bases de datos necesarias)
- Usa secrets para todas las credenciales sensibles

### ❌ NUNCA Hagas Esto:
- `git add secrets/`
- Compartir secretos por email/slack
- Usar mismas credenciales en dev y prod
- Hardcodear credenciales en código
- Commitear archivos con credenciales
- Usar credenciales con permisos excesivos

## 🏗️ Arquitectura de Seguridad

### Inversify Integration:
- Los secrets se inyectan a través de la configuración central
- El contenedor IoC resuelve las dependencias con credenciales seguras
- Las interfaces no exponen credenciales directamente

### Middleware Security:
- Autenticación API Key antes de procesar requests
- Rate limiting para protección contra abuso
- Headers de seguridad con Helmet

## 🛡️ Niveles de Seguridad

### Nivel 1: .env (Desarrollo) ⚠️
```
✓ Fácil de usar
✓ Rápido para desarrollo
⚠️ Riesgo de ser commiteado accidentalmente
⚠️ No encriptado en disco
```

### Nivel 2: Docker Secrets (Producción) ✅
```
✓ Encriptado (en Docker Swarm con external secrets)
✓ Separado del código
✓ Fácil rotación
✓ Auditable
⚠️ Requiere Docker Swarm para encriptación completa
```

### Nivel 3: Cloud Secrets (AWS Secrets Manager, Azure Key Vault, etc.) 🏆
```
✓ Encriptación completa en reposo y en tránsito
✓ Rotación automática
✓ Auditoría completa
✓ Control de acceso granular
⚠️ Complemento adicional (no requerido para esta implementación)
```

## 🔧 Troubleshooting

### Error: "Cannot read secret file"
```bash
# Verificar que el archivo existe
ls -la secrets/

# Verificar permisos (600 para archivos sensibles)
chmod 600 secrets/*

# Verificar contenido (sin espacios extra al final)
cat secrets/mongodb_uri | wc -l  # Debe ser 1 línea
```

### Error: "MongoServerError: Authentication failed"
```bash
# Verificar credenciales en MongoDB
mongosh "$(cat secrets/mongodb_uri)"

# Si falla, verificar formato del URI
# mongodb://user:pass@host:port/db?authSource=admin
```

### El servicio no detecta secrets
```bash
# Verificar variables de entorno
docker-compose exec bcv-service env | grep -E "(FILE|SECRET)"

# Si usas secrets, debe mostrar variables _FILE
# Si no usas secrets, mostrará variables directas
```

### API Keys no funcionan
```bash
# Verificar que las API keys se leen correctamente
# en los logs debería aparecer "Modo: Docker Secrets activado" o similar
# o "Modo: Variables de entorno estándar"

# Probar con curl
curl -H "X-API-Key: tu-api-key" http://localhost:3000/api/rate/latest
```

## 🔄 Migración desde .env

### Antes (Variables de entorno directas):
```yaml
# docker-compose.yml
environment:
  - MONGODB_URI=mongodb://user:pass@host:port/db
  - API_KEYS=key1,key2
```

### Después (Docker Secrets):
```bash
# 1. Crear archivos de secrets
echo "mongodb://user:pass@host:port/db" > secrets/mongodb_uri
echo "key1,key2" > secrets/api_keys
```

```yaml
# 2. Actualizar docker-compose.yml
environment:
  # - MONGODB_URI=mongodb://user:pass@host:port/db  # Comenta esto
  # - API_KEYS=key1,key2                          # Comenta esto
  - MONGODB_URI_FILE=/run/secrets/mongodb_uri      # Descomenta esto
  - API_KEYS_FILE=/run/secrets/api_keys           # Descomenta esto

secrets:
  - mongodb_uri
  - api_keys

# Al final del archivo
secrets:
  mongodb_uri:
    file: ./secrets/mongodb_uri
  api_keys:
    file: ./secrets/api_keys
```

## 📚 Referencias

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Docker Compose Secrets](https://docs.docker.com/compose/use-secrets/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [12 Factor App - Config](https://12factor.net/config)
- [Prometheus Security Guide](https://prometheus.io/docs/operating/security/)

## 🎯 Características Completas

La implementación actual incluye:
- ✅ Docker Secrets para MongoDB URI
- ✅ Docker Secrets para API Keys
- ✅ Docker Secrets para Discord Webhook
- ✅ Docker Secrets para Webhooks HTTP
- ✅ Docker Secrets para Webhook Secret
- ✅ Lectura de secrets con fallback a variables de entorno
- ✅ Soporte para múltiples API keys
- ✅ Logging estructurado sobre modo de configuración (secrets vs env)
- ✅ Validación de secrets antes del uso
- ✅ Seguridad de API con rate limiting
- ✅ Soporte para Redis secrets (si se usa Redis)

El sistema está completamente funcional y listo para producción con las mejores prácticas de seguridad implementadas.

---

**Última actualización**: 2025-11-24
**Versión**: 2.1.0
**Estado**: ✅ Completamente implementado