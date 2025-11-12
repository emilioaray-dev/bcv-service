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

# API Keys
echo ""
echo -e "${GREEN}Configuración de API Keys${NC}"
echo "Generando API keys para autenticación del servicio..."
echo ""

read -p "¿Deseas generar API keys automáticamente? (s/n): " AUTO_GEN_API
echo ""

if [ "$AUTO_GEN_API" = "s" ] || [ "$AUTO_GEN_API" = "S" ]; then
    # Generar múltiples API keys
    API_KEY_1=$(generate_password)
    API_KEY_2=$(generate_password)

    echo -e "${GREEN}✓ API Keys generadas:${NC}"
    echo -e "${YELLOW}Key 1 (Principal): ${API_KEY_1}${NC}"
    echo -e "${YELLOW}Key 2 (Secundaria): ${API_KEY_2}${NC}"
    echo -e "${RED}⚠️  GUARDA ESTAS API KEYS DE FORMA SEGURA${NC}"
    echo ""

    # Guardar como lista (una por línea)
    echo "$API_KEY_1" > "$SECRETS_DIR/api_keys.txt"
    echo "$API_KEY_2" >> "$SECRETS_DIR/api_keys.txt"
else
    echo "Ingresa las API keys (una por línea, presiona Enter dos veces para terminar):"
    > "$SECRETS_DIR/api_keys.txt"

    while true; do
        read -p "API Key (Enter vacío para terminar): " API_KEY
        if [ -z "$API_KEY" ]; then
            break
        fi
        echo "$API_KEY" >> "$SECRETS_DIR/api_keys.txt"
    done

    echo -e "${GREEN}✓ API Keys configuradas${NC}"
fi

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
echo "2. Configura las API Keys en tus clientes"
echo "3. Ejecuta: docker-compose up -d"
echo "4. Verifica que el servicio funcione correctamente"
echo ""
echo -e "${RED}⚠️  IMPORTANTE:${NC}"
echo "- NO comitees los archivos en $SECRETS_DIR/"
echo "- Mantén los secretos en un gestor de contraseñas"
echo "- Rota las credenciales regularmente"
echo "- Comparte las API Keys solo con servicios autorizados"
echo ""
