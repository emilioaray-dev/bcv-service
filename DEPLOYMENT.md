# Despliegue Automático con Webhooks de GitHub

Este documento explica cómo funciona el despliegue automático del servicio utilizando un receptor de webhooks en el servidor de destino.

## Flujo de Despliegue

El proceso está diseñado para ser simple y seguro. Cada vez que se hace un `push` a la rama `main`:

1.  **Build en GitHub Actions**: Un workflow de GitHub Actions se activa, construye la nueva imagen de Docker del servicio y la publica en el GitHub Container Registry (GHCR).
2.  **Notificación por Webhook**: Una vez que la imagen es publicada, GitHub envía una notificación (un evento de webhook) a una URL pública configurada en el servidor de despliegue.
3.  **Recepción y Verificación**: Un servicio ligero (`webhook-listener.js`) que corre en el servidor de despliegue escucha en esa URL. Verifica que la petición venga de GitHub usando un secreto compartido.
4.  **Ejecución del Despliegue**: Si la firma del webhook es válida, el listener ejecuta el script `update_bcv_service.sh`.
5.  **Actualización del Servicio**: El script se encarga de:
    *   Autenticarse en GHCR.
    *   Descargar (`pull`) la nueva imagen de Docker.
    *   Reiniciar los servicios usando `docker-compose`.
    *   Limpiar imágenes de Docker antiguas.

## Configuración Requerida

### 1. Prerrequisitos en el Servidor

Asegúrate de que en tu servidor de despliegue (la máquina donde correrá el servicio) tengas instalado:
*   Node.js (v18+)
*   pnpm
*   Docker
*   Docker Compose
*   pm2 (recomendado para mantener el listener corriendo)

```bash
# Instalar pm2 globalmente
npm install -g pm2
```

### 2. El Receptor de Webhooks (`webhook-listener.js`)

Este repositorio ya incluye el archivo `webhook-listener.js`, que es un servidor de Express simple para recibir las notificaciones. También se ha añadido un script en `package.json` para facilitar su ejecución.

### 3. Iniciar el Receptor de Webhooks

Para iniciar el listener, se recomienda usar `pm2` para asegurar que se mantenga corriendo de forma persistente.

Desde la raíz del proyecto en tu servidor, ejecuta:

```bash
# Reemplaza '<tu_secreto_muy_seguro>' con una clave aleatoria y larga
GITHUB_WEBHOOK_SECRET='<tu_secreto_muy_seguro>' WEBHOOK_PORT=4000 pm2 start 'node webhook-listener.js' --name bcv-webhook-listener
```

*   `GITHUB_WEBHOOK_SECRET`: Es la clave secreta que compartirás con GitHub para verificar la autenticidad de los webhooks. **Debe ser un valor seguro y aleatorio**.
*   `WEBHOOK_PORT`: Es el puerto en el que escuchará el receptor. Asegúrate de que este puerto sea accesible públicamente (puede que necesites configurar tu firewall).
*   `--name bcv-webhook-listener`: Le da un nombre fácil de recordar al proceso en `pm2`.

Puedes verificar que está corriendo con `pm2 list`.

### 4. Configurar el Webhook en GitHub

Ahora, debes configurar GitHub para que envíe los eventos a tu listener.

1.  Ve a la página de tu repositorio en GitHub y navega a **Settings** > **Webhooks**.
2.  Haz clic en **Add webhook**.
3.  Rellena el formulario con la siguiente información:
    *   **Payload URL**: La URL pública de tu servidor apuntando al puerto y la ruta del listener. Ejemplo: `http://TU_IP_PUBLICA:4000/webhook`.
    *   **Content type**: `application/json`.
    *   **Secret**: Pega aquí el mismo valor que usaste para la variable de entorno `GITHUB_WEBHOOK_SECRET`. Deben coincidir exactamente.
    *   **SSL verification**: Se recomienda activarla si usas un dominio con HTTPS (por ejemplo, a través de un proxy inverso como Nginx).
    *   **Which events would you like to trigger this webhook?**: Selecciona **Let me select individual events.** y luego marca únicamente la casilla de **Pushes**.

4.  Haz clic en **Add webhook** para guardar.

## Verificación

Una vez todo esté configurado, puedes verificar el flujo completo:

1.  Haz un `git push` a la rama `main`.
2.  En la pestaña **Actions** de tu repositorio, verás el workflow `Build and Publish` ejecutándose. Espera a que termine.
3.  En la configuración de **Webhooks** en GitHub, puedes ver el historial de entregas. El último evento de `push` debería tener una marca de verificación verde, indicando que fue entregado y recibido con una respuesta `200 OK`.
4.  En tu servidor, puedes ver los logs del listener para confirmar que recibió el webhook y ejecutó el script:

    ```bash
    pm2 logs bcv-webhook-listener
    ```

    Deberías ver mensajes como "Firma de webhook verificada" y "Script de despliegue ejecutado exitosamente".

## Seguridad

*   **Secreto del Webhook**: El secreto compartido asegura que solo GitHub pueda disparar tus despliegues. No lo expongas públicamente.
*   **Firewall**: Abre solo los puertos necesarios en tu servidor (en este caso, el `WEBHOOK_PORT` que hayas elegido).
*   **Permisos mínimos**: El script `update_bcv_service.sh` se ejecuta con los permisos del usuario que corre el proceso `pm2`. Asegúrate de que este usuario tenga permisos para ejecutar `docker` y `docker-compose`.