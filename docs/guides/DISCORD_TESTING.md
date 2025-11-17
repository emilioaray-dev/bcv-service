# Script de Prueba de Notificaciones a Discord

Este script permite probar la funcionalidad de envío de notificaciones a Discord sin necesidad de esperar a que se detecte un cambio real en las tasas.

## Descripción

El script `test-discord-notification.js` crea un mensaje de prueba con datos simulados de tasas de cambio y lo envía al canal de Discord configurado. Es útil para verificar que:

- La URL del webhook de Discord está correctamente configurada
- El servicio de Discord puede conectarse y enviar mensajes
- El formato de las notificaciones es correcto
- La integración está funcionando como se espera

## Requisitos

Antes de ejecutar el script, asegúrate de tener:

1. **Archivo de secret configurado:**
   - El archivo `secrets/discord_webhook_url` debe existir
   - Debe contener la URL completa del webhook de Discord

2. **Variables de entorno:**
   - `DISCORD_WEBHOOK_URL_FILE=./secrets/discord_webhook_url` (en archivo `.env`)

## Cómo usar

1. **Ejecutar el script:**
   ```bash
   npx tsx scripts/test-discord-notification.ts
   ```

2. **Verificar la salida:**
   - Si todo está configurado correctamente, verás el mensaje:
     ```
     ✅ Notificación enviada exitosamente a Discord!
     ✅ Prueba completada exitosamente.
     ```
   - Si hay algún error, se mostrará un mensaje de error con detalles

3. **Verificar en Discord:**
   - Comprueba que el mensaje haya llegado a tu canal de Discord
   - El mensaje aparecerá como un embed con título "🔄 Actualización de Tasas de Cambio"

## Resultado esperado

Cuando el script se ejecuta correctamente, el canal de Discord debe recibir un mensaje con:

- Título: "🔄 Actualización de Tasas de Cambio"
- Descripción: "Se ha detectado un cambio en las tasas de cambio del BCV"
- Campos para cada moneda: nombre y tasa de cambio
- Timestamp de la notificación
- Footer: "Servicio BCV - Notificaciones"

## Troubleshooting

Si el script falla:

1. **Verifica el archivo de secret:**
   - Asegúrate que `secrets/discord_webhook_url` existe y contiene la URL correcta

2. **Verifica el acceso al archivo:**
   - El servicio debe poder leer el archivo de secret
   - Los permisos del archivo deben permitir lectura

3. **Verifica la conectividad:**
   - Asegúrate que puedes acceder directamente al webhook de Discord desde tu red

4. **Revisa los logs:**
   - El script mostrará mensajes de error específicos si algo falla