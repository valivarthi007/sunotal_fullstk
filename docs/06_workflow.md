# 06. CI/CD Workflows & GitHub Actions Automation

This document details the automated GitHub Actions continuous integration and continuous deployment pipelines (`ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml`).

---

## 6.1 Overview of Workflows

```
  [ Git Push to main ]
          │
          ▼
   ┌──────────────┐
   │  ci.yml      │  (Install, Type-Check, Test, SonarCloud, Trivy Scan, Docker Build & Push to ECR)
   └──────┬───────┘
          │ (On Success)
          ▼
   ┌──────────────┐
   │  cd.yml      │  (Auto-Detect EKS/ECS -> Apply K8s Manifests -> DB Migration Job -> Auto ALB Target Sync -> Post-Deploy Test Suite)
   └──────────────┘
```

---

## 6.2 Workflow Breakdown by File

### 1. `ci.yml` (Continuous Integration)
- **Triggers**: `push` to `main`, `pull_request` to `main`, or `workflow_dispatch`.
- **Service Containers**: Starts ephemeral `postgres:16-alpine` database service container on port 5432.
- **Jobs & Steps**:
  1. `Checkout code`: Clones repository.
  2. `Setup pnpm`: Configures pnpm package manager.
  3. `Setup Node.js`: Configures Node.js v20 with pnpm dependency caching.
  4. `Configure AWS Credentials`: Authenticates with AWS secrets.
  5. `SonarCloud Code Analysis`: Runs static security and code quality analysis.
  6. `Type check frontend & backend`: Executes `tsc --noEmit`.
  7. `Run Backend Tests`: Executes `vitest run` against PostgreSQL.
  8. `Run Trivy vulnerability scanner`: Scans repository filesystem for High/Critical CVEs.
  9. `Upload Test Reports`: Uploads JSON reports to AWS S3 (`jcs-raju-sunotal-final`).
  10. `Build & Push Docker Images`: Builds Docker images for all 5 microservices (`frontend`, `backend`, `auth`, `operations`, `inventory`, `user`) and pushes tags (`:${github.sha}` and `:latest`) to AWS ECR.

### 2. `cd.yml` (Continuous Deployment & Automated Testing)
- **Triggers**: Successful completion of `CI Pipeline` (`workflow_run`), or `workflow_dispatch`.
- **Jobs & Steps**:
  1. `Auto-Detect Active Deployment Target`: Checks SSM parameter `/sunotal/compute_target` or queries `aws eks describe-cluster` to dynamically route deployment to `eks` or `ecs`.
  2. `Deploy to AWS EKS`:
     - Updates `kubeconfig` for cluster `sunotal-cluster`.
     - Dynamically substitutes AWS Account ID and ECR registry in Kubernetes manifests (`k8s/02-deployments.yaml` and `k8s/05-db-migration-job.yaml`).
     - Applies Kubernetes resources (`Namespace`, `ConfigMap`, `Secret`, `Services`, `Ingress`).
     - Executes database migration job `sunotal-db-migration` (`pnpm run db:push`).
     - Performs rolling update deployment for all 5 services and waits for rollout status completion.
     - **Self-Healing Infrastructure Sync**:
       - Authorizes EKS Node Security Group in AWS.
       - Configures Target Group `HealthCheckPaths` to `/api/healthz`.
       - Extracts active running pod IPs and registers them into AWS ALB Target Groups (`sunotal-auth-tg`, `sunotal-user-tg`, `sunotal-operations-tg`, `sunotal-inventory-tg`, `sunotal-frontend-tg`).
       - Cleans up (deregisters) stale/terminated pod IPs.
  3. `Post-Deployment Automated Test Suite`:
     - **Test 1**: Frontend HTTP 200 check (`curl -s -o /dev/null -w "%{http_code}" https://sunotal.automateuniverse.space/`).
     - **Test 2**: API Healthz HTTP 200 check (`curl -s https://sunotal.automateuniverse.space/api/healthz`).
     - **Test 3**: Admin Login API & JWT token generation (`POST https://sunotal.automateuniverse.space/api/auth/login`).
     - **Test 4**: Admin Dashboard Stats API (`GET https://sunotal.automateuniverse.space/api/admin/stats` with Bearer token).
     - **Test 5**: Admin Quotations API (`GET https://sunotal.automateuniverse.space/api/admin/quotations` with Bearer token).

### 3. `infra.yml` (Infrastructure Provisioning)
- **Triggers**: `workflow_dispatch`.
- **Function**: Runs `terraform apply -auto-approve` to provision VPC, EKS, ECS, RDS Postgres, S3, CloudFront, ALB, and ECR.

### 4. `infra-destroy.yml` (Infrastructure Teardown)
- **Triggers**: `workflow_dispatch`.
- **Function**: Runs `terraform destroy -auto-approve` to clean up cloud resources when not in use.

---

## 6.3 Workflow Querying & GitHub CLI Commands

```bash
# 1. List Recent Workflow Runs
gh run list --limit 10

# 2. View Logs for a Specific Run
gh run view <run_id> --log

# 3. Trigger CI Pipeline Manually
gh workflow run ci.yml

# 4. Trigger CD Pipeline Manually (Targeting EKS)
gh workflow run cd.yml -f deploy_target=eks
```
