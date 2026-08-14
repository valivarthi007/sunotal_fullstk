# Terraform Architecture, Module Guide & Writing Tutorial

This guide details the Infrastructure as Code (IaC) architecture of **Sunotal Farms**, documenting all Terraform commands used, the modular repository structure, and a step-by-step tutorial on developing modular Terraform code.

---

## Part 1: Terraform Repository Structure

The infrastructure is organized into dedicated, reusable modules under `terraform/modules/`, instantiated by the root module in `terraform/main.tf`.

```text
terraform/
├── main.tf                  # Root module instantiating all child modules
├── variables.tf             # Input variables with types and descriptions
├── outputs.tf               # Root outputs (ALB DNS, ECS Cluster ARN, etc.)
├── terraform.tfvars         # Environment-specific values (Region, CIDR, etc.)
├── modules/
│   ├── vpc/                 # VPC, Public/Private Subnets, IGW, Route Tables
│   ├── security/            # Security Groups for ALB, ECS, RDS, SonarQube
│   ├── database/            # Amazon RDS PostgreSQL instance and Subnet Groups
│   ├── ecs/                 # ECS Cluster, Task Definitions, 5 ECS Services
│   ├── cdn/                 # ALB, Target Groups, Listener Rules, S3, CloudFront
│   ├── iam/                 # ECS Task Execution Roles, GitHub OIDC Role
│   ├── lambda/              # Cleanup and S3 object deletion Lambdas
│   ├── ecr/                 # Amazon ECR container repositories
│   └── sonarqube/           # SonarQube EC2 infrastructure (t3.micro)
```

---

## Part 2: Terraform CLI Commands Reference

```bash
# Initialize Terraform and download provider plugins & modules
cd terraform
terraform init

# Validate syntax and configuration integrity
terraform validate

# Format all Terraform files to canonical style
terraform fmt -recursive

# Generate an execution plan without applying
terraform plan -out=tfplan

# Apply the infrastructure changes to AWS
terraform apply tfplan
# or directly with auto-approval
terraform apply -auto-approve

# Inspect current state resources
terraform state list

# Show detailed state of a specific resource
terraform state show module.cdn.aws_lb.main

# Refresh state against actual cloud infrastructure
terraform refresh

# Target a specific module or resource for apply
terraform apply -target=module.cdn

# Destroy infrastructure
terraform destroy -auto-approve
```

---

## Part 3: Tutorial: Writing Modular Terraform Code

### 1. Defining a Child Module (`modules/cdn/`)

A well-structured module has 3 core files:
- `variables.tf`: Declares what inputs the module needs.
- `main.tf`: Defines the AWS resources created.
- `outputs.tf`: Declares what resource attributes are exposed to parent modules.

#### Example: `modules/cdn/variables.tf`
```hcl
variable "vpc_id" {
  type        = string
  description = "VPC ID where the ALB and Target Groups will reside"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for the internet-facing ALB"
}

variable "alb_security_group_id" {
  type        = string
  description = "Security Group ID allowing inbound HTTPS (443) traffic"
}

variable "certificate_arn" {
  type        = string
  description = "ACM Certificate ARN for HTTPS listener"
}
```

#### Example: `modules/cdn/main.tf` (ALB & Path Routing Rules)
```hcl
# Internet-facing Application Load Balancer
resource "aws_lb" "main" {
  name               = "sunotal-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  tags = {
    Name = "sunotal-alb"
  }
}

# Target Group for Auth Microservice
resource "aws_lb_target_group" "auth" {
  name        = "sunotal-auth-tg"
  port        = 5001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/healthz"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}

# Path-based Listener Rule
resource "aws_lb_listener_rule" "auth" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.auth.arn
  }

  condition {
    path_pattern {
      values = ["/api/auth", "/api/auth/*", "/api/healthz"]
    }
  }
}
```

#### Example: `modules/cdn/outputs.tf`
```hcl
output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "Public DNS name of the Application Load Balancer"
}

output "auth_target_group_arn" {
  value       = aws_lb_target_group.auth.arn
  description = "ARN of the Auth Target Group for ECS service binding"
}
```

---

### 2. Instantiating Modules in Root `main.tf`

The root module connects outputs from one module as inputs to another.

```hcl
module "vpc" {
  source             = "./modules/vpc"
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "security" {
  source = "./modules/security"
  vpc_id = module.vpc.vpc_id
}

module "cdn" {
  source                = "./modules/cdn"
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.security.alb_security_group_id
  certificate_arn       = var.certificate_arn
  s3_bucket_name        = var.s3_bucket_name
  aws_region            = var.aws_region
}

module "ecs" {
  source                 = "./modules/ecs"
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_id  = module.security.ecs_security_group_id
  auth_target_group_arn  = module.cdn.auth_target_group_arn
  ops_target_group_arn   = module.cdn.ops_target_group_arn
  inv_target_group_arn   = module.cdn.inv_target_group_arn
  user_target_group_arn  = module.cdn.user_target_group_arn
  front_target_group_arn = module.cdn.front_target_group_arn
  database_url           = module.database.database_url
  s3_bucket_name         = var.s3_bucket_name
  cloudfront_domain      = module.cdn.cloudfront_domain
}
```

---

## Part 4: Best Practices for Writing Terraform

1. **Explicit Resource Dependencies:** Pass module outputs as inputs to enforce correct creation and destruction ordering automatically.
2. **Path Pattern Boundaries in ALBs:** Always include trailing wildcards (e.g. `/api/product-definitions*`) to cover both root and sub-resource routes (`/api/product-definitions/42`).
3. **Target Type `ip` for Fargate:** When using ECS with `awsvpc` network mode on Fargate, target groups MUST have `target_type = "ip"`.
4. **Stateless Rolling Deployments:** Set `lifecycle { ignore_changes = [task_definition] }` on ECS services if CI/CD updates task definitions independently of Terraform.
