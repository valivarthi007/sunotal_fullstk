# 🛠️ DevOps & AWS Cloud-Native Infrastructure Guide

Guide for configuring AWS Route 53 subdomain records, AWS App Runner / ECS Fargate Spot container deployment, AWS RDS PostgreSQL, and GitHub Actions CI/CD pipelines.

---

## 1. AWS Route 53 Subdomain Setup Procedure

1. **Hosted Zone**:
   - Access **AWS Route 53** ➔ Hosted Zone for `automateuniverse.space`.

2. **Create Alias Records**:
   - `sunotal.automateuniverse.space` ➔ Point A (Alias) to CloudFront / ALB.
   - `vendor-sunotal.automateuniverse.space` ➔ Point A (Alias) to SAME CloudFront / ALB.
   - `admin-sunotal.automateuniverse.space` ➔ Point A (Alias) to SAME CloudFront / ALB.
   - `delivery-sunotal.automateuniverse.space` ➔ Point A (Alias) to SAME CloudFront / ALB.

3. **ACM SSL Certificate**:
   - Request ACM Certificate for `*.automateuniverse.space` in `us-east-1`.
   - Attach certificate to CloudFront / ALB.

---

## 2. GitHub Actions CI/CD Workflows

### CI Pipeline (`.github/workflows/ci.yml`)
- Triggers on PRs and pushes to `main`.
- Runs TypeScript type checking (`tsc --noEmit`), Vitest unit tests, and code formatting lint.

### CD Pipeline (`.github/workflows/cd.yml`)
- Triggers upon successful CI completion on `main`.
- Builds multi-arch Docker container images.
- Performs vulnerability scan via Trivy.
- Pushes images to Amazon ECR (`sunotal-frontend`, `sunotal-backend`).
- Deploys updated container to AWS App Runner / ECS Fargate.

---

## 3. Cost Control Strategy (AWS Free Tier Compliance)

- **AWS App Runner**: Set max instance count to 1 and auto-pause when idle to remain under 180 GB-hours/month.
- **AWS RDS**: Provision `db.t4g.micro` with 20 GB Single-AZ SSD storage.
- **S3 & CloudFront**: Enforce cache control headers to maximize CloudFront edge hit ratio and keep data transfer under 1 TB/month.
