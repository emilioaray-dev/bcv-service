# Secrets Directory

Este directorio almacena los secretos necesarios para ejecutar el servicio.

## 🔐 Gestión de Secretos con SOPS

Este proyecto usa **SOPS (Secrets OPerationS)** + **age** para encriptar secretos que se almacenan de forma segura en Git.

### Quick Start

```bash
# 1. Setup inicial (genera keys, crea archivos)
./scripts/setup-sops.sh

# 2. Edita los secretos con tus valores reales
nano secrets/dev.env
nano secrets/production.env

# 3. Encripta los secretos
./scripts/encrypt-secrets.sh all

# 4. Commitea los archivos encriptados
git add secrets/*.env.enc .sops.yaml
git commit -m "feat: add encrypted secrets"
```

**Ver documentación completa**: [docs/guides/SECRETS_ENCRYPTION.md](../docs/guides/SECRETS_ENCRYPTION.md)

---

## Archivos de Secretos

### Para SOPS (Recomendado)

Los archivos `.env` por ambiente:
- `dev.env` - Desarrollo
- `staging.env` - Staging
- `production.env` - Producción

Estos archivos se encriptan a `.env.enc` y solo los archivos encriptados se commitean.

### Para Docker Secrets (Alternativa)

### Requeridos

1. **mongodb_uri.txt** - URI de conexión a MongoDB
   ```
   mongodb://username:password@host:27017/database?authSource=admin
   ```

2. **redis_password.txt** - Contraseña de Redis (si Redis está habilitado)
   ```
   your-redis-password
   ```

3. **api_key.txt** - API Key para autenticación de endpoints
   ```
   your-secure-api-key
   ```

### Opcionales

4. **discord_webhook.txt** - Webhook URL de Discord para notificaciones (si está habilitado)
   ```
   https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN
   ```

## Configuración

### Desarrollo Local

Para desarrollo local, copie los archivos de ejemplo y modifíquelos con sus valores:

```bash
cp mongodb_uri.txt.example mongodb_uri.txt
cp redis_password.txt.example redis_password.txt
cp api_key.txt.example api_key.txt
cp discord_webhook.txt.example discord_webhook.txt
```

Luego edite cada archivo con sus valores reales.

### Producción con Docker Compose

Los archivos en este directorio son utilizados por `docker-compose.prod.yml` como Docker Secrets:

```yaml
secrets:
  mongodb_uri:
    file: ./secrets/mongodb_uri.txt
  redis_password:
    file: ./secrets/redis_password.txt
```

### Seguridad

⚠️ **IMPORTANTE**:
- **NUNCA** commitear archivos de secretos reales al repositorio
- Los archivos `*.txt` están excluidos en `.gitignore`
- Solo los archivos `*.example` deben estar en el repositorio
- Use permisos restrictivos: `chmod 600 secrets/*.txt`

### Verificación

Para verificar que los secretos están correctamente configurados:

```bash
# Verificar que los archivos existen
ls -la secrets/*.txt

# Verificar permisos (deben ser 600 o similar)
stat secrets/*.txt

# Verificar que no están vacíos
for file in secrets/*.txt; do
  echo "$file: $(wc -c < "$file") bytes"
done
```

### Troubleshooting

**Error: "secret not found"**
- Verifique que el archivo existe en `secrets/`
- Verifique que el nombre del archivo coincide con el declarado en `docker-compose.prod.yml`

**Error: "permission denied"**
- Verifique los permisos del archivo: `chmod 600 secrets/*.txt`
- Verifique el propietario del archivo

**Secreto no se lee correctamente**
- Verifique que el archivo no tenga espacios en blanco al final
- Verifique que use codificación UTF-8
- Use `cat -A secrets/file.txt` para ver caracteres ocultos

## Referencias

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Guía de CI/CD](../docs/guides/CI_CD.md)
- [Guía de Secrets Management](../docs/guides/SECRETS_MANAGEMENT.md)
