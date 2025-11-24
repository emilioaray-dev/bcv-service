# Sistema de Logging

Este microservicio utiliza [Winston](https://github.com/winstonjs/winston) para logging estructurado y profesional. Winston es una biblioteca de logging ampliamente utilizada en aplicaciones Node.js empresariales.

## Índice

- [¿Por qué Winston?](#por-qué-winston)
- [Niveles de Log](#niveles-de-log)
- [Uso del Logger](#uso-del-logger)
- [Configuración](#configuración)
- [Archivos de Log](#archivos-de-log)
- [Mejores Prácticas](#mejores-prácticas)
- [Consulta de Logs](#consulta-de-logs)

## ¿Por qué Winston?

Winston ofrece ventajas significativas sobre `console.log`:

- **Logging estructurado**: Metadata en formato JSON para mejor análisis
- **Niveles de severidad**: Control granular de qué logs se muestran
- **Múltiples destinos**: Consola, archivos, servicios externos
- **Rotación automática**: Previene que los logs crezcan indefinidamente
- **Formato configurable**: Desarrollo (colorizado) vs producción (JSON)
- **Performance**: Optimizado para aplicaciones de alto tráfico

## Niveles de Log

Winston soporta los siguientes niveles de log (de mayor a menor severidad):

### `error` - Nivel 0
Errores que requieren atención inmediata. El servicio puede estar degradado.

**Cuándo usar:**
- Fallos en conexiones críticas (MongoDB, Redis, APIs externas)
- Excepciones no controladas
- Pérdida de datos o inconsistencias
- Operaciones fallidas después de todos los reintentos
- Errores en tareas programadas

**Ejemplo:**
```typescript
log.error('Error conectando a MongoDB', {
  error: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined,
  timestamp: new Date().toISOString()
});
```

### `warn` - Nivel 1
Situaciones inusuales que no impiden el funcionamiento pero requieren atención.

**Cuándo usar:**
- API keys no autorizadas
- Intentos de acceso no autorizado
- Valores fuera de rango esperado
- Recursos con bajo espacio o rendimiento
- Configuración incompleta

**Ejemplo:**
```typescript
log.warn('Intento de acceso no autorizado', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  path: req.path,
  timestamp: new Date().toISOString()
});
```

### `info` - Nivel 2 (Default)
Eventos importantes del ciclo de vida de la aplicación.

**Cuándo usar:**
- Inicio/cierre del servidor
- Conexiones exitosas a bases de datos
- Operaciones programadas (cron jobs) ejecutadas
- Cambios de estado importantes
- Clientes WebSocket conectados/desconectados
- Notificaciones enviadas

**Ejemplo:**
```typescript
log.info('Servidor BCV iniciado', {
  port: config.port,
  schedule: config.cronSchedule,
  environment: config.nodeEnv,
  architecture: 'SOLID with Inversify'
});
```

### `http` - Nivel 3
Logs de requests HTTP y operaciones de red.

**Cuándo usar:**
- Requests HTTP entrantes
- Llamadas a APIs externas
- Respuestas HTTP (status, duración)
- Rate limiting aplicado

**Ejemplo:**
```typescript
log.http('Request recibido', {
  method: req.method,
  path: req.path,
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString()
});
```

### `debug` - Nivel 4
Información detallada para debugging durante desarrollo.

**Cuándo usar:**
- Valores de variables en momentos clave
- Flujo de ejecución detallado
- Operaciones de bajo nivel
- Procesamiento de datos
- Consultas a bases de datos

**Ejemplo:**
```typescript
log.debug('Cambio significativo detectado', {
  currentRate: currentRate,
  previousRate: previousRate,
  change: change,
  timestamp: new Date().toISOString()
});
```

## Uso del Logger

### Importación

```typescript
import log from '../utils/logger';
```

### Sintaxis Básica

```typescript
// Mensaje simple
log.info('Operación completada');

// Con metadata estructurada (RECOMENDADO)
log.info('Tasa actualizada', {
  date: rateData.date,
  rates: rateData.rates,
  timestamp: new Date().toISOString()
});

// Con error completo
log.error('Error conectando a MongoDB', {
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

### Ejemplos por Categoría

#### Inicio de Aplicación
```typescript
log.info('Servidor BCV iniciado', {
  port: config.port,
  schedule: config.cronSchedule,
  environment: config.nodeEnv,
  architecture: 'SOLID with Inversify'
});
```

#### Resultados Exitosos
```typescript
log.info('Tasas actualizadas exitosamente', {
  date: rateData.date,
  rates: rateData.rates,
  timestamp: new Date().toISOString()
});
```

#### Errores con Contexto
```typescript
log.error('Intento de obtener tasa del BCV falló', {
  attempt: attempt + 1,
  maxRetries: this.maxRetries,
  error: this.getErrorMessage(error),
  timestamp: new Date().toISOString()
});
```

#### Información de Debug
```typescript
log.debug('Notificación de cambio de tasa enviada a Discord', {
  rateUpdate: rateData,
  timestamp: new Date().toISOString()
});
```

#### WebSocket
```typescript
log.info('Cliente WebSocket conectado', {
  totalClients: this.clients.size,
  timestamp: new Date().toISOString()
});
```

#### Notificaciones
```typescript
log.info('Notificación de cambio de tasa enviada por Webhook', {
  statusCode: webhookResult.statusCode,
  attempt: webhookResult.attempt,
  duration: webhookResult.duration,
  timestamp: new Date().toISOString()
});
```

## Configuración

### Variable de Entorno

El nivel de logging se configura con la variable `LOG_LEVEL`:

```bash
# .env
LOG_LEVEL=info  # Opciones: error | warn | info | http | debug
```

### Configuración Completa

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d', // 14 días de retención
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d', // 7 días de retención
    }),
  ],
});
```

### Niveles Recomendados por Entorno

- **Producción**: `info`
  - Minimiza overhead de I/O
  - Solo logs esenciales
  - Mejor performance

- **Staging/Testing**: `info`
  - Balance entre visibilidad y volumen
  - Suficiente para diagnóstico

- **Desarrollo**: `debug`
  - Máxima visibilidad
  - Facilita debugging
  - Muestra todo el flujo de ejecución

## Archivos de Log

### Estructura de Archivos

```
logs/
├── error-2025-11-24.log      # Solo errores
└── combined-2025-11-24.log   # Todos los logs (info, warn, error)
```

### Rotación Automática

Los logs se rotan automáticamente:

- **Frecuencia**: Diaria (a medianoche)
- **Nombre**: Incluye fecha (YYYY-MM-DD)
- **Tamaño máximo por archivo**: Controlado por sistema operativo
- **Retención**:
  - Logs de error: 14 días
  - Logs combinados: 7 días

### Formato por Entorno

#### Desarrollo (Consola)
```
info: Servidor BCV iniciado {"port":3000,"schedule":"0 2,10,18 * * *","environment":"development"}
error: Error conectando a MongoDB {"error":"Connection timeout","timestamp":"2025-11-24T10:30:45.123Z"}
```

#### Producción (JSON)
```json
{
  "level": "info",
  "message": "Servidor BCV iniciado",
  "port": 3000,
  "schedule": "0 2,10,18 * * *",
  "environment": "production",
  "timestamp": "2025-11-24T10:30:45.123Z"
}
```

## Mejores Prácticas

### ✅ Recomendado

**1. Usar metadata estructurada**
```typescript
// ✅ BIEN - Datos estructurados y parseables
log.info('Tasa actualizada', {
  date: rateData.date,
  rates: rateData.rates,
  timestamp: new Date().toISOString()
});
```

**2. Incluir contexto relevante**
```typescript
// ✅ BIEN - Incluye contexto para debugging
log.error('Error conectando a MongoDB', {
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

**3. Usar el nivel apropiado**
```typescript
// ✅ BIEN - Nivel correcto según severidad
log.warn('API key no autorizada', { ip: req.ip });
log.error('Conexión a MongoDB perdida', { timestamp: new Date().toISOString() });
log.debug('Procesando tasa', { currency: 'USD', rate: 36.15 });
```

**4. Incluir timestamps**
```typescript
// ✅ BIEN - Siempre incluir timestamp
log.info('Evento ocurrido', {
  data: eventData,
  timestamp: new Date().toISOString()
});
```

### ❌ Evitar

**1. Interpolación de strings**
```typescript
// ❌ MAL - Difícil de parsear
log.info(`Tasa: ${rate}, Fecha: ${date}`);

// ✅ BIEN
log.info('Tasa obtenida', { rate, date });
```

**2. Logs sin contexto**
```typescript
// ❌ MAL - ¿Qué error? ¿Dónde?
log.error('Error');

// ✅ BIEN
log.error('Error obteniendo tasa del BCV', {
  url: config.bcvWebsiteUrl,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

**3. Usar console.log**
```typescript
// ❌ MAL - No estructurado, no rotado
console.log('Servidor iniciado');

// ✅ BIEN
log.info('Servidor BCV iniciado', { 
  port: config.port, 
  environment: config.nodeEnv,
  timestamp: new Date().toISOString()
});
```

**4. Logging excesivo en producción**
```typescript
// ❌ MAL - Demasiado verbose para producción
log.debug('Procesando item');
log.debug('Item procesado');
log.debug('Siguiente item');

// ✅ BIEN - Consolidar información
log.info('Procesamiento completado', {
  itemsProcessed: count,
  duration: durationMs,
  timestamp: new Date().toISOString()
});
```

**5. Exponer información sensible**
```typescript
// ❌ MAL - Expone credenciales
log.info('Conectando a MongoDB', {
  uri: process.env.MONGODB_URI  // ⚠️ PELIGRO
});

// ✅ BIEN - Sanitizar información sensible
log.info('Conectando a MongoDB', {
  host: 'mongodb.example.com',
  database: 'bcv',
  timestamp: new Date().toISOString()
});
```

## Consulta de Logs

### Ver logs en tiempo real

```bash
# Todos los logs
tail -f logs/combined-2025-11-24.log

# Solo errores
tail -f logs/error-2025-11-24.log
```

### Buscar por nivel

```bash
# Errores del día
grep '"level":"error"' logs/combined-2025-11-24.log

# Warnings del día
grep '"level":"warn"' logs/combined-2025-11-24.log
```

### Buscar por mensaje

```bash
# Logs relacionados con MongoDB
grep -i "mongodb" logs/combined-2025-11-24.log

# Logs relacionados con tasa de cambio
grep -i "rate" logs/combined-2025-11-24.log
```

### Analizar JSON (con jq)

```bash
# Extraer solo mensajes de error
cat logs/combined-2025-11-24.log | jq 'select(.level=="error") | .message'

# Contar errores por tipo
cat logs/combined-2025-11-24.log | jq -r 'select(.level=="error") | .message' | sort | uniq -c

# Ver errores con timestamp
cat logs/error-2025-11-24.log | jq -r '[.timestamp, .message, .error] | @tsv'
```

### Ver logs de los últimos N días

```bash
# Errores de los últimos 7 días
cat logs/error-*.log | jq 'select(.level=="error")'

# Todos los logs de la última semana
cat logs/combined-*.log | jq '.'
```

## Integración con Herramientas

### Datadog, Splunk, ELK Stack

El formato JSON de producción es compatible con sistemas de logging empresariales:

```json
{
  "level": "error",
  "message": "Error conectando a MongoDB",
  "error": "Connection timeout",
  "timestamp": "2025-11-24T10:30:45.123Z"
}
```

Estos logs pueden ser:
- Indexados automáticamente
- Consultados con queries complejas
- Visualizados en dashboards
- Usados para alertas

## Sistema de Logging en Componentes Específicos

### BCV Service
- Registra scraping de tasas exitoso o fallido
- Registra reintentos de conexión
- Registra cambios significativos detectados

### NotificationStateService
- Registra cambios en el estado persistente de notificaciones
- Registra detección de cambios significativos
- Registra actualizaciones de estado de notificaciones

### DiscordService
- Registra envío exitoso o fallido de notificaciones a Discord
- Registra errores de conexión a Webhook de Discord

### WebhookService
- Registra envío de notificaciones HTTP
- Registra respuestas de endpoints
- Registra tiempos de respuesta

### WebSocketService
- Registra conexiones y desconexiones de clientes
- Registra envío de mensajes a clientes
- Registra métricas de clientes conectados

### SchedulerService
- Registra ejecución de tareas programadas
- Registra errores en tareas programadas
- Registra estado de scheduler

## Troubleshooting

### No veo logs en archivos

1. Verificar que el directorio `logs/` existe
2. Verificar permisos de escritura
3. Comprobar el nivel de log configurado (`LOG_LEVEL`)

### Demasiados logs

- Ajustar `LOG_LEVEL` a `warn` o `error` en producción
- Reducir logging de debug

### Logs no rotados

- Verificar que `winston-daily-rotate-file` está instalado
- Comprobar configuración de `maxFiles`

## Referencias

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Winston Daily Rotate File](https://github.com/winstonjs/winston-daily-rotate-file)
- [12 Factor App - Logs](https://12factor.net/logs)