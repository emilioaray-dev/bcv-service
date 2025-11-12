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
- Fallos en conexiones críticas (MongoDB, APIs externas)
- Excepciones no controladas
- Pérdida de datos o inconsistencias
- Operaciones fallidas después de todos los reintentos

**Ejemplo:**
```typescript
log.error('Falló obtener tasa del BCV después de todos los intentos', {
  maxRetries: this.maxRetries,
  lastError: lastError?.message,
  stack: lastError?.stack
});
```

### `warn` - Nivel 1
Situaciones inusuales que no impiden el funcionamiento pero requieren atención.

**Cuándo usar:**
- Configuración subóptima o faltante
- Uso de valores por defecto
- Reintentos de operaciones fallidas
- API keys no configuradas en desarrollo

**Ejemplo:**
```typescript
log.warn('No hay API keys configuradas. Modo desarrollo: autenticación desactivada');
```

### `info` - Nivel 2 (Default)
Eventos importantes del ciclo de vida de la aplicación.

**Cuándo usar:**
- Inicio/cierre del servidor
- Conexiones exitosas a bases de datos
- Operaciones programadas (cron jobs)
- Cambios de estado importantes
- Clientes WebSocket conectados/desconectados

**Ejemplo:**
```typescript
log.info('Servidor BCV iniciado', {
  port,
  schedule: config.cronSchedule,
  environment: config.nodeEnv
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
  ip: req.ip
});
```

### `debug` - Nivel 4
Información detallada para debugging durante desarrollo.

**Cuándo usar:**
- Valores de variables en momentos clave
- Flujo de ejecución detallado
- Operaciones de bajo nivel
- Creación de índices de base de datos
- Broadcast de eventos WebSocket

**Ejemplo:**
```typescript
log.debug('Índices de MongoDB creados', {
  indexes: ['date', 'createdAt', 'date+source (unique)']
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
  rate: newRate.rate,
  date: newRate.date,
  detailedRates: newRate.rates
});

// Con error completo
log.error('Error conectando a MongoDB', {
  error: error.message,
  stack: error.stack
});
```

### Ejemplos por Categoría

#### Inicio de Operaciones
```typescript
log.info('Ejecutando tarea programada para actualizar tasa de cambio');
```

#### Resultados Exitosos
```typescript
log.info('Tasa actualizada', {
  rate: newRate.rate,
  date: newRate.date,
  detailedRates: newRate.rates
});
```

#### Errores con Contexto
```typescript
log.error('Intento de obtener tasa del BCV falló', {
  attempt: attempt + 1,
  maxRetries: this.maxRetries,
  error: this.getErrorMessage(error)
});
```

#### Información de Debug
```typescript
log.debug('Actualización de tasa transmitida por WebSocket', {
  eventType: rateUpdate.eventType,
  rate: rateUpdate.rate,
  clientsSent: sentCount,
  totalClients: this.clients.size
});
```

## Configuración

### Variable de Entorno

El nivel de logging se configura con la variable `LOG_LEVEL`:

```bash
# .env
LOG_LEVEL=info  # Opciones: error | warn | info | http | debug
```

### Niveles Recomendados por Entorno

- **Producción**: `info` o `warn`
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
├── error-2025-11-12.log      # Solo errores
├── combined-2025-11-12.log   # Todos los logs (info, warn, error)
└── http-2025-11-12.log       # Solo requests HTTP
```

### Rotación Automática

Los logs se rotan automáticamente:

- **Frecuencia**: Diaria (a medianoche)
- **Nombre**: Incluye fecha (YYYY-MM-DD)
- **Tamaño máximo por archivo**: 20 MB
- **Retención**:
  - Logs de error: 14 días
  - Logs combinados: 7 días
  - Logs HTTP: 7 días

### Formato por Entorno

#### Desarrollo (Consola)
```
2025-11-12 10:30:45 [info]: Servidor BCV iniciado
2025-11-12 10:30:47 [error]: Error conectando a MongoDB
```

#### Producción (JSON)
```json
{
  "timestamp": "2025-11-12 10:30:45",
  "level": "info",
  "message": "Servidor BCV iniciado",
  "port": 3000,
  "schedule": "0 2,10,18 * * *",
  "environment": "production"
}
```

## Mejores Prácticas

### ✅ Recomendado

**1. Usar metadata estructurada**
```typescript
// ✅ BIEN - Datos estructurados y parseables
log.info('Tasa actualizada', {
  rate: newRate.rate,
  date: newRate.date,
  source: 'bcv'
});
```

**2. Incluir contexto relevante**
```typescript
// ✅ BIEN - Incluye contexto para debugging
log.error('Error en tarea programada', {
  error: error.message,
  stack: error.stack,
  attemptNumber: attempt
});
```

**3. Usar el nivel apropiado**
```typescript
// ✅ BIEN - Nivel correcto según severidad
log.warn('Usando valor por defecto para configuración');
log.error('Conexión a MongoDB perdida');
log.debug('Procesando item', { itemId: id });
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
  url: bcvUrl,
  error: error.message,
  stack: error.stack
});
```

**3. Usar console.log**
```typescript
// ❌ MAL - No estructurado, no rotado
console.log('Servidor iniciado');

// ✅ BIEN
log.info('Servidor BCV iniciado', { port, environment });
```

**4. Logging excesivo en producción**
```typescript
// ❌ MAL - Demasiado verbose para producción
log.debug('Iniciando loop');
log.debug('Item procesado', { index: i });
log.debug('Loop completado');

// ✅ BIEN - Consolidar información
log.info('Procesamiento completado', {
  itemsProcessed: count,
  duration: endTime - startTime
});
```

**5. Exponer información sensible**
```typescript
// ❌ MAL - Expone credenciales
log.info('Conectando a MongoDB', {
  uri: 'mongodb://user:password@host:27017/db'  // ⚠️ PELIGRO
});

// ✅ BIEN - Sanitizar información sensible
log.info('Conectando a MongoDB', {
  host: 'mongo.example.com',
  database: 'bcv_service'
});
```

## Consulta de Logs

### Ver logs en tiempo real

```bash
# Todos los logs
tail -f logs/combined-2025-11-12.log

# Solo errores
tail -f logs/error-2025-11-12.log

# Solo HTTP
tail -f logs/http-2025-11-12.log
```

### Buscar por nivel

```bash
# Errores del día
grep '"level":"error"' logs/combined-2025-11-12.log

# Warnings del día
grep '"level":"warn"' logs/combined-2025-11-12.log
```

### Buscar por mensaje

```bash
# Logs relacionados con MongoDB
grep -i "mongodb" logs/combined-2025-11-12.log

# Logs relacionados con tasa de cambio
grep -i "tasa" logs/combined-2025-11-12.log
```

### Analizar JSON (con jq)

```bash
# Extraer solo mensajes de error
cat logs/combined-2025-11-12.log | jq 'select(.level=="error") | .message'

# Contar errores por tipo
cat logs/combined-2025-11-12.log | jq -r 'select(.level=="error") | .message' | sort | uniq -c

# Ver errores con timestamp
cat logs/error-2025-11-12.log | jq -r '[.timestamp, .message, .error] | @tsv'
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
  "timestamp": "2025-11-12 10:30:45",
  "level": "error",
  "message": "Error conectando a MongoDB",
  "error": "Connection timeout",
  "stack": "Error: Connection timeout\n    at..."
}
```

Estos logs pueden ser:
- Indexados automáticamente
- Consultados con queries complejas
- Visualizados en dashboards
- Usados para alertas

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
- Comprobar configuración de `maxFiles` y `maxSize`

## Referencias

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Winston Daily Rotate File](https://github.com/winstonjs/winston-daily-rotate-file)
- [12 Factor App - Logs](https://12factor.net/logs)
