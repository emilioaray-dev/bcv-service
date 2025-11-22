#!/bin/bash
set -e # Salir inmediatamente si un comando falla

# Asegúrate de estar en el directorio correcto (donde está docker-compose.production.yml)
cd "$(dirname "$0")"

echo "🔐 Re-autenticando en GitHub Container Registry..."
# Asegúrate de que las variables de entorno TU_USUARIO_DE_GITHUB y TU_TOKEN estén configuradas
# O que tu sesión de docker ya esté logeada.
# Por seguridad, no incluyas el token directamente aquí. Se asume que el login ya se hizo o que hay credenciales disponibles.
# Si necesitas automatizar el login con el script, tendrías que pasar las credenciales de forma segura (ej. desde un archivo de secretos o variables de entorno)
# echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
echo "Se asume que ya has iniciado sesión en ghcr.io con 'docker login'."

COMPOSE_FILE="docker-compose.production.yml"

echo "⬇️ Descargando las últimas imágenes de Docker..."
docker-compose -f $COMPOSE_FILE pull

echo "♻️ Reiniciando los servicios con las nuevas imágenes..."
# 'down --remove-orphans' detiene y elimina contenedores, redes y volúmenes definidos en el archivo compose.
# '--remove-orphans' elimina servicios para los que ya no hay un contenedor en el compose.
# 'up -d' recrea y arranca los servicios en modo detached.
docker-compose -f $COMPOSE_FILE down --remove-orphans
docker-compose -f $COMPOSE_FILE up -d

echo "🧹 Limpiando imágenes de Docker antiguas..."
docker image prune -f

echo "✅ Despliegue completado y servicio actualizado."
docker-compose -f $COMPOSE_FILE ps
