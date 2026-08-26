# 02. Docker Infrastructure & AWS ECS/ECR Guide

This document details containerization, `docker-compose` setup, Dockerfile line-by-line breakdowns, and AWS ECR/ECS management for Sunotal.

---

## 2.a Service Dockerfile Line-by-Line Breakdown

Each microservice in `backend/services/*` and `frontend` contains an optimized multi-stage Dockerfile.

### Example: `backend/services/auth-service/Dockerfile`

```dockerfile
# Line 1: Use lightweight Node.js 20 Alpine base image
FROM node:20-alpine AS builder

# Line 2: Install pnpm globally via Corepack
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Line 3: Set working directory inside container
WORKDIR /app

# Line 4: Copy package manifest and lockfile first for layer caching
COPY package.json pnpm-lock.yaml ./

# Line 5: Install dependencies
RUN pnpm install --frozen-lockfile

# Line 6: Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src

# Line 7: Build TypeScript code to JavaScript dist output
RUN pnpm run build

# Line 8: Production stage for minimal image size
FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Line 9: Copy built dist artifacts and node_modules from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Line 10: Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Line 11: Expose container port
EXPOSE 5001

# Line 12: Start Node.js application
CMD ["node", "dist/src/index.js"]
```

---

## 2.b Docker Compose Configuration (`docker-compose.yml` & `docker-compose.prod.yml`)

### Development `docker-compose.yml` Template

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: sunotal-postgres-dev
    environment:
      POSTGRES_USER: sunotal
      POSTGRES_PASSWORD: sunotalpass123
      POSTGRES_DB: sunotal
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - sunotal-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sunotal"]
      interval: 5s
      timeout: 5s
      retries: 5

networks:
  sunotal-net:
    driver: bridge

volumes:
  pgdata:
```

### Production Microservices Compose Skeleton

```yaml
version: '3.8'

services:
  auth-service:
    image: ${ECR_REGISTRY}/sunotal-auth:latest
    ports:
      - "5001:5001"
    environment:
      PORT: 5001
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      postgres:
        condition: service_healthy

  user-service:
    image: ${ECR_REGISTRY}/sunotal-user:latest
    ports:
      - "5004:5004"
    environment:
      PORT: 5004
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      postgres:
        condition: service_healthy
```

---

## 2.c Docker Build, Tag, Push, Volume & Container Commands

```bash
# 1. Build Image locally
docker build -t sunotal-auth:latest ./backend/services/auth-service
docker build -t sunotal-frontend:latest ./frontend

# 2. Tag for AWS ECR
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"

docker tag sunotal-auth:latest ${ECR_REGISTRY}/sunotal-auth:latest
docker tag sunotal-frontend:latest ${ECR_REGISTRY}/sunotal-frontend:latest

# 3. Authenticate and Push to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_REGISTRY}

docker push ${ECR_REGISTRY}/sunotal-auth:latest
docker push ${ECR_REGISTRY}/sunotal-frontend:latest

# 4. Create Network & Volume manually
docker network create sunotal-network
docker volume create sunotal-db-volume

# 5. Run Container manually
docker run -d --name sunotal-auth-container \
  --network sunotal-network \
  -e PORT=5001 \
  -e DATABASE_URL="postgresql://sunotal:sunotalpass123@sunotal-postgres:5432/sunotal" \
  -p 5001:5001 \
  ${ECR_REGISTRY}/sunotal-auth:latest
```

---

## 2.d Querying & Execution with `docker exec`

```bash
# 1. Execute interactive shell inside Auth container
docker exec -it sunotal-auth-container sh

# 2. Query container environment variables
docker exec sunotal-auth-container env

# 3. Query PostgreSQL directly inside container
docker exec -it sunotal-postgres-dev psql -U sunotal -d sunotal -c "SELECT COUNT(*) FROM users;"

# 4. Test API Healthz inside Auth container
docker exec sunotal-auth-container wget -qO- http://localhost:5001/api/healthz
```

---

## 2.e, 2.f, 2.g & 2.h Docker Diagnostics, Resource Monitoring & Network Auditing

```bash
# 1. Resource Monitoring (Live CPU, RAM, Network I/O)
docker stats --no-stream

# 2. Log Auditing
docker logs -f --tail=100 sunotal-auth-container

# 3. Network Inspection
docker network inspect sunotal-network

# 4. Inspect Packet/HTTP Communication inside Container Network
docker run --rm --network sunotal-network nicolaka/netshoot curl -v http://sunotal-auth-container:5001/api/healthz
```

---

## 2.i AWS ECR & ECS CLI Operational Guide

### ECR & ECS Management Commands

```bash
# 1. Create ECR Repositories
aws ecr create-repository --repository-name sunotal-auth --region us-east-1
aws ecr create-repository --repository-name sunotal-frontend --region us-east-1

# 2. List ECR Images
aws ecr list-images --repository-name sunotal-auth

# 3. Register ECS Task Definition
aws ecs register-task-definition --cli-input-json file://ecs-task-def.json

# 4. Update ECS Service (Force New Deployment)
aws ecs update-service --cluster sunotal-cluster --service sunotal-auth --force-new-deployment

# 5. Check ECS Service Health Status
aws ecs describe-services --cluster sunotal-cluster --services sunotal-auth --query "services[0].[serviceName, status, runningCount, pendingCount]"
```

---

## 2.j Triage Runbook: What to Check if a Docker Service is Down

1. **Check Container Status**:
   `docker ps -a` -> Look for `Exited (1)` or `Restarting`.
2. **Check Exit Logs**:
   `docker logs --tail=50 <container_name>` -> Check for missing environment variables or DB connection errors (`ECONNREFUSED`).
3. **Check Port Binding Collisions**:
   `netstat -tlpn | grep 5001` or `lsof -i :5001` -> Ensure no other process holds port 5001.
4. **Check Network Connectivity**:
   `docker exec <container_name> ping -c 2 sunotal-postgres` -> Verify DNS resolution inside bridge network.
