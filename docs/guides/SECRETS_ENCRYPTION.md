# Secrets Encryption with SOPS + age

## Roadmap: Gestión de Secretos

### Fase 1: SOPS + age (ACTUAL) ✅
- Secretos encriptados en Git
- Múltiples ambientes (dev/staging/prod)
- Integración con CI/CD
- Sin dependencias externas

### Fase 2: Migración a Doppler/Infisical (FUTURO)
- Auto-rotación de secretos
- UI para gestión
- Sincronización multi-cloud
- Auditoría avanzada

---

## Fase 1: Implementación SOPS + age

### ¿Qué es SOPS?

**SOPS** (Secrets OPerationS) es una herramienta de Mozilla para encriptar archivos completos o valores específicos en archivos YAML, JSON, ENV, INI, y binarios.

**age** es una herramienta de encriptación moderna, simple y segura que usaremos como backend.

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Git Repository                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ secrets/                                             │   │
│  │  ├── .sops.yaml          (Config: qué encriptar)   │   │
│  │  ├── dev.env.enc         (Encriptado ✓)            │   │
│  │  ├── staging.env.enc     (Encriptado ✓)            │   │
│  │  └── production.env.enc  (Encriptado ✓)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  age private key       │
              │  (NO en Git)          │
              │  ~/.sops/key.txt      │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  SOPS desencripta      │
              │  en runtime            │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Aplicación lee        │
              │  variables             │
              └────────────────────────┘
```

### Ventajas

✅ **Versionado Seguro**: Los secretos se commitean encriptados en Git
✅ **Por Ambiente**: Diferentes archivos para dev/staging/prod
✅ **CI/CD Friendly**: Fácil integración con GitHub Actions
✅ **Sin Vendor Lock-in**: Herramienta open-source, sin servicios externos
✅ **Auditable**: Git history muestra quién modificó qué secreto
✅ **Selectivo**: Puede encriptar solo valores, dejando keys visibles

### Estructura de Archivos

```
bcv-service/
├── .sops.yaml                          # Configuración SOPS
├── secrets/
│   ├── .age-key.txt                   # Key age (GITIGNORED)
│   ├── .age-public-key.txt            # Public key (para compartir)
│   ├── dev.env                        # Plain (GITIGNORED)
│   ├── dev.env.enc                    # Encriptado (COMMITEADO)
│   ├── staging.env                    # Plain (GITIGNORED)
│   ├── staging.env.enc                # Encriptado (COMMITEADO)
│   ├── production.env                 # Plain (GITIGNORED)
│   └── production.env.enc             # Encriptado (COMMITEADO)
├── scripts/
│   ├── encrypt-secrets.sh             # Script para encriptar
│   ├── decrypt-secrets.sh             # Script para desencriptar
│   └── rotate-age-key.sh              # Script para rotar keys
└── .github/workflows/
    ├── ci.yml                         # CI con SOPS
    └── release.yml                    # Release con SOPS
```

---

## Instalación

### Local (Desarrollo)

```bash
# macOS
brew install sops age

# Ubuntu/Debian
sudo apt install age
wget -O /usr/local/bin/sops https://github.com/mozilla/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
chmod +x /usr/local/bin/sops

# Verificar instalación
sops --version
age --version
```

### Generar Keys

```bash
# Generar key age
mkdir -p secrets
age-keygen -o secrets/.age-key.txt

# Output:
# Public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
# (guardar esta public key)

# Extraer public key
grep "# public key:" secrets/.age-key.txt | cut -d: -f2 | tr -d ' ' > secrets/.age-public-key.txt
```

---

## Configuración

### 1. Crear .sops.yaml

Configura qué archivos encriptar y con qué key:

```yaml
# .sops.yaml
creation_rules:
  # Encriptar archivos .env.enc con age
  - path_regex: secrets/.*\.env\.enc$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

  # Encriptar archivos YAML en secrets/
  - path_regex: secrets/.*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

### 2. Crear Archivos de Secretos por Ambiente

**secrets/dev.env** (plain, no commiteado):
```env
# Development Secrets
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/bcv-dev
REDIS_URL=redis://localhost:6379
API_KEYS=dev-key-123
DISCORD_WEBHOOK_URL=
LOG_LEVEL=debug
```

**secrets/staging.env** (plain, no commiteado):
```env
# Staging Secrets
NODE_ENV=staging
MONGODB_URI=mongodb://staging-db:27017/bcv-staging
REDIS_URL=redis://staging-redis:6379
API_KEYS=staging-key-456
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/STAGING/xxx
LOG_LEVEL=info
```

**secrets/production.env** (plain, no commiteado):
```env
# Production Secrets
NODE_ENV=production
MONGODB_URI=mongodb://prod-user:STRONG_PASSWORD@prod-db:27017/bcv-prod
REDIS_URL=redis://:REDIS_PASSWORD@prod-redis:6379
API_KEYS=prod-key-789,prod-key-backup-012
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/PROD/xxx
LOG_LEVEL=warn
```

---

## Uso

### Encriptar Secretos

```bash
# Encriptar un ambiente específico
sops -e secrets/dev.env > secrets/dev.env.enc
sops -e secrets/staging.env > secrets/staging.env.enc
sops -e secrets/production.env > secrets/production.env.enc

# O usar el script
./scripts/encrypt-secrets.sh dev
./scripts/encrypt-secrets.sh staging
./scripts/encrypt-secrets.sh production
```

### Desencriptar Secretos

```bash
# Desencriptar en memoria (no guarda archivo)
sops -d secrets/production.env.enc

# Desencriptar a archivo
sops -d secrets/production.env.enc > secrets/production.env

# O usar el script
./scripts/decrypt-secrets.sh production
```

### Editar Secretos Encriptados

```bash
# SOPS abre el archivo desencriptado en tu editor
# Cuando guardas, lo re-encripta automáticamente
sops secrets/production.env.enc

# Esto es MUCHO más seguro que desencriptar → editar → encriptar
```

### Ejecutar Aplicación con Secretos

```bash
# Inyectar secretos al ejecutar
sops exec-env secrets/production.env.enc 'npm start'

# Con Docker Compose
sops exec-env secrets/production.env.enc 'docker compose up'

# Con pnpm
sops exec-env secrets/dev.env.enc 'pnpm dev'
```

---

## Integración CI/CD

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Instalar SOPS y age
      - name: Install SOPS
        run: |
          wget -O /usr/local/bin/sops https://github.com/mozilla/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
          chmod +x /usr/local/bin/sops

      - name: Install age
        run: sudo apt-get install -y age

      # Configurar age key desde secret de GitHub
      - name: Setup age key
        run: |
          mkdir -p secrets
          echo "${{ secrets.SOPS_AGE_KEY }}" > secrets/.age-key.txt
          chmod 600 secrets/.age-key.txt

      # Desencriptar secretos
      - name: Decrypt secrets
        run: |
          sops -d secrets/dev.env.enc > .env

      # Ejecutar tests
      - name: Run tests
        run: pnpm test
```

### GitHub Secrets Requeridos

Añade a GitHub Secrets (Settings → Secrets and variables → Actions):

```
SOPS_AGE_KEY = <contenido de secrets/.age-key.txt>
```

---

## Scripts de Automatización

Los scripts en `/scripts/` simplifican las operaciones comunes:

### encrypt-secrets.sh
```bash
./scripts/encrypt-secrets.sh production
# → Encripta secrets/production.env → secrets/production.env.enc
```

### decrypt-secrets.sh
```bash
./scripts/decrypt-secrets.sh production
# → Desencripta secrets/production.env.enc → secrets/production.env
```

### rotate-age-key.sh
```bash
./scripts/rotate-age-key.sh
# → Genera nueva key, re-encripta todos los secretos
```

---

## Seguridad

### ✅ Buenas Prácticas

1. **NUNCA commitear .age-key.txt**
   - Está en .gitignore
   - Solo commitear .age-public-key.txt

2. **Compartir keys de forma segura**
   - Usar 1Password, Bitwarden, o canal seguro
   - NUNCA por email o Slack

3. **Rotar keys regularmente**
   - Cada 90 días
   - Cuando un miembro del equipo se va
   - Después de un incidente de seguridad

4. **Usar keys diferentes por ambiente**
   - Key diferente para dev vs prod
   - Limita el blast radius

5. **Backup de keys**
   - Guardar en bóveda segura
   - Múltiples copias en ubicaciones diferentes

### ⚠️ Qué NO hacer

❌ Commitear archivos `.env` sin encriptar
❌ Compartir keys por canales inseguros
❌ Usar la misma key para todos los ambientes
❌ Olvidar rotar keys
❌ Dar acceso a keys de producción a todos

---

## Troubleshooting

### Error: "no age private key found"

```bash
# Verificar que existe la key
ls -la secrets/.age-key.txt

# Verificar variable de entorno
export SOPS_AGE_KEY_FILE=secrets/.age-key.txt
```

### Error: "MAC mismatch"

El archivo fue modificado manualmente. Soluciones:

```bash
# Re-encriptar desde el plain text
sops -e secrets/production.env > secrets/production.env.enc

# O editar el encriptado directamente
sops secrets/production.env.enc
```

### Error: "failed to get the data key"

La public key en .sops.yaml no coincide con tu private key:

```bash
# Verificar tu public key
grep "public key" secrets/.age-key.txt

# Actualizar .sops.yaml con la key correcta
```

---

## Migración Futura a Doppler/Infisical

Cuando crezcas y necesites:
- Auto-rotación de secretos
- UI para gestión
- Sincronización multi-cloud
- Auditoría avanzada

Puedes migrar fácilmente:

```bash
# Desencriptar todos los secretos
for env in dev staging production; do
  sops -d secrets/${env}.env.enc > /tmp/${env}.env
done

# Importar a Doppler
doppler secrets upload /tmp/dev.env --project bcv-service --config dev
doppler secrets upload /tmp/staging.env --project bcv-service --config staging
doppler secrets upload /tmp/production.env --project bcv-service --config production
```

---

## Referencias

- [SOPS Documentation](https://github.com/mozilla/sops)
- [age Documentation](https://github.com/FiloSottile/age)
- [SOPS Best Practices](https://www.mozilla.org/en-US/security/advisories/)
- [Doppler Migration Guide](https://docs.doppler.com/)

---

## Checklist de Implementación

- [ ] Instalar SOPS y age localmente
- [ ] Generar age key pair
- [ ] Crear .sops.yaml
- [ ] Crear archivos de secretos por ambiente
- [ ] Encriptar todos los archivos
- [ ] Añadir scripts de automatización
- [ ] Configurar GitHub Actions
- [ ] Añadir SOPS_AGE_KEY a GitHub Secrets
- [ ] Actualizar documentación
- [ ] Compartir public key con el equipo
- [ ] Backup de private key en bóveda segura
