# Guía de Deployment en VPS

Guía completa para deployar BCV Service en un VPS (Virtual Private Server) usando Ubuntu 22.04 LTS.

## Tabla de Contenidos

1. [Requisitos del Servidor](#requisitos-del-servidor)
2. [Configuración Inicial del Servidor](#configuración-inicial-del-servidor)
3. [Instalación de Dependencias](#instalación-de-dependencias)
4. [Deploy de la Aplicación](#deploy-de-la-aplicación)
5. [Reverse Proxy con Nginx](#reverse-proxy-con-nginx)
6. [SSL/TLS con Let's Encrypt](#ssltls-with-lets-encrypt)
7. [Process Manager con PM2](#process-manager-con-pm2)
8. [Monitoreo y Logs](#monitoreo-y-logs)
9. [Backup y Mantenimiento](#backup-y-mantenimiento)
10. [Troubleshooting](#troubleshooting)

---

## Requisitos del Servidor

### Especificaciones Mínimas

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU | 1 vCore | 2 vCores |
| RAM | 1 GB | 2-4 GB |
| Disco | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| Red | 100 Mbps | 1 Gbps |

### Proveedores VPS Recomendados

- **DigitalOcean**: Droplets desde $6/mes
- **Linode**: Nanode desde $5/mes
- **Vultr**: Cloud Compute desde $6/mes
- **Hetzner**: Cloud desde €4.15/mes
- **AWS Lightsail**: desde $5/mes

---

## Configuración Inicial del Servidor

### 1. Acceso SSH

```bash
# Conectar como root
ssh root@your-server-ip

# O con clave SSH
ssh -i ~/.ssh/your-key.pem root@your-server-ip
```

### 2. Actualizar Sistema

```bash
# Actualizar paquetes
apt update && apt upgrade -y

# Instalar utilidades básicas
apt install -y curl wget git vim ufw fail2ban
```

### 3. Crear Usuario No-Root

```bash
# Crear usuario
adduser celsius

# Agregar a grupo sudo
usermod -aG sudo celsius

# Cambiar a nuevo usuario
su - celsius
```

### 4. Configurar SSH

```bash
# En local, copiar clave SSH
ssh-copy-id celsius@your-server-ip

# En servidor, configurar SSH
sudo vim /etc/ssh/sshd_config

# Cambios recomendados:
# Port 2222                    # Cambiar puerto default
# PermitRootLogin no           # Deshabilitar login root
# PasswordAuthentication no    # Solo autenticación por clave
# PubkeyAuthentication yes     # Habilitar claves públicas

# Reiniciar SSH
sudo systemctl restart sshd
```

### 5. Configurar Firewall (UFW)

```bash
# Habilitar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH (puerto personalizado)
sudo ufw allow 2222/tcp

# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Habilitar firewall
sudo ufw enable

# Verificar estado
sudo ufw status verbose
```

### 6. Configurar Fail2Ban

```bash
# Configurar Fail2Ban para SSH
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

sudo vim /etc/fail2ban/jail.local

# Configuración:
[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

# Reiniciar Fail2Ban
sudo systemctl restart fail2ban

# Ver status
sudo fail2ban-client status sshd
```

---

## Instalación de Dependencias

### 1. Node.js y pnpm

```bash
# Instalar Node.js 24 LTS
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version  # v24.x.x
npm --version   # 10.x.x

# Instalar pnpm globalmente
sudo npm install -g pnpm

# Verificar pnpm
pnpm --version
```

### 2. MongoDB

```bash
# Importar clave pública de MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# Crear lista de sources
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Actualizar e instalar
sudo apt update
sudo apt install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar status
sudo systemctl status mongod

# Verificar conexión
mongosh --eval "db.adminCommand('ping')"
```

### 3. Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Iniciar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar
sudo systemctl status nginx
```

### 4. PM2 (Process Manager)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar
pm2 --version
```

---

## Deploy de la Aplicación

### 1. Clonar Repositorio

```bash
# Crear directorio para aplicaciones
mkdir -p ~/apps
cd ~/apps

# Clonar repositorio
git clone https://github.com/your-user/bcv-service.git
cd bcv-service

# O subir código con scp
# En local:
# scp -r -P 2222 ./bcv-service celsius@your-server-ip:~/apps/
```

### 2. Instalar Dependencias

```bash
# Instalar dependencias
pnpm install --frozen-lockfile

# Build TypeScript
pnpm run build

# Verificar build
ls -la dist/
```

### 3. Configurar Variables de Entorno

```bash
# Crear archivo .env
vim .env

# Contenido:
NODE_ENV=production
PORT=3000
SAVE_TO_DATABASE=true
MONGODB_URI=mongodb://localhost:27017/bcv
LOG_LEVEL=info
CRON_SCHEDULE=*/30 * * * *
API_KEYS=["your-api-key-1", "your-api-key-2"]

# Asegurar permisos
chmod 600 .env
```

### 4. Configurar MongoDB

```bash
# Conectar a MongoDB
mongosh

# Crear usuario para la aplicación
use admin
db.createUser({
  user: "bcv_user",
  pwd: "SecurePassword123!",
  roles: [
    { role: "readWrite", db: "bcv" }
  ]
})

# Salir
exit

# Actualizar .env con URI autenticada
vim .env
# MONGODB_URI=mongodb://bcv_user:SecurePassword123!@localhost:27017/bcv?authSource=admin

# Habilitar autenticación en MongoDB
sudo vim /etc/mongod.conf

# Descomentar y configurar:
security:
  authorization: enabled

# Reiniciar MongoDB
sudo systemctl restart mongod
```

---

## Reverse Proxy con Nginx

### 1. Configurar Nginx

```bash
# Crear configuración del sitio
sudo vim /etc/nginx/sites-available/bcv-service

# Contenido:
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Logs
    access_log /var/log/nginx/bcv-service.access.log;
    error_log /var/log/nginx/bcv-service.error.log;

    # Proxy a Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket support
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Health check endpoint (sin autenticación)
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Metrics endpoint (solo local)
    location /metrics {
        allow 127.0.0.1;
        deny all;
        proxy_pass http://localhost:3000/metrics;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:3000/api/;
    }
}

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/bcv-service /etc/nginx/sites-enabled/

# Eliminar default
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

### 2. Configurar DNS

```bash
# En tu proveedor de DNS (Cloudflare, Route53, etc.)
# Crear registros A:

# Tipo  Nombre  Valor              TTL
# A     @       your-server-ip     Auto
# A     www     your-server-ip     Auto
```

---

## SSL/TLS con Let's Encrypt

### 1. Instalar Certbot

```bash
# Instalar Certbot y plugin de Nginx
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtener Certificado

```bash
# Obtener certificado automático
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Seguir instrucciones:
# - Ingresar email
# - Aceptar términos
# - Elegir redirect HTTP -> HTTPS (opción 2)

# Verificar certificados
sudo certbot certificates
```

### 3. Auto-renovación

```bash
# Certbot configura auto-renovación automáticamente

# Verificar timer de renovación
sudo systemctl status certbot.timer

# Test de renovación (dry-run)
sudo certbot renew --dry-run

# Renovación manual (si necesario)
sudo certbot renew
```

### 4. Nginx con SSL (automático con Certbot)

```nginx
# /etc/nginx/sites-available/bcv-service (post-certbot)
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rest of configuration...
    location / {
        proxy_pass http://localhost:3000;
        # ... proxy settings ...
    }
}
```

---

## Process Manager con PM2

### 1. Configurar PM2

```bash
# Crear ecosystem file
cd ~/apps/bcv-service

vim ecosystem.config.js

# Contenido:
module.exports = {
  apps: [{
    name: 'bcv-service',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true
  }]
};
```

### 2. Iniciar con PM2

```bash
# Iniciar aplicación
pm2 start ecosystem.config.js

# Ver status
pm2 status

# Ver logs
pm2 logs bcv-service

# Ver logs en tiempo real
pm2 logs bcv-service --lines 100

# Monitoreo en tiempo real
pm2 monit
```

### 3. Configurar PM2 Startup

```bash
# Generar script de startup
pm2 startup systemd

# Ejecutar comando que PM2 genera (como root)
# Ejemplo:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u celsius --hp /home/celsius

# Guardar lista de procesos
pm2 save

# Verificar que se inicia automáticamente
sudo systemctl status pm2-celsius
```

### 4. Comandos Útiles PM2

```bash
# Restart
pm2 restart bcv-service

# Stop
pm2 stop bcv-service

# Delete
pm2 delete bcv-service

# Reload (zero-downtime)
pm2 reload bcv-service

# Ver métricas
pm2 show bcv-service

# Flush logs
pm2 flush

# Update PM2
pm2 update
```

---

## Monitoreo y Logs

### 1. PM2 Plus (Opcional - Monitoring Cloud)

```bash
# Registrarse en https://app.pm2.io

# Link con PM2 Plus
pm2 link <secret_key> <public_key>

# Ver en dashboard web
```

### 2. Logs del Sistema

```bash
# Logs de aplicación (Winston)
tail -f ~/apps/bcv-service/logs/combined-*.log
tail -f ~/apps/bcv-service/logs/error-*.log

# Logs de PM2
pm2 logs bcv-service

# Logs de Nginx
sudo tail -f /var/log/nginx/bcv-service.access.log
sudo tail -f /var/log/nginx/bcv-service.error.log

# Logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Logs del sistema
sudo journalctl -u mongod -f
sudo journalctl -u nginx -f
sudo journalctl -u pm2-celsius -f
```

### 3. Métricas con Prometheus (Opcional)

```bash
# Instalar Prometheus
cd /opt
sudo wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
sudo tar xvfz prometheus-*.tar.gz
sudo mv prometheus-2.45.0.linux-amd64 prometheus

# Configurar Prometheus
sudo vim /opt/prometheus/prometheus.yml

# Contenido:
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'bcv-service'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

# Crear servicio systemd
sudo vim /etc/systemd/system/prometheus.service

# Contenido:
[Unit]
Description=Prometheus
After=network.target

[Service]
Type=simple
User=celsius
ExecStart=/opt/prometheus/prometheus --config.file=/opt/prometheus/prometheus.yml --storage.tsdb.path=/opt/prometheus/data
Restart=on-failure

[Install]
WantedBy=multi-user.target

# Iniciar Prometheus
sudo systemctl daemon-reload
sudo systemctl start prometheus
sudo systemctl enable prometheus

# Acceder a Prometheus: http://your-server-ip:9090
# (Configurar firewall o reverse proxy según necesidad)
```

---

## Backup y Mantenimiento

### 1. Backup de MongoDB

```bash
# Crear script de backup
vim ~/scripts/backup-mongo.sh

# Contenido:
#!/bin/bash
BACKUP_DIR="/home/celsius/backups/mongo"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

mongodump \
  --uri="mongodb://bcv_user:SecurePassword123!@localhost:27017/bcv?authSource=admin" \
  --out="$BACKUP_DIR/backup_$DATE" \
  --gzip

# Mantener solo últimos 7 días
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completado: $DATE"

# Dar permisos de ejecución
chmod +x ~/scripts/backup-mongo.sh

# Configurar cron para backup diario
crontab -e

# Agregar línea:
0 2 * * * /home/celsius/scripts/backup-mongo.sh >> /home/celsius/logs/backup.log 2>&1
```

### 2. Backup Remoto (rsync)

```bash
# Sincronizar backups a servidor remoto
rsync -avz --delete \
  ~/backups/ \
  celsius@backup-server:/backups/bcv-service/

# O a S3 con AWS CLI
aws s3 sync ~/backups/ s3://my-bucket/bcv-backups/
```

### 3. Updates y Mantenimiento

```bash
# Script de update
vim ~/scripts/update-app.sh

# Contenido:
#!/bin/bash
cd ~/apps/bcv-service

# Pull cambios
git pull origin main

# Instalar dependencias
pnpm install --frozen-lockfile

# Build
pnpm run build

# Reload PM2 (zero-downtime)
pm2 reload bcv-service

echo "Update completado: $(date)"

# Dar permisos
chmod +x ~/scripts/update-app.sh

# Ejecutar update
~/scripts/update-app.sh
```

### 4. Monitoreo de Disco

```bash
# Ver uso de disco
df -h

# Ver archivos grandes
sudo du -sh /* | sort -h

# Limpiar logs antiguos
sudo journalctl --vacuum-time=7d

# Limpiar package manager cache
sudo apt clean
sudo apt autoclean
```

---

## Troubleshooting

### Aplicación no responde

```bash
# Verificar PM2
pm2 status
pm2 logs bcv-service --lines 50

# Verificar proceso
ps aux | grep node

# Verificar puerto
sudo netstat -tulpn | grep :3000
sudo lsof -i :3000

# Restart PM2
pm2 restart bcv-service
```

### MongoDB connection failed

```bash
# Verificar MongoDB
sudo systemctl status mongod
mongosh --eval "db.adminCommand('ping')"

# Ver logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod

# Verificar autenticación
mongosh -u bcv_user -p --authenticationDatabase admin
```

### Nginx errors

```bash
# Verificar configuración
sudo nginx -t

# Ver logs de error
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx

# Verificar que escucha en puerto 80/443
sudo netstat -tulpn | grep nginx
```

### SSL certificate issues

```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew --force-renewal

# Test de configuración SSL
curl -vI https://your-domain.com
```

### Out of Memory

```bash
# Ver uso de memoria
free -h
htop

# Ver procesos por memoria
ps aux --sort=-%mem | head -10

# Aumentar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Hacer permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### High CPU usage

```bash
# Ver procesos por CPU
top
htop

# PM2 monitoring
pm2 monit

# Ver métricas de Node.js
pm2 show bcv-service

# Limitar instancias de PM2
pm2 scale bcv-service 1
```

---

## Seguridad Adicional

### 1. Configurar HTTPS únicamente

```nginx
# En Nginx config, forzar HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

### 2. IP Whitelisting (Opcional)

```nginx
# Permitir solo IPs específicas
location /api/admin/ {
    allow 192.168.1.0/24;
    deny all;
    proxy_pass http://localhost:3000/api/admin/;
}
```

### 3. Rate Limiting Agresivo

```nginx
# En Nginx
limit_req_zone $binary_remote_addr zone=strict:10m rate=1r/s;
location /api/ {
    limit_req zone=strict burst=5 nodelay;
    limit_req_status 429;
}
```

---

## Checklist de Deployment

- [ ] Servidor configurado con usuario no-root
- [ ] SSH con autenticación por clave
- [ ] Firewall (UFW) configurado
- [ ] Fail2Ban activo
- [ ] Node.js 24 LTS instalado
- [ ] MongoDB instalado y autenticación habilitada
- [ ] Nginx instalado y configurado
- [ ] Código cloneado y build exitoso
- [ ] Variables de entorno configuradas (.env)
- [ ] PM2 configurado y startup habilitado
- [ ] Nginx reverse proxy funcionando
- [ ] SSL/TLS configurado (Let's Encrypt)
- [ ] Auto-renovación SSL activa
- [ ] Backups automáticos configurados
- [ ] Monitoreo configurado (logs, métricas)
- [ ] DNS apuntando al servidor
- [ ] Health checks respondiendo correctamente
- [ ] WebSocket funcionando
- [ ] Rate limiting activo

---

## Referencias

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)
- [MongoDB Production Notes](https://docs.mongodb.com/manual/administration/production-notes/)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)
