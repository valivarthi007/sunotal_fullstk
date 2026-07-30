# Sunotal DevOps — Comprehensive Documentation & Training Guide

> **Version**: 2.0 · **Last Updated**: July 2026 · **Author**: DevOps Team  
> **Repository**: [sunotal_fullstk](https://github.com/valivarthi007/sunotal_fullstk)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Infrastructure as Code — Terraform](#4-infrastructure-as-code--terraform)
5. [Machine Image Building — Packer & Ansible](#5-machine-image-building--packer--ansible)
6. [CI/CD Pipelines — GitHub Actions](#6-cicd-pipelines--github-actions)
7. [CI/CD Pipelines — Jenkins](#7-cicd-pipelines--jenkins)
8. [Secrets & Credential Management](#8-secrets--credential-management)
9. [S3 Bucket Structure & Asset Management](#9-s3-bucket-structure--asset-management)
10. [Networking & Security Architecture](#10-networking--security-architecture)
11. [Operational Runbooks](#11-operational-runbooks)
12. [Troubleshooting Guide](#12-troubleshooting-guide)
13. [Glossary](#13-glossary)

---

## 1. Architecture Overview

```mermaid
graph TB
    subgraph "Internet"
        USER["👤 End Users"]
    end

    subgraph "AWS us-east-1"
        subgraph "CloudFront CDN"
            CF["CloudFront Distribution<br/>S3 Product Images"]
        end

        subgraph "VPC: sunotal-vpc (10.10.0.0/16)"
            subgraph "Public Subnets"
                ALB["Application Load Balancer<br/>sunotal-alb (Port 80)"]
                BASTION["Bastion Host<br/>sunotal-bastion<br/>t3.micro"]
            end

            subgraph "Private Subnets"
                EC2["App Server<br/>sunotal-frontend<br/>t3.small"]
                RDS["RDS PostgreSQL 16.3<br/>sunotal-postgres<br/>db.t3.micro"]
            end
        end

        S3["S3 Bucket<br/>jcs-raju-sunotal-final"]
        DYNAMO["DynamoDB<br/>sunotal-terraform-locks"]
    end

    USER -->|HTTPS| CF
    USER -->|HTTP/80| ALB
    ALB -->|Port 80| EC2
    EC2 -->|Port 5432| RDS
    EC2 -->|IAM Role| S3
    CF -->|OAC| S3

    subgraph "CI/CD"
        GHA["GitHub Actions"]
        JENKINS["Jenkins"]
    end

    GHA -->|SSH ProxyJump| BASTION
    BASTION -->|SSH Tunnel| EC2
    GHA -->|Terraform| S3
    GHA -->|Terraform| DYNAMO
```

### Key Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Private-by-default** | App server lives in a private subnet with no public IP |
| **Bastion-gated SSH** | All SSH access tunnels through the public Bastion host via ProxyJump |
| **Immutable AMIs** | Packer builds golden images; EC2 instances are replaceable |
| **Remote State Locking** | Terraform state stored in S3 with DynamoDB locking |
| **S3-native CDN** | Product images served via CloudFront with Origin Access Control |
| **Unified Tagging** | All resources tagged `Project=sunotal`, `Environment=production`, `ManagedBy=terraform` |

---

## 2. Technology Stack

### Infrastructure & DevOps Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Terraform** | >= 1.5.0 | Infrastructure as Code (modular) |
| **Packer** | latest | AMI golden image building |
| **Ansible** | latest (via PPA) | Server configuration management (local provisioner inside Packer) |
| **GitHub Actions** | v4 runners | Primary CI/CD automation |
| **Jenkins** | Declarative Pipelines | Alternative CI/CD automation |
| **AWS CLI** | v2 | Cloud resource management |
| **SonarQube** | Cloud/Self-hosted | Static code analysis |

### AWS Services Used

| Service | Resource Name | Purpose |
|---------|---------------|---------|
| **EC2** | `sunotal-bastion`, `sunotal-frontend` | Bastion host, Application server |
| **RDS** | `sunotal-postgres` | PostgreSQL 16.3 managed database |
| **S3** | `jcs-raju-sunotal-final` | Terraform state, build artifacts, product images |
| **DynamoDB** | `sunotal-terraform-locks` | Terraform state locking |
| **CloudFront** | `sunotal-s3-cdn` | CDN for S3 product images |
| **ALB** | `sunotal-alb` | Application Load Balancer (HTTP/80) |
| **IAM** | `sunotal-ec2-s3-access-role` | EC2-to-S3 least-privilege access |
| **VPC** | `sunotal-vpc` | Isolated network (10.10.0.0/16) |

### Application Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | React + Vite + TypeScript + TailwindCSS |
| **Backend** | Node.js + Express 5 + TypeScript |
| **ORM** | Drizzle ORM |
| **Database** | PostgreSQL 16.3 (AWS RDS) |
| **Process Manager** | PM2 |
| **Web Server** | Nginx (reverse proxy) |
| **Package Manager** | pnpm 9.x |

---

## 3. Repository Structure

```
sunotal_fullstk/
├── .github/workflows/           # GitHub Actions CI/CD pipelines
│   ├── infra.yml                # Infrastructure provisioning
│   ├── ci.yml                   # Build, test & deploy application
│   └── infra-destroy.yml        # Infrastructure teardown
│
├── terraform/                   # Terraform IaC (modular)
│   ├── main.tf                  # Root module: instantiates all child modules
│   ├── variables.tf             # Root-level input variables
│   ├── outputs.tf               # Root-level outputs
│   └── modules/                 # Reusable Terraform modules
│       ├── vpc/                 # VPC, subnets, IGW, NAT, routes
│       ├── security/            # Security groups (ALB, bastion, web, DB)
│       ├── iam/                 # IAM roles, policies, instance profiles
│       ├── compute/             # EC2 instances (bastion + web)
│       ├── database/            # RDS PostgreSQL instance
│       └── cdn/                 # ALB, CloudFront, S3 bucket policy
│
├── packer/                      # Packer AMI build templates
│   ├── packer.pkr.hcl           # HCL2 Packer template
│   └── ansible/
│       └── site.yml             # Ansible playbook for server hardening
│
├── Jenkinsfile                  # Jenkins: Infrastructure provisioning
├── Jenkinsfile-deploy           # Jenkins: Application CI/CD deployment
├── Jenkinsfile-destroy          # Jenkins: Infrastructure teardown
│
├── frontend/                    # React frontend application
├── backend/                     # Node.js backend API
└── docker-compose.yml           # Docker Compose for local database
```

---

## 4. Infrastructure as Code — Terraform

### 4.1 Backend Configuration

Terraform state is stored remotely in S3 with DynamoDB locking to prevent concurrent modifications.

```hcl
backend "s3" {
  bucket         = "jcs-raju-sunotal-final"
  key            = "state/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "sunotal-terraform-locks"
  encrypt        = true
}
```

> [!IMPORTANT]
> The S3 bucket and DynamoDB table are **pre-created** by the `infra.yml` workflow before Terraform runs. They are NOT managed by Terraform itself (chicken-and-egg problem).

### 4.2 Module Architecture

The infrastructure is split into **6 independent modules**, each with its own `main.tf`, `variables.tf`, and `outputs.tf`:

| Module | Directory | Resources Created |
|--------|-----------|-------------------|
| **IAM** | [modules/iam/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/terraform/modules/iam) | IAM Role (`sunotal-ec2-s3-access-role`), Policy (`sunotal-s3-access-policy`), Instance Profile |
| **VPC** | [modules/vpc/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/terraform/modules/vpc) | VPC, 2 public + 2 private subnets, IGW, NAT Gateway, EIP, Route Tables, S3 Gateway Endpoint |
| **Security** | [modules/security/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/terraform/modules/security) | 4 Security Groups (ALB, Bastion, Web, DB) |
| **Compute** | [modules/compute/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/terraform/modules/compute) | Bastion Host (public), Web Server EC2 (private) |
| **Database** | [modules/database/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/terraform/modules/database) | RDS PostgreSQL 16.3, DB Subnet Group |
| **CDN** | [modules/cdn/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/terraform/modules/cdn) | ALB, Target Group, Listener, CloudFront Distribution, OAC, S3 Bucket Policy |

### 4.3 Module Dependency Graph

```mermaid
graph LR
    IAM["module.iam"]
    VPC["module.vpc"]
    SEC["module.security"]
    COMP["module.compute"]
    DB["module.database"]
    CDN["module.cdn"]

    VPC --> SEC
    VPC --> COMP
    VPC --> DB
    VPC --> CDN
    SEC --> COMP
    SEC --> DB
    SEC --> CDN
    IAM --> COMP
    COMP --> CDN
```

### 4.4 Key Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `aws_region` | `us-east-1` | AWS deployment region |
| `ami_id` | *(required)* | AMI ID from Packer build |
| `instance_type` | `t3.small` | EC2 instance type for app server |
| `bastion_instance_type` | `t3.micro` | EC2 instance type for bastion |
| `vpc_cidr` | `10.10.0.0/16` | VPC CIDR block |
| `public_subnet_1_cidr` | `10.10.1.0/24` | Public subnet AZ-a |
| `public_subnet_2_cidr` | `10.10.2.0/24` | Public subnet AZ-b |
| `private_subnet_1_cidr` | `10.10.10.0/24` | Private subnet AZ-a |
| `private_subnet_2_cidr` | `10.10.20.0/24` | Private subnet AZ-b |
| `db_instance_class` | `db.t3.micro` | RDS instance class |
| `db_name` | `sunotal` | PostgreSQL database name |
| `db_username` | `sunotal` | PostgreSQL admin username |
| `db_password` | `sunotalpass123` | PostgreSQL admin password *(sensitive)* |
| `key_name` | `jcs_raju_laptop` | SSH key pair name |
| `s3_bucket_name` | `jcs-raju-sunotal-final` | S3 bucket name |

### 4.5 Common Terraform Commands

```bash
# Format all Terraform files recursively
cd terraform && terraform fmt -recursive

# Initialize with backend (production)
terraform init -upgrade

# Initialize without backend (local validation only)
terraform init -backend=false -upgrade

# Validate configuration syntax
terraform validate

# Plan infrastructure changes
terraform plan -var="ami_id=ami-0xxxxxx" -var="key_name=jcs_raju_laptop"

# Apply infrastructure changes
terraform apply -auto-approve -var="ami_id=ami-0xxxxxx" -var="key_name=jcs_raju_laptop"

# Destroy all infrastructure
terraform destroy -auto-approve -var="ami_id=destroy-placeholder" -var="key_name=jcs_raju_laptop"

# List all resources in state
terraform state list

# Import an existing AWS resource into state
terraform import -var="ami_id=ami-0xxxxxx" module.iam.aws_iam_role.ec2_s3_role sunotal-ec2-s3-access-role
```

### 4.6 Outputs

| Output | Description |
|--------|-------------|
| `instance_id` | Application EC2 instance ID |
| `private_ip` | Private IP of the application server |
| `bastion_public_ip` | Public IP of the Bastion Host |
| `alb_dns_name` | Public DNS of the Application Load Balancer |
| `db_endpoint` | RDS PostgreSQL hostname |
| `cloudfront_domain_name` | CloudFront CDN domain |
| `cloudfront_distribution_id` | CloudFront distribution ID |

---

## 5. Machine Image Building — Packer & Ansible

### 5.1 Packer Template

**File**: [packer/packer.pkr.hcl](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/packer/packer.pkr.hcl)

The Packer template builds a **golden AMI** based on Ubuntu 22.04 (Jammy) with all application dependencies pre-installed.

#### Build Process

```mermaid
graph LR
    A["Ubuntu 22.04<br/>Base AMI<br/>(Canonical)"] -->|"Shell Provisioner<br/>(cloud-init, apt, ansible)"| B["Ansible-Ready<br/>Base Image"]
    B -->|"Ansible Local<br/>Provisioner"| C["Configured<br/>Application Image"]
    C -->|"Shell Cleanup<br/>(cloud-init clean)"| D["Golden AMI<br/>sunotal-frontend-ami"]
    D -->|"Post-Processor"| E["packer-manifest.json"]
```

#### AMI Tags

```hcl
tags = {
  Name        = "sunotal-frontend-ami"
  Project     = "sunotal"
  ManagedBy   = "packer"
  Environment = "production"
}
```

### 5.2 Ansible Playbook

**File**: [packer/ansible/site.yml](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/packer/ansible/site.yml)

The Ansible playbook provisions the AMI with:

| Task | Details |
|------|---------|
| **System Packages** | nginx, ufw, auditd, curl, git, docker, awscli |
| **Swap Space** | 2 GB swapfile (`/swapfile`) |
| **Node.js 20** | Via NodeSource PPA |
| **pnpm 9** | Global npm package |
| **PM2** | Process manager for Node.js backend |
| **Nginx Config** | Reverse proxy: `/api/` → `localhost:5000`, SPA fallback for `/` |
| **SSH Hardening** | `PasswordAuthentication no`, `PermitRootLogin no` |
| **UFW Firewall** | Default deny; allow ports 22, 80, 443, 5000, 5432 |
| **Docker** | `docker.io` + `docker-compose-v2` |

#### Nginx Configuration (Baked into AMI)

```nginx
server {
    listen 80 default_server;
    server_name _;
    root /var/www/sunotal;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 5.3 Packer Commands

```bash
# Initialize Packer plugins
cd packer && packer init .

# Validate template syntax
packer validate .

# Build AMI (requires AWS credentials)
packer build -var="aws_region=us-east-1" .

# Build with custom instance type
packer build -var="aws_region=us-east-1" -var="instance_type=t3.medium" .
```

---

## 6. CI/CD Pipelines — GitHub Actions

### 6.1 Infrastructure Provisioning (`infra.yml`)

**File**: [.github/workflows/infra.yml](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/.github/workflows/infra.yml)

**Triggers**: Manual dispatch (`workflow_dispatch`), PR changes to `terraform/`, `packer/`, or `infra.yml`

```mermaid
graph TD
    A["Checkout & Configure AWS"] --> B["Create S3 Bucket<br/>+ Enable Versioning<br/>+ Init Folders"]
    B --> C["Create DynamoDB<br/>Lock Table"]
    C --> D["Setup Packer<br/>& Terraform"]
    D --> E["Validate Packer<br/>& Terraform Syntax"]
    E --> F{"Existing AMI<br/>Tagged?"}
    F -->|Yes| G["Reuse AMI"]
    F -->|No| H["Build AMI<br/>with Packer"]
    G --> I["terraform init"]
    H --> I
    I --> J{"Active Infra<br/>Detected?"}
    J -->|Yes & !force| K["Skip Apply"]
    J -->|No or force| L["terraform plan<br/>& apply"]
```

**Manual Dispatch Inputs**:
- `force_rebuild_ami`: Rebuild AMI even if one exists (default: `false`)
- `force_reapply_infra`: Re-apply Terraform even if infrastructure is running (default: `false`)

---

### 6.2 Application CI/CD (`ci.yml`)

**File**: [.github/workflows/ci.yml](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/.github/workflows/ci.yml)

**Triggers**: Push to `main`, PR to `main`

```mermaid
graph TD
    A["SonarQube Scan"] --> B["Checkout Code"]
    B --> C["pnpm Install<br/>(frontend + backend)"]
    C --> D["TypeScript Type Check<br/>(tsc --noEmit)"]
    D --> E["Build Frontend<br/>(pnpm build)"]
    E --> F["Build Backend<br/>(pnpm build)"]
    F --> G["Package Artifacts<br/>(tar -czf)"]
    G --> H["Restore Soft-Deleted<br/>S3 Assets"]
    H --> I["Upload to S3<br/>artifacts/\{SHA\}/ + latest/"]
    I --> J{"Push to main?"}
    J -->|Yes| K["SSH ProxyJump<br/>Bastion → Private EC2"]
    J -->|PR| L["Stop"]
    K --> M["Download Artifacts<br/>from S3"]
    M --> N["Extract Frontend<br/>to /var/www/sunotal"]
    N --> O["Extract Backend<br/>to /var/www/sunotal-backend"]
    O --> P["Configure .env<br/>with RDS endpoint"]
    P --> Q["pnpm install<br/>db:push, db:seed"]
    Q --> R["PM2 restart<br/>+ Nginx reload"]
    R --> S["ALB Health Check"]
```

#### SSH ProxyJump Deployment

The CI/CD pipeline deploys to the **private EC2 instance** through the **public bastion host** using SSH ProxyJump:

```
GitHub Actions Runner → SSH → Bastion (Public) → SSH Tunnel → App EC2 (Private)
```

The SSH config generated at runtime:

```
Host bastion
  HostName <BASTION_PUBLIC_IP>
  User ubuntu
  IdentityFile ~/.ssh/id_rsa
  StrictHostKeyChecking no

Host app-private
  HostName <APP_PRIVATE_IP>
  User ubuntu
  IdentityFile ~/.ssh/id_rsa
  ProxyJump bastion
  StrictHostKeyChecking no
```

---

### 6.3 Infrastructure Teardown (`infra-destroy.yml`)

**File**: [.github/workflows/infra-destroy.yml](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/.github/workflows/infra-destroy.yml)

**Triggers**: Manual dispatch only (requires typing `DESTROY` to confirm)

```mermaid
graph TD
    A["Verify DESTROY<br/>Confirmation"] --> B["Empty S3<br/>Build Artifacts"]
    B --> C["terraform destroy"]
    C --> D["Deregister Packer AMIs<br/>+ Delete EBS Snapshots"]
    D --> E["Full AWS us-east-1<br/>Resource Sweeper"]
```

**Sweeper cleans**: EC2 Instances, RDS Database, ALB, Target Groups, CloudFront OAC, IAM Roles/Policies/Instance Profiles, Security Groups, VPC.

> [!CAUTION]
> This workflow is **destructive and irreversible**. It wipes ALL `sunotal-*` resources in `us-east-1`. The S3 bucket and DynamoDB table are intentionally preserved.

---

## 7. CI/CD Pipelines — Jenkins

### 7.1 Infrastructure Pipeline (`Jenkinsfile`)

**File**: [Jenkinsfile](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/Jenkinsfile)

| Stage | Action |
|-------|--------|
| Checkout | Clone repository |
| Validate Syntax | `packer validate`, `terraform validate` |
| Resolve or Build AMI | Check for existing tagged AMI; build with Packer if none found |
| Deploy Infrastructure | `terraform init` → `terraform plan` → `terraform apply` |

### 7.2 Application Deployment Pipeline (`Jenkinsfile-deploy`)

**File**: [Jenkinsfile-deploy](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/Jenkinsfile-deploy)

| Stage | Action |
|-------|--------|
| Install & Validate Code | `pnpm install --frozen-lockfile`, `tsc --noEmit` |
| Build & Package | `pnpm build`, `tar -czf` artifacts |
| Upload to S3 | Push build artifacts to `artifacts/latest/` |
| Deploy via Bastion | SSH ProxyJump → download from S3 → extract → PM2 restart |

### 7.3 Infrastructure Teardown Pipeline (`Jenkinsfile-destroy`)

**File**: [Jenkinsfile-destroy](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/Jenkinsfile-destroy)

**Requires**: `CONFIRM_DESTROY` boolean parameter checked to `true`

| Stage | Action |
|-------|--------|
| Verify Approval | Abort if `CONFIRM_DESTROY` is unchecked |
| Restore S3 State | Recover valid Terraform state from S3 version history |
| Destroy Infrastructure | `terraform destroy -auto-approve` |
| Purge AMIs & Sweeper | Deregister AMIs, delete snapshots, full resource sweeper |

### 7.4 Required Jenkins Credentials

| Credential ID | Type | Purpose |
|---------------|------|---------|
| `AWS` | Username/Password | AWS Access Key ID / Secret Access Key |
| `EC2_SSH_KEY` | SSH Private Key | SSH key for EC2 access |

---

## 8. Secrets & Credential Management

### 8.1 GitHub Actions Secrets

These must be configured in **Settings → Secrets and variables → Actions**:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | `wJalr...` |
| `AWS_DEFAULT_REGION` | AWS region | `us-east-1` |
| `EC2_SSH_KEY` | PEM private key for SSH access to EC2 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `S3_BUCKET_NAME` | S3 bucket name | `jcs-raju-sunotal-final` |
| `SONAR_TOKEN` | SonarQube authentication token | `sqp_...` |
| `SONAR_HOST_URL` | SonarQube server URL | `https://sonar.example.com` |

### 8.2 Terraform Sensitive Variables

| Variable | How It's Passed |
|----------|----------------|
| `db_password` | Declared `sensitive = true` in variables.tf; has default but should be overridden via `-var` or `TF_VAR_db_password` |
| `ami_id` | Passed via `-var` from Packer manifest output |
| `key_name` | Passed via `-var` |

> [!WARNING]
> The `db_password` currently has a default value in `variables.tf`. For production, override it via environment variable `TF_VAR_db_password` or GitHub Actions secret.

---

## 9. S3 Bucket Structure & Asset Management

### 9.1 Bucket: `jcs-raju-sunotal-final`

```
jcs-raju-sunotal-final/
├── state/                        # Terraform remote state
│   └── terraform.tfstate         # Current state file (versioned)
│
├── artifacts/                    # CI/CD build artifacts
│   ├── latest/                   # Latest build pointer
│   │   ├── frontend-build.tgz
│   │   ├── backend-build.tgz
│   │   └── docker-compose.yml
│   └── {commit-sha}/            # Versioned build artifacts
│       ├── frontend-build.tgz
│       └── backend-build.tgz
│
└── images/                       # Product & banner images (uploaded from admin UI)
    ├── {timestamp}-{random}.jpg  # Product images
    └── banners/                  # Hero banner images
        └── {timestamp}-{random}.jpg
```

### 9.2 S3 Versioning & Soft-Delete Recovery

S3 versioning is **enabled** on the bucket. The CI/CD pipeline (`ci.yml`) automatically **un-deletes** soft-deleted assets by scanning for `DeleteMarker` entries and removing them:

```bash
aws s3api list-object-versions --bucket "$BUCKET_NAME" \
  --query 'DeleteMarkers[?IsLatest==`true`].[Key, VersionId]' \
  --output text | while read -r KEY VERSION_ID; do
    aws s3api delete-object --bucket "$BUCKET_NAME" --key "$KEY" --version-id "$VERSION_ID"
  done
```

### 9.3 Image Upload Flow

```mermaid
sequenceDiagram
    participant Admin as Admin UI
    participant API as Backend API
    participant S3 as S3 Bucket
    participant CF as CloudFront

    Admin->>Admin: Select image file
    Admin->>API: POST /api/upload (base64 data)
    API->>S3: PutObject to images/{unique-filename}
    S3-->>API: Success + URL
    API-->>Admin: { url: "https://bucket.s3.amazonaws.com/images/..." }
    Admin->>API: POST /api/products (with image URL)

    Note over CF,S3: CloudFront serves images<br/>via Origin Access Control
```

---

## 10. Networking & Security Architecture

### 10.1 VPC Subnet Layout

| Subnet | CIDR | AZ | Type | Purpose |
|--------|------|----|------|---------|
| `public_subnet_1` | `10.10.1.0/24` | us-east-1a | Public | Bastion Host, ALB |
| `public_subnet_2` | `10.10.2.0/24` | us-east-1b | Public | ALB (Multi-AZ) |
| `private_subnet_1` | `10.10.10.0/24` | us-east-1a | Private | App EC2, RDS |
| `private_subnet_2` | `10.10.20.0/24` | us-east-1b | Private | RDS (Multi-AZ) |

### 10.2 Network Components

| Component | Purpose |
|-----------|---------|
| **Internet Gateway** | Provides internet access for public subnets |
| **NAT Gateway** | Allows private subnet instances to reach the internet (outbound only) |
| **Elastic IP** | Static IP for NAT Gateway |
| **S3 Gateway Endpoint** | Free, fast S3 access from private subnets without NAT |

### 10.3 Security Groups

| Security Group | Inbound Rules | Purpose |
|----------------|---------------|---------|
| **ALB SG** | `80/tcp` from `0.0.0.0/0`, `443/tcp` from `0.0.0.0/0` | Public web traffic |
| **Bastion SG** | `22/tcp` from `0.0.0.0/0` | SSH access from anywhere |
| **Web SG** | `80/tcp` from ALB SG, `5000/tcp` from ALB SG, `22/tcp` from Bastion SG | App server access |
| **DB SG** | `5432/tcp` from Web SG | PostgreSQL from app server only |

### 10.4 Traffic Flow

```
Internet → ALB (Port 80) → Web EC2 (Port 80/Nginx → Port 5000/PM2)
                                      ↓
                              RDS PostgreSQL (Port 5432)

SSH: DevOps/CI → Bastion (Port 22) → Web EC2 (Port 22, ProxyJump)
```

---

## 11. Operational Runbooks

### 11.1 Fresh Slate Deployment (From Scratch)

```bash
# Step 1: Run Infrastructure provisioning
# GitHub Actions → Actions → Infrastructure Automation → Run workflow

# Step 2: Wait for infrastructure to be ready (15-20 mins for RDS)

# Step 3: Deploy application
# Push to main branch OR
# GitHub Actions → Actions → CI/CD Pipeline → Run workflow
```

### 11.2 Rebuild AMI Only

```bash
# GitHub Actions → Actions → Infrastructure Automation → Run workflow
# Set force_rebuild_ami = true
```

### 11.3 Force Re-Apply Terraform

```bash
# GitHub Actions → Actions → Infrastructure Automation → Run workflow
# Set force_reapply_infra = true
```

### 11.4 SSH into Private EC2 (Manual)

```bash
# Save PEM key locally
chmod 600 ~/sunotal-key.pem

# Get bastion and private IPs from Terraform outputs or AWS Console

# SSH directly via ProxyJump
ssh -i ~/sunotal-key.pem -J ubuntu@<BASTION_PUBLIC_IP> ubuntu@<APP_PRIVATE_IP>
```

### 11.5 View Application Logs

```bash
# SSH into private EC2 first, then:
pm2 logs sunotal-backend          # Application logs
pm2 monit                         # Real-time monitoring
sudo journalctl -u nginx -f       # Nginx logs
sudo cat /var/log/nginx/error.log # Nginx error logs
```

### 11.6 Restart Application

```bash
# On the private EC2:
pm2 restart sunotal-backend       # Restart backend
sudo systemctl restart nginx      # Restart Nginx
```

### 11.7 Full Teardown

```bash
# GitHub Actions → Actions → Infrastructure Teardown → Run workflow
# Type "DESTROY" in the confirmation field
```

---

## 12. Troubleshooting Guide

### 12.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **`EntityAlreadyExists` during `terraform apply`** | Resource exists but not in Terraform state | Import the resource: `terraform import module.iam.aws_iam_role.ec2_s3_role sunotal-ec2-s3-access-role` |
| **SSH connection timeout to private EC2** | Bastion not running, or wrong key | Verify bastion is running, check key permissions (`chmod 600`), verify security groups allow port 22 |
| **Packer build fails: apt lock** | Another apt process is running | The Packer template already handles this by killing apt processes and removing lock files |
| **`terraform init` fails: S3 bucket not found** | S3 backend bucket was deleted | Run `infra.yml` workflow — it auto-creates the bucket before `terraform init` |
| **RDS connection refused** | Security group misconfigured or RDS still provisioning | Check DB SG allows `5432/tcp` from Web SG; RDS takes 10-15 min to provision |
| **PM2 process not found** | First deployment or crashed | SSH into EC2 and run: `pm2 start dist/src/index.js --name sunotal-backend` |
| **Product images not loading** | S3 bucket policy missing or CloudFront not configured | Verify CDN module applied correctly and S3 bucket policy allows CloudFront access |
| **Image upload fails (500 error)** | EC2 instance lacks S3 permissions | Verify IAM instance profile `sunotal-ec2-instance-profile` is attached to the EC2 instance |
| **DynamoDB lock timeout** | Previous Terraform run crashed without releasing lock | Delete the lock: `aws dynamodb delete-item --table-name sunotal-terraform-locks --key '{"LockID":{"S":"jcs-raju-sunotal-final/state/terraform.tfstate"}}'` |

### 12.2 Terraform State Recovery

If the Terraform state file is corrupted or empty:

```bash
# List all versions of the state file
aws s3api list-object-versions --bucket jcs-raju-sunotal-final --prefix state/terraform.tfstate

# Download a specific version
aws s3 cp "s3://jcs-raju-sunotal-final/state/terraform.tfstate?versionId=<VERSION_ID>" ./terraform.tfstate

# Upload the recovered state
aws s3 cp ./terraform.tfstate s3://jcs-raju-sunotal-final/state/terraform.tfstate
```

### 12.3 Force Unlock Terraform State

```bash
cd terraform
terraform init
terraform force-unlock <LOCK_ID>
```

---

## 13. Glossary

| Term | Definition |
|------|-----------|
| **AMI** | Amazon Machine Image — a pre-configured snapshot of an EC2 instance |
| **ALB** | Application Load Balancer — distributes HTTP traffic across targets |
| **Bastion Host** | A hardened public-facing EC2 instance used as an SSH jump host |
| **CDN** | Content Delivery Network — caches and serves static content globally |
| **CloudFront OAC** | Origin Access Control — restricts S3 access to CloudFront only |
| **DynamoDB** | AWS NoSQL database service — used here for Terraform state locking |
| **EIP** | Elastic IP — a static public IPv4 address for NAT Gateway |
| **Golden AMI** | A pre-baked machine image with all dependencies and configurations installed |
| **IAM** | Identity and Access Management — AWS permission and role management |
| **IGW** | Internet Gateway — provides internet access to VPC public subnets |
| **NAT Gateway** | Network Address Translation — allows private subnets outbound internet access |
| **OAC** | Origin Access Control — CloudFront mechanism to securely access S3 origins |
| **PM2** | Production process manager for Node.js applications |
| **ProxyJump** | SSH feature that tunnels through an intermediate host (bastion) |
| **RDS** | Relational Database Service — AWS managed PostgreSQL |
| **SPA** | Single Page Application — React app with client-side routing |
| **Terraform State** | A JSON file tracking all managed infrastructure resources |
| **VPC** | Virtual Private Cloud — an isolated network environment in AWS |
