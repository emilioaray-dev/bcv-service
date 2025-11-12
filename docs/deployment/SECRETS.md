# Guía de Configuración de Secrets

Guía completa para gestionar secretos y credenciales sensibles en BCV Service de forma segura.

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Variables de Entorno vs Secrets](#variables-de-entorno-vs-secrets)
3. [Docker Secrets](#docker-secrets)
4. [Kubernetes Secrets](#kubernetes-secrets)
5. [VPS Deployment](#vps-deployment)
6. [Mejores Prácticas](#mejores-prácticas)
7. [Rotación de Secrets](#rotación-de-secrets)
8. [Troubleshooting](#troubleshooting)

---

## Introducción

BCV Service soporta dos métodos de configuración:

1. **Variables de Entorno** (`.env` file)
2. **Docker Secrets** (archivos en `/run/secrets/`)

El servicio automáticamente detecta y usa secretos desde archivos si las variables `*_FILE` están configuradas.

---

## Variables de Entorno vs Secrets

### Variables de Entorno

**Uso**: Desarrollo, testing, configuración no sensible

**Ventajas**:
- ✅ Fácil de configurar
- ✅ Standard de 12-factor app
- ✅ Compatible con todos los entornos

**Desventajas**:
- ⚠️ Visibles en `ps` y `/proc`
- ⚠️ Fácil de commitear accidentalmente
- ⚠️ Difícil de rotar

**Ejemplo**:
```bash
# .env
MONGODB_URI=mongodb://localhost:27017/bcv
API_KEYS=["key-123", "key-456"]
```

### Docker/Kubernetes Secrets

**Uso**: Producción, staging

**Ventajas**:
- ✅ Encriptados en reposo
- ✅ No visibles en logs
- ✅ Fácil rotación
- ✅ Control de acceso granular

**Desventajas**:
- ⚠️ Requiere orquestador (Docker Swarm/Kubernetes)
- ⚠️ Complejidad adicional

**Ejemplo**:
```bash
# Variables apuntan a archivos
MONGODB_URI_FILE=/run/secrets/mongodb_uri
API_KEYS_FILE=/run/secrets/api_keys
```

---

## Docker Secrets

### Configuración

#### 1. Crear Archivos de Secrets

```bash
# Crear directorio de secrets (local)
mkdir -p secrets

# MongoDB URI
echo "mongodb://admin:SecurePassword123!@mongo:27017/bcv?authSource=admin" > secrets/mongodb_uri.txt

# API Keys (JSON array)
echo '["live-key-abc123xyz", "backup-key-def456uvw"]' > secrets/api_keys.txt

# Establecer permisos restrictivos
chmod 600 secrets/*

# Agregar a .gitignore
echo "secrets/" >> .gitignore
```

#### 2. Docker Compose con Secrets

```yaml
# docker-compose.yml
version: '3.8'

services:
  bcv-service:
    image: bcv-service:latest
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SAVE_TO_DATABASE=true
      - LOG_LEVEL=info
      # Variables _FILE para leer desde secrets
      - MONGODB_URI_FILE=/run/secrets/mongodb_uri
      - API_KEYS_FILE=/run/secrets/api_keys
    secrets:
      - mongodb_uri
      - api_keys
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    environment:
      - MONGO_INITDB_ROOT_USERNAME_FILE=/run/secrets/mongo_root_username
      - MONGO_INITDB_ROOT_PASSWORD_FILE=/run/secrets/mongo_root_password
    secrets:
      - mongo_root_username
      - mongo_root_password

secrets:
  mongodb_uri:
    file: ./secrets/mongodb_uri.txt
  api_keys:
    file: ./secrets/api_keys.txt
  mongo_root_username:
    file: ./secrets/mongo_root_username.txt
  mongo_root_password:
    file: ./secrets/mongo_root_password.txt
```

#### 3. Verificar Secrets en Container

```bash
# Acceder al container
docker-compose exec bcv-service sh

# Ver secrets montados
ls -la /run/secrets/

# Leer secret
cat /run/secrets/mongodb_uri
cat /run/secrets/api_keys
```

### Docker Swarm Secrets

```bash
# Crear secrets en Swarm
echo "mongodb://admin:pass@mongo:27017/bcv" | docker secret create mongodb_uri -
echo '["key-1", "key-2"]' | docker secret create api_keys -

# Listar secrets
docker secret ls

# Inspeccionar secret (no muestra valor)
docker secret inspect mongodb_uri

# Deploy con stack
docker stack deploy -c docker-compose.yml bcv-stack

# Ver services
docker service ls

# Ver logs
docker service logs bcv-stack_bcv-service
```

---

## Kubernetes Secrets

### Configuración

#### 1. Crear Secrets desde Archivos

```bash
# Crear secrets desde archivos locales
kubectl create secret generic bcv-secrets \
  --from-file=mongodb-uri=./secrets/mongodb_uri.txt \
  --from-file=api-keys=./secrets/api_keys.txt \
  -n bcv-service

# Verificar
kubectl get secrets -n bcv-service
kubectl describe secret bcv-secrets -n bcv-service
```

#### 2. Crear Secrets desde Literales

```bash
# Crear secrets desde valores directos
kubectl create secret generic bcv-secrets \
  --from-literal=mongodb-uri='mongodb://admin:pass@mongo:27017/bcv' \
  --from-literal=api-keys='["key-1", "key-2"]' \
  -n bcv-service
```

#### 3. Manifest YAML

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bcv-secrets
  namespace: bcv-service
type: Opaque
stringData:
  # stringData codifica automáticamente en base64
  mongodb-uri: "mongodb://admin:SecurePassword123@mongo:27017/bcv?authSource=admin"
  api-keys: '["key-abc123", "key-def456"]'
```

```bash
# Aplicar secret
kubectl apply -f k8s/secret.yaml

# Ver secret (valores en base64)
kubectl get secret bcv-secrets -n bcv-service -o yaml
```

#### 4. Usar Secrets en Deployment

**Opción 1: Como Variables de Entorno**

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bcv-service
spec:
  template:
    spec:
      containers:
      - name: bcv-service
        image: bcv-service:latest
        env:
        # Leer directamente de secret
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: bcv-secrets
              key: mongodb-uri
        - name: API_KEYS
          valueFrom:
            secretKeyRef:
              name: bcv-secrets
              key: api-keys
```

**Opción 2: Como Archivos Montados**

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bcv-service
spec:
  template:
    spec:
      containers:
      - name: bcv-service
        image: bcv-service:latest
        env:
        # Variables _FILE apuntando a archivos montados
        - name: MONGODB_URI_FILE
          value: /run/secrets/mongodb-uri
        - name: API_KEYS_FILE
          value: /run/secrets/api-keys
        volumeMounts:
        - name: secrets
          mountPath: /run/secrets
          readOnly: true
      volumes:
      - name: secrets
        secret:
          secretName: bcv-secrets
          items:
          - key: mongodb-uri
            path: mongodb-uri
          - key: api-keys
            path: api-keys
```

### External Secrets Operator (Avanzado)

Integración con gestores de secretos externos (AWS Secrets Manager, HashiCorp Vault, etc.)

```yaml
# Instalar External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

# SecretStore conectando a AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: bcv-service
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            key: secret-access-key

---
# ExternalSecret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: bcv-external-secrets
  namespace: bcv-service
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: bcv-secrets
    creationPolicy: Owner
  data:
  - secretKey: mongodb-uri
    remoteRef:
      key: bcv-service/mongodb-uri
  - secretKey: api-keys
    remoteRef:
      key: bcv-service/api-keys
```

---

## VPS Deployment

### Opción 1: Archivo .env Protegido

```bash
# Crear .env en servidor
cd ~/apps/bcv-service
vim .env

# Contenido:
NODE_ENV=production
PORT=3000
SAVE_TO_DATABASE=true
MONGODB_URI=mongodb://bcv_user:SecurePassword123!@localhost:27017/bcv?authSource=admin
LOG_LEVEL=info
CRON_SCHEDULE=*/30 * * * *
API_KEYS=["live-key-abc123", "backup-key-def456"]

# Establecer permisos restrictivos
chmod 600 .env

# Verificar ownership
ls -la .env
# -rw------- 1 celsius celsius 250 Jan 12 10:00 .env
```

### Opción 2: Vault de HashiCorp

```bash
# Instalar Vault
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Iniciar Vault en modo dev (testing)
vault server -dev

# En otra terminal, configurar
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='dev-token'

# Guardar secrets
vault kv put secret/bcv-service \
  mongodb_uri='mongodb://admin:pass@localhost:27017/bcv' \
  api_keys='["key-1", "key-2"]'

# Leer secrets
vault kv get secret/bcv-service

# En aplicación, usar vault-client
npm install node-vault

# Script para cargar secrets desde Vault
const vault = require('node-vault')({ endpoint: 'http://127.0.0.1:8200', token: process.env.VAULT_TOKEN });
const secrets = await vault.read('secret/data/bcv-service');
process.env.MONGODB_URI = secrets.data.data.mongodb_uri;
process.env.API_KEYS = secrets.data.data.api_keys;
```

### Opción 3: AWS Systems Manager Parameter Store

```bash
# Instalar AWS CLI
sudo apt install -y awscli

# Configurar credenciales
aws configure

# Guardar parámetros
aws ssm put-parameter \
  --name "/bcv-service/production/mongodb-uri" \
  --value "mongodb://admin:pass@localhost:27017/bcv" \
  --type SecureString

aws ssm put-parameter \
  --name "/bcv-service/production/api-keys" \
  --value '["key-1", "key-2"]' \
  --type SecureString

# Leer parámetros en aplicación
# Usar aws-sdk en Node.js
const AWS = require('aws-sdk');
const ssm = new AWS.SSM({ region: 'us-east-1' });

const params = await ssm.getParameter({
  Name: '/bcv-service/production/mongodb-uri',
  WithDecryption: true
}).promise();

process.env.MONGODB_URI = params.Parameter.Value;
```

---

## Mejores Prácticas

### 1. Nunca Commitear Secrets

```bash
# .gitignore
.env
.env.*
secrets/
*.key
*.pem
credentials.json
```

### 2. Usar Diferentes Secrets por Ambiente

```
secrets/
├── dev/
│   ├── mongodb_uri.txt
│   └── api_keys.txt
├── staging/
│   ├── mongodb_uri.txt
│   └── api_keys.txt
└── production/
    ├── mongodb_uri.txt
    └── api_keys.txt
```

### 3. Rotación Regular de Secrets

```bash
# Script de rotación
#!/bin/bash

# 1. Generar nueva API key
NEW_KEY=$(openssl rand -hex 32)

# 2. Actualizar en secret manager
kubectl create secret generic bcv-secrets-new \
  --from-literal=api-keys="[\"$NEW_KEY\", \"$OLD_KEY\"]" \
  -n bcv-service --dry-run=client -o yaml | kubectl apply -f -

# 3. Rolling restart
kubectl rollout restart deployment/bcv-service -n bcv-service

# 4. Esperar a que esté healthy
kubectl rollout status deployment/bcv-service -n bcv-service

# 5. Remover old key (después de validar)
kubectl create secret generic bcv-secrets \
  --from-literal=api-keys="[\"$NEW_KEY\"]" \
  -n bcv-service --dry-run=client -o yaml | kubectl apply -f -
```

### 4. Encriptar Secrets en Reposo

**Kubernetes**: Habilitar encryption at rest

```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
    - secrets
    providers:
    - aescbc:
        keys:
        - name: key1
          secret: <base64-encoded-secret>
    - identity: {}
```

### 5. Least Privilege Access

**Kubernetes RBAC**:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bcv-service-sa
  namespace: bcv-service
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: bcv-service
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["bcv-secrets"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-secrets
  namespace: bcv-service
subjects:
- kind: ServiceAccount
  name: bcv-service-sa
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

### 6. Auditoría de Secrets

```bash
# Kubernetes audit logs
kubectl get events -n bcv-service | grep secrets

# Ver quién accedió a secrets
kubectl get events --all-namespaces --field-selector involvedObject.kind=Secret

# Docker audit
docker history bcv-service:latest | grep -i secret
```

---

## Rotación de Secrets

### MongoDB Password Rotation

```bash
# 1. Conectar a MongoDB
mongosh -u admin -p

# 2. Cambiar password
use admin
db.changeUserPassword("bcv_user", "NewSecurePassword456!")

# 3. Actualizar secret
# Docker Compose:
echo "mongodb://bcv_user:NewSecurePassword456!@mongo:27017/bcv?authSource=admin" > secrets/mongodb_uri.txt

# Kubernetes:
kubectl create secret generic bcv-secrets \
  --from-literal=mongodb-uri='mongodb://bcv_user:NewSecurePassword456!@mongo:27017/bcv?authSource=admin' \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Rolling restart
docker-compose restart bcv-service
# o
kubectl rollout restart deployment/bcv-service -n bcv-service
```

### API Keys Rotation

**Estrategia**: Mantener 2 keys durante transición

```bash
# Estado actual: ["old-key"]

# 1. Agregar nueva key (mantener old)
NEW_KEY=$(openssl rand -hex 32)
echo "[\"old-key\", \"$NEW_KEY\"]" > secrets/api_keys.txt

# 2. Restart service
docker-compose restart bcv-service

# 3. Notificar a clientes para migrar a NEW_KEY

# 4. Después de período de gracia, remover old-key
echo "[\"$NEW_KEY\"]" > secrets/api_keys.txt

# 5. Restart nuevamente
docker-compose restart bcv-service
```

---

## Troubleshooting

### Secret no se lee correctamente

```bash
# Verificar que existe
# Docker:
docker-compose exec bcv-service ls -la /run/secrets/

# Kubernetes:
kubectl exec -it <pod-name> -n bcv-service -- ls -la /run/secrets/

# Verificar contenido
docker-compose exec bcv-service cat /run/secrets/mongodb_uri
kubectl exec -it <pod-name> -n bcv-service -- cat /run/secrets/mongodb-uri

# Verificar variables de entorno
docker-compose exec bcv-service env | grep _FILE
kubectl exec -it <pod-name> -n bcv-service -- env | grep _FILE
```

### Permisos incorrectos

```bash
# Docker: Los secrets siempre son 444 (read-only)
# Kubernetes: Configurar en secret definition

# Ejemplo:
volumes:
- name: secrets
  secret:
    secretName: bcv-secrets
    defaultMode: 0400  # read-only para owner
```

### Secret no se actualiza

```bash
# Docker Compose: Recrear container
docker-compose up -d --force-recreate bcv-service

# Kubernetes: Los secrets montados como volumen se actualizan automáticamente (eventual consistency)
# Para forzar actualización inmediata, rolling restart:
kubectl rollout restart deployment/bcv-service -n bcv-service
```

---

## Checklist de Seguridad

- [ ] Secrets no están en código fuente
- [ ] `.gitignore` configurado correctamente
- [ ] Permisos de archivos restrictivos (600 o 400)
- [ ] Diferentes secrets por ambiente
- [ ] Rotación de secrets programada
- [ ] Auditoría de acceso a secrets habilitada
- [ ] Encriptación en reposo habilitada (producción)
- [ ] Least privilege access configurado
- [ ] Backup de secrets en ubicación segura
- [ ] Proceso de recuperación de secrets documentado

---

## Referencias

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [External Secrets Operator](https://external-secrets.io/)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [12-Factor App: Config](https://12factor.net/config)
