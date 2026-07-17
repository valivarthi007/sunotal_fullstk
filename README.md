# Sunotal Fullstack

Sunotal is a full-stack farm produce marketplace with a React/Vite frontend, an Express backend, and a PostgreSQL database. This guide shows how to run it locally and how to deploy the frontend to AWS using Packer, Terraform, Ansible, and Jenkins.

## 1. Local development

### Prerequisites
- Node.js 20+
- pnpm
- Docker
- PostgreSQL (or Docker Compose)

### Start the database
```bash
docker compose up -d postgres
```

### Start the backend
```bash
cd backend
cp .env.example .env
pnpm install
pnpm run dev
```

The backend runs on http://localhost:5000.

### Start the frontend
```bash
cd frontend
pnpm install
pnpm run dev
```

The frontend runs on http://localhost:3000.

### Build for production
```bash
cd frontend
pnpm run build
```

```bash
cd backend
pnpm run build
```

## 2. AWS deployment architecture

The deployment strategy decouples infrastructure provisioning from application deployments:

**Infrastructure Pipeline** (`Jenkinsfile`):
- **Packer**: Creates a reusable Ubuntu base AMI with Docker and PM2.
- **Ansible**: Installs dependencies and configures the Nginx reverse proxy.
- **Terraform**: Provisions the VPC, security groups, and EC2 instance.
- Run this manually when you need to provision or update servers.

**Deployment Pipeline** (`Jenkinsfile-deploy`):
- Automatically triggered on application code pushes to GitHub.
- Builds the frontend and backend, starts PostgreSQL via Docker, migrates the DB, and restarts the backend via PM2.

**Decommission Pipeline** (`Jenkinsfile-destroy`):
- Safely destroys all AWS infrastructure when no longer needed.

## 3. Implement the full AWS pipeline

### Step 1: Install tooling locally
Install the following tools on the machine or CI runner that will orchestrate deployment:
- AWS CLI
- Packer
- Terraform
- Ansible
- Jenkins (or a Jenkins agent)

Example on Ubuntu:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

Verify access:
```bash
aws configure
aws sts get-caller-identity
```

### Step 2: Build a custom AMI with Packer
The AMI build process is defined in [packer/packer.pkr.hcl](packer/packer.pkr.hcl) and [packer/ansible/site.yml](packer/ansible/site.yml).

Run:
```bash
cd packer
packer init .
packer build -var='aws_region=us-east-1' .
```

What the build does:
- Launches an Ubuntu base image in AWS
- Installs Node.js, pnpm, Nginx, and system hardening packages
- Configures firewall and basic security headers
- Prepares directory structures with proper permissions (`/var/www/sunotal`) for future app deployments

After the build completes, copy the resulting AMI ID and use it in Terraform.

### Step 3: Create AWS infrastructure with Terraform
The Terraform configuration is in [terraform/main.tf](terraform/main.tf) and [terraform/variables.tf](terraform/variables.tf).

Prepare the variable file:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit [terraform/terraform.tfvars.example](terraform/terraform.tfvars.example) and set:
- `ami_id`: the AMI ID from the Packer build
- `key_name`: an existing EC2 key pair name
- `aws_region`: your target region
- `allowed_cidr_blocks`: the CIDRs allowed to access the instance

Apply the infrastructure:
```bash
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

Terraform will create:
- A VPC and public subnet
- An internet gateway and route table
- A security group allowing SSH and web traffic
- An EC2 instance running the hardened AMI
- An Elastic IP for public access

### Step 4: Configure Jenkins CI/CD
The pipeline logic is split into two distinct files to decouple infrastructure changes from application deployments.

#### Jenkins prerequisites
Install on the agent or controller:
- Node.js 20
- pnpm
- Packer
- Terraform
- Ansible
- AWS CLI
- Trivy (optional but recommended for scanning)

#### Jenkins credentials
Create the following secret text credentials:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEFAULT_REGION`
- SSH keys required to access the target EC2 instances.

#### Pipeline 1: Infrastructure Provisioning (`Jenkinsfile-infra`)
1. Checks out the repository.
2. Builds the base AMI with Packer (on `main`).
3. Provisions networking and compute resources via Terraform.
4. Triggers the deployment pipeline upon success.
**Setup:** Create a new Jenkins Pipeline job pointing to `Jenkinsfile-infra`.

#### Pipeline 2: Application Deployment (`Jenkinsfile-deploy`)
1. Checks out the repository.
2. Installs Node.js tools and frontend/backend dependencies.
3. Builds the frontend and runs a security scan.
4. Discovers the target EC2 IP via AWS CLI and deploys the built frontend code directly using `rsync`.
**Setup:** Create a new Jenkins Pipeline job named `sunotal-deploy` pointing to `Jenkinsfile-deploy`.

### Step 5: Best practices
- Store secrets in Jenkins credentials or AWS Secrets Manager, not in source control
- Use IAM roles instead of long-lived credentials where possible
- Keep Terraform state remote (for example, S3 + DynamoDB locking)
- Restrict SSH and web access to known CIDRs
- Use branch protection and code review before merging to `main`
- Add automated tests before promoting to production

## 4. Database and environment notes
The backend uses Drizzle and PostgreSQL. For production, configure a managed PostgreSQL instance and set strong environment variables such as `JWT_SECRET`.

```bash
cd backend
pnpm run db:push
```

Do not commit `.env` files. Keep environment values in CI secrets or AWS-based secret storage.

## 5. Security and hardening summary
The current AMI build applies a baseline hardening flow:
- SSH password authentication disabled
- Root login disabled
- UFW enabled
- Nginx security headers enabled

This is a good starting point, but production environments should be reviewed against the CIS benchmark or a company-approved baseline.

## 6. Quick start summary
```bash
# local development
docker compose up -d postgres
cd backend && pnpm install && pnpm run dev
cd frontend && pnpm install && pnpm run dev

# AWS deployment (Infrastructure)
cd packer && packer init . && packer build -var='aws_region=us-east-1' .
cd ../terraform && cp terraform.tfvars.example terraform.tfvars && terraform init && terraform apply -var-file=terraform.tfvars

# AWS deployment (Application Code - typically run by Jenkins)
# Assuming EC2_IP is your terraform output public IP:
# rsync -avz -e "ssh -o StrictHostKeyChecking=no" frontend/dist/ ubuntu@$EC2_IP:/var/www/sunotal/
```

## 7. Notes
- Addresses and orders are currently stored in the frontend for demo purposes. For production, move this state to a real backend API and database.
- Review the application environment and secrets before deployment.
