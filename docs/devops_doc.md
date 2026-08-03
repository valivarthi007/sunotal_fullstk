# Sunotal DevOps & AWS Infrastructure Tutorial

This tutorial provides a complete walkthrough of the DevOps and AWS cloud infrastructure configuration for the Sunotal Corporate E-Commerce application.

---

## 1. Golden AMI Baking (Packer & Ansible)

We build a reusable, hardened Amazon Machine Image (AMI) containing all system dependencies to ensure fast, immutable deployment cycles.

### Packer Template
Located at `packer/packer.pkr.hcl`, the template:
1. Pulls the latest base Ubuntu 22.04 LTS AMI.
2. Runs the Ansible local provisioner.
3. Outputs the baked AMI ID to `packer-manifest.json`.

### Ansible Configuration
Located in `packer/ansible/`, the playbook:
- Installs Node.js, `pnpm`, Git, Nginx, and system utilities.
- Configures Nginx as a reverse proxy (traffic from port 80/443 routed to backend on port 5000 and static frontend built files).
- Disables password authentication and SSH root logins, enabling the UFW firewall (allowing only ports 22, 80, and 443).

---

## 2. Infrastructure as Code (Terraform)

All AWS cloud resources are defined declaratively in [terraform/main.tf](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/terraform/main.tf).

### Module Architecture
- **VPC Module**: Provisions VPC, public subnets (for ALB/Bastion), and private subnets (for EC2 app server and PostgreSQL RDS).
- **IAM Module**: Automatically sets up the EC2 Instance Profile allowing read/write access to S3 artifacts and permissions to invoke the S3 auto-delete Lambda function.
- **Compute Module**: Provisions the public Bastion host (for secure SSH tunneling) and private EC2 App Server.
- **Database Module**: Provisions an RDS PostgreSQL instance in private subnets.
- **CDN / ALB Module**: Provisions the Application Load Balancer, SSL Certificate integration, and configures listener routing.
- **Lambda Module**: Provisions the Python 3.11 S3 auto-deletion function.

### Remote State & Locks
Terraform state is stored in S3 and locked via DynamoDB:
- **Bucket**: `s3://jcs-raju-sunotal-final/state/terraform.tfstate`
- **Lock Table**: `sunotal-terraform-locks`

---

## 3. ALB HTTPS Redirection

To secure web traffic, the ALB has two listener rules:
1. **HTTP Listener (Port 80)**: Performs a `HTTP_301` redirect to HTTPS (Port 443).
2. **HTTPS Listener (Port 443)**: Binds the SSL Certificate specified by `ssl_certificate_arn` and forwards decrypted traffic to the backend target group.

---

## 4. S3 Auto-Deletion Lambda Function

When an administrator deletes a product from the database, the backend triggers an AWS Lambda function to automatically clean up the product image from S3.

### Lambda Code
Written in Python 3.11 inside [index.py](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/terraform/modules/lambda/src/index.py):
- Receives the event containing the target `bucket` and `key`.
- Invokes `s3.delete_object` to delete the file.
- Handles logging to CloudWatch.

### IAM Permissions
- **Lambda Execution Role**: Attached to `sunotal-lambda-s3-delete-role` with permission to run `s3:DeleteObject` on the target S3 bucket.
- **EC2 Instance Role**: Allows the EC2 server to run `lambda:InvokeFunction` specifically on the deletion function.

---

## 5. CI/CD Pipelines

Sunotal supports two enterprise-grade orchestration pipelines.

### Option A: Jenkins Pipelines
1. **Infrastructure Provisioning (`Jenkinsfile`)**:
   - Clones repo, validates Packer and Terraform templates.
   - Runs `packer build` to bake the golden AMI.
   - Runs `terraform apply` to deploy AWS infrastructure.
2. **Decommission (`Jenkinsfile-destroy`)**:
   - Safely tears down the AWS infrastructure after manual verification.
3. **Application Deploy (`Jenkinsfile-deploy`)**:
   - Runs code builds (`pnpm build`).
   - Copies frontend dist and backend built assets to the EC2 server via secure SSH rsync.
   - Configures the PM2 backend service and database migrations.

### Option B: GitHub Actions Workflows
Workflows are located in `.github/workflows/`:
- **`infra.yml`**: Triggers on infrastructure directory PRs to run Packer/Terraform validation and provision resources.
- **`ci.yml`**: Triggers on code pushes to compile code, run TypeScript checks, upload build packages to S3, and execute deployment on EC2.
