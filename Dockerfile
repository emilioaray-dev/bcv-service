# Usa una imagen base de Node.js con Alpine Linux para un tamaño más pequeño
FROM node:20-alpine

# Instala pnpm globalmente
RUN npm install -g pnpm

# Crea el directorio de trabajo
WORKDIR /app

# Copia package.json y pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Instala las dependencias con pnpm
RUN pnpm install --frozen-lockfile

# Copia los archivos de configuración
COPY tsconfig.json biome.json ./

# Copia el código fuente
COPY src ./src

# Compila el código TypeScript
RUN pnpm build

# Expone el puerto (por defecto 3000, pero la aplicación usará la variable PORT)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "dist/app.js"]