
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 4000;
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

// Middleware para parsear el body de las peticiones como texto plano, necesario para la verificación
app.use(express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  if (!GITHUB_WEBHOOK_SECRET) {
    console.error('La variable de entorno GITHUB_WEBHOOK_SECRET no está configurada.');
    return res.status(500).send('Error interno del servidor: secreto no configurado.');
  }

  // --- Verificación de la firma de GitHub ---
  const signature = req.header('X-Hub-Signature-256');
  if (!signature) {
    console.warn('Petición recibida sin la cabecera X-Hub-Signature-256.');
    return res.status(401).send('Acceso no autorizado: falta la firma.');
  }

  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(req.body).digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
    console.warn('Firma de webhook inválida.');
    return res.status(401).send('Acceso no autorizado: firma inválida.');
  }
  // --- Fin de la verificación ---

  console.log('Firma de webhook verificada. Petición recibida de GitHub.');

  // Solo actuar en eventos 'push' a la rama 'main'
  const githubEvent = req.header('X-GitHub-Event');
  const payload = JSON.parse(req.body);

  if (githubEvent === 'push' && payload.ref === 'refs/heads/main') {
    console.log('Push a la rama "main" detectado. Iniciando script de despliegue...');

    const scriptPath = path.resolve(__dirname, 'update_bcv_service.sh');

    exec(`sh ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al ejecutar el script de despliegue: ${error.message}`);
        console.error(`Stderr: ${stderr}`);
        return res.status(500).send('Error al ejecutar el script de despliegue.');
      }
      console.log(`Script de despliegue ejecutado exitosamente:\n${stdout}`);
      res.status(200).send('Despliegue iniciado exitosamente.');
    });
  } else {
    console.log(`Evento '${githubEvent}' recibido (ref: ${payload.ref}). No se requiere acción.`);
    res.status(200).send('Evento recibido, no se requiere acción.');
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('Webhook listener is running.');
});

app.listen(PORT, () => {
  console.log(`Receptor de webhooks escuchando en el puerto ${PORT}`);
  if (!GITHUB_WEBHOOK_SECRET) {
    console.warn('ADVERTENCIA: La variable de entorno GITHUB_WEBHOOK_SECRET no está definida. El receptor no funcionará correctamente.');
  }
});
