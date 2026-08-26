# 06. CI/CD Workflows, GitHub Actions & Automated Testing Masterclass

Welcome to the **Sunotal CI/CD Workflows & GitHub Actions Master Guide**. This document provides an exhaustive, educational, and operational manual for Sunotal's continuous integration and continuous deployment pipelines (`ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml`).

---

## 📖 Table of Contents
1. [CI/CD 101: Core Concepts for Beginners](#1-cicd-101-core-concepts-for-beginners)
2. [Pipeline Architecture & Workflow Dependency Graph](#2-pipeline-architecture--workflow-dependency-graph)
3. [Exhaustive Breakdown of `ci.yml` (Continuous Integration)](#3-exhaustive-breakdown-of-ciyml-continuous-integration)
4. [Exhaustive Breakdown of `cd.yml` (Continuous Deployment & Self-Healing Sync)](#4-exhaustive-breakdown-of-cdyml-continuous-deployment--self-healing-sync)
5. [GitHub CLI Operational Commands](#5-github-cli-operational-commands)
6. [How to Add a Custom Test Step to GitHub Actions](#6-how-to-add-a-custom-test-step-to-github-actions)

---

## 1. CI/CD 101: Core Concepts for Beginners

### What is CI/CD?
- **Continuous Integration (CI)**: The automated practice of building code, running type checks, unit tests, static code analysis, vulnerability scans, and creating Docker container images whenever code is pushed to a repository.
- **Continuous Deployment (CD)**: The automated practice of deploying compiled container images to cloud infrastructure (AWS EKS/ECS), executing database migrations, updating target load balancers, and running post-deployment integration tests.

---

## 2. Pipeline Architecture & Workflow Dependency Graph

```
  [ Developer Push to main ]
              │
              ▼
   ┌──────────────────────┐
   │  CI Pipeline (ci.yml) │
   └──────────┬───────────┘
              │ (On Workflow Success)
              ▼
   ┌──────────────────────┐
   │  CD Pipeline (cd.yml) │
   └──────────┬───────────┘
              │
              ├─► 1. Auto-Detect EKS/ECS Deployment Target
              ├─► 2. Apply K8s Manifests & Substitute ECR Registry
              ├─► 3. Execute DB Migration Job (`pnpm db:push`)
              ├─► 4. Perform Rolling Update Deployment
              ├─► 5. Self-Healing Target Group Sync (Pod IPs -> ALB)
              └─► 6. Post-Deployment 5-Step Test Suite (curl)
```

---

## 3. Exhaustive Breakdown of `ci.yml` (Continuous Integration)

### Trigger Events
- `push` to `main` branch.
- `pull_request` to `main` branch.
- `workflow_dispatch` (Manual trigger from GitHub UI).

### Ephemeral Database Service Container
Starts PostgreSQL 16 Alpine container (`postgres:16-alpine`) on port 5432 with health check polling.

### Job Steps
1. **Checkout Code**: Uses `actions/checkout@v4`.
2. **Setup pnpm & Node.js**: Installs pnpm 9.15.4 and Node.js v20 with dependency caching.
3. **Configure AWS Credentials**: Authenticates with AWS using secrets.
4. **SonarCloud Code Analysis**: Runs code quality and security scan.
5. **TypeScript Type Check**: Runs `pnpm exec tsc --noEmit`.
6. **Backend Unit Tests**: Executes `vitest run` against PostgreSQL database.
7. **Trivy Vulnerability Scanner**: Scans filesystem for High/Critical vulnerabilities.
8. **Upload Reports**: Uploads test results to AWS S3 (`jcs-raju-sunotal-final`).
9. **Build & Push Docker Images**: Builds images for 5 microservices and pushes tags to AWS ECR (`:${github.sha}` and `:latest`).

---

## 4. Exhaustive Breakdown of `cd.yml` (Continuous Deployment & Self-Healing Sync)

### Self-Healing EKS Sync & Post-Deployment Test Suite

```yaml
      - name: Deploy to AWS EKS
        if: env.DEPLOY_TARGET == 'eks'
        run: |
          aws eks update-kubeconfig --name sunotal-cluster --region us-east-1
          kubectl apply -f k8s/00-namespace.yaml
          kubectl apply -f k8s/01-configmap-secret.yaml
          kubectl apply -f k8s/03-services.yaml
          kubectl apply -f k8s/04-ingress.yaml
          kubectl apply -f k8s/02-deployments.yaml

          # Self-healing ALB Target Registration
          AUTH_IP=$(kubectl get pods -n sunotal -l app=sunotal-auth --field-selector=status.phase=Running -o jsonpath='{.items[0].status.podIP}')
          aws elbv2 register-targets --target-group-arn "arn:aws:elasticloadbalancing:us-east-1:143797622495:targetgroup/sunotal-auth-tg/24a0b8296cb65cd9" --targets Id=$AUTH_IP,Port=5001

      - name: Post-Deployment Automated Test Suite
        run: |
          BASE="https://sunotal.automateuniverse.space"
          
          # Test 1: Frontend Webpage
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
          if [ "$STATUS" != "200" ]; then exit 1; fi

          # Test 2: Auth Service Healthz
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/healthz")
          if [ "$STATUS" != "200" ]; then exit 1; fi

          # Test 3: Admin Login API
          LOGIN_RES=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@sunotal.com","password":"admin123"}')
          TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
          if [ -z "$TOKEN" ]; then exit 1; fi

          # Test 4: Admin Stats API
          STATS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/stats")
          if [ "$STATS_STATUS" != "200" ]; then exit 1; fi

          # Test 5: Admin Quotations API
          QUOTES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/quotations")
          if [ "$QUOTES_STATUS" != "200" ]; then exit 1; fi
```

---

## 5. GitHub CLI Operational Commands

```bash
# 1. List Recent Workflow Pipeline Runs
gh run list --limit 10

# 2. View Logs for a Specific Run ID
gh run view <run_id> --log

# 3. Trigger CI Pipeline Manually
gh workflow run ci.yml

# 4. Trigger CD Pipeline Manually (Targeting EKS)
gh workflow run cd.yml -f deploy_target=eks
```
