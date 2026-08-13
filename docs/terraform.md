# Terraform Infrastructure-as-Code Documentation

This document describes the design, directory layout, remote backend configurations, locking mechanisms, and detailed module schemas of the Terraform code for the Sunotal platform.

---

## 1. Directory Structure

The infrastructure-as-code configuration is organized into modular components under the `terraform/` directory:

```
terraform/
├── main.tf                 # Root module invoking subnet, database, and ECS modules
├── variables.tf            # Global parameters definitions (CIDR limits, credentials)
├── outputs.tf              # Returns load balancer URLs, instance IPs, and ECR URIs
├── terraform.tfvars        # Environment-specific values (Gitignored in production)
└── modules/
    ├── vpc/                # Configures subnets, route tables, and gateways (EIP/NAT Gateway deleted)
    ├── security/           # Establishes firewalls and SG mapping rules
    ├── database/           # Configures Amazon RDS PostgreSQL instance
    ├── cdn/                # Configures the Application Load Balancer & CloudFront CDN
    ├── ecr/                # Configures ECR container repositories
    ├── ecs/                # Sets up ECS Fargate clusters, services, and tasks (Fargate Spot)
    ├── lambda/             # Provisions Python auto-delete triggers
    ├── iam/                # Sets up instance profiles, execution roles, and access rules
    ├── sonarqube/          # Provisions EC2 instance for static code analysis
    └── test_server/        # Provisions staging test host
```

---

## 2. Terraform S3 Remote State & DynamoDB Locks

To allow teamwork and prevent state file conflicts, Terraform stores state files remotely in AWS instead of on local disks.

```
       Developer / CI Runner (Runs Terraform)
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[S3 State File Storage]    [DynamoDB Lock Table]
jcs-raju-sunotal-final/    sunotal-terraform-locks
state/terraform.tfstate    (Prevents simultaneous applys)
```

### 2.1 S3 Remote State
* **Location**: Stored in a single centralized S3 bucket at `s3://jcs-raju-sunotal-final/state/terraform.tfstate`.
* **Encryption**: Configured with `encrypt = true` to protect credentials and private variables in the state file.

### 2.2 DynamoDB Lock Table
* **Table Name**: `sunotal-terraform-locks`
* **Mechanism**: Before running updates, Terraform locks the state by writing a lock ID to DynamoDB. If another developer or pipeline runner tries to modify the infrastructure at the same time, Terraform blocks the run until the lock is released.
* **Billing Mode**: `PAY_PER_REQUEST` (On-Demand), minimizing static maintenance costs.

---

## 3. Terraform Module Schema & Details

### 3.1 Network Module (`vpc`)
Sets up a Virtual Private Cloud (VPC) with segregated subnets:
* **Public Subnets**: Two subnets exposed to the internet. Hosts the ALB, ECS Fargate tasks, SonarQube, and Test Server.
* **Private Subnets**: Two isolated subnets. Hosts the RDS PostgreSQL database.
* **Gateways & Cost Optimization**: Internet Gateway (IGW) for public subnets. **The NAT Gateway and Elastic IP have been removed** to save ~$390/year. Private subnets are completely isolated from the internet (industry standard for databases), while public subnets run tasks using public IPs to draw ECR images and post CloudWatch logs.

### 3.2 Security Module (`security`)
Sets up security group firewalls restricting inbound and outbound traffic:
* **ALB Security Group**: Accepts HTTP (80) and HTTPS (443) traffic from the public internet.
* **ECS Security Group**: Allows inbound traffic from the ALB security group on microservice ports `5001`–`5004` (and port `80` for the frontend).
* **Database Security Group**: Restricts access, only accepting connections from the ECS Fargate security group on PostgreSQL port `5432`.
* **EC2 Security Groups**: Permits SSH (22) and UI access (SonarQube `9000`, Test Server `3000`/`5000`) from authorized CIDR blocks.

### 3.3 Database Module (`database`)
Provisions the relational database:
* **Resource**: `aws_db_instance` (Amazon RDS PostgreSQL).
* **Configuration**: Runs a single database instance inside a subnet group linked to the private subnets. Disk storage is configured to autoscale from a base of 20GB up to a limit of 100GB.

### 3.4 Load Balancing & CDN Module (`cdn`)
Handles traffic distribution:
* **ALB**: Provisions an Application Load Balancer and target groups linked to the ECS Fargate services.
* **CloudFront CDN**: Configures caching policies and edge locations to accelerate frontend asset delivery.

### 3.5 Container Registry Module (`ecr`)
Creates the ECR repositories (`aws_ecr_repository`) for the frontend and each of the four backend microservices.

### 3.6 Container Orchestration Module (`ecs`)
* **Cluster**: Sets up the `sunotal-cluster` ECS cluster.
* **Task Definitions**: Declares `aws_ecs_task_definition` templates defining ports, env variables, logging directories, and ECR repository images for each service.
* **Services & Fargate Spot**: Configures ECS services to use **Fargate Spot capacity providers** (`FARGATE_SPOT`), reducing container compute costs by up to 70%. Tasks are deployed in public subnets with public IPs assigned to communicate with AWS APIs.

### 3.7 Lambda & IAM Modules (`lambda` & `iam`)
* **Lambda**: Sets up the Python-based `sunotal-delete-s3-object` script and registers bucket event triggers.
* **IAM**: Configures the ECS Task Execution Role, ECS Task Role, and S3 read/write policies.
