# Microservicio BCV Tasa de Cambio

Microservicio en Node.js con TypeScript que consulta periódicamente la tasa oficial de cambio del Banco Central de Venezuela, almacenando los datos localmente y notificando a servicios suscriptores mediante WebSockets cuando hay cambios.

## 🚀 Características

### Core Features
- ✅ Consulta automatizada de tasa de cambio cada 8 horas
- ✅ Scraping directo del sitio oficial del BCV (www.bcv.org.ve)
- ✅ Almacenamiento en MongoDB con modo consola opcional
- ✅ Notificaciones en tiempo real mediante WebSockets
- ✅ API REST con autenticación por API Key
- ✅ Rate limiting para protección contra abuso

### Arquitectura y Calidad
- ✅ **Arquitectura SOLID** con Inversify para Dependency Injection
- ✅ Logging estructurado con Winston
- ✅ Testing con Vitest
- ✅ Gestión segura de secretos con Docker Secrets
- ✅ Formateo y calidad de código con Biome

### Observability
- ✅ **Health Checks** para Kubernetes (liveness/readiness probes)
- ✅ **Métricas de Prometheus** para monitoreo
- ✅ Tracking automático de requests HTTP
- ✅ Métricas de negocio (tasas BCV, clientes WebSocket)

## 📋 Requisitos

- Node.js 18+
- pnpm
- MongoDB (opcional en modo consola)
- Docker (opcional, para contenedores)

## 🔧 Instalación Rápida

```bash
# Clonar el repositorio
git clone https://github.com/emilioaray-dev/bcv-service.git
cd bcv-service

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar en desarrollo
pnpm dev
```

Para más detalles, ver [Guía de Configuración Local](docs/guides/SETUP_LOCAL.md) o [Quick Start](docs/guides/QUICK_START.md).

## 📚 Documentación

La documentación está organizada en las siguientes secciones:

### Guías
- [**Quick Start**](docs/guides/QUICK_START.md) - Inicio rápido del proyecto
- [**Setup Local**](docs/guides/SETUP_LOCAL.md) - Configuración del entorno local
- [**Secrets Management**](docs/guides/SECRETS_MANAGEMENT.md) - Gestión segura de credenciales
- [**Logging**](docs/guides/LOGGING.md) - Sistema de logging estructurado
- [**Observability**](docs/guides/OBSERVABILITY.md) - Health checks y métricas de Prometheus

### Arquitectura
- [**Plan de Arquitectura**](docs/architecture/PLAN.md) - Planificación arquitectónica
- [**Mejoras**](docs/architecture/MEJORAS.md) - Mejoras implementadas
- [**Resumen de Mejoras**](docs/architecture/RESUMEN_MEJORAS.md) - Resumen ejecutivo

### Desarrollo
- [**Branch Strategy**](docs/development/BRANCH_STRATEGY.md) - Estrategia de branching
- [**Tasks**](docs/development/TASKS.md) - Tareas y roadmap del proyecto

## 🔌 API Endpoints

### REST API (requiere autenticación)
```bash
# Obtener la tasa más reciente
GET /api/rate/latest

# Obtener historial (máximo 30 registros)
GET /api/rate/history?limit=30

# Obtener tasa para fecha específica
GET /api/rate/:date  # formato: YYYY-MM-DD
```

**Autenticación**: Incluir header `X-API-Key` con tu API key.

### Health Checks (sin autenticación)
```bash
# Health check completo
GET /health

# Kubernetes liveness probe
GET /healthz

# Kubernetes readiness probe
GET /readyz

# Health checks individuales
GET /health/mongodb
GET /health/scheduler
GET /health/bcv
GET /health/websocket
```

### Métricas (sin autenticación)
```bash
# Métricas de Prometheus
GET /metrics
```

Ver [Documentación de Observability](docs/guides/OBSERVABILITY.md) para más detalles.

## 🌐 WebSockets

Conéctate para recibir actualizaciones en tiempo real:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.on('message', (data) => {
  const update = JSON.parse(data);
  console.log('Tasa actualizada:', update);
});
```

**Formato del evento:**
```json
{
  "timestamp": "2025-11-12T10:30:00.000Z",
  "rate": 36.50,
  "rates": [
    { "currency": "USD", "rate": 36.50, "name": "Dólar" },
    { "currency": "EUR", "rate": 39.20, "name": "Euro" }
  ],
  "change": 0.05,
  "eventType": "rate-update"
}
```

## ⚙️ Variables de Entorno

### Obligatorias
```bash
PORT=3000                    # Puerto del servicio
MONGODB_URI=mongodb://...    # Conexión a MongoDB
BCV_WEBSITE_URL=https://...  # URL del sitio del BCV
API_KEY=your-secret-key      # API key para autenticación
```

### Opcionales
```bash
CRON_SCHEDULE="0 2,10,18 * * *"  # Cada 8 horas (2am, 10am, 6pm)
NODE_ENV=development              # Entorno de ejecución
SAVE_TO_DATABASE=true             # Habilitar almacenamiento en DB
LOG_LEVEL=info                    # Nivel de logs (error, warn, info, debug)
```

Ver [Secrets Management](docs/guides/SECRETS_MANAGEMENT.md) para gestión segura de credenciales.

## 🐳 Docker

### Desarrollo
```bash
docker-compose up -d
```

### Producción
```bash
# Construir imagen
docker build -t bcv-service:latest .

# Ejecutar contenedor
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://... \
  -e API_KEY=your-key \
  bcv-service:latest
```

## 🏗️ Arquitectura SOLID

El proyecto implementa los principios SOLID con Inversify para Dependency Injection:

```
src/
├── Application.ts              # Bootstrap de la aplicación
├── config/
│   ├── inversify.config.ts    # Configuración del contenedor IoC
│   └── types.ts               # Symbols para DI
├── interfaces/                # Abstracciones (DIP)
│   ├── IBCVService.ts
│   ├── IWebSocketService.ts
│   ├── ISchedulerService.ts
│   ├── IHealthCheckService.ts
│   └── IMetricsService.ts
├── services/                  # Implementaciones de servicios
│   ├── bcv.service.ts
│   ├── websocket.service.ts
│   ├── scheduler.service.ts
│   ├── health-check.service.ts
│   └── metrics.service.ts
├── controllers/               # Controladores HTTP
│   ├── rate.controller.ts
│   ├── health.controller.ts
│   └── metrics.controller.ts
├── middleware/                # Middleware de Express
└── utils/                     # Utilidades compartidas
```

**Beneficios:**
- ✅ Testabilidad mejorada con mocking sencillo
- ✅ Desacoplamiento entre componentes
- ✅ Extensibilidad sin modificar código existente
- ✅ Cumplimiento de principios SOLID

## 🧪 Testing

```bash
# Ejecutar todos los tests
pnpm test

# Tests con coverage
pnpm test:coverage

# Tests en modo watch
pnpm test:watch

# UI de tests
pnpm test:ui
```

## 📊 Monitoreo

### Prometheus + Grafana

1. **Configurar Prometheus** para scraping del endpoint `/metrics`
2. **Crear dashboards** en Grafana con las métricas expuestas
3. **Configurar alertas** basadas en las métricas de negocio

Ver [Documentación de Observability](docs/guides/OBSERVABILITY.md) para configuración detallada.

### Métricas Clave

- `http_requests_total`: Requests HTTP por endpoint
- `http_request_duration_seconds`: Latencia de requests
- `bcv_websocket_connected_clients`: Clientes WebSocket activos
- `bcv_update_total`: Actualizaciones exitosas/fallidas
- `bcv_latest_rate`: Última tasa obtenida

## 🔍 Scripts Disponibles

```bash
pnpm build          # Compilar TypeScript
pnpm start          # Iniciar en producción
pnpm dev            # Iniciar en desarrollo con auto-reload
pnpm test           # Ejecutar tests
pnpm test:coverage  # Tests con coverage
pnpm test:ui        # UI de tests
pnpm lint           # Verificar código con Biome
pnpm lint:fix       # Corregir errores de código
pnpm format         # Formatear código
```

## 💡 Modo Consola

Para desarrollo/testing sin MongoDB:

```bash
SAVE_TO_DATABASE=false pnpm dev
```

En este modo:
- ❌ No se conecta a MongoDB
- ✅ Scraping del BCV funciona normalmente
- ✅ Logs muestran las tasas obtenidas
- ✅ WebSockets siguen operativos
- ❌ API REST retorna error 405

## 🛠️ Solución de Problemas

### Puerto en uso
```bash
# Encontrar proceso
lsof -i :3000

# Terminar proceso
kill -9 <PID>

# O cambiar puerto
PORT=3001 pnpm dev
```

### Problemas de scraping
- Verificar conectividad con www.bcv.org.ve
- El sitio puede haber cambiado su estructura HTML
- Revisar logs en `logs/combined.log`

### Problemas de certificados SSL
- En desarrollo, axios maneja certificados automáticamente
- En producción, configurar certificados válidos

Ver [Setup Local](docs/guides/SETUP_LOCAL.md) para más troubleshooting.

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/amazing-feature`)
3. Seguir convenciones de código (Biome)
4. Escribir tests para nuevas features
5. Commit con convención (`git commit -m 'feat: add amazing feature'`)
6. Push a la rama (`git push origin feature/amazing-feature`)
7. Abrir Pull Request

Ver [Branch Strategy](docs/development/BRANCH_STRATEGY.md) para más detalles.

## 📝 Licencia

MIT

## 🔗 Links Útiles

- [Sitio oficial BCV](https://www.bcv.org.ve/)
- [Documentación de Prometheus](https://prometheus.io/docs/)
- [Inversify Documentation](https://inversify.io/)
- [Vitest Documentation](https://vitest.dev/)

---

**Mantenido por**: [@emilioaray-dev](https://github.com/emilioaray-dev)
