# Guía de Deployment en Kubernetes

Esta guía cubre el deployment del BCV Service en Kubernetes para ambientes productivos de alta disponibilidad.

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Arquitectura](#arquitectura)
3. [Manifests de Kubernetes](#manifests-de-kubernetes)
4. [Deployment](#deployment)
5. [Scaling](#scaling)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

### Herramientas Necesarias

```bash
# kubectl
kubectl version --client

# Cluster de Kubernetes (opciones)
# - Minikube (desarrollo local)
# - k3s (producción ligera)
# - GKE / EKS / AKS (cloud)
# - Self-hosted (kubeadm)

# Helm (opcional pero recomendado)
helm version
```

### Recursos Mínimos

| Componente | CPU | Memory | Storage |
|------------|-----|--------|---------|
| BCV Service (1 pod) | 0.5 | 256Mi | - |
| MongoDB | 1.0 | 512Mi | 20Gi |
| Total (3 replicas) | 2.5 | 1280Mi | 20Gi |

---

## Arquitectura

### Topología del Cluster

```
┌────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Ingress Controller                   │  │
│  │         (nginx / traefik / istio)                 │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                     │
│  ┌────────────────▼─────────────────────────────────┐  │
│  │         BCV Service (LoadBalancer)               │  │
│  │             Port 3000                             │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                     │
│  ┌────────────────▼─────────────────────────────────┐  │
│  │          BCV Deployment                           │  │
│  │    ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │    │  Pod 1   │ │  Pod 2   │ │  Pod 3   │       │  │
│  │    │ (replica)│ │ (replica)│ │ (replica)│       │  │
│  │    └──────────┘ └──────────┘ └──────────┘       │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                     │
│  ┌────────────────▼─────────────────────────────────┐  │
│  │       MongoDB StatefulSet                         │  │
│  │         (PersistentVolume)                        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Monitoring Stack (opcional)                      │ │
│  │  - Prometheus                                     │ │
│  │  - Grafana                                        │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## Manifests de Kubernetes

### Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bcv-service
  labels:
    name: bcv-service
    environment: production
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bcv-config
  namespace: bcv-service
data:
  NODE_ENV: "production"
  PORT: "3000"
  SAVE_TO_DATABASE: "true"
  LOG_LEVEL: "info"
  CRON_SCHEDULE: "*/30 * * * *"
  MONGODB_URI: "mongodb://bcv-mongo:27017/bcv"
```

### Secret

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bcv-secrets
  namespace: bcv-service
type: Opaque
stringData:
  mongodb-uri: "mongodb://admin:SecurePassword123@bcv-mongo:27017/bcv?authSource=admin"
  api-keys: '["key-12345", "key-67890"]'
  mongo-root-username: "admin"
  mongo-root-password: "SecurePassword123"
```

Crear secret desde archivo:
```bash
kubectl create secret generic bcv-secrets \
  --from-file=mongodb-uri=./secrets/mongodb_uri.txt \
  --from-file=api-keys=./secrets/api_keys.txt \
  -n bcv-service
```

### Deployment - BCV Service

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bcv-service
  namespace: bcv-service
  labels:
    app: bcv-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bcv-service
  template:
    metadata:
      labels:
        app: bcv-service
        version: v1
    spec:
      containers:
      - name: bcv-service
        image: your-registry/bcv-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: bcv-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: bcv-config
              key: PORT
        - name: SAVE_TO_DATABASE
          valueFrom:
            configMapKeyRef:
              name: bcv-config
              key: SAVE_TO_DATABASE
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: bcv-config
              key: LOG_LEVEL
        - name: CRON_SCHEDULE
          valueFrom:
            configMapKeyRef:
              name: bcv-config
              key: CRON_SCHEDULE
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
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /readyz
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
      restartPolicy: Always
```

### Service - BCV Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: bcv-service
  namespace: bcv-service
  labels:
    app: bcv-service
spec:
  type: LoadBalancer
  selector:
    app: bcv-service
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 horas para WebSocket
```

### StatefulSet - MongoDB

```yaml
# k8s/mongodb-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: bcv-mongo
  namespace: bcv-service
spec:
  serviceName: bcv-mongo
  replicas: 1
  selector:
    matchLabels:
      app: bcv-mongo
  template:
    metadata:
      labels:
        app: bcv-mongo
    spec:
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
        volumeMounts:
        - name: mongo-data
          mountPath: /data/db
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - mongosh
            - --eval
            - "db.adminCommand('ping')"
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - mongosh
            - --eval
            - "db.adminCommand('ping')"
          initialDelaySeconds: 5
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: mongo-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 20Gi
```

### Service - MongoDB

```yaml
# k8s/mongodb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: bcv-mongo
  namespace: bcv-service
  labels:
    app: bcv-mongo
spec:
  type: ClusterIP
  clusterIP: None  # Headless service for StatefulSet
  selector:
    app: bcv-mongo
  ports:
  - port: 27017
    targetPort: 27017
    name: mongo
```

### HorizontalPodAutoscaler

```yaml
# k8s/hpa.yaml
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
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
```

### Ingress (Nginx)

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bcv-service-ingress
  namespace: bcv-service
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/websocket-services: "bcv-service"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  tls:
  - hosts:
    - bcv-api.yourdomain.com
    secretName: bcv-tls-secret
  rules:
  - host: bcv-api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bcv-service
            port:
              number: 80
```

### ServiceMonitor (Prometheus)

```yaml
# k8s/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bcv-service-metrics
  namespace: bcv-service
  labels:
    app: bcv-service
spec:
  selector:
    matchLabels:
      app: bcv-service
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
```

---

## Deployment

### Deploy Completo

```bash
# 1. Crear namespace
kubectl apply -f k8s/namespace.yaml

# 2. Crear secrets
kubectl apply -f k8s/secret.yaml

# 3. Crear configmap
kubectl apply -f k8s/configmap.yaml

# 4. Deploy MongoDB
kubectl apply -f k8s/mongodb-statefulset.yaml
kubectl apply -f k8s/mongodb-service.yaml

# Esperar a que MongoDB esté ready
kubectl wait --for=condition=ready pod -l app=bcv-mongo -n bcv-service --timeout=300s

# 5. Deploy BCV Service
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# 6. Configurar autoscaling
kubectl apply -f k8s/hpa.yaml

# 7. Configurar ingress (opcional)
kubectl apply -f k8s/ingress.yaml

# 8. Configurar monitoring (opcional)
kubectl apply -f k8s/servicemonitor.yaml
```

### Deploy con Kustomize

```bash
# k8s/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: bcv-service

resources:
  - namespace.yaml
  - configmap.yaml
  - secret.yaml
  - deployment.yaml
  - service.yaml
  - mongodb-statefulset.yaml
  - mongodb-service.yaml
  - hpa.yaml
  - ingress.yaml

# Deploy con kustomize
kubectl apply -k k8s/
```

### Verificar Deployment

```bash
# Ver pods
kubectl get pods -n bcv-service

# Ver servicios
kubectl get svc -n bcv-service

# Ver ingress
kubectl get ingress -n bcv-service

# Ver logs
kubectl logs -f deployment/bcv-service -n bcv-service

# Ver eventos
kubectl get events -n bcv-service --sort-by=.metadata.creationTimestamp

# Describe pod
kubectl describe pod <pod-name> -n bcv-service

# Ver métricas de HPA
kubectl get hpa -n bcv-service
```

---

## Scaling

### Manual Scaling

```bash
# Escalar deployment
kubectl scale deployment/bcv-service --replicas=5 -n bcv-service

# Verificar
kubectl get pods -n bcv-service -l app=bcv-service
```

### Auto-scaling (HPA)

El HPA configurado escala automáticamente basado en:
- CPU: 70% utilization
- Memory: 80% utilization
- Min replicas: 2
- Max replicas: 10

```bash
# Ver estado del HPA
kubectl get hpa bcv-service-hpa -n bcv-service

# Ver métricas actuales
kubectl top pods -n bcv-service

# Ver histórico de scaling
kubectl describe hpa bcv-service-hpa -n bcv-service
```

### Vertical Pod Autoscaler (VPA) - Opcional

```yaml
# k8s/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: bcv-service-vpa
  namespace: bcv-service
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: bcv-service
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: bcv-service
      minAllowed:
        cpu: "250m"
        memory: "256Mi"
      maxAllowed:
        cpu: "2000m"
        memory: "1Gi"
```

---

## Monitoring

### Prometheus + Grafana

```bash
# Instalar Prometheus Operator con Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --create-namespace

# Aplicar ServiceMonitor
kubectl apply -f k8s/servicemonitor.yaml

# Acceder a Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Usuario: admin
# Password:
kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
```

### Queries Prometheus útiles

```promql
# Request rate
rate(http_requests_total{job="bcv-service"}[5m])

# Error rate
rate(http_requests_total{job="bcv-service", status=~"5.."}[5m])

# Latency p95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# WebSocket connections
websocket_clients_connected

# Pod CPU usage
container_cpu_usage_seconds_total{pod=~"bcv-service-.*"}

# Pod Memory usage
container_memory_usage_bytes{pod=~"bcv-service-.*"}
```

### Logs Aggregation

```bash
# Opciones:
# 1. ELK Stack (Elasticsearch + Logstash + Kibana)
# 2. EFK Stack (Elasticsearch + Fluentd + Kibana)
# 3. Loki + Grafana

# Ejemplo con Loki
helm install loki grafana/loki-stack \
  -n monitoring \
  --set promtail.enabled=true

# Ver logs en Grafana Loki datasource
# Query: {namespace="bcv-service", app="bcv-service"}
```

---

## Rolling Updates

### Update de Imagen

```bash
# Actualizar imagen
kubectl set image deployment/bcv-service \
  bcv-service=your-registry/bcv-service:v2.0.0 \
  -n bcv-service

# Ver rollout status
kubectl rollout status deployment/bcv-service -n bcv-service

# Ver histórico
kubectl rollout history deployment/bcv-service -n bcv-service
```

### Rollback

```bash
# Rollback a versión anterior
kubectl rollout undo deployment/bcv-service -n bcv-service

# Rollback a versión específica
kubectl rollout undo deployment/bcv-service --to-revision=2 -n bcv-service
```

### Strategy de Deployment

```yaml
# En deployment.yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Pods adicionales durante update
      maxUnavailable: 0  # Pods indisponibles durante update
```

---

## Troubleshooting

### Pods no inician

```bash
# Ver estado
kubectl get pods -n bcv-service

# Describe pod
kubectl describe pod <pod-name> -n bcv-service

# Ver logs
kubectl logs <pod-name> -n bcv-service

# Ver logs de container anterior (si crasheó)
kubectl logs <pod-name> -n bcv-service --previous

# Ejecutar comando en pod
kubectl exec -it <pod-name> -n bcv-service -- sh
```

### Problemas de Red

```bash
# Verificar servicio
kubectl get svc -n bcv-service

# Test de conectividad desde otro pod
kubectl run -it --rm debug --image=alpine --restart=Never -n bcv-service -- sh
> apk add curl
> curl http://bcv-service/health

# Ver endpoints
kubectl get endpoints bcv-service -n bcv-service
```

### MongoDB Connection Issues

```bash
# Verificar StatefulSet
kubectl get statefulset bcv-mongo -n bcv-service

# Ver logs de MongoDB
kubectl logs statefulset/bcv-mongo -n bcv-service

# Ejecutar comando en MongoDB
kubectl exec -it bcv-mongo-0 -n bcv-service -- mongosh

# Verificar DNS
kubectl exec -it <bcv-service-pod> -n bcv-service -- nslookup bcv-mongo
```

### Resource Issues

```bash
# Ver uso de recursos
kubectl top pods -n bcv-service
kubectl top nodes

# Ver eventos de scheduling
kubectl get events -n bcv-service | grep -i "insufficient\|failed"

# Describe node
kubectl describe node <node-name>
```

---

## Backup y Restore

### MongoDB Backup

```yaml
# k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongo-backup
  namespace: bcv-service
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mongo:7
            command:
            - /bin/sh
            - -c
            - |
              mongodump --host=bcv-mongo --out=/backup/$(date +%Y%m%d_%H%M%S) --gzip
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: mongo-backup-pvc
          restartPolicy: OnFailure
```

### Manual Backup

```bash
# Backup
kubectl exec bcv-mongo-0 -n bcv-service -- mongodump --out /tmp/backup --gzip

# Copy to local
kubectl cp bcv-service/bcv-mongo-0:/tmp/backup ./backup

# Restore
kubectl cp ./backup bcv-service/bcv-mongo-0:/tmp/restore
kubectl exec bcv-mongo-0 -n bcv-service -- mongorestore /tmp/restore --gzip
```

---

## Seguridad

### RBAC

```yaml
# k8s/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bcv-service-sa
  namespace: bcv-service
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: bcv-service-role
  namespace: bcv-service
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
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
  name: bcv-service-sa
  namespace: bcv-service
```

### Network Policy

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
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: bcv-mongo
    ports:
    - protocol: TCP
      port: 27017
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53  # DNS
    - protocol: UDP
      port: 53
```

---

## Referencias

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
