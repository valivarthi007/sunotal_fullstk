# Sunotal Fullstack & DevOps Architecture Documentation

This document provides a comprehensive overview of the Sunotal application architecture and its automated CI/CD deployment pipelines.

## 1. Application Overview

Sunotal is a full-stack farm produce marketplace. 

### Technology Stack
- **Frontend**: React.js with Vite (TypeScript)
- **Backend**: Node.js with Express.js (TypeScript)
- **Database**: PostgreSQL (managed via Docker locally, ORM: Drizzle)
- **Package Manager**: pnpm

### Core Components
- **Frontend Application**: Provides the user interface for administrators, vendors (farmers), and consumers. It communicates with the backend via REST APIs. 
- **Backend Service**: Serves business logic, handles authentication (JWT), and interacts with the PostgreSQL database.
- **PostgreSQL Database**: Stores users, products, orders, and configuration state.

---

## 2. Infrastructure as Code (IaC)

To guarantee reproducible, reliable, and scalable environments, the underlying infrastructure is entirely provisioned via code.

### 2.1 Base Image Baking (Packer)
We utilize **HashiCorp Packer** to build a golden Amazon Machine Image (AMI) for our EC2 instances. 
- **Location**: `packer/packer.pkr.hcl`
- **Responsibilities**:
  - Pulls the latest Ubuntu 22.04 LTS base image.
  - Invokes Ansible to harden the OS and install prerequisites.
  - Outputs a reusable AMI ID into a `packer-manifest.json` file.

### 2.2 Server Configuration (Ansible)
**Ansible** is run by Packer during the AMI build phase.
- **Location**: `packer/ansible/site.yml`
- **Responsibilities**:
  - **Tooling**: Installs Node.js, pnpm, Nginx, UFW, Git, and other system utilities.
  - **Security**: Hardens SSH (disables password auth and root login), enables the UFW firewall, and installs `auditd`.
  - **Environment**: Sets up the `/var/www/sunotal` directory with appropriate `ubuntu` user permissions to allow for seamless code deployments.
  - **Web Server**: Configures Nginx as a reverse proxy/web server.

### 2.3 Cloud Provisioning (Terraform)
**HashiCorp Terraform** uses the Packer-generated AMI to provision AWS resources.
- **Location**: `terraform/main.tf`
- **Responsibilities**:
  - **Networking**: Provisions a VPC, a public subnet, an Internet Gateway, and Route Tables.
  - **Security Groups**: Creates rules allowing inbound traffic on ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).
  - **Compute**: Spins up an EC2 instance (`t3.small` by default) using the Packer AMI and associates it with the VPC and Security Groups.
  - **Outputs**: Provides the Public IP of the resulting EC2 instance for subsequent application deployments.

---

## 3. CI/CD Pipeline (Jenkins)

The CI/CD workflow is heavily decoupled, adhering to modern DevOps best practices. We separate **Infrastructure Provisioning** from **Application Deployment**.

### 3.1 Infrastructure Pipeline (`Jenkinsfile`)
This pipeline manages the physical servers and network. It is executed manually.

1. **Checkout**: Clones the source repository.
2. **Packer Build**: 
   - Initializes Packer.
   - Builds the hardened Ubuntu AMI (now pre-equipped with Docker and PM2).
   - Saves the resulting metadata (AMI ID) to `packer-manifest.json`.
3. **Terraform Deploy**: 
   - Extracts the AMI ID from the Packer manifest.
   - Initializes Terraform.
   - Applies the Terraform configuration (`terraform apply`), provisioning the AWS infrastructure.

### 3.2 Decommission Pipeline (`Jenkinsfile-destroy`)
This pipeline safely tears down all AWS resources created by Terraform. It requires explicit manual confirmation.

### 3.3 Application Deployment Pipeline (`Jenkinsfile-deploy`)
This pipeline focuses purely on the software artifact lifecycle. It triggers automatically on GitHub pushes.

1. **Checkout**: Clones the source repository.
2. **Build**: Installs dependencies and runs `pnpm build` to compile the frontend and backend.
3. **Deploy to EC2**: 
   - Locates the EC2 instance dynamically via AWS tags.
   - **Frontend**: Pushes compiled static files to `/var/www/sunotal`.
   - **Database**: Copies `docker-compose.yml` and spins up PostgreSQL.
   - **Backend**: Pushes backend code, installs production dependencies, runs Drizzle migrations, and starts the Node.js API using PM2.

---

## 4. Operational Runbook

### Changing Application Code
1. Commit changes to `frontend/` or `backend/`.
2. Jenkins triggers `Jenkinsfile-deploy`.
3. Code is built and instantly pushed to the existing EC2 instance via `rsync`.
*(Fast, no AWS infrastructure changes occur).*

### Changing Infrastructure Configuration
1. Commit changes to `packer/` (e.g., updating Ansible roles) or `terraform/` (e.g., adding an RDS database).
2. Jenkins triggers `Jenkinsfile-infra`.
3. A new AMI is baked, and Terraform replaces the EC2 instance (immutable infrastructure).
4. `Jenkinsfile-infra` automatically triggers `Jenkinsfile-deploy` to reinstall the application code onto the fresh server.
*(Slower, completely refreshes the underlying operating system).*

### Manual Deployment Fallback
In the event Jenkins is unavailable, you can deploy manually:
```bash
# 1. Ensure you have built the code locally
cd frontend && pnpm build

# 2. Sync to the server (Replace EC2_IP with the actual IP)
rsync -avz -e "ssh -o StrictHostKeyChecking=no" dist/ ubuntu@EC2_IP:/var/www/sunotal/
```
