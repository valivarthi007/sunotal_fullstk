# GitHub Actions CI/CD Workflows: Deep Dive & Element Explanation

This document explains every single trigger, job, service container, step, action plugin, and secret used in the **Sunotal Farms** GitHub Actions automation pipeline.

---

## Active Workflow Roster

1. **`CI Pipeline` (`.github/workflows/ci.yml`):**
   - Triggers on push or pull request to `main`.
   - Runs linting, type checks, unit tests against a live PostgreSQL 16 Alpine service container, SonarCloud static analysis, Trivy vulnerability scans, builds 5 Docker images, and pushes to Amazon ECR.
2. **`CD Pipeline` (`.github/workflows/cd.yml`):**
   - Triggers automatically upon successful completion of the `CI Pipeline` workflow.
   - Executes rolling zero-downtime updates across all 5 ECS services, runs database migrations, waits for services to stabilize, and performs post-deployment health checks.

---

## Part 1: Detailed Breakdown of `.github/workflows/ci.yml`

```yaml
name: CI Pipeline

on:
  workflow_dispatch: # Allows manual trigger from GitHub UI
  push:
    branches:
      - main
    paths:           # Only runs when code or dependencies change
      - 'backend/**'
      - 'frontend/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - '.github/workflows/ci.yml'
      - '.github/workflows/cd.yml'
  pull_request:
    branches:
      - main
```

### Environment Variables (`env:`)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`: Credentials used to authenticate to AWS ECR and S3.
- `S3_BUCKET_NAME`: Target bucket (`jcs-raju-sunotal-final`) where build artifacts and security reports are stored.
- `NODE_VERSION: 20`, `PNPM_VERSION: 9.15.4`: Pins predictable runtime and package manager versions across CI runners.

### Service Containers (`services: postgres:`)
```yaml
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: sunotal
          POSTGRES_PASSWORD: sunotalpass123
          POSTGRES_DB: sunotal
        ports:
          - 5432:5432
        options: >
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
```
- **Why it is used:** Spins up a real, ephemeral PostgreSQL database inside the GitHub Actions runner network so backend integration tests can execute against genuine PostgreSQL rather than an in-memory mock.
- `--health-cmd pg_isready`: Ensures the CI job pauses until PostgreSQL is accepting connections before running test steps.

---

### Step-by-Step Action Analysis

1. **`actions/checkout@v4` with `fetch-depth: 0`:**
   - Clones the Git repository. `fetch-depth: 0` fetches the entire Git history, which is required by SonarCloud to calculate blame lines, author attribution, and code changes across branches.

2. **`pnpm/action-setup@v4` & `actions/setup-node@v4`:**
   - Installs pnpm and Node.js with built-in dependency caching (`cache: 'pnpm'`), speeding up workflow runs by up to 60%.

3. **`SonarSource/sonarcloud-github-action@master`:**
   - Executes SonarCloud static analysis scanner using `SONAR_TOKEN`.
   - Analyzes code quality, test coverage, code smells, duplication, and security hotspots based on rules in `sonar-project.properties`.

4. **`aquasecurity/trivy-action@master`:**
   - Scans repository filesystem (`scan-type: 'fs'`) for vulnerable dependencies, CVEs, and hardcoded credentials.
   - Emits a structured JSON report (`trivy-report.json`) uploaded to S3.

5. **`aws-actions/amazon-ecr-login@v2`:**
   - Authenticates the runner's Docker daemon against the private Amazon ECR registry in `us-east-1`.

6. **Docker Multi-Image Build & Push Matrix:**
   - Builds and tags images for:
     - `sunotal-frontend`
     - `sunotal-backend`
     - `sunotal-auth`
     - `sunotal-operations`
     - `sunotal-inventory`
     - `sunotal-user`
   - Tags each image with both the commit SHA (`${{ github.sha }}`) and `:latest` for instant rollouts.

---

## Part 2: Detailed Breakdown of `.github/workflows/cd.yml`

```yaml
name: CD Pipeline

on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types:
      - completed
    branches:
      - main
  workflow_dispatch:
```

### Key Deployment Steps

1. **`aws ecs update-service --force-new-deployment`:**
   - Commands Amazon ECS to pull the latest Docker image from ECR and spin up replacement Fargate tasks.
   - Follows rolling deployment: keeps old tasks healthy until new tasks pass ALB target group health checks (`/api/healthz`).

2. **`aws ecs wait services-stable`:**
   - Blocks the workflow until all 5 services have successfully registered with their target groups and old containers have been drained and stopped.

3. **Post-Deployment Health Checks:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" "https://sunotal.automateuniverse.space/"
   curl -s -o /dev/null -w "%{http_code}" "https://sunotal.automateuniverse.space/api/healthz"
   ```
   - Confirms that the live public domain responds with `HTTP 200` before declaring deployment success.

---

## Part 3: Required GitHub Secrets Reference

| Secret Name | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM User access key with permissions to ECR, ECS, S3, and CloudWatch. |
| `AWS_SECRET_ACCESS_KEY` | IAM User secret access key. |
| `AWS_DEFAULT_REGION` | AWS region (`us-east-1`). |
| `SONAR_TOKEN` | Access token generated from SonarCloud user account. |
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions for commit status updates. |
