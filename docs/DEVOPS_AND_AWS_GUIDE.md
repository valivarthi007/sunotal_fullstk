# 🛠️ DevOps & AWS Cloud-Native Infrastructure Guide

Exhaustive guide for AWS Route 53 subdomain records, ACM SSL wildcard certificates, AWS App Runner, ECS Fargate Spot container deployment, AWS RDS PostgreSQL, Amazon ECR, GitHub Actions CI/CD pipelines, and observability monitoring.

---

## 1. Subdomain & Domain Infrastructure Topology

The application uses domain isolation across 4 subdomains:

| Subdomain | Target Service | CNAME / Alias Record Target | SSL Certificate |
|---|---|---|---|
| `sunotal.automateuniverse.space` | Consumer Storefront | CloudFront / ALB Target | `*.automateuniverse.space` |
| `vendor-sunotal.automateuniverse.space` | Farmer & Vendor Portal | CloudFront / ALB Target | `*.automateuniverse.space` |
| `admin-sunotal.automateuniverse.space` | Admin Control Center | CloudFront / ALB Target | `*.automateuniverse.space` |
| `delivery-sunotal.automateuniverse.space` | Delivery Partner App | CloudFront / ALB Target | `*.automateuniverse.space` |

### Step-by-Step AWS Route 53 Configuration Procedure:
1. **AWS Route 53 Hosted Zone**: Access Hosted Zone for `automateuniverse.space`.
2. **Create Alias Records**: Point A (Alias) records for all 4 subdomains to CloudFront distribution or Application Load Balancer (ALB).
3. **AWS Certificate Manager (ACM)**:
   - Request ACM SSL Certificate for `*.automateuniverse.space` in `us-east-1`.
   - Complete DNS validation by adding the CNAME records output by ACM.
   - Attach certificate to CloudFront / ALB HTTPS listener (Port 443).

---

## 2. Containerization & Docker Setup

### Dockerfile Specification (`backend/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

---

## 3. GitHub Actions CI/CD Workflows

### CI Workflow (`.github/workflows/ci.yml`)
- Triggers on pull requests and pushes to `main`.
- Runs TypeScript type checking (`tsc --noEmit`), Vitest unit tests, and ESLint.

### CD Workflow (`.github/workflows/cd.yml`)
- Triggers on pushes to `main` upon CI success.
- Authenticates with Amazon ECR (`aws-actions/amazon-ecr-login`).
- Builds multi-stage Docker image and tags with git commit SHA and `latest`.
- Scans container image for vulnerabilities using Trivy.
- Pushes image to Amazon ECR repositories (`sunotal-backend`, `sunotal-frontend`).
- Triggers deployment update on AWS App Runner / ECS Fargate task definition.

---

## 4. AWS Free Tier Cost Control Strategy

- **AWS App Runner**: Set max instance count = 1, CPU = 0.25 vCPU, Memory = 0.5 GB. Auto-pause when idle to remain under 180 GB-hours/month free tier.
- **AWS RDS PostgreSQL**: Provision `db.t4g.micro` with 20 GB Single-AZ SSD storage (750 free hours/month).
- **Amazon S3**: Enforce lifecycle rules to delete temporary uploads after 30 days.
- **AWS CloudFront**: Set aggressive cache TTLs for static JS/CSS assets to remain under 1 TB/month free data transfer.

---

## 5. Observability & Telemetry Integration

- **Prometheus Metrics Endpoint**: Backend exposes `/metrics` with process CPU, memory RSS, HTTP request latency histograms, and active connections.
- **Grafana Telemetry Server**: Configured with Prometheus data source on port 9090.
- **Admin Observability Dashboard**: `GET /api/admin/observability` aggregates live microservices uptime, latency, memory usage, and real-time AWS cost breakdown (EKS, EC2, RDS, S3, Data Transfer).
