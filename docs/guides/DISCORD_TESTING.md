# Prueba de Integración con Discord

Guía para probar y validar la funcionalidad de envío de notificaciones a Discord en el servicio BCV.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Características de las Notificaciones a Discord](#características-de-las-notificaciones-a-discord)
- [Configuración Requerida](#configuración-requerida)
- [Variables de Entorno](#variables-de-entorno)
- [Scripts de Prueba](#scripts-de-prueba)
- [Formato de Notificaciones](#formato-de-notificaciones)
- [Ejemplo de Notificación](#ejemplo-de-notificación)
- [Integración con Sistema de Estado Persistente](#integración-con-sistema-de-estado-persistente)
- [Troubleshooting](#troubleshooting)

## Descripción General

El servicio BCV implementa un sistema robusto de notificaciones a Discord para alertar cambios significativos en las tasas de cambio. El sistema envía notificaciones cuando se detecta una diferencia absoluta ≥0.01 en cualquier moneda (USD, EUR, CNY, TRY, RUB).

## Características de las Notificaciones a Discord

### ✅ Notificaciones Significativas
- Se envían solo cuando hay cambios **significativos** (≥0.01)
- Previene spam de notificaciones con cambios menores
- Basado en el sistema de estado persistente para evitar duplicados

### ✅ Formato Estructurado
- Embeds ricos con información detallada
- Información de la moneda, valor actual y porcentaje de cambio
- Fechas y horarios precisos
- Formato visualmente atractivo

### ✅ Multiples Monedas
- Soporte para USD, EUR, CNY, TRY, RUB
- Cada moneda se muestra en un campo separado
- Porcentaje de cambio calculado para cada moneda

### ✅ Integración con Estado Persistente
- Verifica contra el estado persistente de notificaciones
- Previene notificaciones duplicadas al reiniciar el servicio
- Usa MongoDB como almacenamiento primario con Redis como cache opcional

## Configuración Requerida

### 1. Webhook de Discord
Para recibir notificaciones, necesitas:
- Un servidor de Discord con permisos para crear webhooks
- Un webhook configurado en un canal específico
- La URL del webhook (no compartas públicamente)

### 2. Archivo de Secretos (Recomendado para producción)
- Archivo: `secrets/discord_webhook_url.txt`
- Contenido: URL completa del webhook de Discord
- Permisos: 600 (solo lectura/escritura por el propietario)

### 3. Alternativa: Variables de Entorno (Desarrollo)
- Variable: `DISCORD_WEBHOOK_URL`
- Contenido: URL completa del webhook de Discord

## Variables de Entorno

### Variables para producción (con secrets):
```env
DISCORD_WEBHOOK_URL_FILE=/run/secrets/discord_webhook_url
```

### Variable para desarrollo (directamente):
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### Prioridad de Configuración:
1. `DISCORD_WEBHOOK_URL_FILE` (si está configurado, ignora `DISCORD_WEBHOOK_URL`)
2. `DISCORD_WEBHOOK_URL` (si no está `DISCORD_WEBHOOK_URL_FILE`)
3. Deshabilitado (si ninguna está configurada)

## Scripts de Prueba

### Script Principal: Prueba de Notificación

El script `scripts/test-discord-notification.ts` permite probar la funcionalidad de envío de notificaciones a Discord sin necesidad de esperar a que se detecte un cambio real en las tasas.

**Ejecutar script de prueba:**
```bash
npx tsx scripts/test-discord-notification.ts
```

**Salida esperada si todo funciona correctamente:**
```
✅ Notificación de prueba a Discord enviada exitosamente!
📊 Detalles:
   - Moneda: USD
   - Tasa actual: 36.5000
   - Tasa anterior: 36.4500
   - Cambio: +0.0500 (+0.14%)
   - Fecha: 2025-11-24

✅ Prueba completada exitosamente.
```

### Script de Prueba de Despliegue

El script `scripts/test-deployment-notification.ts` permite probar notificaciones de eventos de deployment a Discord:

**Ejecutar script de prueba de deployment:**
```bash
npx tsx scripts/test-deployment-notification.ts
```

**Prueba diferentes tipos de eventos:**
- `deployment.success`: Notificación de despliegue exitoso
- `deployment.failure`: Notificación de fallo en despliegue
- `service.healthy`: Notificación de estado saludable del servicio

## Formato de Notificaciones

### Embed de Notificación de Tasa
Las notificaciones de tasas a Discord usan el siguiente formato:

**Título:** "🔄 Actualización de Tasas de Cambio"
**Descripción:** "Se ha detectado un cambio significativo en las tasas de cambio del BCV"
**Color:** Naranja (0xFFA500) para cambios positivos, Rojo (0xFF0000) para cambios negativos

**Campos:**
- Nombre de cada moneda (USD, EUR, CNY, etc.)
- Valor actual de la tasa
- Porcentaje de cambio desde la última notificación

**Footer:** "Servicio BCV - Notificaciones | Fecha: DD/MM/YYYY"
**Timestamp:** Fecha y hora exacta de la notificación

### Embed de Notificación de Estado
Para eventos de estado del servicio:

**Título:** "🟢 Servicio BCV - Estado" o "🔴 Servicio BCV - Problema"
**Descripción:** Mensaje sobre el estado del servicio
**Color:** Verde para estado saludable, Rojo para problemas, Amarillo para degradado

### Embed de Notificación de Deployment
Para eventos de despliegue:

**Título:** "🚀 Despliegue - Servicio BCV"
**Descripción:** Detalles del evento de despliegue
**Color:** Verde para éxito, Rojo para fallo

## Ejemplo de Notificación

Cuando se detecta un cambio significativo en las tasas, el bot de Discord enviará un mensaje como este:

```
🔄 Actualización de Tasas de Cambio
Se ha detectado un cambio significativo en las tasas de cambio del BCV

USD: 36.5000 (+0.14%)
EUR: 39.2000 (+0.05%)
CNY: 5.0500 (-0.02%)

Servicio BCV - Notificaciones | Fecha: 24/11/2025
```

## Integración con Sistema de Estado Persistente

### Prevención de Duplicados
El sistema de notificaciones a Discord está integrado con el sistema de estado persistente:
- Antes de enviar una notificación, compara con la última tasa notificada
- Solo envía si hay un cambio **absoluto** ≥0.01 en alguna moneda
- Al reiniciar el servicio, no envía notificación duplicada

### Arquitectura Dual-Layer
- **MongoDB (primario)**: Almacenamiento persistente del estado
- **Redis (cache opcional)**: Lectura/escritura rápida de estado
- **Fallback**: Si Redis falla, opera solo con MongoDB

### Configuración Requerida
Para que las notificaciones sean efectivas, debes tener:
- Sistema de estado persistente activo
- Conexión a MongoDB (si se usa el sistema de estado persistente)
- Redis opcional para mejor performance (si `CACHE_ENABLED=true`)

## Troubleshooting

### Problemas Comunes y Soluciones

#### 1. **No recibo notificaciones en Discord**

**Verifica paso a paso:**
1. Asegúrate que la URL del webhook es correcta
2. Verifica que el archivo `secrets/discord_webhook_url.txt` existe y tiene permisos adecuados (600)
3. Confirma que la variable `DISCORD_WEBHOOK_URL_FILE` o `DISCORD_WEBHOOK_URL` está correctamente configurada
4. Asegúrate que hay un cambio **real y significativo** (≥0.01) en las tasas
5. Revisa los logs del servicio para cualquier error de conexión a Discord

#### 2. **Script de prueba falla**

**Solución:**
- Verifica que el archivo de secrets existe y es legible
- Asegúrate que tienes conectividad a internet
- Confirma que la URL del webhook no está revocada
- Revisa que el canal de Discord aún existe y el webhook tiene permisos

#### 3. **Notificaciones repetidas al reiniciar**

**Solución:**
- Confirma que el sistema de estado persistente está habilitado
- Asegúrate que el servicio puede escribir en MongoDB
- Verifica que las credenciales de MongoDB están correctamente configuradas

#### 4. **Error 404 en webhook**

**Solución:**
- El webhook de Discord ha sido eliminado o revocado
- Crea un nuevo webhook en tu servidor de Discord
- Actualiza la variable de entorno o archivo de secrets

#### 5. **Notificaciones sin formato visual**

**Solución:**
- Asegúrate que el bot de Discord tiene permisos para embeds
- Verifica que no estés alcanzando límites de rate limit de Discord
- Revisa que el contenido no excede los límites de caracteres

### Verificación de Configuración

**Verificar variables de entorno:**
```bash
# En modo desarrollo
echo $DISCORD_WEBHOOK_URL

# En modo producción (si usas docker secrets)
docker exec -it bcv-service env | grep DISCORD
```

**Verificar en los logs:**
```bash
docker-compose logs bcv-service | grep -i discord
```

**Probar manualmente conexión:**
```bash
curl -H "Content-Type: application/json" \
     -d '{"content":"Prueba de conexión a Discord"}' \
     YOUR_DISCORD_WEBHOOK_URL
```

## Notas Adicionales

- Las notificaciones a Discord se envían en el mismo ciclo que las notificaciones WebSocket y Webhook
- El sistema maneja reintentos automáticos en caso de fallos temporales
- La integración de Discord es parte del sistema de notificaciones multi-canal
- Para pruebas locales, puedes usar un webhook de prueba en un canal privado
- El sistema de estado persistente es esencial para evitar spam de notificaciones
- El umbral de 0.01 para notificaciones puede ajustarse en el código si es necesario

---

**Última actualización:** 2025-11-24
**Versión del servicio:** 2.1.0
**Característica activa:** ✅ Notificaciones a Discord implementadas y operativas