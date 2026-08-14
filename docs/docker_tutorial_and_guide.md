# Docker, Dockerfile & Docker Compose: Comprehensive Guide & Tutorials

This document provides a thorough tutorial on containerization with Docker, multi-stage Dockerfiles, Docker Compose orchestrations, and all Docker commands used in the **Sunotal Farms** ecosystem.

---

## Part 1: Docker Commands Reference

### Building & Tagging Images
```bash
# Build frontend production image
docker build -t sunotal-frontend:latest ./frontend

# Build monolithic backend image
docker build -t sunotal-backend:latest ./backend

# Build individual microservices
docker build -t sunotal-auth:latest ./backend/services/auth-service
docker build -t sunotal-operations:latest ./backend/services/operations-service
docker build -t sunotal-inventory:latest ./backend/services/inventory-service
docker build -t sunotal-user:latest ./backend/services/user-service

# Tag images for Amazon ECR
REGISTRY="143797622495.dkr.ecr.us-east-1.amazonaws.com"
docker tag sunotal-frontend:latest $REGISTRY/sunotal-frontend:latest
docker tag sunotal-auth:latest $REGISTRY/sunotal-auth:latest
docker tag sunotal-operations:latest $REGISTRY/sunotal-operations:latest
docker tag sunotal-inventory:latest $REGISTRY/sunotal-inventory:latest
docker tag sunotal-user:latest $REGISTRY/sunotal-user:latest

# Push to Amazon ECR
docker push $REGISTRY/sunotal-frontend:latest
docker push $REGISTRY/sunotal-auth:latest
docker push $REGISTRY/sunotal-operations:latest
docker push $REGISTRY/sunotal-inventory:latest
docker push $REGISTRY/sunotal-user:latest
```

### Managing Containers & Compose
```bash
# Start local PostgreSQL via Docker Compose in background
docker compose up -d postgres

# View running containers
docker ps

# Check logs of a container
docker logs -f sunotal-db

# Execute a command inside a running container
docker exec -it sunotal-db psql -U sunotal -d sunotal

# Test PostgreSQL readiness
docker exec sunotal-db pg_isready -U sunotal

# Stop and remove all Compose containers and volumes
docker compose down -v
```

---

## Part 2: Multi-Stage Dockerfile Tutorial

A **multi-stage build** separates the build environment (compilers, build tools, dev dependencies) from the minimal production runtime container. This drastically reduces container size, eliminates security vulnerabilities, and speeds up deployment.

### Microservice Dockerfile Anatomy (`backend/services/*/Dockerfile`)

```dockerfile
# ── Stage 1: Build & Compile ──────────────────────────────────────────
FROM node:20-alpine AS builder

# 1. Update OS packages and install pnpm globally
RUN apk update && apk upgrade --no-cache
RUN npm install -g pnpm

WORKDIR /app

# 2. Copy only package manifests first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml ./

# 3. Install all dependencies (including devDependencies like typescript, tsx)
RUN pnpm install --frozen-lockfile

# 4. Copy full source code
COPY . .

# 5. Compile TypeScript into JavaScript (dist/ directory)
RUN pnpm build

# 6. Prune devDependencies to keep only production node_modules
RUN CI=true pnpm prune --prod

# ── Stage 2: Minimal Production Image ────────────────────────────────
FROM node:20-alpine

RUN apk update && apk upgrade --no-cache && npm install -g pnpm

WORKDIR /app

# Copy production package.json, pre-built node_modules, and compiled JavaScript
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Copy configuration and runtime schemas needed by Drizzle ORM
COPY drizzle.config.ts tsconfig.json ./
COPY src/lib ./src/lib
COPY src/schema ./src/schema

# Set container entrypoint
CMD ["node", "dist/src/index.js"]
```

### Frontend Dockerfile Anatomy (`frontend/Dockerfile`)

```dockerfile
# ── Stage 1: Build Static Assets ─────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build # Emits optimized static bundle to dist/

# ── Stage 2: Nginx Web Server ─────────────────────────────────────────
FROM nginx:1.27-alpine

# Copy custom Nginx configuration with SPA fallback routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built HTML, CSS, JS assets from Stage 1 into Nginx webroot
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Part 3: Docker Compose Tutorial

Docker Compose is a tool for defining and running multi-container Docker applications using a declarative YAML file.

### Local Development `docker-compose.yml` Breakdown

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine            # Lightweight official PostgreSQL 16 image
    container_name: sunotal-db           # Predictable container name for scripts
    restart: unless-stopped              # Auto-restart on reboot or failure
    environment:
      POSTGRES_DB: sunotal               # Database name
      POSTGRES_USER: sunotal             # Superuser username
      POSTGRES_PASSWORD: sunotalpass123  # Database password
    ports:
      - "5432:5432"                      # Map host port 5432 to container port 5432
    volumes:
      - sunotal_pgdata:/var/lib/postgresql/data # Persist data across container restarts

volumes:
  sunotal_pgdata:                        # Named volume managed by Docker
```
