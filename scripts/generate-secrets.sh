#!/bin/bash

# Script para generar archivos de secretos
# Uso: ./scripts/generate-secrets.sh

set -e

SECRETS_DIR="./secrets"
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${BOLD}🔐 Generador de Secretos para BCV Service${NC}\n"

# Crear directorio de secretos si no existe
if [ ! -d "$SECRETS_DIR" ]; then
    echo -e "${YELLOW}📁 Creando directorio de secretos...${NC}"
    mkdir -p "$SECRETS_DIR"
fi

# Función para generar password seguro
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Función para solicitar información al usuario
prompt_mongodb_uri() {
    echo -e "${GREEN}MongoDB Configuration${NC}"
    echo "Por favor ingresa la información de conexión a MongoDB:"
    echo ""

    read -p "Usuario de MongoDB (ej: bcv_user): " MONGO_USER
    echo ""

    echo -e "${YELLOW}¿Deseas generar un password seguro automáticamente? (s/n)${NC}"
    read -p "Respuesta: " AUTO_GEN

    if [ "$AUTO_GEN" = "s" ] || [ "$AUTO_GEN" = "S" ]; then
        MONGO_PASS=$(generate_password)
        echo -e "${GREEN}✓ Password generado: ${MONGO_PASS}${NC}"
        echo -e "${RED}⚠️  GUARDA ESTE PASSWORD DE FORMA SEGURA${NC}"
    else
        read -sp "Password de MongoDB: " MONGO_PASS
        echo ""
    fi

    read -p "Host de MongoDB (ej: 192.168.11.185): " MONGO_HOST
    read -p "Puerto de MongoDB (default: 27017): " MONGO_PORT
    MONGO_PORT=${MONGO_PORT:-27017}

    read -p "Nombre de la base de datos (default: bcvdb): " MONGO_DB
    MONGO_DB=${MONGO_DB:-bcvdb}

    read -p "AuthSource (default: bcvdb): " MONGO_AUTH_SOURCE
    MONGO_AUTH_SOURCE=${MONGO_AUTH_SOURCE:-bcvdb}

    # Construir URI
    MONGODB_URI="mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=${MONGO_AUTH_SOURCE}"

    echo ""
    echo -e "${GREEN}✓ MongoDB URI configurada${NC}"
}

# Verificar si los secretos ya existen
if [ -f "$SECRETS_DIR/mongodb_uri.txt" ]; then
    echo -e "${YELLOW}⚠️  Los archivos de secretos ya existen.${NC}"
    read -p "¿Deseas sobrescribirlos? (s/n): " OVERWRITE
    if [ "$OVERWRITE" != "s" ] && [ "$OVERWRITE" != "S" ]; then
        echo -e "${RED}Operación cancelada.${NC}"
        exit 0
    fi
    echo ""
fi

# Generar secretos
echo -e "${BOLD}Configurando secretos...${NC}\n"

# MongoDB URI
prompt_mongodb_uri

# Guardar secretos
echo "$MONGODB_URI" > "$SECRETS_DIR/mongodb_uri.txt"

# Establecer permisos restrictivos
chmod 600 "$SECRETS_DIR"/*.txt

echo ""
echo -e "${GREEN}${BOLD}✓ Secretos generados exitosamente!${NC}\n"
echo "Archivos creados en $SECRETS_DIR/"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "1. Actualiza las credenciales en tu servidor MongoDB"
echo "2. Ejecuta: docker-compose -f docker-compose.secrets.yml up -d"
echo "3. Verifica que el servicio funcione correctamente"
echo ""
echo -e "${RED}⚠️  IMPORTANTE:${NC}"
echo "- NO comitees los archivos en $SECRETS_DIR/"
echo "- Mantén los secretos en un gestor de contraseñas"
echo "- Rota las credenciales regularmente"
echo ""
