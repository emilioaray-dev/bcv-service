# Gestión de Secretos con Docker Secrets

Guía para implementar y usar Docker Secrets en el servicio BCV.

## 🔒 ¿Por qué Docker Secrets?

Docker Secrets proporciona:
- **Seguridad**: Credenciales encriptadas en reposo y en tránsito
- **Separación**: Secretos separados del código y configuración
- **Rotación**: Fácil actualización sin rebuild de imágenes
- **Auditoría**: Control de acceso granular

## 📋 Archivos Creados

```
bcv-service/
├── docker-compose.yml           # Docker Compose unificado (con/sin Secrets)
├── scripts/
│   └── generate-secrets.sh      # Script de generación
├── secrets/
│   ├── .gitkeep                 # Mantiene el directorio en git
│   └── mongodb_uri.txt          # Secreto (NO en git)
└── src/config/
    └── secrets.ts               # Utilidad para leer secretos
```

## 🚀 Paso 1: Rotar Credenciales de MongoDB

### En tu servidor MongoDB:

```bash
# Conectar a MongoDB
mongosh admin -u admin -p admin123

# Crear nuevo usuario con credenciales seguras
use bcvdb
db.createUser({
  user: "bcv_user_new",
  pwd: "TU_PASSWORD_SEGURO_GENERADO",  // Usa el script generate-secrets.sh
  roles: [
    { role: "readWrite", db: "bcvdb" }
  ]
})

# Verificar que el nuevo usuario funciona
exit

# Probar conexión
mongosh "mongodb://bcv_user_new:TU_PASSWORD@localhost:27017/bcvdb?authSource=bcvdb"

# Una vez verificado, eliminar el usuario antiguo
mongosh admin -u admin -p admin123
use bcvdb
db.dropUser("bcv_user")
exit
```

## 🔐 Paso 2: Generar Archivos de Secretos

```bash
# Ejecutar script de generación
./scripts/generate-secrets.sh
```

El script te preguntará:
1. Usuario de MongoDB
2. Si quieres generar password automático (recomendado)
3. Host, puerto, base de datos

Creará: `secrets/mongodb_uri.txt` con formato:
```
mongodb://bcv_user_new:PASSWORD@host:port/bcvdb?authSource=bcvdb
```

## 🐳 Paso 3: Configurar Docker Compose

Edita `docker-compose.yml`:

### Para usar Docker Secrets (Producción):

1. **Descomenta** las líneas de secrets en `docker-compose.yml`:
```yaml
environment:
  - MONGODB_URI_FILE=/run/secrets/mongodb_uri  # Descomenta esto

# Descomenta esta sección
secrets:
  - mongodb_uri

# Al final del archivo, descomenta:
secrets:
  mongodb_uri:
    file: ./secrets/mongodb_uri.txt
```

2. **Comenta** la variable `MONGODB_URI` directa

### Para desarrollo sin secrets:

Déjalo como está (usa `MONGODB_URI` directamente o `.env` con `pnpm dev`)

## 🐳 Paso 4: Iniciar el Servicio

```bash
# Iniciar con Docker Compose
docker-compose up -d

# Ver logs
docker-compose logs -f bcv-service

# Detener
docker-compose down
```

### Desarrollo Local (sin Docker):

Sigue usando tu `.env` como siempre:
```bash
pnpm dev
```

El código detecta automáticamente si estás usando Secrets o `.env`.

## 🔍 Verificar que Funciona

```bash
# Ver logs del contenedor
docker-compose logs bcv-service

# Si usas secrets, deberías ver:
# 🔐 Modo: Docker Secrets activado
# ✓ Secreto cargado desde archivo: MONGODB_URI_FILE
# Servidor BCV corriendo en puerto 3000

# Si usas .env o MONGODB_URI directa, verás:
# ⚙️  Modo: Variables de entorno estándar
# Servidor BCV corriendo en puerto 3000
```

## 🔄 Cómo Rotar Secretos

```bash
# 1. Generar nuevas credenciales en MongoDB
# 2. Actualizar archivo de secreto
./scripts/generate-secrets.sh

# 3. Reiniciar servicio (Docker recargará el secreto)
docker-compose restart bcv-service

# 4. Verificar en logs
docker-compose logs -f bcv-service
```

## 📁 Estructura de Secretos

### docker-compose.yml
```yaml
services:
  bcv-service:
    environment:
      # Descomenta para usar secrets
      # - MONGODB_URI_FILE=/run/secrets/mongodb_uri

      # Comenta si usas secrets
      - MONGODB_URI=mongodb://user:pass@host:port/db

    # Descomenta si usas secrets
    # secrets:
    #   - mongodb_uri

# Descomenta si usas secrets
# secrets:
#   mongodb_uri:
#     file: ./secrets/mongodb_uri.txt
```

### Código (src/config/index.ts)
```typescript
import { readSecret } from './secrets';

mongoUri: readSecret(
  'MONGODB_URI',           // Variable de entorno tradicional
  'MONGODB_URI_FILE',      // Variable que apunta al archivo de secreto
  'default value'          // Fallback
)
```

## 🔐 Seguridad Best Practices

### ✅ Haz Esto:
- Usa `generate-secrets.sh` para passwords seguros
- Rota credenciales cada 90 días
- Usa permisos 600 en archivos de secretos
- Documenta en gestor de passwords (1Password, Bitwarden)
- Usa usuarios diferentes por ambiente (dev/staging/prod)

### ❌ NUNCA Hagas Esto:
- `git add secrets/*.txt`
- Compartir secretos por email/slack
- Usar mismas credenciales en dev y prod
- Hardcodear credenciales en código
- Commitear archivos con credenciales

## 🛡️ Niveles de Seguridad

### Nivel 1: .env (Desarrollo) ⚠️
```
✓ Fácil de usar
✓ Rápido para desarrollo
⚠️ Fácil de commitear accidentalmente
⚠️ No encriptado
```

### Nivel 2: Docker Secrets (Producción) ✅
```
✓ Encriptado en reposo
✓ Separado del código
✓ Fácil rotación
✓ Auditable
⚠️ Requiere Docker Swarm para encriptación completa
```

### Nivel 3: Vault/Cloud Secrets (Enterprise) 🏆
```
✓ Encriptación total
✓ Rotación automática
✓ Auditoría completa
✓ Control de acceso granular
⚠️ Más complejo de configurar
```

## 📊 Migración desde .env

### Antes (Variable de entorno directa):
```yaml
# docker-compose.yml
environment:
  - MONGODB_URI=mongodb://user:pass@host:port/db
```

### Después (Docker Secrets):
```bash
# 1. Generar archivo de secreto: secrets/mongodb_uri.txt
./scripts/generate-secrets.sh
```

```yaml
# 2. Actualizar docker-compose.yml
environment:
  # - MONGODB_URI=mongodb://user:pass@host:port/db  # Comenta esto
  - MONGODB_URI_FILE=/run/secrets/mongodb_uri  # Descomenta esto

secrets:
  - mongodb_uri

# Al final del archivo
secrets:
  mongodb_uri:
    file: ./secrets/mongodb_uri.txt
```

## 🔧 Troubleshooting

### Error: "Cannot read secret file"
```bash
# Verificar que el archivo existe
ls -la secrets/

# Verificar permisos
chmod 600 secrets/*.txt

# Verificar contenido (sin espacios extra)
cat secrets/mongodb_uri.txt | wc -l  # Debe ser 1 línea
```

### Error: "MongoServerError: Authentication failed"
```bash
# Verificar credenciales en MongoDB
mongosh "$(cat secrets/mongodb_uri.txt)"

# Si falla, regenerar secreto
./scripts/generate-secrets.sh
```

### El servicio usa .env en lugar de secrets
```bash
# Verificar variable de entorno
docker-compose exec bcv-service env | grep MONGODB

# Si usas secrets, debe mostrar:
# MONGODB_URI_FILE=/run/secrets/mongodb_uri

# Si no usas secrets, mostrará:
# MONGODB_URI=mongodb://...
```

## 📚 Referencias

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)

## ⏭️ Próximos Pasos

1. **Implementado**: Docker Secrets básico
2. **Pendiente Fase 1**: API Key authentication
3. **Pendiente Fase 2**: Structured logging con Winston
4. **Pendiente Fase 4**: Vault integration (opcional)

---

**Última actualización**: 2025-11-11
**Versión**: 1.0.0
**Feature Branch**: feat/secrets-management
