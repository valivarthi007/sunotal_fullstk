# 02. Docker Infrastructure, Containerization & AWS ECS/ECR Guide

Welcome to the **Sunotal Docker Infrastructure & AWS Containerization Master Guide**. This guide provides an exhaustive, beginner-friendly to enterprise-level operational manual for containerizing, orchestrating, and monitoring Sunotal using Docker, `docker-compose`, AWS ECR, and AWS ECS Fargate.

---

## 📖 Table of Contents
1. [Docker 101: Core Concepts for Beginners](#1-docker-101-core-concepts-for-beginners)
2. [Line-by-Line Breakdown of All Service Dockerfiles](#2-line-by-line-breakdown-of-all-service-dockerfiles)
3. [Docker Compose Architecture (`docker-compose.yml` & `docker-compose.prod.yml`)](#3-docker-compose-architecture-docker-composeyml--docker-composeprodyml)
4. [Step-by-Step CLI Commands: Build, Tag, Push, Volumes & Networks](#4-step-by-step-cli-commands-build-tag-push-volumes--networks)
5. [`docker exec` Querying & Inspection Masterclass](#5-docker-exec-querying--inspection-masterclass)
6. [Docker Resource Monitoring & Log Auditing](#6-docker-resource-monitoring--log-auditing)
7. [Docker Network Inspection & HTTP Methods Debugging](#7-docker-network-inspection--http-methods-debugging)
8. [AWS ECR & ECS Operational Guide & CLI Templates](#8-aws-ecr--ecs-operational-guide--cli-templates)
9. [Triage Runbook: What to Check if a Docker Service is Down](#9-triage-runbook-what-to-check-if-a-docker-service-is-down)

---

## 1. Docker 101: Core Concepts for Beginners

### What is Docker?
Docker is an open-source platform that packages applications and their dependencies into lightweight, isolated units called **Containers**. Unlike traditional Virtual Machines (VMs) that require a full copy of a guest operating system, containers share the host operating system kernel, making them start in milliseconds and consume minimal RAM and CPU.

### Core Terminology
- **Dockerfile**: A text blueprint containing instructions on how to assemble a container image line by line.
- **Image**: A read-only, executable template created from a Dockerfile (e.g. `sunotal-auth:latest`).
- **Container**: A running instance of an Image.
- **Registry**: A repository for storing Docker images (e.g. Docker Hub, AWS ECR).
- **Volume**: Persistent storage mounted into containers to preserve database data across container restarts.
- **Bridge Network**: An isolated virtual network enabling containers to communicate with each other using service names (e.g. `http://sunotal-postgres:5432`).

---

## 2. Line-by-Line Breakdown of All Service Dockerfiles

Sunotal uses **Multi-Stage Builds** to minimize production image size and remove build dependencies (like TypeScript compilers) from final runtime containers.

### 1. `backend/services/auth-service/Dockerfile`

```dockerfile
# STAGE 1: Build Stage
FROM node:20-alpine AS builder
# Line 1: Use lightweight Node.js 20 Linux Alpine base image (~40MB).

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
# Line 2: Enable Corepack and activate pnpm package manager version 9.15.4.

WORKDIR /app
# Line 3: Create and set internal working directory to /app.

COPY package.json pnpm-lock.yaml ./
# Line 4: Copy package manifest and lockfile first to maximize Docker layer cache efficiency.

RUN pnpm install --frozen-lockfile
# Line 5: Install exact node_modules dependencies without modifying lockfile.

COPY tsconfig.json ./
COPY src ./src
# Line 6-7: Copy TypeScript configuration and source code into container.

RUN pnpm run build
# Line 8: Compile TypeScript code (.ts) into executable JavaScript (.js) inside /app/dist.

# STAGE 2: Production Runner Stage
FROM node:20-alpine AS runner
# Line 9: Start clean production stage to throw away intermediate build files.

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Line 10-12: Copy package manifest, node_modules, and compiled dist JavaScript from builder stage.

ENV NODE_ENV=production
ENV PORT=5001
# Line 13-14: Set runtime environment variables.

EXPOSE 5001
# Line 15: Document container port 5001.

CMD ["node", "dist/src/index.js"]
# Line 16: Define entry point execution command to launch Express server.
```

### 2. `frontend/Dockerfile`

```dockerfile
# STAGE 1: Build React SPA
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build
# Produces production bundle inside /app/dist

# STAGE 2: Nginx Web Server Runner
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 3. Docker Compose Architecture (`docker-compose.yml` & `docker-compose.prod.yml`)

### Local Development `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: sunotal-db
    environment:
      POSTGRES_USER: sunotal
      POSTGRES_PASSWORD: sunotalpass123
      POSTGRES_DB: sunotal
    ports:
      - "5432:5432"
    volumes:
      - sunotal-pgdata:/var/lib/postgresql/data
    networks:
      - sunotal-dev-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sunotal"]
      interval: 5s
      timeout: 5s
      retries: 5

networks:
  sunotal-dev-net:
    driver: bridge

volumes:
  sunotal-pgdata:
    driver: local
```

---

## 4. Step-by-Step CLI Commands: Build, Tag, Push, Volumes & Networks

```bash
# 1. Build All Microservice Docker Images
docker build -t sunotal-frontend:latest ./frontend
docker build -t sunotal-auth:latest ./backend/services/auth-service
docker build -t sunotal-operations:latest ./backend/services/operations-service
docker build -t sunotal-inventory:latest ./backend/services/inventory-service
docker build -t sunotal-user:latest ./backend/services/user-service

# 2. Tag Images for AWS ECR Repository
AWS_ACCOUNT_ID="143797622495"
AWS_REGION="us-east-1"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker tag sunotal-frontend:latest ${ECR_REGISTRY}/sunotal-frontend:latest
docker tag sunotal-auth:latest ${ECR_REGISTRY}/sunotal-auth:latest
docker tag sunotal-operations:latest ${ECR_REGISTRY}/sunotal-operations:latest
docker tag sunotal-inventory:latest ${ECR_REGISTRY}/sunotal-inventory:latest
docker tag sunotal-user:latest ${ECR_REGISTRY}/sunotal-user:latest

# 3. Authenticate Docker CLI to AWS ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# 4. Push Images to AWS ECR
docker push ${ECR_REGISTRY}/sunotal-frontend:latest
docker push ${ECR_REGISTRY}/sunotal-auth:latest
docker push ${ECR_REGISTRY}/sunotal-operations:latest
docker push ${ECR_REGISTRY}/sunotal-inventory:latest
docker push ${ECR_REGISTRY}/sunotal-user:latest

# 5. Create Docker Custom Bridge Network
docker network create --driver bridge sunotal-prod-network

# 6. Create Docker Persistent Volume
docker volume create sunotal-postgres-storage

# 7. Manually Run Auth Container
docker run -d \
  --name sunotal-auth-prod \
  --network sunotal-prod-network \
  -p 5001:5001 \
  -e PORT=5001 \
  -e DATABASE_URL="postgresql://sunotal:sunotalpass123@sunotal-postgres.cs1gq0a2wtpu.us-east-1.rds.amazonaws.com:5432/sunotal?sslmode=require" \
  ${ECR_REGISTRY}/sunotal-auth:latest
```

---

## 5. `docker exec` Querying & Inspection Masterclass

```bash
# 1. Open Interactive Shell inside Auth Service Container
docker exec -it sunotal-auth-prod sh

# 2. Query Container Environment Variables
docker exec sunotal-auth-prod env

# 3. Query PostgreSQL directly inside container
docker exec -it sunotal-db psql -U sunotal -d sunotal -c "SELECT email, role FROM users;"

# 4. Query Healthz API inside Container using Wget
docker exec sunotal-auth-prod wget -qO- http://localhost:5001/api/healthz

# 5. Inspect Process Tree inside Container
docker exec sunotal-auth-prod ps aux
```

---

## 6. Docker Resource Monitoring & Log Auditing

```bash
# 1. Real-time CPU, RAM & Network I/O Monitoring across all Containers
docker stats

# 2. View Last 100 Log Lines for Auth Service
docker logs --tail=100 sunotal-auth-prod

# 3. Stream Live Log Output with Timestamps
docker logs -f --timestamps sunotal-auth-prod

# 4. View Container Error Logs
docker logs sunotal-auth-prod 2>&1 | grep -i "error"
```

---

## 7. Docker Network Inspection & HTTP Methods Debugging

```bash
# 1. Inspect Custom Docker Network
docker network inspect sunotal-prod-network

# 2. Test Container-to-Container Connectivity with Netshoot
docker run --rm --network sunotal-prod-network nicolaka/netshoot curl -v http://sunotal-auth-prod:5001/api/healthz

# 3. Test HTTP POST Login Request across Docker Network
docker run --rm --network sunotal-prod-network nicolaka/netshoot \
  curl -i -X POST http://sunotal-auth-prod:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sunotal.com","password":"admin123"}'
```

---

## 8. AWS ECR & ECS Operational Guide & CLI Templates

### ECR & ECS CLI Commands

```bash
# 1. Create ECR Repositories
aws ecr create-repository --repository-name sunotal-auth --region us-east-1
aws ecr create-repository --repository-name sunotal-user --region us-east-1

# 2. Describe ECR Images
aws ecr describe-images --repository-name sunotal-auth

# 3. Delete Stale ECR Image
aws ecr batch-delete-image --repository-name sunotal-auth --image-ids imageTag=old-tag

# 4. Force ECS Fargate Service Redeployment
aws ecs update-service --cluster sunotal-cluster --service sunotal-auth --force-new-deployment

# 5. Describe ECS Running Tasks
aws ecs list-tasks --cluster sunotal-cluster
aws ecs describe-tasks --cluster sunotal-cluster --tasks <TASK_ARN>
```

---

## 9. Triage Runbook: What to Check if a Docker Service is Down

1. **Check Container Status**: Run `docker ps -a`. Look for status `Exited (1)` or `Restarting`.
2. **Inspect Error Traceback**: Run `docker logs --tail=50 <container_name>`. Look for `ENOTFOUND`, `ECONNREFUSED`, or `Error: DATABASE_URL environment variable is required.`.
3. **Verify Database Connectivity**: Run `docker exec -it <container_name> ping sunotal-postgres`.
4. **Inspect Port Allocation**: Run `netstat -tlpn | grep 5001` to check for host port collisions.
