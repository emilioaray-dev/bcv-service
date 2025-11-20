# Configuración de Deployment Automático a Proxmox

Este documento explica cómo configurar el deployment automático desde GitHub Actions a tu VM de Proxmox.

## Flujo de Deployment Automático

Cada vez que haces push a `main`:
1. ✅ GitHub Actions construye la imagen Docker
2. ✅ La imagen se publica en GitHub Container Registry (GHCR)
3. ✅ Se conecta automáticamente a tu VM de Proxmox vía SSH
4. ✅ Descarga la nueva imagen
5. ✅ Reinicia los contenedores con la nueva versión
6. ✅ Muestra logs del deployment en GitHub Actions

## Configuración Requerida

### 1. Generar Par de Claves SSH

En tu máquina local, genera un par de claves SSH específico para deployment:

```bash
# Generar nueva clave SSH (sin passphrase para automatización)
ssh-keygen -t ed25519 -C "github-actions-deployment" -f ~/.ssh/github_actions_deploy

# Esto creará dos archivos:
# - ~/.ssh/github_actions_deploy      (clave privada - para GitHub Secrets)
# - ~/.ssh/github_actions_deploy.pub  (clave pública - para Proxmox VM)
```

### 2. Configurar la VM de Proxmox

Copia la clave pública a tu VM de Proxmox:

```bash
# Opción 1: Usando ssh-copy-id
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub usuario@IP_PROXMOX_VM

# Opción 2: Manualmente
# En tu VM de Proxmox, agregar la clave pública a:
# ~/.ssh/authorized_keys
```

Asegúrate de que Docker y Docker Compose están instalados en la VM:

```bash
# Verificar instalaciones
docker --version
docker-compose --version
```

### 3. Preparar el Proyecto en Proxmox VM

```bash
# En tu VM de Proxmox, crear el directorio del proyecto
sudo mkdir -p /opt/bcv-service
sudo chown -R $USER:$USER /opt/bcv-service

# Copiar archivos necesarios (docker-compose.yml y .env)
cd /opt/bcv-service

# Crear archivo .env con tus configuraciones
nano .env
```

**Importante**: El `docker-compose.yml` en Proxmox debe usar la imagen de GHCR en lugar de build local:

```yaml
services:
  bcv-service:
    # Usar imagen publicada en GitHub Container Registry
    image: ghcr.io/emilioaray-dev/bcv-service:main
    # NO usar: build: .

    container_name: bcv-service
    # ... resto de la configuración
```

### 4. Configurar GitHub Secrets

Ve a tu repositorio en GitHub: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Agrega los siguientes secrets:

#### PROXMOX_HOST
```
IP o hostname de tu VM de Proxmox
Ejemplo: 192.168.1.100
```

#### PROXMOX_USER
```
Usuario SSH en la VM
Ejemplo: root o tu_usuario
```

#### PROXMOX_SSH_KEY
```
Contenido de la clave privada SSH
```

Para copiar el contenido:
```bash
# En tu máquina local
cat ~/.ssh/github_actions_deploy
# Copiar TODO el contenido, incluyendo:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

#### PROXMOX_PORT (opcional)
```
Puerto SSH (por defecto es 22)
Si usas un puerto diferente, especifícalo aquí
```

#### PROXMOX_PROJECT_PATH (opcional)
```
Ruta completa donde está el proyecto en Proxmox
Por defecto: /opt/bcv-service
Si usas otra ruta, especifícala aquí
```

### 5. Verificar que GH_PAT está configurado

El secret `GH_PAT` (GitHub Personal Access Token) debe estar configurado con permisos para:
- ✅ `read:packages` - Leer paquetes del Container Registry
- ✅ `write:packages` - Escribir paquetes al Container Registry

## Verificación del Deployment

### En GitHub Actions

1. Ve a la pestaña `Actions` en tu repositorio
2. Verás el workflow `Build, Publish and Deploy`
3. Cada ejecución mostrará dos jobs:
   - `build-and-push-image`: Construcción y publicación
   - `deploy-to-proxmox`: Deployment a la VM

### Logs Visibles

El job `deploy-to-proxmox` mostrará logs detallados:
```
🚀 Iniciando deployment en Proxmox VM
📦 Imagen: ghcr.io/emilioaray-dev/bcv-service:main
📊 Estado actual de contenedores
🔐 Autenticando en GHCR...
⬇️ Descargando nueva imagen...
🛑 Deteniendo contenedores...
▶️ Iniciando contenedores actualizados...
⏳ Esperando a que los servicios estén listos...
✅ Estado final de contenedores
📝 Logs recientes del servicio
🧹 Limpiando imágenes antiguas...
✅ Deployment completado exitosamente!
```

### Verificación Manual en Proxmox

Conéctate a tu VM y verifica:

```bash
ssh usuario@IP_PROXMOX_VM

# Ver contenedores en ejecución
docker-compose ps

# Ver logs del servicio
docker-compose logs -f bcv-service

# Verificar imagen actual
docker images | grep bcv-service
```

## Troubleshooting

### Error: Permission denied (publickey)
- Verifica que la clave pública esté en `~/.ssh/authorized_keys` en Proxmox
- Asegúrate de copiar la clave privada COMPLETA en el secret
- Verifica que el usuario tenga permisos correctos

### Error: docker-compose: command not found
```bash
# Instalar docker-compose en Proxmox VM
sudo apt update
sudo apt install docker-compose
```

### Error: Cannot connect to Docker daemon
```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar
```

### Ver logs de deployment en tiempo real
En GitHub Actions, haz clic en el job `deploy-to-proxmox` para ver los logs en vivo mientras se ejecuta.

## Rollback Manual

Si necesitas volver a una versión anterior:

```bash
# En Proxmox VM
cd /opt/bcv-service

# Ver imágenes disponibles
docker images | grep bcv-service

# Modificar docker-compose.yml para usar un tag específico
# Cambiar: ghcr.io/emilioaray-dev/bcv-service:main
# Por:     ghcr.io/emilioaray-dev/bcv-service:sha-abc123

# Reiniciar con la versión específica
docker-compose down
docker-compose up -d
```

## Seguridad

- ✅ La clave SSH es exclusiva para deployment (no reutilices tu clave personal)
- ✅ Los secrets nunca se exponen en los logs
- ✅ La comunicación SSH está cifrada
- ✅ El token GH_PAT tiene permisos mínimos necesarios
- ✅ Las credenciales de MongoDB están en variables de entorno, no en código

## Próximos Pasos

Una vez configurado, cada push a `main` activará automáticamente:
1. Build de la imagen
2. Publicación en GHCR
3. Deployment a Proxmox
4. Logs visibles en GitHub Actions

¡Todo quedará documentado y rastreable en la pestaña Actions!
