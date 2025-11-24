# Guía del Servicio de Estado Persistente de Notificaciones

Esta guía explica el sistema de estado persistente de notificaciones implementado en el servicio BCV Service.

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura](#arquitectura)
- [Almacenamiento Persistente](#almacenamiento-persistente)
- [Capa de Caché con Redis](#capa-de-caché-con-redis)
- [Detección de Cambios](#detección-de-cambios)
- [Integración con Otros Servicios](#integración-con-otros-servicios)
- [Sistema de Notificaciones Multi-Canal](#sistema-de-notificaciones-multi-canal)
- [Arquitectura de Estado Dual-Layer](#arquitectura-de-estado-dual-layer)
- [Prevención de Notificaciones Duplicadas](#prevención-de-notificaciones-duplicadas)

## Descripción General

El servicio de Estado de Notificaciones proporciona un mecanismo robusto para rastrear las últimas tasas de cambio notificadas. Esto previene notificaciones duplicadas cuando se reinicia el servicio y garantiza una detección precisa de cambios a través de despliegues.

### Problema Resuelto

Anteriormente, el servicio confiaba en el estado en memoria para determinar si se necesitaban notificaciones. Esto causaba:
- **Notificaciones espurias al reiniciar el servicio** (ya que no había referencia histórica)
- **Posibles notificaciones duplicadas durante despliegues**
- **Detección inconsistente de cambios a través de instancias del servicio**
- **Falta de control sobre el estado de notificaciones entre reinicios**

### Solución Implementada

El sistema de estado persistente de notificaciones almacena las últimas tasas notificadas en MongoDB y usa Redis como capa de cache para un rendimiento óptimo. Además, implementa un sistema multi-canal de notificaciones (WebSocket, Discord, Webhook HTTP).

## Arquitectura

El servicio implementa una arquitectura de doble capa (dual-layer):

```
┌─────────────────┐    ┌─────────────┐
│   Application   │    │   Redis     │
│  (Notification │◄──►│   Cache     │
│   State Service)│    │ (Fast Read/ │
└─────────────────┘    │   Write)    │
                       └─────────────┘
                              ▲
                              │
                       ┌─────────────┐
                       │   MongoDB   │
                       │(Persistent  │
                       │   Storage)  │
                       └─────────────┘
```

### Componentes Principales

1. **NotificationStateService**: Servicio principal que maneja operaciones de estado
2. **MongoDB**: Almacenamiento persistente para el estado de notificaciones
3. **Redis**: Capa de cache para operaciones rápidas de lectura/escritura
4. **DiscordService**: Servicio de notificaciones a Discord
5. **WebhookService**: Servicio de notificaciones HTTP con firma HMAC
6. **WebSocketService**: Servicio de notificaciones en tiempo real

## Almacenamiento Persistente

### Integración con MongoDB

El servicio almacena el estado de notificaciones en la colección `notification_states`:

```typescript
interface NotificationState {
  _id: ObjectId;                // Identificador único (usado como "last_notification")
  lastNotifiedRate: BCVRateData; // Las últimas tasas que fueron notificadas
  lastNotificationDate: Date;    // Timestamp de la última notificación
  createdAt: Date;              // Timestamp de creación
  updatedAt: Date;              // Timestamp de última actualización
}
```

### Ciclo de Vida de Datos

- **Lectura**: Primero intenta leer desde Redis, si falla, recurre a MongoDB
- **Escritura**: Escribe en ambos MongoDB (persistencia) y Redis (rendimiento)
- **Modo de Respaldo**: Continúa operando normalmente si Redis no está disponible

### Operaciones CRUD

- **Guardar estado**: `saveNotificationState(rateData)` - Guarda las tasas notificadas
- **Obtener estado**: `getLastNotificationState()` - Recupera la última notificación guardada
- **Comparación persistente**: `hasSignificantChangeAndNotify(rateData)` - Compara y notifica

## Capa de Caché con Redis

### Beneficios de Rendimiento

- **Lecturas Rápidas**: Redis proporciona lectura en sub-milisegundos
- **Reducción de Carga en BD**: Chequeos frecuentes de estado no golpean MongoDB
- **Alto Rendimiento**: Maneja eficientemente múltiples operaciones concurrentes
- **Tiempo de respuesta reducido**: Lecturas de estado en < 1ms

### Estrategia de Caché

- **Read-Through**: Si los datos no están en Redis, los busca en MongoDB y los cachea
- **Write-Through**: Las actualizaciones van simultáneamente a Redis y MongoDB
- **Modo de Respaldo**: Opera normalmente solo con MongoDB cuando Redis no está disponible

### Configuración de Redis

- **Conexión**: Configurable a través de variables de entorno
- **TTL**: Opcional para caducidad de entradas de cache (actualmente no aplicable al estado de notificaciones)
- **Cluster**: Soporte para modo cluster si se requiere alta disponibilidad

## Detección de Cambios

### Umbral de Diferencia Absoluta

El sistema utiliza diferencia absoluta en lugar de porcentaje:

- **Umbral**: ≥ 0.01 diferencia en cualquier tasa de moneda
- **Comparación**: Respecto a la última tasa notificada (almacenada persistentemente)
- **Granularidad**: Detección por moneda (USD, EUR, CNY, TRY, RUB, etc.)
- **Soporte multi-moneda**: Detecta cambios en todas las monedas disponibles

### Ejemplo de Detección

- Si la tasa USD cambia de 38.50 a 38.51 (diferencia de 0.01), se activa una notificación
- Si la tasa USD cambia de 38.50 a 38.505 (diferencia de 0.005), **no** se activa notificación
- El sistema considera cambios en **cualquiera** de las monedas: USD, EUR, CNY, TRY, RUB

### Cálculo de Cambios

```typescript
// Ejemplo de cálculo de cambio
const difference = Math.abs(currentRate - previousRate);
const isSignificant = difference >= 0.01;
```

## Integración con Otros Servicios

### Servicio BCV

El servicio BCV delega la detección de cambios al NotificationStateService:

```typescript
// Antes: comparación con estado en memoria
const hasChange = this.hasRateChanged(this.lastRate, currentRate);

// Ahora: comparación con estado persistente
const hasSignificantChange = 
  await this.notificationStateService.hasSignificantChangeAndNotify(rateData);

if (hasSignificantChange) {
  // Enviar notificaciones a través de los diferentes canales
  await this.sendNotifications(rateData);
}
```

### Servicios de Notificaciones

Los servicios de notificación reciben la comparación con el estado persistente:

- **DiscordService**: Incluye emojis de tendencia (↗️/↘️) y cambios porcentuales
- **WebhookService**: Proporciona información detallada del cambio con firma HMAC-SHA256
- **WebSocketService**: Envía actualizaciones en tiempo real con información de cambio

## Sistema de Notificaciones Multi-Canal

### Canales Disponibles

1. **WebSocket**: Comunicación en tiempo real con clientes suscritos
2. **Discord**: Notificaciones estructuradas a canales de Discord
3. **HTTP Webhooks**: Notificaciones a endpoints personalizados con firma HMAC

### Gestión de Notificaciones

El servicio de estado persistente coordina la notificación a través de múltiples canales:

```typescript
// Flujo de notificación coordinado
async hasSignificantChangeAndNotify(rateData: BCVRateData): Promise<boolean> {
  // 1. Obtener estado anterior
  const lastState = await this.getLastNotificationState();
  
  // 2. Comparar con umbrales
  const hasChange = this.checkSignificantChange(lastState?.lastNotifiedRate, rateData);
  
  if (hasChange) {
    // 3. Enviar a todos los canales
    await Promise.allSettled([
      this.discordService.sendRateUpdateNotification(rateData, lastState?.lastNotifiedRate),
      this.webhookService.sendRateUpdateNotification(rateData, lastState?.lastNotifiedRate),
      this.webSocketService.broadcastRateUpdate(this.createRateUpdateEvent(rateData))
    ]);
    
    // 4. Guardar nuevo estado
    await this.saveNotificationState(rateData);
  }
  
  return hasChange;
}
```

## Arquitectura de Estado Dual-Layer

### Diseño de Arquitectura

El sistema combina dos capas para balancear rendimiento y persistencia:

#### Capa Primaria: MongoDB
- **Persistencia**: Almacena definitivamente el estado
- **Fiabilidad**: Sistema persistente que sobrevive a reinicios
- **Consistencia**: Mantiene el estado a través de despliegues
- **Replicación**: Compatible con replica sets para alta disponibilidad

#### Capa Secundaria: Redis (Opcional)
- **Rendimiento**: Lectura/escritura extremadamente rápida
- **Caché**: Reduce la carga en MongoDB
- **Tolerancia a fallas**: El sistema funciona sin Redis
- **Escalabilidad**: Maneja alta concurrencia

### Estrategia de Respaldo (Fallback)

1. **Redis disponible**: Operación normal con doble capa
2. **Redis no disponible**: Sistema opera solo con MongoDB
3. **Redis restaurado**: Recupera automáticamente funcionalidad de cache

## Prevención de Notificaciones Duplicadas

### Mecanismos de Prevención

#### 1. Estado Persistente
- Almacena la última tasa notificada en MongoDB
- Sobrevive a reinicios del servicio
- Mantiene coherencia entre despliegues

#### 2. Comparación Inteligente
- Compara contra la última tasa notificada (no la última consultada)
- Umbral de 0.01 para evitar spam por fluctuaciones menores
- Detección por moneda individual

#### 3. Control de Frecuencia
- Previene notificaciones múltiples por el mismo cambio
- Coordina entre diferentes servicios de notificación
- Mantiene consistencia en todos los canales

### Flujo de Notificación

```
1. BCVService obtiene nuevas tasas
2. → NotificationStateService compara con estado persistente
3. → Si cambio ≥ 0.01, prepara notificaciones
4. → Envia a Discord, Webhook, WebSocket simultáneamente
5. → Guarda nuevo estado en MongoDB y Redis
6. → Cliente recibe notificación única por cambio significativo
```

## Configuración

### Variables de Entorno Relevantes

```env
# MongoDB (requerido)
MONGODB_URI=mongodb://user:pass@host:port/database

# Redis (opcional, para cache de estado de notificaciones)
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=true  # Habilita Redis como capa de cache
CACHE_TTL_NOTIFS=3600  # TTL opcional para entradas de estado de notificaciones (segundos)
```

### Archivos de Secrets (Producción)

```env
# Para Docker Secrets
MONGODB_URI_FILE=/run/secrets/mongodb_uri
REDIS_URL_FILE=/run/secrets/redis_url  # Opcional
```

### Integración con Inversify

El servicio está completamente integrado con el contenedor IoC:

```typescript
// Inversify configuration
container.bind<INotificationStateService>(TYPES.NotificationStateService)
  .to(NotificationStateService)
  .inSingletonScope();

// Inyección en servicios que lo usan
constructor(
  @inject(TYPES.NotificationStateService) 
  private notificationStateService: INotificationStateService
) {}
```

### Manejo de Errores

- **Fallos de Redis**: Sistema opera con MongoDB-only
- **Fallos de MongoDB**: Se registran errores, puede deshabilitar estado persistente temporalmente
- **Timeouts**: Manejados con logging apropiado y comportamiento degrade

## Beneficios del Sistema

### ✅ Eliminación de Notificaciones Duplicadas
- **Eliminadas por completo**: Ningún reinicio del servicio causa notificaciones espurias
- **Consistencia garantizada**: El estado se mantiene a través de reinicios y despliegues
- **Experiencia de usuario mejorada**: Solo notificaciones cuando hay cambios reales

### ✅ Escalabilidad Horizontal
- **Soporte para múltiples instancias**: Cada instancia puede leer del estado común
- **Prevención de duplicados**: Aunque se ejecuten múltiples instancias
- **Coordinación automática**: No se requiere coordinación manual entre instancias

### ✅ Observabilidad y Control
- **Métricas de estado**: Seguimiento del estado persistente
- **Auditoría de notificaciones**: Registro de todas las notificaciones enviadas
- **Control de tendencias**: Cálculo de direcciones y porcentajes de cambio
- **Sistema anti-spam**: Prevención de notificaciones por fluctuaciones menores

---

**Última actualización**: 2025-11-24
**Versión del servicio**: 2.1.0
**Estado**: ✅ Completamente implementado y operativo