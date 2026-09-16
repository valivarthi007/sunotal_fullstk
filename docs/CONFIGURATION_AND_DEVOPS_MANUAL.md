# 📘 Sunotal Grocery - Comprehensive Configuration & DevOps Manual

This document provides a hyper-exhaustive reference for all configuration files, network topologies, containerization setups, CI/CD pipelines, and environment specifications across the Sunotal Grocery quick-commerce platform.

---

## 📑 Manual Table of Contents

1. [System Architecture & Network Topology](#1-system-architecture--network-topology)
2. [Complete NGINX Configuration Reference](#2-complete-nginx-configuration-reference)
3. [Containerization & Multi-Stage Dockerfiles](#3-containerization--multi-stage-dockerfiles)
4. [Environment Variable Matrix](#4-environment-variable-matrix)
5. [Package & Lockfile Management (`pnpm`)](#5-package--lockfile-management-pnpm)
6. [Terraform & AWS Cloud Infrastructure](#6-terraform--aws-cloud-infrastructure)
7. [GitHub Actions CI/CD Workflows](#7-github-actions-cicd-workflows)
8. [Health Checks & Verification Standard Operating Procedures](#8-health-checks--verification-standard-operating-procedures)

---

## 1. System Architecture & Network Topology

Sunotal Grocery operates on a **decoupled microservices and micro-frontend architecture**:
- **5 Frontend Micro-apps** (`apps/user-app`, `apps/admin-app`, `apps/vendor-app`, `apps/delivery-app`, `apps/support-app`).
- **6 Domain Microservices** (`services/auth-service`, `services/operations-service`, `services/inventory-service`, `services/user-service`, `services/delivery-service`, `services/support-service`).
- **1 Consolidated Monolithic Service** (`services/unified-backend`) for single-node deployments.
- **1 Unified Frontend Service** (`apps/unified-frontend`) providing single-container NGINX multi-host serving.

```
                                [ AWS ALB / NGINX Gateway ]
                                             │
      ┌───────────────────┬──────────────────┼───────────────────┬───────────────────┐
      │ (sunotal)         │ (admin-sunotal)  │ (vendor-sunotal)  │ (delivery-sunotal)│ (support-sunotal)
      ▼                   ▼                  ▼                   ▼                   ▼
[ user-app:80 ]    [ admin-app:80 ]   [ vendor-app:80 ]  [ delivery-app:80 ] [ support-app:80 ]
      │                   │                  │                   │                   │
      └───────────────────┴──────────────────┼───────────────────┴───────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │ Path-Based Reverse Proxy Routing (/api/*)  │
                       └─────────────────────┬─────────────────────┘
                                             │
       ┌──────────────┬──────────────┬───────┴──────┬──────────────┬──────────────┐
       │              │              │              │              │              │
  /api/auth/     /api/inventory/  /api/users/   /api/delivery/ /api/support/     /api/*
       ▼              ▼              ▼              ▼              ▼              ▼
 [ auth:5001 ] [ inventory:5003 ] [ user:5004 ] [ delivery:5006 ][ support:5007 ][ operations:5002 ]
       │              │              │              │              │              │
       └──────────────┴──────────────┼──────────────┴──────────────┴──────────────┘
                                     │
                      ┌──────────────┴──────────────┐
                      ▼                             ▼
              [ MongoDB (27017) ]           [ Redis (6379) ]
```

---

## 2. Complete NGINX Configuration Reference

### 2.1 Root Reverse Proxy Gateway (`nginx.conf`)
Location: [nginx.conf](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/nginx.conf)

```nginx
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Performance Optimizations
    sendfile           on;
    tcp_nopush         on;
    tcp_nodelay        on;
    keepalive_timeout  65;
    client_max_body_size 20M;

    # Gzip Compression
    gzip              on;
    gzip_vary         on;
    gzip_proxied      any;
    gzip_comp_level   6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        image/svg+xml;

    # Customer Storefront Server Block
    server {
        listen 80;
        listen 443 ssl;
        server_name sunotal.automateuniverse.space localhost "";

        location / {
            proxy_pass http://sunotal-user-app:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/auth/ { proxy_pass http://sunotal-auth:5001; }
        location /api/delivery/ { proxy_pass http://sunotal-delivery:5006; }
        location /api/support/ { proxy_pass http://sunotal-support:5007; }
        location /api/inventory/ { proxy_pass http://sunotal-inventory:5003; }
        location /api/users/ { proxy_pass http://sunotal-user:5004; }
        location /api/ { proxy_pass http://sunotal-operations:5002; }
    }
}
```

### 2.2 App NGINX Configuration Template
Location: `apps/<app-name>/nginx.conf` (e.g., [apps/user-app/nginx.conf](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/apps/user-app/nginx.conf))

```nginx
server {
    listen 80;
    server_name localhost;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    root /usr/share/nginx/html;

    # Instant Health Check
    location /healthz {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    # Vite Hashed Assets (1-Year Cache, Immutable, Correct MIME)
    location /assets/ {
        include /etc/nginx/mime.types;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Content-Type-Options nosniff;
        try_files $uri =404;
    }

    # SPA Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

---

## 3. Containerization & Multi-Stage Dockerfiles

### 3.1 Microservices Dockerfile Pattern (`services/*/Dockerfile`)
Each backend microservice follows a 2-stage build:
- **Stage 1 (`builder`)**: Installs Node 20 alpine, enables corepack pnpm 9.15.4, copies `package.json` & `pnpm-lock.yaml`, runs `pnpm install --frozen-lockfile`, and compiles TypeScript (`npm run build`).
- **Stage 2 (`runner`)**: Installs production dependencies (`pnpm install --frozen-lockfile --prod`), copies `dist/` from builder, drops permissions to `USER node`, exposes port, and configures health check via `wget`.

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN echo "unsafe-perm=true" > /root/.npmrc

COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache wget
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN echo "unsafe-perm=true" > /root/.npmrc

COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile --prod; \
    elif [ -f package-lock.json ]; then \
      npm ci --only=production --ignore-scripts; \
    else \
      npm install --only=production --ignore-scripts; \
    fi

COPY --from=builder /app/dist ./dist
RUN chown -R node:node /app
USER node

EXPOSE 5001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/healthz || exit 1

CMD ["node", "dist/index.js"]
```

---

## 4. Environment Variable Matrix

| Component | Variable Name | Purpose | Example Value |
|---|---|---|---|
| All Services | `PORT` | HTTP Listening Port | `5001` - `5007` |
| All Services | `NODE_ENV` | Environment Flag | `production` / `development` |
| Microservices | `MONGODB_URI` | MongoDB Connection URI | `mongodb://mongodb:27017/sunotal` |
| Ops & Inventory | `REDIS_HOST` | Redis Server Host | `redis` / `127.0.0.1` |
| Ops & Inventory | `REDIS_PORT` | Redis Server Port | `6379` |
| Auth & Gateway | `JWT_SECRET` | Secret Key for JWT Signing | `sunotal-jwt-production-secret` |
| Frontend Apps | `VITE_PAYMENT_PROVIDER` | Payment Gateway Provider | `mock` / `razorpay` |
| Frontend Apps | `VITE_MAP_PROVIDER` | Mapping Engine | `cartodb` / `leaflet` |

---

## 5. Package & Lockfile Management (`pnpm`)

All microservices and apps use `pnpm` (v9+ / v11+).

### Maintenance Commands
```bash
# Update lockfile when package.json changes
cd services/auth-service
pnpm install --no-frozen-lockfile

# Verify lockfile matches manifest (CI check)
pnpm install --frozen-lockfile

# Approve native build scripts (e.g. esbuild)
pnpm approve-builds --all
```

---

## 6. Terraform & AWS Cloud Infrastructure

### Infrastructure Architecture & Modules
- **Location**: [terraform/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/terraform)
- **State Backend**: S3 (`s3://jcs-raju-sunotal-final/state/terraform.tfstate`) in `us-east-1`.
- **Modules**:
  - `modules/vpc`: Multi-AZ VPC, Public/Private Subnets, Internet Gateway, Route Tables.
  - `modules/security_groups`: Ingress/Egress rules for HTTP (80), HTTPS (443), Microservices (5000-5007), MongoDB (27017), Redis (6379).
  - `modules/ecr`: ECR repositories for all 26 container services.
  - `modules/route53`: Public DNS records for `automateuniverse.space`.

---

## 7. GitHub Actions CI/CD Workflows

Location: [.github/workflows/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/.github/workflows)

1. **`ci.yml`**:
   - Compiles Node.js 20 backend microservices (`services/*`) and Vite React frontends (`apps/*`).
   - Runs `pnpm install --frozen-lockfile` and `tsc --noEmit`.
2. **`cd-infra.yml`**:
   - Provisions Terraform infrastructure on AWS.
3. **`cd-app.yml`**:
   - Builds multi-stage Docker containers, tags them with Git SHA (`:${{ github.sha }}`) and `:latest`, and pushes to Amazon ECR.

---

## 8. Health Checks & Verification Standard Operating Procedures

### Standard Operational Verification Steps:

1. **AWS Identity & ECR Verification**:
   ```bash
   aws sts get-caller-identity
   aws ecr describe-repositories --query "repositories[].repositoryName" --output table
   ```

2. **HTTP & Asset Header Verification**:
   ```bash
   curl -sIL https://sunotal.automateuniverse.space/
   curl -sIL https://sunotal.automateuniverse.space/assets/index-XXXX.js
   ```
   *Expected Output*:
   - HTTP Status: `200 OK`
   - Content-Type: `application/javascript` or `text/css`
   - Cache-Control: `public, max-age=31536000, immutable`
   - X-Content-Type-Options: `nosniff`
