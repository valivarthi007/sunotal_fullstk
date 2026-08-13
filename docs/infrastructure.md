# 2. Infrastructure Code Documentation (Terraform & Docker)

This document describes the design, directory structures, configurations, and mechanics of the Terraform and Docker files used to build and orchestrate Sunotal's environment.

---

## 1. Terraform Architecture

The infrastructure deployment is modularized to ensure separation of concerns.

### 1.1 Directory Structure
```
terraform/
├── main.tf                    # Root module orchestrating child modules
├── variables.tf               # Global input variables
├── outputs.tf                 # Output parameters from infrastructure resources
├── terraform.tfvars           # Environment-specific configuration values
├── modules/
│   ├── vpc/                   # Creates VPC, subnets, Internet Gateways, NAT Gateways
│   ├── iam/                   # Configures instance profiles, execution roles, bucket policies
│   ├── security/              # Controls SG firewall rules for ALB, RDS, and ECS tasks
│   ├── database/              # Sets up Amazon RDS PostgreSQL instances
│   ├── cdn/                   # Provisions Application Load Balancers and CloudFront CDN
│   ├── ecr/                   # Registers ECR repositories for container management
│   ├── ecs/                   # Launches Fargate services, tasks, CPU/Memory configurations
│   ├── lambda/                # Deploys serverless backend helpers
│   ├── sonarqube/             # Launches the SonarQube static analysis server
│   └── test_server/           # Provisions target hosts for QA deployment
```

### 1.2 State Locking & Security
* **Backend Storage**: The state files are stored in S3 (`state/terraform.tfstate` in `jcs-raju-sunotal-final`). Versioning is enabled to facilitate point-in-time recovery.
* **State Locking**: An AWS DynamoDB table (`sunotal-terraform-locks`) manages distributed locking with a `LockID` HASH key to prevent concurrent updates and state corruption.

### 1.3 Module Parameters
* **VPC Module**: Creates `sunotal-vpc` with CIDR block `10.0.0.0/16`. Splits the network into 2 public subnets (`10.0.1.0/24`, `10.0.2.0/24`) and 2 private subnets (`10.0.3.0/24`, `10.0.4.0/24`).
* **Database Module**: Provisions RDS instance `sunotal-postgres` using instance class `db.t4g.micro` with storage auto-scaling enabled up to 100 GB.
* **ECS Module**: Runs on AWS Fargate (serverless task execution). CPU is configured at 256 units (0.25 vCPU) and RAM at 512 MB per task.

---

## 2. Docker Architecture

Sunotal uses optimized multi-stage builds to package services.

### 2.1 Backend Services Dockerfile
This template is parameterized for each microservice (`auth`, `operations`, `inventory`, `user`):

```dockerfile
# Stage 1: Build & Compilation
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Clean Runner
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
ENV PORT=5000
EXPOSE 5000
CMD ["node", "dist/src/index.js"]
```

### 2.2 Frontend Application Dockerfile
Uses Nginx to serve the SPA static output:

```dockerfile
# Stage 1: SPA Compilation
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: HTTP Web Server
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2.3 Docker Compose Local Orchestration
The local dev environment (`docker-compose.yml`) configures a localized PostgreSQL instance to mock AWS RDS:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: sunotal-db
    environment:
      POSTGRES_DB: sunotal
      POSTGRES_USER: sunotal
      POSTGRES_PASSWORD: sunotalpass123
    ports:
      - "5432:5432"
    volumes:
      - sunotal_pgdata:/var/lib/postgresql/data
```
