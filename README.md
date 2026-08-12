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

## 3. DevOps & Infrastructure Architecture

### AWS S3 Storage Segregation (`jcs-raju-sunotal-final`)
All storage needs are organized inside the single bucket `s3://jcs-raju-sunotal-final`:

```
s3://jcs-raju-sunotal-final/
├── [Product Images]       <-- Existing website images (kept at root)
├── artifacts/             <-- Versioned CI/CD build packages
│   ├── ${BUILD_TAG}/      <-- Commit-specific frontend & backend tarballs
│   └── latest/            <-- Pointer for quick retrieval
└── state/                 <-- Terraform Remote State (terraform.tfstate)
```

### Terraform Remote State & DynamoDB Locking
- **State File**: Stored remotely at `s3://jcs-raju-sunotal-final/state/terraform.tfstate`.
- **Locking Table**: `sunotal-terraform-locks` configured with **`PAY_PER_REQUEST` (On-Demand)** billing mode ($0 fixed monthly cost for trial accounts).
- **EC2 IAM Role & Policy**: Automatically provisions an IAM Role (`sunotal-ec2-s3-access-role`), IAM Policy (`sunotal-s3-artifacts-read-policy`), and Instance Profile allowing the EC2 instance to download build packages from `s3://jcs-raju-sunotal-final/artifacts/*`.

### AWS Lambda S3 Auto-Deletion Function
- **Trigger**: Automatically triggered by the Backend API (`@aws-sdk/client-lambda`) when an admin deletes a product to remove its associated S3 image.
- **Function Name**: `sunotal-delete-s3-object` (configured via Terraform, running in Python 3.11).
- **Permissions**:
  - Provisions an IAM Role (`sunotal-lambda-s3-delete-role`) and Policy (`sunotal-lambda-s3-delete-policy`) allowing the Lambda function to perform `s3:DeleteObject` on the `s3://jcs-raju-sunotal-final/` bucket.
  - Grants the EC2 instance policy (`sunotal-s3-access-policy`) permission to call `lambda:InvokeFunction` on the auto-deletion Lambda.

### HTTPS Redirection & Load Balancer Listener Rules
- **HTTP (Port 80) Listener**: Configured to automatically redirect all incoming HTTP web requests to HTTPS (Port 443) using a `HTTP_301` status code.
- **HTTPS (Port 443) Listener**: Secured via SSL certificate integration (`ssl_certificate_arn`), forwarding all decrypted traffic to the backend application's EC2 target group.

---

## 4. Pipeline Execution Strategy

### A. Infrastructure Pipeline (`.github/workflows/infra.yml`)
- **Trigger**: **Manual (`workflow_dispatch`)** or on explicit `terraform/**` / `packer/**` pull requests.
- **Responsibilities**:
  1. Validates Packer templates (`packer validate`) and Terraform files (`terraform validate`).
  2. Builds custom hardened base AMI using Packer & Ansible.
  3. Provisions VPC, public subnets, security groups, IAM instance profiles, and EC2 instance via Terraform using S3 remote state.
  4. **No Destructive Action**: Safe plan & apply without deleting running infrastructure.

### B. CI Pipeline (`.github/workflows/ci.yml`)
- **Trigger**: **Every Code Change** (`push` to `main` and `pull_request` to `main`).
- **Responsibilities**:
  1. **Quality & Analysis**: Runs TypeScript type checking (`tsc --noEmit`) and SonarQube static code scanning.
  2. **Test execution**: Verifies local unit tests.

### C. CD Pipeline (`.github/workflows/cd.yml`)
- **Trigger**: **CI Success** or manual run.
- **Responsibilities**:
  1. **Build & Package**: Compiles frontend & backend, creates tarballs (`frontend-build.tgz`, `backend-build.tgz`).
  2. **Versioned S3 Upload**: Uploads versioned artifacts to `s3://jcs-raju-sunotal-final/artifacts/${BUILD_TAG}/` and `s3://jcs-raju-sunotal-final/artifacts/latest/`.
  3. **Automated EC2 Deployment**: Deploys frontend code to `/var/www/sunotal`, backend code to `/var/www/sunotal-backend`, executes database schema migration (`db:push`), restarts PM2 daemon, and executes an HTTP health check.

### D. Teardown Pipeline (`.github/workflows/infra-destroy.yml`)
- **Trigger**: **Manual (`workflow_dispatch`)** with confirmation input.
- **Responsibilities**:
  1. Destroys all AWS infrastructure created by Terraform in the `terraform` directory.
  2. **Exclusion**: The S3 remote state bucket and DynamoDB locking table are preserved/excluded from deletion to maintain the backend state lock registry safely.

---

## 5. EC2 Service Persistence & Reboot Autostart

To guarantee that the backend API, Nginx web server, and PostgreSQL database automatically start up when the EC2 instance is **stopped, booted, or restarted**, without losing user logins or data:

### 1. Database Persistence (Docker & PostgreSQL)
- **Docker Compose**: Service uses `restart: unless-stopped` with named volume `sunotal_pgdata:/var/lib/postgresql/data`.
- **Intact Logins**: PostgreSQL data files persist across container/server restarts, ensuring all registered accounts, passwords, and sessions remain 100% intact.

### 2. Backend API Service Persistence (PM2 Daemon)
- **PM2 Autostart**: Automated deployment executes:
  ```bash
  pm2 start dist/src/index.js --name sunotal-backend
  sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
  pm2 save
  ```
- Ensures the Node.js backend automatically starts upon system boot.

### 3. Frontend Web Server Persistence (Nginx)
- **Nginx Systemd**: Configured with `sudo systemctl enable nginx`.
- Starts automatically on boot and proxies web traffic (`/` to frontend static dist, `/api/` to `http://127.0.0.1:5000`).

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
