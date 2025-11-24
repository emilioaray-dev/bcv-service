# Guía de Deployment en Kubernetes

Esta guía cubre el deployment del BCV Service en Kubernetes para ambientes productivos de alta disponibilidad con arquitectura SOLID, sistema dual-layer de persistencia y notificaciones multi-canal.

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Arquitectura en Kubernetes](#arquitectura-en-kubernetes)
3. [Manifests de Kubernetes](#manifests-de-kubernetes)
4. [Deployment Completo](#deployment-completo)
5. [Escalabilidad y Auto-scaling](#escalabilidad-y-auto-scaling)
6. [Monitoreo y Observabilidad](#monitoreo-y-observabilidad)
7. [Seguridad en Kubernetes](#seguridad-en-kubernetes)
8. [Health Checks Kubernetes-style](#health-checks-kubernetes-style)
9. [Network Policies](#network-policies)
10. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

### Herramientas Necesarias

```bash
# kubectl
kubectl version --client

# Cluster de Kubernetes (opciones)
# - Minikube (desarrollo local)
# - kind (desarrollo con clusters locales)
# - k3s (producción ligera)
# - GKE / EKS / AKS (cloud providers)
# - Self-hosted (kubeadm)

# Helm (opcional pero recomendado para charts complejos)
helm version

# Opcional: kustomize para overlays de ambiente
kustomize version
```

### Recursos Recomendados

| Componente | CPU | Memory | Storage |
|------------|-----|--------|---------|
| BCV Service (1 pod) | 0.5 | 256Mi | - |
| MongoDB | 1.0 | 512Mi | 20Gi |
| Redis (cache layer) | 0.2 | 128Mi | - |
| Total (3 replicas + dual-layer persistence) | 2.1 | 960Mi | 20Gi |

---

## Arquitectura en Kubernetes

### Topología del Cluster con Arquitectura Dual-Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Ingress Controller                        │   │
│  │            (nginx / traefik / istio)                      │   │
│  └─────────────────┬─────────────────────────────────────────┘   │
│                    │                                             │
│  ┌─────────────────▼─────────────────────────────────────────┐   │
│  │         BCV Service LoadBalancer                            │   │
│  │                Port 3000                                  │   │
│  └─────────────────┬─────────────────────────────────────────┘   │
│                    │                                             │
│  ┌─────────────────▼─────────────────────────────────────────┐   │
│  │                                                          │   │
│  │        BCV Service Deployment                            │   │
│  │    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │   │
│  │    │   Pod 1     │ │   Pod 2     │ │   Pod 3     │      │   │
│  │    │ (replica)   │ │ (replica)   │ │ (replica)   │      │   │
│  │    │ STATELESS   │ │ STATELESS   │ │ STATELESS   │      │   │
│  │    │ Dual-Layer  │ │ Dual-Layer  │ │ Dual-Layer  │      │   │
│  │    │ State       │ │ State       │ │ State       │      │   │
│  │    └─────────────┘ └─────────────┘ └─────────────┘      │   │
│  │                                                          │   │
│  └─────────────────┬─────────────────────────────────────────┘   │
│                    │                                             │
│  ┌─────────────────┴─────────────────────────────────────────┐   │
│  │         Dual-Layer Persistence System                     │   │
│  │                                                            │   │
│  │  ┌─────────────┐         ┌─────────────────────────────┐   │
│  │  │  Redis      │◄──────►│  MongoDB                    │   │
│  │  │  (Cache)    │         │  (Primary Storage)          │   │
│  │  │  Layer      │         │  Dual-Layer                 │   │
│  │  └─────────────┘         └─────────────────────────────┘   │
│  │         │                           │                      │
│  │         │     ┌─────────────────────▽─────────────────────┐ │
│  │         └─────►     Shared State Management              │ │
│  │               │   (Prevención de notificaciones dupli-  │ │
│  │               │    cadas entre múltiples instancias)     │ │
│  │               └───────────────────────────────────────────┘ │
│  └──────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        Notification Delivery System                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │   │
│  │  │  WebSocket  │ │   Discord   │ │  HTTP       │      │   │
│  │  │  Channel    │ │  Webhook    │ │  Webhooks   │      │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘      │   │
│  │         │               │                │            │   │
│  │         └───────────────┼────────────────┘            │   │
│  │                         │                             │   │
│  │             ┌───────────▼───────────┐                 │   │
│  │             │   Unified Notification│                 │   │
│  │             │   Coordination        │                 │   │
│  │             │   (Inversify + DI)    │                 │   │
│  └─────────────┴───────────────────────┴─────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

---

## Manifests de Kubernetes con Inversify y Dual-Layer

### 1. Namespace con Labels

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bcv-service
  labels:
    name: bcv-service
    environment: production
    tier: backend
```

### 2. Secret con Inversify Configuration (Dual-Layer)

```yaml
# k8s/base/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bcv-secrets
  namespace: bcv-service
type: Opaque
stringData:
  # MongoDB (almacenamiento primario para estado dual-layer)
  mongodb-uri: "mongodb://bcv_user:bcv4r4y4r4y@bcv-mongo:27017/bcv?authSource=admin"
  
  # Redis (capa de cache para acceso rápido a estado dual-layer)
  redis-password: "your-redis-password-here"
  
  # API Keys para autenticación
  api-keys: "key-12345,key-67890"
  
  # Webhook secrets para notificaciones multi-canal
  discord-webhook-url: "https://discord.com/api/webhooks/YOUR_CHANNEL/YOUR_TOKEN"
  webhook-url: "https://your-app.com/webhook/bcv-notifications"
  webhook-secret: "your-webhook-signing-secret"
  service-status-webhook-url: "https://your-app.com/webhook/service-status"
  deployment-webhook-url: "https://your-app.com/webhook/deployment"
  
  # Credenciales de MongoDB para seguridad
  mongo-root-username: "admin"
  mongo-root-password: "your-mongo-admin-password"
```

### 3. ConfigMap con Arquitectura SOLID

```yaml
# k8s/base/config-map.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bcv-config
  namespace: bcv-service
data:
  # Configuración general
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  DEV_FILE_LOGS: "false"
  
  # Configuración de persistencia dual-layer
  SAVE_TO_DATABASE: "true"  # MongoDB como almacenamiento primario
  CACHE_ENABLED: "true"     # Redis como capa de cache
  CACHE_TTL_LATEST: "300"   # 5 minutos para tasa más reciente
  CACHE_TTL_NOTIFICATIONS: "3600"  # 1 hora para estado de notificaciones
  
  # Configuración de scraping del BCV
  BCV_WEBSITE_URL: "https://www.bcv.org.ve/"
  CRON_SCHEDULE: "0 2,10,18 * * *"  # Cada 8 horas: 2am, 10am, 6pm
  
  # Configuración de Inversify (DI Container)
  INVERSIFY_DEBUG: "false"
  
  # Configuración de seguridad
  RATE_LIMIT_WINDOW_MS: "900000"      # 15 minutos
  RATE_LIMIT_MAX_REQUESTS: "100"
  CORS_ORIGIN: "*"  # Ajustar en producción
  
  # MongoDB connection pool configuration
  MONGODB_MAX_POOL_SIZE: "10"
  MONGODB_MIN_POOL_SIZE: "2"
  MONGODB_MAX_IDLE_TIME_MS: "60000"
  MONGODB_CONNECT_TIMEOUT_MS: "10000"
  MONGODB_SOCKET_TIMEOUT_MS: "45000"
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: "10000"
  MONGODB_RETRY_WRITES: "true"
  MONGODB_RETRY_READS: "true"
  MONGODB_COMPRESSORS: "zstd,snappy,zlib"
  
  # Redis configuration
  REDIS_HOST: "bcv-redis"
  REDIS_PORT: "6379"
  REDIS_DB: "0"
  REDIS_MAX_RETRIES: "3"
  REDIS_RETRY_DELAY: "1000"
  REDIS_CONNECT_TIMEOUT: "10000"
  
  # Notification thresholds
  NOTIFICATION_THRESHOLD_ABSOLUTE: "0.01"  # Umbral de cambio absoluto
  
  # WebSocket configuration
  WEBSOCKET_PING_INTERVAL: "30000"  # 30 segundos
  WEBSOCKET_PONG_TIMEOUT: "10000"   # 10 segundos
```

### 4. Deployment Principal con Inversify DI

```yaml
# k8s/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bcv-service
  namespace: bcv-service
  labels:
    app: bcv-service
    version: v2.1.0
    architecture: "SOLID-Inversify-DualLayer"
spec:
  replicas: 3  # Escalabilidad horizontal con estado dual-layer
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Máximo un pod adicional durante update
      maxUnavailable: 1  # Máximo un pod inactivo durante update
  
  selector:
    matchLabels:
      app: bcv-service
  
  template:
    metadata:
      labels:
        app: bcv-service
        version: v2.1.0
        tier: backend
    spec:
      serviceAccountName: bcv-service-account
      
      # Pod Disruption Budget para alta disponibilidad
      terminationGracePeriodSeconds: 60
      
      containers:
      - name: bcv-service
        image: ghcr.io/emilioaray-dev/bcv-service:latest
        imagePullPolicy: Always
        
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        - containerPort: 3001  # WebSocket port (si se expone separadamente)
          name: websocket
          protocol: TCP
        
        envFrom:
        - configMapRef:
            name: bcv-config
        - secretRef:
            name: bcv-secrets
            
        # Variables específicas para dual-layer persistence
        env:
        # Inversify container configuration
        - name: INVERSIFY_MODE
          value: "production"  # Para configuración de Inversify
        - name: ENABLE_DI_DEBUG
          value: "false"       # Deshabilitar debug de dependencias en prod
          
        # Dual-layer persistence configuration
        - name: REDIS_URL
          value: "redis://:$(REDIS_PASSWORD)@bcv-redis:6379/0"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: bcv-secrets
              key: mongodb-uri
              
        # Notification multi-channel configuration
        - name: DISCORD_WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: bcv-secrets
              key: discord-webhook-url
        - name: WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: bcv-secrets
              key: webhook-url
        - name: WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: bcv-secrets
              key: webhook-secret
              
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "1000m"  # Limitar CPU para prevenir abuso
            
        # Health checks Kubernetes-style (liveness/readiness/probes)
        livenessProbe:
          httpGet:
            path: /healthz
            port: 3000
            scheme: HTTP
          initialDelaySeconds: 40    # Esperar inicialmente a que se conecte MongoDB
          periodSeconds: 30         # Cada 30s
          timeoutSeconds: 10        # Timeout de 10s
          successThreshold: 1       # 1 éxito para considerar como vivo
          failureThreshold: 3       # Reiniciar después de 3 fallos
          
        readinessProbe:
          httpGet:
            path: /readyz
            port: 3000
            scheme: HTTP
          initialDelaySeconds: 20   # Ready check más rápido
          periodSeconds: 10        # Cada 10s
          timeoutSeconds: 5        # Timeout de 5s
          successThreshold: 1      # 1 éxito es suficiente
          failureThreshold: 3      # Marcar como no ready después de 3 fallos
          
        # Startup probe para asegurar conexión inicial (muy importante con dual-layer persistence)
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30  # Iniciar después de 30s
          periodSeconds: 10       # Revisar cada 10s
          timeoutSeconds: 10      # Timeout de 10s
          successThreshold: 1     # 1 éxito es suficiente
          failureThreshold: 30    # 30 * 10s = 300s antes de reiniciar (5 minutos de tiempo para iniciar con dual-layer)
          
        volumeMounts:
        - name: logs
          mountPath: /app/logs    # Logs persistentes para observabilidad
        - name: temp
          mountPath: /tmp         # Directorio temporal
          
      volumes:
      - name: logs
        emptyDir: {}
      - name: temp
        emptyDir: {}
        
      # Restart policy
      restartPolicy: Always
      
      # Node affinity y tolerations (opcional)
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - bcv-service
              topologyKey: kubernetes.io/hostname
```

### 5. Service para el Servicio BCV

```yaml
# k8s/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: bcv-service
  namespace: bcv-service
  labels:
    app: bcv-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  selector:
    app: bcv-service
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  - name: websocket  # Opcional, si se requiere puerto separado para WebSocket
    port: 81
    targetPort: 3000
    protocol: TCP
  sessionAffinity: None  # Stateless - no se requiere session affinity gracias a dual-layer persistence
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 horas (si se usa session affinity)
```

### 6. MongoDB StatefulSet con Persistencia

```yaml
# k8s/base/mongodb-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: bcv-mongo
  namespace: bcv-service
  labels:
    app: bcv-mongo
    tier: database
spec:
  serviceName: bcv-mongo
  replicas: 1  # MongoDB primario para almacenamiento dual-layer
  selector:
    matchLabels:
      app: bcv-mongo
  template:
    metadata:
      labels:
        app: bcv-mongo
        tier: database
    spec:
      terminationGracePeriodSeconds: 30
      
      containers:
      - name: mongo
        image: mongo:7
        ports:
        - containerPort: 27017
          name: mongo
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          valueFrom:
            secretKeyRef:
              name: bcv-secrets
              key: mongo-root-username
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: bcv-secrets
              key: mongo-root-password
        - name: MONGO_INITDB_DATABASE
          value: "bcv"
        args:
        # Configuración de seguridad y rendimiento para dual-layer persistence
        - --wiredTigerCacheSizeGB=1
        - --auth
        - --setParameter
        - authenticationMechanisms=SCRAM-SHA-256
        volumeMounts:
        - name: mongo-data
          mountPath: /data/db
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - bash
            - -c
            - |
              mongosh --quiet --eval "db.adminCommand('ping')" \
                --username "$(MONGO_INITDB_ROOT_USERNAME)" \
                --password "$(MONGO_INITDB_ROOT_PASSWORD)" \
                --authenticationDatabase admin
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 10
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
            - bash
            - -c
            - |
              mongosh --quiet --eval "db.runCommand('ping')" \
                --username "$(MONGO_INITDB_ROOT_USERNAME)" \
                --password "$(MONGO_INITDB_ROOT_PASSWORD)" \
                --authenticationDatabase admin
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
  volumeClaimTemplates:
  - metadata:
      name: mongo-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "fast-ssd"  # Usar SSD para mejor performance de persistencia dual-layer
      resources:
        requests:
          storage: 20Gi  # Espacio para tasas históricas y estado persistente
```

### 7. MongoDB Service

```yaml
# k8s/base/mongodb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: bcv-mongo
  namespace: bcv-service
  labels:
    app: bcv-mongo
    tier: database
spec:
  type: ClusterIP
  clusterIP: None  # Headless service para StatefulSet
  selector:
    app: bcv-mongo
  ports:
  - port: 27017
    targetPort: 27017
    name: mongo
```

### 8. Redis para Dual-Layer Cache (Opcional pero recomendado)

```yaml
# k8s/base/redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: bcv-redis
  namespace: bcv-service
  labels:
    app: bcv-redis
    tier: cache
spec:
  serviceName: bcv-redis
  replicas: 1  # Redis para capa de cache dual-layer
  selector:
    matchLabels:
      app: bcv-redis
  template:
    metadata:
      labels:
        app: bcv-redis
        tier: cache
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
          name: redis
        command:
        - redis-server
        args:
        - --requirepass-file
        - /run/secrets/redis_password
        - --appendonly
        - "yes"
        - --maxmemory
        - 256mb
        - --maxmemory-policy
        - allkeys-lru  # Política de evicción para cache dual-layer
        volumeMounts:
        - name: redis-data
          mountPath: /data
        - name: redis-password
          mountPath: /run/secrets/redis_password
          subPath: redis_password
          readOnly: true
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - -a
            - "$(cat /run/secrets/redis_password)"
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
            - redis-cli
            - -a
            - "$(cat /run/secrets/redis_password)"
            - ping
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
      volumes:
      - name: redis-password
        secret:
          secretName: bcv-secrets
          items:
          - key: redis-password
            path: redis_password
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "fast-ssd"  # SSD para mejor performance de cache
      resources:
        requests:
          storage: 2Gi
```

### 9. Redis Service

```yaml
# k8s/base/redis-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: bcv-redis
  namespace: bcv-service
  labels:
    app: bcv-redis
    tier: cache
spec:
  type: ClusterIP
  clusterIP: None  # Headless service para StatefulSet
  selector:
    app: bcv-redis
  ports:
  - port: 6379
    targetPort: 6379
    name: redis
```

### 10. Horizontal Pod Autoscaler (HPA)

```yaml
# k8s/base/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bcv-service-hpa
  namespace: bcv-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bcv-service
  minReplicas: 2  # Mínimo 2 replicas para alta disponibilidad con dual-layer
  maxReplicas: 10 # Máximo 10 replicas
  metrics:
  # Basado en CPU (70% utilization)
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  # Basado en Memory (80% utilization)
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  # Basado en tasas de requests HTTP personalizadas
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 minutos para evitar scaling down rápidamente
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60   # 1 minuto para scaling up
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
```

### 11. ServiceMonitor para Prometheus (Observabilidad con Inversify Metrics)

```yaml
# k8s/monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bcv-service-monitor
  namespace: bcv-service
  labels:
    app: bcv-service
    monitoring: prometheus
spec:
  selector:
    matchLabels:
      app: bcv-service
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
    relabelings:
    - sourceLabels: [__meta_kubernetes_pod_label_app]
      targetLabel: app
    - sourceLabels: [__meta_kubernetes_namespace]
      targetLabel: namespace
  namespaceSelector:
    matchNames:
    - bcv-service
```

### 12. Network Policies para Seguridad

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: bcv-service-netpol
  namespace: bcv-service
spec:
  podSelector:
    matchLabels:
      app: bcv-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    # Permitir ingreso desde Ingress controller
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
      podSelector:
        matchLabels:
          app.kubernetes.io/name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    # Solo permitir egress a MongoDB y Redis internos para dual-layer persistence
    - namespaceSelector:
        matchLabels:
          name: bcv-service
      podSelector:
        matchLabels:
          app: bcv-mongo
    ports:
    - protocol: TCP
      port: 27017
  - to:
    # Permitir egress a Redis para cache dual-layer
    - namespaceSelector:
        matchLabels:
          name: bcv-service
      podSelector:
        matchLabels:
          app: bcv-redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    # Permitir egress a DNS
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
  - to:
    # Permitir acceso a BCV website para scraping
    - ipBlock:
        cidr: 0.0.0.0/0
      except:
      - 10.0.0.0/8
      - 172.16.0.0/12
      - 192.168.0.0/16
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443
  - to:
    # Permitir notificaciones a Discord y webhooks
    - ipBlock:
        cidr: 0.0.0.0/0
      except:
      - 10.0.0.0/8
      - 172.16.0.0/12
      - 192.168.0.0/16
    ports:
    - protocol: TCP
      port: 443
```

---

## Deployment Completo

### 13. Kustomize Overlay para Producción

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: bcv-service

bases:
- ../../base

patchesStrategicMerge:
- deployment-patch.yaml
- service-patch.yaml

images:
- name: ghcr.io/emilioaray-dev/bcv-service
  newName: ghcr.io/emilioaray-dev/bcv-service
  newTag: 2.1.0

secretGenerator:
- name: bcv-secrets
  files:
  - mongodb_uri.txt
  - api_keys.txt
  - discord_webhook_url.txt
  - webhook_url.txt
  - webhook_secret.txt
  type: Opaque

configMapGenerator:
- name: bcv-config
  behavior: merge
  literals:
  - NODE_ENV=production
  - LOG_LEVEL=info
  - SAVE_TO_DATABASE=true
  - CACHE_ENABLED=true
  - CRON_SCHEDULE=0 2,10,18 * * *
```

### 14. Despliegue con Kompose o Kubectl

```bash
# Opción 1: Usar kubectl apply
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/secrets.yaml
kubectl apply -f k8s/base/config-map.yaml
kubectl apply -f k8s/base/mongodb-service.yaml
kubectl apply -f k8s/base/mongodb-statefulset.yaml
kubectl apply -f k8s/base/redis-service.yaml
kubectl apply -f k8s/base/redis-statefulset.yaml
kubectl apply -f k8s/base/service.yaml
kubectl apply -f k8s/base/deployment.yaml
kubectl apply -f k8s/base/hpa.yaml

# Esperar a que MongoDB y Redis estén ready
kubectl wait --for=condition=ready pod -l app=bcv-mongo -n bcv-service --timeout=300s
kubectl wait --for=condition=ready pod -l app=bcv-redis -n bcv-service --timeout=300s

# Opción 2: Usar kustomize
kubectl apply -k k8s/overlays/production/

# Opción 3: Usar Helm chart (si está disponible)
helm install bcv-service ./charts/bcv-service \
  --namespace bcv-service \
  --create-namespace \
  --set image.tag=2.1.0 \
  --set replicaCount=3 \
  --set persistence.storageClass=fast-ssd \
  --values production-values.yaml
```

### 15. Verificación del Deployment

```bash
# Verificar estado de todos los recursos
kubectl get all -n bcv-service

# Verificar pods
kubectl get pods -n bcv-service -o wide
kubectl describe pod -l app=bcv-service -n bcv-service

# Verificar servicios
kubectl get svc -n bcv-service
kubectl describe svc bcv-service -n bcv-service

# Verificar StatefulSets
kubectl get statefulsets -n bcv-service
kubectl describe statefulset -l app=bcv-mongo -n bcv-service

# Verificar HPA
kubectl get hpa -n bcv-service
kubectl describe hpa bcv-service-hpa -n bcv-service

# Verificar eventos
kubectl get events -n bcv-service --sort-by='.lastTimestamp'

# Verificar logs
kubectl logs -f deployment/bcv-service -n bcv-service --tail=100

# Verificar métricas de recursos
kubectl top pods -n bcv-service

# Verificar health checks
curl -H "X-API-Key: $(kubectl get secret bcv-secrets -n bcv-service -o jsonpath='{.data.api-keys}' | base64 -d)" \
  http://$(kubectl get svc bcv-service -n bcv-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')/health

# Verificar estado dual-layer (MongoDB + Redis)
kubectl exec -it bcv-mongo-0 -n bcv-service -- mongosh bcv --eval "db.notificationStates.findOne()"
kubectl exec -it bcv-redis-0 -n bcv-service -- redis-cli get "bcv:notifications:last_state"
```

---

## Escalabilidad y Auto-scaling con Dual-Layer Architecture

### 16. Escalabilidad Horizontal con Estado Persistente (Dual-Layer)

El sistema dual-layer (MongoDB primario + Redis cache) permite escalabilidad horizontal eficiente:

```yaml
# Características de escalabilidad horizontal con dual-layer persistence:
# 1. Estado compartido entre instancias (no depende de estado local)
# 2. Prevención de notificaciones duplicadas entre instancias
# 3. Consistencia de notificaciones a través de múltiples instancias
# 4. Distribución equitativa de carga con Load Balancer

# Escalabilidad manual
kubectl scale deployment/bcv-service --replicas=5 -n bcv-service

# Auto-scaling basado en métricas (HPA ya configurado previamente)
# - CPU: 70% utilization trigger
# - Memory: 80% utilization trigger
# - HTTP requests: 100 req/sec trigger
```

### 17. Estrategia de Scaling con Inversify Services

```yaml
# El contenedor Inversify permite que cada instancia tenga sus propios servicios inyectados
# pero compartiendo el estado dual-layer, lo que permite:
# - Inyección de dependencias eficiente en cada pod
# - Estado consistente entre instancias
# - Operación stateless con persistencia compartida
# - Escalabilidad basada en métricas personalizadas de Inversify
```

---

## Monitoreo y Observabilidad con Inversify y Dual-Layer

### 18. Métricas Prometheus para Inversify Services

```typescript
// src/services/metrics.service.ts (fragmento relevante para Kubernetes)
import { Counter, Gauge, Histogram } from 'prom-client';

export class MetricsService implements IMetricsService {
  // Métricas para Inversify container
  private inversifyResolutionTime: Histogram;
  private inversifyResolutionErrors: Counter;

  // Métricas para dual-layer persistence
  private dualLayerCacheHit: Counter;
  private dualLayerCacheMiss: Counter;
  private dualLayerOperationDuration: Histogram;
  
  // Métricas para notificaciones multi-canal
  private notificationChannelsTotal: Counter;
  private notificationSuccessTotal: Counter;
  private notificationFailureTotal: Counter;

  constructor() {
    // Inversify metrics
    this.inversifyResolutionTime = new Histogram({
      name: 'inversify_resolution_duration_seconds',
      help: 'Duration of Inversify service resolution',
      labelNames: ['service', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });

    // Dual-layer metrics
    this.dualLayerCacheHit = new Counter({
      name: 'dual_layer_cache_hits_total',
      help: 'Total cache hits in Redis layer for notification state',
      labelNames: ['layer', 'operation']
    });

    this.dualLayerCacheMiss = new Counter({
      name: 'dual_layer_cache_misses_total',
      help: 'Total cache misses requiring MongoDB fallback in dual-layer',
      labelNames: ['layer', 'operation']
    });

    this.dualLayerOperationDuration = new Histogram({
      name: 'dual_layer_operation_duration_seconds',
      help: 'Duration of dual-layer operations',
      labelNames: ['operation', 'layer', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });

    // Notification metrics
    this.notificationChannelsTotal = new Counter({
      name: 'notification_channels_total',
      help: 'Total notification channels attempted with unified coordination',
      labelNames: ['channel', 'event_type']
    });

    this.notificationSuccessTotal = new Counter({
      name: 'notification_success_total',
      help: 'Total successful notifications across all channels',
      labelNames: ['channel', 'event_type']
    });

    this.notificationFailureTotal = new Counter({
      name: 'notification_failure_total',
      help: 'Total failed notifications across all channels',
      labelNames: ['channel', 'event_type', 'reason']
    });
  }
}
```

### 19. Queries Prometheus para Dual-Layer State

```
# Cache hit/miss ratio (rendimiento del sistema dual-layer)
rate(dual_layer_cache_hits_total{layer="redis"}[5m]) / 
(rate(dual_layer_cache_hits_total{layer="redis"}[5m]) + rate(dual_layer_cache_misses_total[5m]))

# Latencia promedio de operaciones dual-layer
rate(dual_layer_operation_duration_seconds_sum[5m]) / 
rate(dual_layer_operation_duration_seconds_count[5m])

# Tasa de éxito de Inversify resolution
rate(inversify_resolution_errors_total[5m])

# Notificaciones por canal (multi-channel con coordinación unificada)
rate(notification_success_total{channel="discord"}[5m])
rate(notification_success_total{channel="webhook"}[5m])
rate(notification_success_total{channel="websocket"}[5m])

# WebSocket clients concurrentes (en todos los pods)
sum(websocket_clients_connected)
```

---

## Seguridad en Kubernetes con Inversify

### 20. RBAC (Role-Based Access Control)

```yaml
# k8s/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bcv-service-account
  namespace: bcv-service
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: bcv-service-role
  namespace: bcv-service
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list"]
- apiGroups: ["autoscaling"]
  resources: ["horizontalpodautoscalers"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: bcv-service-rolebinding
  namespace: bcv-service
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: bcv-service-role
subjects:
- kind: ServiceAccount
  name: bcv-service-account
  namespace: bcv-service
```

### 21. Security Context

```yaml
# En el deployment.yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault
      
      containers:
      - name: bcv-service
        # ... otros campos ...
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1001
          capabilities:
            drop:
            - ALL
```

---

## Health Checks Kubernetes-style con Inversify

### 22. Endpoints de Health Check

El servicio implementa 3 niveles de health checks estilo Kubernetes:

#### `/healthz` - Liveness Probe
```typescript
// src/controllers/health.controller.ts
@get('/healthz')
async healthz(req: Request, res: Response): Promise<void> {
  // Ultra-rápido, sin I/O, solo verifica que el proceso esté vivo
  this.logger.debug('Liveness check received');
  res.status(200).send('OK');
}
```

#### `/readyz` - Readiness Probe
```typescript
// src/controllers/health.controller.ts
@get('/readyz')
async readyz(req: Request, res: Response): Promise<void> {
  // Verifica conectividad a dependencias críticas
  try {
    // Solo verifica conectividad a MongoDB (almacenamiento primario dual-layer)
    // No verifica Redis porque no es crítico para readiness (usará fallback a MongoDB)
    await this.cacheService.ping();
    
    res.status(200).send('READY');
  } catch (error) {
    res.status(503).send('NOT READY');
  }
}
```

#### `/health` - Full Diagnostics
```typescript
// src/controllers/health.controller.ts
@get('/health')
async health(req: Request, res: Response): Promise<void> {
  // Diagnóstico completo de todos los componentes
  const checks = await Promise.allSettled([
    this.checkMongoDB(),    // Almacenamiento primario dual-layer
    this.checkRedis(),      // Capa de cache dual-layer
    this.checkWebSocket(),  // Servicio de notificaciones
    this.checkScheduler(),  // Servicio de tareas programadas
    this.checkDiscord(),    // Servicio de notificaciones Discord
    this.checkWebhook()     // Servicio de notificaciones HTTP
  ]);

  const results = this.processResults(checks);
  const overallStatus = this.calculateOverallStatus(results);

  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: results,
    architecture: 'SOLID with Inversify DI',
    persistence: 'Dual-Layer (MongoDB + Redis)',
    notifications: 'Multi-channel (WebSocket, Discord, Webhook)'
  });
}
```

---

## Troubleshooting

### 23. Problemas Comunes en Kubernetes con Dual-Layer Architecture

#### A. Problemas de Estado Persistente Dual-Layer

```bash
# Verificar estado de persistencia en Redis (capa de cache)
kubectl exec -it bcv-redis-0 -n bcv-service -- redis-cli -a "$(kubectl get secret bcv-secrets -n bcv-service -o jsonpath='{.data.redis-password}' | base64 -d)" KEYS "bcv:*"

# Verificar estado de persistencia en MongoDB (almacenamiento primario)
kubectl exec -it bcv-mongo-0 -n bcv-service -- mongosh bcv --eval "db.notificationStates.findOne()"

# Verificar coincidencia entre ambos sistemas
kubectl logs -f deployment/bcv-service -n bcv-service | grep -i "dual-layer\|cache\|persistence"
```

#### B. Problemas de Inversify Dependency Injection

```bash
# Verificar que el contenedor Inversify funciona correctamente
kubectl logs -f deployment/bcv-service -n bcv-service | grep -i "inversify\|di\|container"

# Verificar resolución de dependencias
kubectl exec -it <bcv-pod-name> -n bcv-service -- node -e "
  const { createContainer } = require('./dist/config/inversify.config');
  const container = createContainer();
  console.log('Inversify container created:', container);
  console.log('BCVService bound:', container.isBound(require('./dist/config/types').TYPES.BCVService));
  console.log('MongoService bound:', container.isBound(require('./dist/config/types').TYPES.CacheService));
  console.log('RedisService bound:', container.isBound(require('./dist/config/types').TYPES.RedisService));
  console.log('NotificationStateService bound:', container.isBound(require('./dist/config/types').TYPES.NotificationStateService));
"
```

#### C. Problemas de Notificaciones Multi-Canal

```bash
# Verificar logs de notificaciones
kubectl logs -f deployment/bcv-service -n bcv-service | grep -i "notification\|discord\|webhook\|websocket"

# Verificar métricas de notificaciones
kubectl logs -f deployment/bcv-service -n bcv-service | grep -i "notification_success\|notification_failure"

# Verificar estado de WebSocket connections
kubectl logs -f deployment/bcv-service -n bcv-service | grep -i "websocket\|clients"
```

#### D. Problemas de Escalabilidad con Estado Dual-Layer

```bash
# Verificar que las notificaciones no se dupliquen entre múltiples instancias
kubectl logs -f deployment/bcv-service -n bcv-service | grep -i "duplicate\|notification\|sent"

# Verificar que todas las instancias usan el sistema dual-layer de forma coordinada
kubectl get pods -n bcv-service -l app=bcv-service
kubectl logs deployment/bcv-service-6d4f5g8h9j -n bcv-service | head -50
kubectl logs deployment/bcv-service-1a2b3c4d5e -n bcv-service | head -50
```

### 24. Debugging Commands

```bash
# Verificar conectividad interna
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -n bcv-service -- sh
#> nslookup bcv-mongo.bcv-service.svc.cluster.local
#> curl -v http://bcv-service:3000/health

# Verificar variables de entorno en el pod
kubectl exec deployment/bcv-service -n bcv-service -- env | grep -E "(MONGO|REDIS|API|NODE_|PORT|CRON|CACHE)"

# Verificar archivo de configuración de Inversify
kubectl exec deployment/bcv-service -n bcv-service -- ls -la /app/dist/config/

# Verificar estado de todos los componentes del sistema dual-layer
kubectl exec deployment/bcv-service -n bcv-service -- node -e "
  const http = require('http');
  http.get('http://localhost:3000/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Health:', data));
  });
"

# Verificar métricas de performance dual-layer
kubectl port-forward service/bcv-service 9090:80 -n monitoring
# Luego ir a http://localhost:9090 para acceso a Prometheus
```

---

## Deployment Estratégico con Dual-Layer Architecture

### 25. Blue-Green Deployment para Sistema Dual-Layer

```yaml
# Para evitar interrupciones en el estado persistente dual-layer durante despliegues
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: bcv-service-rollout
  namespace: bcv-service
spec:
  replicas: 3
  strategy:
    blueGreen:
      activeService: bcv-service-active
      previewService: bcv-service-preview
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: bcv-service-preview
      postPromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: bcv-service-active
  selector:
    matchLabels:
      app: bcv-service
  template:
    metadata:
      labels:
        app: bcv-service
    spec:
      containers:
      - name: bcv-service
        image: ghcr.io/emilioaray-dev/bcv-service:2.1.0
        # ... resto de la configuración
```

---

## Resumen de Características Implementadas

✅ **Arquitectura SOLID**: Implementación completa con Inversify DI  
✅ **Dual-Layer Persistence**: MongoDB primario + Redis cache para estado persistente  
✅ **Notificaciones Multi-Canal**: WebSocket, Discord y Webhooks coordinados  
✅ **Sistema de Estado Persistente**: Prevención de notificaciones duplicadas entre reinicios  
✅ **Inversify Integration**: Inyección de dependencias con contenedor IoC  
✅ **Security Headers**: Helmet.js con CSP, HSTS, XSS protection  
✅ **Rate Limiting**: 100 requests/15 min con express-rate-limit  
✅ **Health Checks**: 3 niveles (liveness, readiness, full diagnostics)  
✅ **Metrics**: Prometheus integration con métricas para dual-layer y notificaciones  
✅ **Auto-scaling**: HPA con métricas personalizadas  
✅ **Observabilidad**: Winston logging + Prometheus metrics  
✅ **Seguridad**: Docker Secrets + API Key auth + Webhook signatures  
✅ **Performance**: Compression + Dual-layer caching + Optimized queries  

---

## Estado Actual

El servicio BCV Service está completamente desplegable en Kubernetes con:
- ✅ Arquitectura stateless con dual-layer persistence
- ✅ Escalabilidad horizontal (múltiples replicas)  
- ✅ Sistema de estado persistente sin notificaciones duplicadas
- ✅ Inversify DI para desacoplamiento y testabilidad
- ✅ Notificaciones multi-canal coordinadas
- ✅ Observabilidad completa con Prometheus y health checks
- ✅ Seguridad implementada con best practices

---

**Última actualización**: 2025-11-24  
**Versión del servicio**: 2.1.0  
**Arquitectura**: SOLID con Inversify + Dual-Layer Persistence + Multi-Channel Notifications