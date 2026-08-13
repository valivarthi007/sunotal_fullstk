# Sunotal Corporate Fullstack E-Commerce & DevOps Infrastructure

Sunotal is a corporate farm-to-door grocery e-commerce web application featuring **Automatic HTML5 Location Detection**, a **React/TypeScript frontend**, **Node.js/Express API backend**, **PostgreSQL database**, and enterprise-grade **DevOps Pipelines** (GitHub Actions, Terraform S3 Remote State, DynamoDB Lock Table, Packer, Ansible, and PM2/Systemd EC2 Service Persistence).

---

## 1. Local Development

### Prerequisites
- **Node.js**: v20+
- **Package Manager**: `pnpm` (v9+)
- **Database**: Docker & Docker Compose

### Quick Start
```bash
# 1. Run automated setup (installs dependencies, builds/seeds DB, creates env configs)
./setup.sh

# 2. Start the local development environment (automatically runs PostgreSQL in Docker and boots dev servers)
./start-dev.sh
```

---

## 2. Web Application Features: Automatic Location Detection & Corporate E-Commerce

### Location Auto-Detection System
- **HTML5 Geolocation API**: Uses `navigator.geolocation.getCurrentPosition` with reverse geocoding via OpenStreetMap's Nominatim API.
- **IP Geolocation Fallback**: Falls back seamlessly to IP geolocation (`ipapi.co`) if GPS access is denied or unavailable.
- **Corporate Hub Selector Modal**: One-click quick selection for top Indian corporate hubs:
  - **Bengaluru** (Electronic City & Whitefield)
  - **Mumbai** (BKC & Lower Parel)
  - **Delhi NCR** (Cyber City & Noida)
  - **Hyderabad** (HITEC City & Gachibowli)
  - **Chennai** (OMR & Guindy)
  - **Pune** (Hinjawadi & Kharadi)
  - **Kolkata** (Salt Lake Sector V)
  - **Ahmedabad** (GIFT City)
- **State Persistence**: Saves detected/selected location in `localStorage` so location selection persists across page refreshes and browser restarts.

### Corporate Checkout & Registration
- **Auto-Populated Location**: Shipping address, city, state, and pincode are automatically filled from detected location.
- **Corporate Invoicing**: Includes GSTIN claiming field, Corporate PO Reference Number, and Company Billing details.
- **Express Location Delivery**: Shows region-aware delivery promises (e.g. *"Express 2-Hour Delivery in [Detected City]"*).
- **Payment Options**: Credit/Debit Cards, UPI / QR Code, Net Banking, and Corporate PO Invoice Billing.

---

### 3. DevOps & Infrastructure Architecture

### AWS S3 Storage Segregation (`jcs-raju-sunotal-final`)
All storage needs are organized inside the single bucket `s3://jcs-raju-sunotal-final`:

```
s3://jcs-raju-sunotal-final/
├── [Product Images]       <-- User-uploaded assets (images/invoices)
├── test_result/           <-- Versioned test report documents (vitest/trivy)
└── state/                 <-- Terraform Remote State (terraform.tfstate)
```

### Terraform Remote State & DynamoDB Locking
- **State File**: Stored remotely at `s3://jcs-raju-sunotal-final/state/terraform.tfstate`.
- **Locking Table**: `sunotal-terraform-locks` configured with **`PAY_PER_REQUEST` (On-Demand)** billing mode to manage state concurrency.
- **ECS Task IAM Role & Policy**: Automatically provisions an IAM Role (`sunotal-ecs-task-role`) and Policy allowing container tasks to access S3 media and invoke operational services securely.

### AWS Lambda S3 Auto-Deletion Function
- **Trigger**: Automatically triggered by the Operations Service (`@aws-sdk/client-lambda`) when an admin deletes a product to remove its associated S3 image.
- **Function Name**: `sunotal-delete-s3-object` (configured via Terraform, running in Python 3.11).

### HTTPS Redirection & Load Balancer Listener Rules
- **HTTP (Port 80) Listener**: Configured to automatically redirect all incoming HTTP web requests to HTTPS (Port 443) using a `HTTP_301` status code.
- **HTTPS (Port 443) Listener**: Secured via SSL certificate integration, forwarding decrypted traffic to the ECS Fargate service target groups based on request path matching.

---

## 4. Pipeline Execution Strategy

### A. Infrastructure Pipeline (`.github/workflows/infra.yml`)
- **Trigger**: **Manual (`workflow_dispatch`)** or on explicit `terraform/**` pull requests.
- **Responsibilities**:
  1. Validates Terraform HCL files (`terraform validate`).
  2. Provisions VPC, public subnets, security groups, IAM execution roles, ALB target groups, RDS databases, and ECS clusters using cost-optimized **Fargate Spot** instances.

### B. CI Pipeline (`.github/workflows/ci.yml`)
- **Trigger**: **Every Code Change** (`push` to `main` and `pull_request` to `main`).
- **Responsibilities**:
  1. **Quality & Analysis**: Runs TypeScript type checking (`tsc --noEmit`) and SonarQube static code scanning.
  2. **Playwright E2E Tests**: Boots a live PostgreSQL service container in the runner, applies migrations/seeds, starts the backend, and runs Playwright browser E2E tests strictly.
  3. **Docker Security Gate**: Builds container images and executes Trivy scans for critical vulnerabilities before ECR push.

### C. CD Pipeline (`.github/workflows/cd.yml`)
- **Trigger**: **CI Success** on `main` branch.
- **Responsibilities**:
  1. **ECS Rolling Deployment**: Invokes `aws ecs update-service` to trigger rolling updates for ECS Fargate Spot tasks.
  2. **DB Migration Tasks**: Launches serverless one-off tasks in Fargate to execute database schema syncs (`db:push`) and seed entries.
  3. **Stability & Health Gates**: Blocks pipeline completion using `aws ecs wait services-stable` and performs strict HTTP endpoint health checks against the ALB for all services.

### D. Teardown Pipeline (`.github/workflows/infra-destroy.yml`)
- **Trigger**: **Manual (`workflow_dispatch`)** with confirmation input.
- **Responsibilities**:
  1. Destroys all AWS infrastructure created by Terraform (excluding state backend S3 bucket and DynamoDB locking table). Error-silencing is disabled to prevent resource leaks.

---

## 5. ECS Fargate Container Service Persistence

To guarantee that the backend services, Nginx load balancer, and PostgreSQL database automatically maintain state and run with high availability:

### 1. Database Persistence (RDS PostgreSQL)
- **AWS RDS**: Database tables and assets are hosted on managed Amazon RDS PostgreSQL instances with automated volume autoscaling (from 20GB up to 100GB), decoupled from the lifespan of Fargate container tasks.

### 2. High Availability & Spot Billing
- **Fargate Spot**: ECS Fargate services run using Fargate Spot capacity providers, giving up to a **70% discount** on standard CPU/Memory pricing.
- **Task Resilience**: Container restarts and rolling updates automatically register new healthy tasks into target groups before draining traffic from old ones.

---

## 6. GitHub Repository Secrets Configuration

To run the workflows in your repository, configure the following secrets under **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example / Default |
| :--- | :--- | :--- |
| `AWS_ACCESS_KEY_ID` | AWS Access Key for IAM user with S3, EC2, VPC permissions | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | `wJalrXUtnFEMI...` |
| `AWS_DEFAULT_REGION` | Target AWS Region | `us-east-1` |
| `S3_BUCKET_NAME` | S3 Bucket Name for state & artifacts | `jcs-raju-sunotal-final` |
| `EC2_SSH_KEY` | Raw PEM SSH private key for EC2 deployment access | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SONAR_TOKEN` | (Optional) SonarQube authentication token | `sqp_...` |
| `SONAR_HOST_URL` | (Optional) SonarQube host URL | `https://sonarcloud.io` |
| `SSL_CERTIFICATE_ARN` | (Optional) AWS Certificate Manager ARN for the HTTPS listener | `arn:aws:acm:us-east-1:123456789012:certificate/...` |

---

## 7. Verification & Health Checks

Run the following locally to verify code compilation before committing:
```bash
# Type check frontend
cd frontend && pnpm exec tsc --noEmit && pnpm build

# Type check backend
cd ../backend && pnpm exec tsc --noEmit && pnpm build
```
