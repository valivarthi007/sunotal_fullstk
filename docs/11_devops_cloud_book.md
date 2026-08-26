# 11. Complete DevOps, Cloud & Infrastructure Line-by-Line Annotation Book

Welcome to the **Sunotal DevOps, AWS, Kubernetes, GitHub Actions, Docker, Terraform & Linux Master Textbook**. This document is a **line-by-line educational textbook** covering every infrastructure configuration, CI/CD pipeline, Kubernetes manifest, Dockerfile, Terraform module, shell script, Linux command, Git operation, and AWS CLI command in this repository.

---

## 📖 Table of Contents
1. [Chapter 1: GitHub Actions CI/CD Pipeline Textbook (`.github/workflows/cd.yml`)](#chapter-1-github-actions-cicd-pipeline-textbook-githubworkflowscdyml)
2. [Chapter 2: Kubernetes Manifests Textbook (`k8s/02-deployments.yaml`)](#chapter-2-kubernetes-manifests-textbook-k8s02-deploymentsyaml)
3. [Chapter 3: Dockerfiles & Containerization Textbook (`Dockerfile`)](#chapter-3-dockerfiles--containerization-textbook-dockerfile)
4. [Chapter 4: Terraform Infrastructure as Code Textbook (`terraform/main.tf`)](#chapter-4-terraform-infrastructure-as-code-textbook-terraformmaintf)
5. [Chapter 5: Shell Automation Textbook (`setup.sh` & `start-dev.sh`)](#chapter-5-shell-automation-textbook-setupsh--start-devsh)
6. [Chapter 6: Linux Systems Administration Commands Masterclass](#chapter-6-linux-systems-administration-commands-masterclass)
7. [Chapter 7: Git Version Control & AWS CLI Commands Masterclass](#chapter-7-git-version-control--aws-cli-commands-masterclass)

---

## Chapter 1: GitHub Actions CI/CD Pipeline Textbook (`.github/workflows/cd.yml`)

Below is the complete line-by-line code listing and annotation of the automated **Continuous Deployment (CD) Pipeline** (`.github/workflows/cd.yml`).

```yaml
1: name: CD Pipeline
2: 
3: on:
4:   workflow_run:
5:     workflows: ["CI Pipeline"]
6:     types:
7:       - completed
8:     branches:
9:       - main
10:   workflow_dispatch:
11:     inputs:
12:       deploy_target:
13:         description: 'Target Compute Platform (auto, eks, or ecs)'
14:         required: false
15:         default: 'auto'
16:         type: choice
17:         options:
18:           - auto
19:           - eks
20:           - ecs
21: 
22: env:
23:   AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
24:   AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
25:   AWS_DEFAULT_REGION: ${{ secrets.AWS_DEFAULT_REGION || 'us-east-1' }}
26: 
27: jobs:
28:   deploy:
29:     name: Deploy Application
30:     if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'workflow_dispatch' }}
31:     runs-on: ubuntu-latest
```

### Line-by-Line Explanation: Trigger Events & Environment Config
- **Line 1 (`name: CD Pipeline`)**: Sets the human-readable display title for this pipeline in the GitHub Actions UI.
- **Lines 3-9 (`on: workflow_run`)**: Configures automatic triggering when the "CI Pipeline" finishes execution on the `main` branch.
- **Lines 10-20 (`workflow_dispatch`)**: Enables manual trigger capability from GitHub UI with an interactive dropdown selection (`auto`, `eks`, or `ecs`).
- **Lines 22-25 (`env:`)**: Defines global workflow environment variables mapping encrypted repository secrets (`secrets.AWS_ACCESS_KEY_ID`, `secrets.AWS_SECRET_ACCESS_KEY`) to AWS CLI environment parameters.
- **Lines 27-31 (`jobs: deploy`)**: Declares the deployment runner job executing on an Ubuntu 24.04 runner VM (`ubuntu-latest`), conditional on the previous CI build completing successfully.

---

### Line-by-Line Explanation: Target Detection & EKS Deployment Steps

```yaml
44:       - name: Auto-Detect Active Deployment Target
45:         id: set_target
46:         run: |
47:           TARGET="${{ inputs.deploy_target }}"
48:           
49:           if [ -z "$TARGET" ] || [ "$TARGET" = "auto" ]; then
50:             echo "Attempting auto-detection of active compute target from SSM..."
51:             TARGET=$(aws ssm get-parameter --name "/sunotal/compute_target" --query "Parameter.Value" --output text 2>/dev/null || echo "")
52:           fi
53: 
54:           if [ -z "$TARGET" ] || [ "$TARGET" = "auto" ]; then
55:             echo "SSM parameter not found. Checking if EKS cluster 'sunotal-cluster' is ACTIVE..."
56:             EKS_STATUS=$(aws eks describe-cluster --name sunotal-cluster --query "cluster.status" --output text 2>/dev/null || echo "")
57:             if [ "$EKS_STATUS" = "ACTIVE" ]; then
58:               TARGET="eks"
59:             else
60:               TARGET="ecs"
61:             fi
62:           fi
63: 
64:           echo "DEPLOY_TARGET=$TARGET" >> $GITHUB_ENV
```

- **Lines 47-52**: Shell script checking if `deploy_target` input is set to `auto`. If auto, queries AWS Systems Manager (SSM) Parameter Store `/sunotal/compute_target`.
- **Lines 54-62**: If SSM is unset, queries AWS EKS API (`aws eks describe-cluster --name sunotal-cluster`). If status is `ACTIVE`, dynamically sets `TARGET="eks"`; otherwise defaults to `ecs`.
- **Line 64 (`echo "DEPLOY_TARGET=$TARGET" >> $GITHUB_ENV`)**: Writes the computed target to `$GITHUB_ENV` file so subsequent job steps inherit the variable.

```yaml
71:           aws eks update-kubeconfig --name sunotal-cluster --region ${{ env.AWS_DEFAULT_REGION }} || true
72: 
73:           ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
74:           if [ -n "$ACCOUNT_ID" ]; then
75:             ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
76:             echo "Substituting ECR registry: $ECR_REGISTRY"
77:             sed -i "s|sunotal-frontend:latest|${ECR_REGISTRY}/sunotal-frontend:latest|g" k8s/02-deployments.yaml
78:             sed -i "s|sunotal-auth:latest|${ECR_REGISTRY}/sunotal-auth:latest|g" k8s/02-deployments.yaml k8s/05-db-migration-job.yaml
...
85:           kubectl apply -f k8s/00-namespace.yaml || true
86:           kubectl apply -f k8s/01-configmap-secret.yaml || true
87:           kubectl apply -f k8s/03-services.yaml || true
88:           kubectl apply -f k8s/04-ingress.yaml || true
89: 
90:           echo "Running DB migrations on EKS..."
91:           kubectl delete job sunotal-db-migration -n sunotal --ignore-not-found || true
92:           kubectl apply -f k8s/05-db-migration-job.yaml || true
93:           kubectl wait --for=condition=complete job/sunotal-db-migration -n sunotal --timeout=120s || true
```

- **Line 71**: Fetches EKS authentication token and generates cluster configuration inside local `~/.kube/config`.
- **Lines 73-82**: Uses AWS STS (`get-caller-identity`) to retrieve 12-digit AWS Account ID, constructs the ECR registry URL (`143797622495.dkr.ecr.us-east-1.amazonaws.com`), and uses `sed -i` stream editor to dynamically replace image placeholders in Kubernetes YAML manifests.
- **Lines 85-88**: Applies Kubernetes manifests (`Namespace`, `ConfigMap`, `Secret`, `Services`, `Ingress`).
- **Lines 91-93**: Deletes previous migration job, applies `k8s/05-db-migration-job.yaml`, and blocks execution until schema migration completes (`kubectl wait --for=condition=complete`).

---

## Chapter 2: Kubernetes Manifests Textbook (`k8s/02-deployments.yaml`)

Below is the line-by-line code listing and annotation of `k8s/02-deployments.yaml`.

```yaml
1: apiVersion: apps/v1
2: kind: Deployment
3: metadata:
4:   name: sunotal-auth
5:   namespace: sunotal
6:   labels:
7:     app: sunotal-auth
8: spec:
9:   replicas: 1
10:   selector:
11:     matchLabels:
12:       app: sunotal-auth
13:   template:
14:     metadata:
15:       labels:
16:         app: sunotal-auth
17:     spec:
18:       containers:
19:         - name: auth
20:           image: 143797622495.dkr.ecr.us-east-1.amazonaws.com/sunotal-auth:latest
21:           imagePullPolicy: Always
22:           ports:
23:             - containerPort: 5001
24:           envFrom:
25:             - configMapRef:
26:                 name: sunotal-config
27:             - secretRef:
28:                 name: sunotal-secrets
29:           resources:
30:             requests:
31:               cpu: 100m
32:               memory: 128Mi
33:             limits:
34:               cpu: 250m
35:               memory: 256Mi
36:           livenessProbe:
37:             httpGet:
38:               path: /api/healthz
39:               port: 5001
40:             initialDelaySeconds: 15
41:             periodSeconds: 10
42:           readinessProbe:
43:             httpGet:
44:               path: /api/healthz
45:               port: 5001
46:             initialDelaySeconds: 5
47:             periodSeconds: 5
```

### Line-by-Line Explanation: Kubernetes Deployment Spec
- **Line 1 (`apiVersion: apps/v1`)**: Specifies the Kubernetes API group for Deployment controllers.
- **Line 2 (`kind: Deployment`)**: Declares resource type as a Deployment controller.
- **Lines 4-5**: Assigns metadata name `sunotal-auth` inside namespace `sunotal`.
- **Line 9 (`replicas: 1`)**: Instructs Kubernetes to maintain exactly 1 running Pod instance.
- **Lines 10-16 (`selector` & `labels`)**: Label matching rules ensuring this Deployment manages Pods labeled `app: sunotal-auth`.
- **Line 20 (`image: ...`)**: Full Amazon ECR Docker image URI.
- **Line 21 (`imagePullPolicy: Always`)**: Forces Kubernetes to pull latest image tag from ECR on every pod restart.
- **Line 23 (`containerPort: 5001`)**: Exposes microservice container port 5001.
- **Lines 24-28 (`envFrom:`)**: Injects all key-value environment variables from ConfigMap `sunotal-config` and Secret `sunotal-secrets` directly into container environment.
- **Lines 29-35 (`resources:`)**:
  - `requests`: Guarantees container allocation of 0.1 CPU core (`100m`) and 128MB RAM (`128Mi`).
  - `limits`: Hard ceiling capping container resource consumption to 0.25 CPU cores (`250m`) and 256MB RAM (`256Mi`). If RAM exceeds 256Mi, Linux kernel terminates container with Out-Of-Memory error (`OOMKilled`).
- **Lines 36-41 (`livenessProbe`)**: Polling check querying HTTP GET `/api/healthz` on port 5001 every 10 seconds. If probe fails repeatedly, Kubernetes restarts the pod.
- **Lines 42-47 (`readinessProbe`)**: Readiness probe checking if container is ready to handle client traffic. If probe fails, Kubernetes temporarily removes Pod IP from Service endpoint load balancer.

---

## Chapter 3: Dockerfiles & Containerization Textbook (`Dockerfile`)

Below is the annotated multi-stage Dockerfile used for microservices.

```dockerfile
# STAGE 1: Builder Stage
1: FROM node:20-alpine AS builder
2: RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
3: WORKDIR /app
4: COPY package.json pnpm-lock.yaml ./
5: RUN pnpm install --frozen-lockfile
6: COPY tsconfig.json ./
7: COPY src ./src
8: RUN pnpm run build

# STAGE 2: Runner Stage
9: FROM node:20-alpine AS runner
10: WORKDIR /app
11: RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
12: COPY --from=builder /app/package.json ./
13: COPY --from=builder /app/node_modules ./node_modules
14: COPY --from=builder /app/dist ./dist
15: ENV NODE_ENV=production
16: ENV PORT=5001
17: EXPOSE 5001
18: CMD ["node", "dist/src/index.js"]
```

### Line-by-Line Explanation: Docker multi-stage build
- **Line 1**: Starts Builder stage using minimal Node.js 20 Alpine Linux base image (~40MB).
- **Line 2**: Enables Corepack and activates exact pnpm version `9.15.4`.
- **Line 3**: Creates `/app` working directory inside container filesystem.
- **Line 4**: Copies `package.json` and `pnpm-lock.yaml` first to leverage Docker layer caching.
- **Line 5**: Installs npm packages without modifying lockfile (`--frozen-lockfile`).
- **Lines 6-7**: Copies TypeScript compiler config and source directory.
- **Line 8**: Compiles TypeScript `.ts` files into executable JavaScript `.js` in `/app/dist`.
- **Line 9**: Starts clean Runner stage using fresh Alpine image to purge intermediate compiler tooling.
- **Lines 12-14**: Copies only runtime production artifacts (`dist`, `node_modules`, `package.json`) from Builder stage.
- **Lines 15-16**: Sets production environment variables (`NODE_ENV=production`, `PORT=5001`).
- **Line 17**: Documents target container listening port 5001.
- **Line 18**: Specifies entrypoint command launching Node.js web server.

---

## Chapter 4: Terraform Infrastructure as Code Textbook (`terraform/main.tf`)

Below is the line-by-line code listing and annotation of `terraform/main.tf`.

```hcl
1: terraform {
2:   required_version = ">= 1.5.0"
3:   required_providers {
4:     aws = {
5:       source  = "hashicorp/aws"
6:       version = "~> 5.0"
7:     }
8:   }
9: }
10: 
11: provider "aws" {
12:   region = var.aws_region
13: }
14: 
15: module "vpc" {
16:   source   = "./modules/vpc"
17:   vpc_cidr = var.vpc_cidr
18:   environment = var.environment
19: }
20: 
21: module "security" {
22:   source = "./modules/security"
23:   vpc_id = module.vpc.vpc_id
24: }
25: 
26: module "database" {
27:   source            = "./modules/database"
28:   vpc_id            = module.vpc.vpc_id
29:   private_subnets   = module.vpc.private_subnet_ids
30:   security_group_id = module.security.rds_sg_id
31:   db_password       = var.db_password
32: }
```

### Line-by-Line Explanation: Terraform HCL
- **Lines 1-9 (`terraform`)**: Enforces minimum Terraform binary version (`>= 1.5.0`) and downloads official HashiCorp AWS provider plugin version `5.x`.
- **Lines 11-13 (`provider "aws"`)**: Configures AWS provider authentication targeting region specified in variable `var.aws_region` (`us-east-1`).
- **Lines 15-19 (`module "vpc"`)**: Instantiates custom VPC module passing network CIDR block `10.10.0.0/16`.
- **Lines 21-24 (`module "security"`)**: Instantiates Security Group module, linking `vpc_id` output from VPC module.
- **Lines 26-32 (`module "database"`)**: Provisions AWS RDS PostgreSQL instance placed inside private subnets, referencing `rds_sg_id` security group and database password.

---

## Chapter 5: Shell Automation Textbook (`setup.sh` & `start-dev.sh`)

```bash
1: #!/usr/bin/env bash
2: set -euo pipefail
3: SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
4: (cd "$SCRIPT_DIR/backend" && pnpm dev) &
5: BACK_PID=$!
6: (cd "$SCRIPT_DIR/frontend" && pnpm dev) &
7: FRONT_PID=$!
8: cleanup() { kill "$BACK_PID" "$FRONT_PID" 2>/dev/null; exit; }
9: trap cleanup INT TERM
10: wait
```

### Line-by-Line Explanation: Bash Process Concurrency & Signal Traps
- **Line 1**: Shebang specifying execution via `/usr/bin/env bash`.
- **Line 2**: Enables strict error handling (`-e` exit on error, `-u` error on unset variable, `-o pipefail` fail on pipeline errors).
- **Line 3**: Resolves absolute directory path of shell script.
- **Lines 4-5**: Launches backend dev server in isolated subshell background process `(...) &` and saves Process ID to variable `BACK_PID`.
- **Lines 6-7**: Launches frontend dev server in background subshell `(...) &` and saves Process ID to `FRONT_PID`.
- **Line 8**: Defines `cleanup()` function sending `SIGKILL` signals to `$BACK_PID` and `$FRONT_PID`.
- **Line 9**: Registers `cleanup()` function to trigger automatically when process receives interrupt (`SIGINT` Ctrl+C) or termination (`SIGTERM`) signals.
- **Line 10**: Blocks main script thread until background child processes finish.

---

## Chapter 6: Linux Systems Administration Commands Masterclass

### 1. Process Control & Inspection
```bash
# View all active system processes with full details
ps aux | grep node

# Monitor real-time process CPU & Memory consumption
top -b -n 1 | head -n 20

# Kill process by PID forcefully
kill -9 <PID>

# Find process holding specific network port (e.g., 5001)
lsof -i :5001
netstat -tlpn | grep 5001
```

### 2. Disk & Memory Inspection
```bash
# Check filesystem disk space utilization in human-readable format
df -h

# Check RAM & Swap usage
free -h

# Check size of specific directory
du -sh /var/lib/docker
```

### 3. File Search & Stream Manipulation
```bash
# Find files by pattern recursively
find . -name "*.ts" -type f

# Stream editor search and inline replace
sed -i "s|localhost|sunotal.automateuniverse.space|g" config.json

# Pattern extraction with regular expressions
grep -rn "initDatabase" --include="*.ts" backend/
```

---

## Chapter 7: Git Version Control & AWS CLI Commands Masterclass

### 1. Git Version Control Commands
```bash
# Create and checkout feature branch
git checkout -b feature/farmer-payouts

# Stage modified file
git add backend/services/user-service/src/routes/vendors.ts

# Commit with Conventional Commit message
git commit -m "feat(user-service): add farmer payout endpoint"

# Revert commit safely
git revert 7e2b46a7

# Hard reset local repository to known-good commit
git reset --hard a8a00935
```

### 2. AWS CLI Infrastructure Commands
```bash
# Authenticate ECR Docker login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 143797622495.dkr.ecr.us-east-1.amazonaws.com

# Update EKS Kubeconfig
aws eks update-kubeconfig --name sunotal-cluster --region us-east-1

# Query Target Group Health
aws elbv2 describe-target-health --target-group-arn "arn:aws:elasticloadbalancing:us-east-1:143797622495:targetgroup/sunotal-auth-tg/24a0b8296cb65cd9"

# Authorize ALB Ingress to EKS Node Security Group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0f50d6c770735f855 \
  --protocol -1 \
  --source-group sg-049a325dedf54e9e3
```
