# Microservicio BCV Tasa de Cambio

Microservicio en Node.js con TypeScript que consulta periódicamente la tasa oficial de cambio del Banco Central de Venezuela, almacenando los datos localmente y notificando a servicios suscriptores mediante WebSockets cuando hay cambios.

## Características

- Consulta la tasa de cambio cada 8 horas
- Scraping directo del sitio oficial del BCV (www.bcv.org.ve) 
- Almacenamiento en MongoDB
- Modo consola (sin almacenamiento en base de datos)
- Notificaciones en tiempo real mediante WebSockets
- API REST para consultas programáticas
- Docker y Docker Compose para contenerización
- Formateo y calidad de código con Biome

## Requisitos

- Node.js 18+
- pnpm
- MongoDB (opcional en modo consola)
- Docker (opcional, para contenedores)

## Instalación

1. Clona el repositorio
2. Instala las dependencias:

```bash
pnpm install
```

3. Crea un archivo `.env` con las variables de entorno necesarias (ver `.env.example`)

## Variables de Entorno

### Obligatorias
- `PORT`: Puerto donde correrá el servicio (por defecto: 3000)
- `MONGODB_URI`: URL de conexión a la base de datos MongoDB
- `BCV_WEBSITE_URL`: URL del sitio web oficial del BCV (por defecto: https://www.bcv.org.ve/)

### Opcionales
- `REDIS_URL`: URL de conexión a Redis (por defecto: redis://localhost:6379)
- `CRON_SCHEDULE`: Programación para tareas periódicas (por defecto: cada 8 horas)
- `NODE_ENV`: Entorno de ejecución (development/production)
- `SAVE_TO_DATABASE`: Habilita/deshabilita el almacenamiento en base de datos (por defecto: true)

## Modo Consola

El servicio incluye un modo especial de consola que permite probar y verificar la obtención de datos del BCV sin almacenarlos en la base de datos:

- **Activar modo consola**: `SAVE_TO_DATABASE=false`
- En este modo, el servicio:
  - No se conecta a MongoDB
  - Sigue haciendo scraping del sitio oficial del BCV
  - Muestra los resultados en consola con el mensaje: `[MODO CONSOLA] Tasa cambiada: [valor] ([fecha]) - NO se almacenó en DB`
  - Los endpoints de API devuelven error 405 indicando que está en modo consola
  - La funcionalidad de WebSockets se mantiene operativa

## Scripts Disponibles

- `pnpm build`: Compila el código TypeScript
- `pnpm start`: Inicia el servicio en modo producción
- `pnpm dev`: Inicia el servicio en modo desarrollo con auto-reload
- `pnpm lint`: Verifica el código con Biome
- `pnpm lint:fix`: Corrige errores de código con Biome
- `pnpm format`: Formatea el código con Biome
- `pnpm test`: Ejecuta las pruebas unitarias

## API Endpoints

- `GET /api/rate/latest` - Obtener la tasa más reciente
- `GET /api/rate/history?limit=30` - Obtener historial de tasas (máximo 30 registros)
- `GET /api/rate/:date` - Obtener tasa para una fecha específica (formato: YYYY-MM-DD)

**Nota**: Estos endpoints solo funcionan cuando `SAVE_TO_DATABASE=true`

## WebSockets

El servicio expone un servidor WebSocket para notificaciones en tiempo real. Los clientes pueden conectarse al servidor y recibir eventos cuando hay actualizaciones en la tasa de cambio.

Evento: `rate-update`
```json
{
  "timestamp": "2025-11-11T10:30:00.000Z",
  "rate": 36.1500,
  "change": 0.0050,
  "eventType": "rate-update"
}
```

## Docker

Para construir y ejecutar con Docker:

```bash
# Construir la imagen
docker build -t bcv-service .

# Ejecutar el contenedor
docker run -p 3000:3000 bcv-service
```

O con docker-compose (sin servicio MongoDB interno):

```bash
docker-compose up -d
```

**Nota**: El docker-compose.yml no incluye el servicio MongoDB para permitir escalabilidad y desacoplamiento, conectándose a un MongoDB externo a través de MONGODB_URI.

## Arquitectura

- `src/services/`: Lógica de negocio (consulta BCV, caché, WebSockets)
- `src/controllers/`: Controladores para la API REST
- `src/models/`: Modelos de datos
- `src/config/`: Configuración de la aplicación
- `src/utils/`: Utilidades generales

## Optimización de Escritura

El servicio implementa una lógica de verificación para evitar escrituras innecesarias en la base de datos:
- Antes de guardar una nueva tasa, compara con la última almacenada
- Solo escribe en la base de datos si hay un cambio significativo (más de 0.0001 de diferencia)
- Si no hay cambios, muestra: `Tasa sin cambios: [valor], no se almacenó`

## Solución de Problemas

### Puerto ya en uso (EADDRINUSE)

Si recibes el error `Error: listen EADDRINUSE: address already in use :::3000`:

- El puerto 3000 ya está ocupado por otro proceso
- Soluciones:
  1. Encuentra el proceso: `lsof -i :3000`
  2. Termina el proceso: `kill -9 <PID>` (reemplaza <PID> con el ID del proceso)
  3. O cambia el puerto en la variable de entorno `PORT`

### Problemas de Scraping

- Si el scraping falla, puede ser porque:
  - El sitio web del BCV ha cambiado su estructura HTML
  - Hay problemas temporales de conexión
  - Se requiere actualización de los selectores CSS

### Certificados SSL

En algunos entornos puede haber problemas con la verificación de certificados del sitio del BCV. En entornos de desarrollo, estos se manejan automáticamente por la librería axios.

## Contribución

1. Haz un fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-feature`)
3. Asegúrate de seguir las reglas de formateo con Biome
4. Haz commit de tus cambios (`git commit -m 'Añadir nueva feature'`)
5. Haz push a la rama (`git push origin feature/nueva-feature`)
6. Abre un Pull Request

## Licencia

MIT