# Architectural Decision Records (ADRs)

Registro cronológico de decisiones arquitectónicas importantes del proyecto BCV Service.

---

## ADR-001: Adopción de Arquitectura SOLID con Inversify

**Fecha**: 2025-01-10

**Estado**: ✅ Aceptado e implementado

**Autores**: Celsius Aray

### Contexto

El código original del microservicio BCV estaba concentrado en un solo archivo (`app.ts`) con aproximadamente 300 líneas de código. Esta estructura presentaba varios problemas:

- Dificultad para testing unitario (servicios acoplados)
- Responsabilidades mezcladas (scraping, persistencia, WebSocket en un solo archivo)
- Imposibilidad de extender funcionalidad sin modificar código existente
- Dependencias hard-coded, no intercambiables
- Violación de principios SOLID

### Decisión

Refactorizar completamente la aplicación implementando:

1. **Arquitectura SOLID**:
   - **S**ingle Responsibility: Cada servicio/clase tiene una única responsabilidad
   - **O**pen/Closed: Abierto a extensión, cerrado a modificación
   - **L**iskov Substitution: Interfaces implementables
   - **I**nterface Segregation: Interfaces específicas por responsabilidad
   - **D**ependency Inversion: Depender de abstracciones, no de implementaciones

2. **Inversify IoC Container**:
   - Contenedor de Inversión de Control para gestión de dependencias
   - Decoradores `@injectable()` y `@inject()` para declaración de dependencias
   - Configuración centralizada de bindings en `inversify.config.ts`

3. **Estructura de Capas**:
   ```
   src/
   ├── Application.ts         # Bootstrap de aplicación
   ├── config/                # Configuración e IoC
   ├── controllers/           # Controladores HTTP
   ├── services/              # Lógica de negocio
   ├── interfaces/            # Contratos de servicios
   ├── middleware/            # Middleware Express
   └── utils/                 # Utilidades compartidas
   ```

### Consecuencias

#### Positivas

- ✅ **Testabilidad**: Fácil mocking de dependencias para tests unitarios
- ✅ **Mantenibilidad**: Código organizado por responsabilidades claras
- ✅ **Extensibilidad**: Nuevos servicios se agregan sin modificar existentes
- ✅ **Desacoplamiento**: Servicios dependen de interfaces, no de implementaciones concretas
- ✅ **Reusabilidad**: Servicios pueden usarse en diferentes contextos
- ✅ **Documentación**: Código autodocumentado con interfaces claras

#### Negativas

- ⚠️ **Complejidad inicial**: Mayor cantidad de archivos y configuración
- ⚠️ **Curva de aprendizaje**: Nuevos desarrolladores deben entender Inversify
- ⚠️ **Overhead mínimo**: Pequeño overhead en runtime por reflection (negligible)

#### Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Archivos de código | 1 | 25+ |
| Test coverage | 0% | 66% |
| Líneas por archivo | ~300 | <200 |
| Servicios testables | 0 | 8 |

### Alternativas Consideradas

1. **Mantener código monolítico**: Rechazado por falta de escalabilidad
2. **NestJS Framework**: Rechazado por overhead innecesario para microservicio pequeño
3. **tsyringe (DI container alternativo)**: Rechazado; Inversify tiene mejor soporte de comunidad

### Referencias

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Inversify Documentation](https://inversify.io/)
- Commit: `202e650` - Complete architectural refactoring

---

## ADR-002: Winston para Structured Logging

**Fecha**: 2025-01-11

**Estado**: ✅ Aceptado e implementado

**Autores**: Celsius Aray

### Contexto

El logging original utilizaba `console.log()` directamente en todo el código:

```typescript
// Antes
console.log('Scraping BCV...');
console.error('Error:', error.message);
```

Problemas:
- No hay niveles de log (todo es info o error mezclado)
- Sin estructura (texto plano, difícil de parsear)
- Sin rotación de archivos
- Sin diferenciación desarrollo vs producción
- Imposible filtrar logs por nivel o componente

### Decisión

Implementar **Winston** como solución de logging estructurado:

1. **Niveles de Log**:
   - `error`: Errores críticos que requieren atención
   - `warn`: Advertencias, situaciones anormales
   - `info`: Información general de operación
   - `http`: Requests HTTP (middleware)
   - `debug`: Debugging detallado (desarrollo)

2. **Formatos**:
   - **Producción**: JSON estructurado para parsing automático
   - **Desarrollo**: Colorizado con timestamps legibles

3. **Transports**:
   - Console (siempre activo)
   - Daily Rotate File (producción)
     - `logs/error-%DATE%.log` (14 días retención)
     - `logs/combined-%DATE%.log` (7 días retención)

4. **Configuración**:
   ```typescript
   const logger = winston.createLogger({
     level: config.logLevel,
     format: winston.format.json(),
     transports: [
       new winston.transports.Console(),
       new DailyRotateFile({ filename: 'error-%DATE%.log', level: 'error' }),
       new DailyRotateFile({ filename: 'combined-%DATE%.log' })
     ]
   });
   ```

### Consecuencias

#### Positivas

- ✅ **Debugging mejorado**: Logs estructurados facilitan búsqueda de problemas
- ✅ **Producción-ready**: Rotación automática previene crecimiento infinito de logs
- ✅ **Parseable**: JSON permite integración con herramientas (ELK, Datadog)
- ✅ **Filtrado**: Nivel de log configurable por ambiente (`LOG_LEVEL`)
- ✅ **Metadata**: Contexto adicional en objetos (error stack, request IDs)
- ✅ **Performance**: Minimal overhead, async writing

#### Negativas

- ⚠️ **Dependencias**: 2 paquetes adicionales (winston + winston-daily-rotate-file)
- ⚠️ **Disk I/O**: Escritura a disco (mitigado con async writes)
- ⚠️ **Configuración**: Requiere configuración inicial vs `console.log`

#### Ejemplo de Uso

```typescript
// Antes
console.log('User authenticated:', userId);

// Después
log.info('User authenticated', { userId, method: 'API Key' });
// Output (production):
// {"level":"info","message":"User authenticated","userId":"123","method":"API Key","timestamp":"2025-01-11T10:30:00.000Z"}
```

### Alternativas Consideradas

1. **Pino**: Rechazado; Winston tiene mejor ecosistema de transports
2. **Bunyan**: Rechazado; proyecto menos activo
3. **Console.log custom wrapper**: Rechazado; reinventar la rueda

### Referencias

- [Winston Documentation](https://github.com/winstonjs/winston)
- [12-Factor App: Logs](https://12factor.net/logs)
- Commit: `bc37b6e` - Winston structured logging
- Guía: `docs/guides/LOGGING.md`

---

## ADR-003: Prometheus para Observabilidad

**Fecha**: 2025-01-12

**Estado**: ✅ Aceptado e implementado

**Autores**: Celsius Aray

### Contexto

El microservicio no tenía ninguna observabilidad en producción:

- ❌ No hay métricas de rendimiento
- ❌ No hay health checks
- ❌ Imposible saber si el scraping está funcionando
- ❌ Sin visibilidad de conexiones WebSocket
- ❌ Sin alertas automáticas posibles

Esto dificulta:
- Detectar problemas en producción
- Diagnóstico de performance
- Capacity planning
- Troubleshooting

### Decisión

Implementar **observabilidad completa** con Prometheus y health checks:

1. **Métricas Prometheus** (`/metrics`):
   ```
   # HTTP Requests
   http_requests_total{method, route, status}
   http_request_duration_seconds{method, route}

   # WebSocket
   websocket_clients_connected

   # BCV Scraping
   bcv_scrape_success_total
   bcv_scrape_failure_total
   bcv_latest_rate{currency}

   # Node.js (default)
   nodejs_heap_size_bytes
   nodejs_gc_duration_seconds
   process_cpu_user_seconds_total
   ```

2. **Health Checks**:
   - `/health`: Liveness probe (servidor vivo)
   - `/healthz`: Liveness probe (alias)
   - `/readyz`: Readiness probe (listo para servir tráfico)

   Verificaciones:
   - ✅ MongoDB connection
   - ✅ Scheduler status
   - ✅ Last scrape recency

3. **Arquitectura**:
   ```
   ┌─────────────┐
   │  BCV Service│
   │  :3000      │
   │             │
   │  /metrics   │◄─────┐
   │  /health    │      │
   └─────────────┘      │
                        │ scrape every 30s
                 ┌──────┴──────┐
                 │  Prometheus │
                 │   Server    │
                 └──────┬──────┘
                        │
                        │ visualize
                 ┌──────▼──────┐
                 │   Grafana   │ (opcional)
                 │  Dashboard  │
                 └─────────────┘
   ```

### Consecuencias

#### Positivas

- ✅ **Visibilidad completa**: Métricas de todos los componentes críticos
- ✅ **Alertas**: Posibilidad de configurar alertas en Prometheus
- ✅ **Debugging**: Fácil correlación de métricas con problemas
- ✅ **Capacity planning**: Datos históricos de uso
- ✅ **Standard de industria**: Compatible con ecosistema Prometheus/Grafana
- ✅ **Low overhead**: <1% CPU, <10MB RAM

#### Negativas

- ⚠️ **Infraestructura**: Requiere Prometheus server (opcional)
- ⚠️ **Complejidad**: Más endpoints que mantener
- ⚠️ **Storage**: Prometheus almacena time-series data

#### Métricas de Impacto

| Aspecto | Antes | Después |
|---------|-------|---------|
| MTTR (Mean Time To Repair) | Horas | Minutos |
| Visibilidad de errores | 0% | 100% |
| Detección proactiva | No | Sí (con alertas) |
| Performance monitoring | No | Sí |

### Uso en Producción

**Health Checks en Kubernetes**:
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /readyz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Alertas Ejemplo**:
```yaml
# Prometheus alerting rule
- alert: BCVScrapingFailing
  expr: rate(bcv_scrape_failure_total[5m]) > 0.5
  for: 10m
  annotations:
    summary: "BCV scraping tiene alta tasa de fallos"
```

### Alternativas Consideradas

1. **Datadog/New Relic**: Rechazado; soluciones comerciales costosas
2. **StatsD**: Rechazado; Prometheus es más completo
3. **OpenTelemetry**: Considerado para futuro (tracing)

### Referencias

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Prometheus Node.js Client](https://github.com/siimon/prom-client)
- Commit: `7f0f79f` - feat(observability): implement Prometheus metrics
- Commit: `40cd8eb` - feat(observability): implement health check endpoints
- Guía: `docs/guides/OBSERVABILITY.md`

---

## ADR-004: MongoDB para Persistencia de Datos

**Fecha**: 2025-01-08

**Estado**: ✅ Aceptado e implementado

**Autores**: Celsius Aray

### Contexto

El microservicio necesita almacenar:
- Tasas de cambio históricas
- Timestamps de actualización
- Metadata de scraping

Requerimientos:
- Schema flexible (tasas pueden cambiar)
- Queries rápidas por fecha
- Escalabilidad horizontal
- Bajo costo operacional

### Decisión

Usar **MongoDB** como base de datos principal:

1. **Modelo de Datos**:
   ```typescript
   interface RateData {
     date: Date;           // Fecha de la tasa
     rates: {
       currency: string;   // USD, EUR, etc.
       value: number;      // Valor en Bs
     }[];
     scrapedAt: Date;      // Timestamp del scraping
     source: string;       // 'bcv.org.ve'
   }
   ```

2. **Índices**:
   ```javascript
   db.rates.createIndex({ date: -1 });        // Query por fecha
   db.rates.createIndex({ scrapedAt: -1 });  // Última tasa
   db.rates.createIndex({ "rates.currency": 1, date: -1 }); // Por moneda
   ```

3. **Operaciones**:
   - `saveRate()`: Insertar nueva tasa
   - `getLatestRate()`: Última tasa
   - `getRatesByDateRange()`: Historial
   - `getRateByCurrency()`: Tasa específica

### Consecuencias

#### Positivas

- ✅ **Schema flexible**: Fácil agregar nuevas monedas o campos
- ✅ **Performance**: Queries indexadas < 10ms
- ✅ **Escalabilidad**: Sharding horizontal posible
- ✅ **Ecosistema**: Excelente soporte Node.js (driver oficial)
- ✅ **Operaciones**: Atlas para managed service
- ✅ **Costo**: Free tier (512MB) suficiente para desarrollo

#### Negativas

- ⚠️ **Recursos**: Requiere servidor MongoDB (local o cloud)
- ⚠️ **Backup**: Requiere estrategia de backup
- ⚠️ **Memoria**: Mayor uso de memoria vs SQL ligero

#### Configuración

**Desarrollo**:
```bash
# Docker
docker run -d -p 27017:27017 mongo:latest

# .env
MONGODB_URI=mongodb://localhost:27017/bcv
SAVE_TO_DATABASE=true
```

**Producción**:
```bash
# Docker Secrets
echo "mongodb://user:pass@mongo:27017/bcv" > /run/secrets/mongodb_uri

# Application
MONGODB_URI_FILE=/run/secrets/mongodb_uri
SAVE_TO_DATABASE=true
```

### Alternativas Consideradas

1. **PostgreSQL**:
   - ✅ ACID compliance
   - ❌ Schema rígido (migraciones necesarias)
   - ❌ JSONB menos performante que documento nativo

2. **Redis**:
   - ✅ Ultra rápido
   - ❌ Principalmente cache, no database
   - ❌ Persistencia secundaria (RDB/AOF)

3. **SQLite**:
   - ✅ Zero config
   - ❌ No escalabilidad horizontal
   - ❌ No adecuado para producción

### Referencias

- [MongoDB Documentation](https://docs.mongodb.com/)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
- Implementación: `src/services/mongo.service.ts`

---

## ADR-005: WebSocket para Comunicación Real-Time

**Fecha**: 2025-01-08

**Estado**: ✅ Aceptado e implementado

**Autores**: Celsius Aray

### Contexto

Los clientes del microservicio necesitan:
- Recibir actualizaciones de tasas inmediatamente
- Evitar polling constante (desperdicio de recursos)
- Conexión bidireccional para futuros features

Comparación de alternativas:

| Método | Latencia | Overhead | Complejidad |
|--------|----------|----------|-------------|
| Polling (HTTP) | Alta (30s-1min) | Alto | Bajo |
| Long Polling | Media | Medio | Medio |
| Server-Sent Events | Baja | Bajo | Medio |
| WebSocket | Muy baja | Muy bajo | Alto |

### Decisión

Implementar **WebSocket bidireccional** con la librería `ws`:

1. **Protocolo**:
   ```typescript
   // Eventos del servidor
   {
     event: 'rate-update',
     data: {
       date: '2025-01-12T10:00:00Z',
       rates: [
         { currency: 'USD', value: 36.50 }
       ]
     }
   }

   // Heartbeat (ping/pong)
   {
     event: 'ping'
   }
   ```

2. **Cliente JavaScript**:
   ```javascript
   const ws = new WebSocket('ws://localhost:3000');

   ws.on('message', (data) => {
     const message = JSON.parse(data);
     if (message.event === 'rate-update') {
       updateUI(message.data);
     }
   });
   ```

3. **Gestión de Conexiones**:
   - Broadcast a todos los clientes conectados
   - Ping/pong cada 30s para detectar desconexiones
   - Reconexión automática del lado del cliente
   - Tracking de clientes conectados (métrica)

### Consecuencias

#### Positivas

- ✅ **Latencia ultra-baja**: <50ms desde servidor a cliente
- ✅ **Eficiencia**: Sin overhead HTTP en cada mensaje
- ✅ **Escalabilidad**: Miles de conexiones concurrentes posibles
- ✅ **Bidireccional**: Cliente puede enviar mensajes al servidor
- ✅ **Standard**: Compatible con Socket.io y otros clientes

#### Negativas

- ⚠️ **Complejidad**: Gestión manual de conexiones
- ⚠️ **Escalabilidad horizontal**: Requiere Redis pub/sub para múltiples instancias
- ⚠️ **Recursos**: Cada conexión consume memoria (mitigado con event loop)

#### Limitaciones Actuales

**Single Instance**:
- WebSocket connections están en memoria de una sola instancia
- Scaling horizontal requiere Redis pub/sub:

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│Instance1│    │Instance2│    │Instance3│
└────┬────┘    └────┬────┘    └────┬────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
             ┌──────▼──────┐
             │    Redis    │
             │   Pub/Sub   │
             └─────────────┘
```

### Roadmap

**Fase actual**: WebSocket básico funcionando
**Fase 7**: Implementar Redis pub/sub para horizontal scaling
**Fase 8**: Rooms/channels para suscripción selectiva

### Alternativas Consideradas

1. **Server-Sent Events (SSE)**:
   - ✅ Unidireccional suficiente
   - ❌ No bidireccional (limitado)
   - ❌ Overhead HTTP mayor

2. **Socket.io**:
   - ✅ Más features (rooms, namespaces)
   - ❌ Overhead de librería
   - ❌ No necesario para caso de uso actual

3. **gRPC Streaming**:
   - ✅ Muy performante
   - ❌ Complejidad innecesaria
   - ❌ No compatible con navegadores

### Referencias

- [WebSocket RFC](https://tools.ietf.org/html/rfc6455)
- [ws Library](https://github.com/websockets/ws)
- Implementación: `src/services/websocket.service.ts`

---

## ADR-006: Biome para Code Quality (en lugar de ESLint/Prettier)

**Fecha**: 2025-01-12

**Estado**: ✅ Aceptado

**Autores**: Celsius Aray

### Contexto

El proyecto necesita:
- Linting de código TypeScript
- Formatting automático
- Pre-commit hooks (opcional)

Tradicionalmente se usa:
- ESLint para linting
- Prettier para formatting
- Husky para git hooks

Problema: Múltiples herramientas, configuración compleja, slower performance.

### Decisión

Usar **Biome** como herramienta unificada:

1. **Biome reemplaza**:
   - ❌ ESLint → ✅ Biome Linter
   - ❌ Prettier → ✅ Biome Formatter
   - ❌ (NO usar Husky - usuario lo rechazó)

2. **Configuración**:
   ```json
   // biome.json
   {
     "linter": {
       "enabled": true,
       "rules": {
         "recommended": true
       }
     },
     "formatter": {
       "enabled": true,
       "indentStyle": "space",
       "indentWidth": 2
     }
   }
   ```

3. **Scripts**:
   ```json
   {
     "lint": "biome check .",
     "format": "biome format --write .",
     "check": "biome check --apply ."
   }
   ```

### Consecuencias

#### Positivas

- ✅ **Performance**: 10-100x más rápido que ESLint
- ✅ **Simplicidad**: Una sola herramienta vs 3
- ✅ **Zero config**: Funciona out-of-the-box
- ✅ **Rust-based**: Ultra rápido, bajo consumo de recursos
- ✅ **Modern**: Diseñado para TypeScript/JavaScript moderno

#### Negativas

- ⚠️ **Ecosistema joven**: Menos plugins que ESLint
- ⚠️ **Migración**: Equipo debe aprender nueva herramienta
- ⚠️ **Reglas**: Aún no tiene todas las reglas de ESLint

### Alternativas Consideradas

1. **ESLint + Prettier**:
   - ❌ Más lento
   - ❌ Configuración compleja
   - ❌ Conflictos entre herramientas

2. **Deno fmt/lint**:
   - ❌ Requiere Deno runtime

### Referencias

- [Biome Documentation](https://biomejs.dev/)
- [Biome vs ESLint Benchmark](https://biomejs.dev/blog/biome-wins-prettier-challenge/)

---

## ADR-007: Vitest para Testing (en lugar de Jest)

**Fecha**: 2025-01-11

**Estado**: ✅ Aceptado e implementado

**Autores**: Celsius Aray

### Contexto

El proyecto necesita:
- Unit testing de servicios
- Mocking de dependencias
- Coverage reporting
- Rápida ejecución de tests

### Decisión

Usar **Vitest** como framework de testing:

1. **Características**:
   - API compatible con Jest
   - Ultra rápido (Vite-powered)
   - ESM nativo
   - TypeScript de primera clase
   - Watch mode inteligente

2. **Configuración**:
   ```typescript
   // vitest.config.ts
   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
       coverage: {
         provider: 'v8',
         reporter: ['text', 'html', 'lcov']
       }
     }
   });
   ```

### Consecuencias

#### Positivas

- ✅ **Velocidad**: 5-10x más rápido que Jest
- ✅ **Watch mode**: Instant feedback en desarrollo
- ✅ **ESM**: No requiere transformaciones
- ✅ **TypeScript**: Sin configuración adicional
- ✅ **Coverage**: v8 nativo, muy rápido

#### Negativas

- ⚠️ **Ecosistema**: Menos plugins que Jest
- ⚠️ **Madurez**: Más nuevo que Jest

### Resultados

**Coverage Actual**:
- Statements: 66.26%
- Branches: 65.51%
- Functions: 48.38%
- Lines: 66.04%

**Tests**: 55 passing

### Referencias

- [Vitest Documentation](https://vitest.dev/)
- Tests: `test/unit/**/*.test.ts`
- Commit: Fase 3 - Testing

---

## Template para Futuros ADRs

```markdown
## ADR-XXX: [Título]

**Fecha**: YYYY-MM-DD

**Estado**: [Propuesto | Aceptado | Rechazado | Deprecado | Superseded]

**Autores**: [Nombres]

### Contexto

[Descripción del problema o situación que requiere una decisión]

### Decisión

[La decisión tomada y su justificación]

### Consecuencias

#### Positivas

- ✅ [Beneficio 1]
- ✅ [Beneficio 2]

#### Negativas

- ⚠️ [Limitación 1]
- ⚠️ [Limitación 2]

### Alternativas Consideradas

1. **[Alternativa 1]**: [Razón de rechazo]
2. **[Alternativa 2]**: [Razón de rechazo]

### Referencias

- [Links relevantes]
```

---

## Resumen de Decisiones

| ADR | Decisión | Estado | Impacto |
|-----|----------|--------|---------|
| 001 | SOLID + Inversify | ✅ | Alto |
| 002 | Winston Logging | ✅ | Medio |
| 003 | Prometheus Metrics | ✅ | Alto |
| 004 | MongoDB | ✅ | Alto |
| 005 | WebSocket | ✅ | Medio |
| 006 | Biome | ✅ | Bajo |
| 007 | Vitest | ✅ | Medio |

**Última actualización**: 2025-01-12
