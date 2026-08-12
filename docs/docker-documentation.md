# Docker, ECR, and ECS Deployment Documentation

This document explains the containerization, registry storage, and orchestration architecture of the Sunotal application, focusing on Docker configurations, Amazon ECR integrations, ECS task definitions, load balancing, and database bootstrapping.

---

## 1. Analysis of Dockerfiles

The codebase features separate Docker configurations optimized for various runtime models (monolithic local testing vs. split cloud microservices).

### 1.1 Frontend Dockerfile (`frontend/Dockerfile`)
Uses a **multi-stage build** structure to separate compilation from the web server runtime, keeping the footprint minimal:
* **Stage 1 (Build)**:
  * Uses `node:20-alpine` as a base.
  * Installs `pnpm` globally.
  * Installs dependencies (`pnpm install --frozen-lockfile`) and builds the React/Vite assets using `pnpm build`, exporting files to the `dist/` directory.
* **Stage 2 (Production)**:
  * Uses a clean `nginx:1.27-alpine` web server image.
  * Copies the compiled `/app/dist` files from Stage 1 into the default Nginx html server directory (`/usr/share/nginx/html`).
  * Exposes **Port `80`** and runs Nginx in the foreground (`daemon off;`).

### 1.2 Microservice Dockerfiles (`backend/services/*/Dockerfile`)
Each individual microservice (Auth, Inventory, Operations, User) features its own Dockerfile tailored for isolation:
* **Base Image**: `node:20-alpine` for the build and execution stages.
* **Build Stage**: Installs `pnpm`, fetches dependencies, compiles the TS codebase to JS (outputting to `dist/`), and runs `pnpm prune --prod` to discard compile-time packages.
* **Production Stage**: Copies the pruned `node_modules/` and compiled `/dist/` folder, and boots the microservice by running `node dist/src/index.js` (listening on ports `5001`–`5004` respectively).

### 1.3 Unified Monolith Dockerfile (`backend/Dockerfile`)
Builds the unified/monolithic API server that mounts all routes concurrently.
* **Stage 1 (Build)**: Runs compile tasks using Node 20 + `pnpm`, producing the `/dist` directory containing all consolidated endpoints.
* **Stage 2 (Production)**: Starts a clean Node.js container, stripping out `npm` and `npx` binaries for security hardening. Exposes **Port `5000`** and launches the server.

---

## 2. Amazon ECR Registry Structure

Docker images built by the CI/CD pipeline are pushed to individual **Amazon Elastic Container Registry (ECR)** repositories.

### 2.1 ECR Registries
Terraform provisions five separate ECR repositories to store versioned Docker images:
* `sunotal-frontend`
* `sunotal-auth`
* `sunotal-operations`
* `sunotal-inventory`
* `sunotal-user`

### 2.2 Image Pushing Workflow
In the CD pipeline workflow:
1. **Authentication**: Authenticates Docker with ECR via the AWS CLI (`aws ecr get-login-password`).
2. **Build and Tag**: Builds the container images and tags them with both `latest` and the specific git commit SHA.
3. **Registry Push**: Uploads the tagged images to the corresponding ECR endpoints.

---

## 3. AWS ECS Fargate Orchestration

Sunotal utilizes serverless **Amazon ECS Fargate** to execute containerized services without managing underlying hosts.

### 3.1 Task Definitions
Task definitions are blueprint files (defined in Terraform) specifying container parameters:
* **Resources**: Tasks allocate `256 CPU` units and `512 MB` of memory (low-cost, high-performance profiles).
* **Logging**: Integrated with **AWS CloudWatch Logs** (`awslogs` driver) under log groups like `/ecs/sunotal-auth` to persist output streams.
* **IAM Integration**: Associated with:
  * **Execution Role**: Permits ECS Fargate to pull images from ECR and write log lines to CloudWatch.
  * **Task Role**: Grants the container itself rights to call AWS resources (e.g., S3, Lambda).

### 3.2 ECS Services
ECS Services guarantee that the target count of tasks remains active and healthy. The cluster manages:
* **Networking**: Tasks deploy in private subnets with traffic directed via security groups.
* **Auto-Recovery**: If a container crashes, Fargate automatically provisions a replacement container to restore the desired task count.

---

## 4. One-off Database Operations (Migrations & Seeding)

Because Fargate services run stateless application images, database initialization (schema updates and records seeding) cannot run directly within the continuous service loop.

Instead, they are executed as **one-off ECS Fargate tasks**:
* **Mechanism**: During deployment, the CD workflow issues an `aws ecs run-task` command.
* **Overrides**: The command passes overrides instructing the `sunotal-auth` task to bypass its standard index execution and run migration scripts instead:
  * **Schema push**: `pnpm run db:push`
  * **Database seed**: `pnpm run db:seed`
* **Subnet Execution**: These temporary containers run within private subnets to reach the RDS instance securely. They spin down immediately upon task completion.

---

## 5. ALB Integration & Path-Based Routing

The public entrypoint to the microservice cluster is managed by an **AWS Application Load Balancer (ALB)**, which acts as a reverse proxy.

```
Incoming Traffic (HTTP 80 / HTTPS 443)
                 │
                 ▼
     Application Load Balancer (ALB)
                 │
        ┌────────┼────────┬────────┬────────┐
     Path: /  /api/auth/ /api/admin/ /api/products/ /api/users/
        │        │        │        │        │
        ▼        ▼        ▼        ▼        ▼
     Frontend   Auth     Ops     Inventory User
     Service  Service  Service   Service  Service
    (Port 80) (Pt 5001)(Pt 5002) (Pt 5003) (Pt 5004)
```

### 5.1 Connection Flow
1. **SSL Termination**: The ALB receives external client HTTPS traffic on port `443` and terminates SSL.
2. **Listener Rules**: The ALB inspects the URL pathname of incoming requests and matches them against routing rules:
   * Path `/api/auth/*` $\rightarrow$ Routes to the **Auth Service** target group (Port `5001`).
   * Path `/api/admin/*` $\rightarrow$ Routes to the **Operations Service** target group (Port `5002`).
   * Path `/api/products/*` $\rightarrow$ Routes to the **Inventory Service** target group (Port `5003`).
   * Path `/api/users/*` $\rightarrow$ Routes to the **User Service** target group (Port `5004`).
   * Path `/` (default route) $\rightarrow$ Routes to the **Frontend Service** target group (Port `80`).
3. **Target Group Redirection**: Target groups dispatch traffic directly to the private IP addresses of the running ECS Fargate tasks.
