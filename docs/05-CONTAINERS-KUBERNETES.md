# Chapter 5: Containers & Kubernetes Orchestration

## 1. Containerization with Docker

### What is Docker?
Docker creates a lightweight, portable container containing the application binary and its required runtime environment. This eliminates the "it works on my machine" problem.

### Multi-Stage Build Strategy
Sunotal uses **Multi-Stage Dockerfiles** across all services to produce ultra-small, secure production images:
1. **Stage 1 (Builder)**: Installs build tools (`pnpm`, `typescript`, `vite`), compiles TypeScript/React source code, and prepares static outputs or server dist files.
2. **Stage 2 (Production)**: Copies *only* the compiled Javascript output (`dist/`) and necessary runtime dependencies from Stage 1 into a clean minimal Alpine Linux image. Development tools are completely excluded.

### Service Dockerfiles Overview

| Component | Base Image | Output Stage | Configuration File |
| :--- | :--- | :--- | :--- |
| **Frontend** | `node:20-alpine` → `nginx:1.27-alpine` | Static HTML/JS served via Nginx on port 80 | [frontend/Dockerfile](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/frontend/Dockerfile) |
| **Auth Service** | `node:20-alpine` | Node.js Express server on port 5001 | [backend/services/auth-service/Dockerfile](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/services/auth-service/Dockerfile) |
| **Operations Service** | `node:20-alpine` | Node.js Express server on port 5002 | [backend/services/operations-service/Dockerfile](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/services/operations-service/Dockerfile) |
| **Inventory Service** | `node:20-alpine` | Node.js Express server on port 5003 | [backend/services/inventory-service/Dockerfile](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/services/inventory-service/Dockerfile) |
| **User Service** | `node:20-alpine` | Node.js Express server on port 5004 | [backend/services/user-service/Dockerfile](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/services/user-service/Dockerfile) |
| **Delivery Service** | `node:20-alpine` | Node.js Express server on port 5006 | [backend/services/delivery-service/Dockerfile](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/services/delivery-service/Dockerfile) |

---

## 2. Kubernetes (EKS) Orchestration (`k8s/`)

Kubernetes manages container deployments, health monitoring, auto-restarting, Prometheus scraping, and internal DNS routing. All Kubernetes manifests reside in the `k8s/` directory and are executed in numerical order:

```
k8s/
├── 00-namespace.yaml                      # Defines isolated 'sunotal' namespace
├── 01-configmap-secret.yaml               # Environment configs and database secrets
├── 02-deployments.yaml                    # Pod replica definitions for all 5 microservices + frontend
├── 03-services.yaml                       # ClusterIP internal network load balancers
├── 04-ingress.yaml                        # ALB ingress controller path routing rules
├── 05-db-migration-job.yaml               # One-shot database schema migration job
└── 06-observability-prometheus-grafana.yaml # Prometheus & Grafana telemetry deployment
```

### Detailed Manifest Explanations

#### 1. Namespace (`00-namespace.yaml`)
Creates an isolated logical cluster slice named `sunotal`. All resources exist inside this namespace.

#### 2. ConfigMap & Secret (`01-configmap-secret.yaml`)
- **ConfigMap (`sunotal-config`)**: Stores non-sensitive settings (`NODE_ENV=production`, `FRONTEND_URL`, `S3_BUCKET_NAME`, `AWS_REGION`).
- **Secret (`sunotal-secrets`)**: Stores sensitive database credentials (`DATABASE_URL`, `SESSION_SECRET`).

#### 3. Deployments (`02-deployments.yaml`)
Defines the desired state for running containers:
- Replicas: 1 replica per microservice.
- Resource Requests & Limits: CPU `100m - 250m`, Memory `128Mi - 256Mi`.
- Prometheus Scraping Annotations: Exposes `/metrics` endpoints for metrics ingestion (`prometheus.io/scrape: "true"`).
- Probes:
  - **LivenessProbe**: Checks `/api/healthz` every 10s. If it fails, K8s restarts the container.
  - **ReadinessProbe**: Checks `/api/healthz` every 5s. Pod only receives traffic when healthy.

#### 4. ClusterIP Services (`03-services.yaml`)
Provides persistent internal IP addresses and DNS names inside the cluster (e.g. `http://sunotal-delivery:5006`).

#### 5. ALB Ingress (`04-ingress.yaml`)
Configures the AWS ALB Ingress Controller to route external domain requests based on URL paths (`/` → frontend, `/api/auth` → auth, `/api/delivery` → delivery service).

#### 6. DB Migration Job (`05-db-migration-job.yaml`)
A batch Job (`sunotal-db-migration`) that runs non-interactively (`pnpm run db:push`) using `drizzle-kit` to apply schema updates to RDS PostgreSQL before deployment rollout.

#### 7. Observability Stack (`06-observability-prometheus-grafana.yaml`)
Provisions Prometheus TSDB (Port 9090) and Grafana Dashboard (Port 3000) for real-time latency, throughput, and error metrics monitoring.

---

## 3. Useful Kubernetes (kubectl) Operations Commands

### Connect to EKS Cluster:
```bash
aws eks update-kubeconfig --name sunotal-cluster --region us-east-1
```

### Inspect Pod Statuses:
```bash
kubectl get pods -n sunotal
```

### View Live Pod Logs:
```bash
kubectl logs -n sunotal -l app=sunotal-delivery --tail=100 -f
```

### Check Deployment Rollout Status:
```bash
kubectl rollout status deployment/sunotal-delivery -n sunotal
```

### Restart a Service (Rolling Restart):
```bash
kubectl rollout restart deployment/sunotal-delivery -n sunotal
```
