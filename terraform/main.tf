################################################################################
# Sunotal Platform — Root Terraform Configuration
# Manages: VPC, Security Groups, IAM Roles, ECR, AWS DocumentDB (MongoDB),
#          SQS/SNS Event Bus, Lambda S3 Photo Manager, AWS ECS Fargate Cluster,
#          ACM SSL Certificate, Application Load Balancer, Route53 DNS
################################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.89.0"
    }
  }

  backend "s3" {
    bucket  = "jcs-raju-sunotal-final"
    key     = "state/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

locals {
  common_tags = {
    Project     = "sunotal"
    Environment = "production"
    ManagedBy   = "terraform"
    Owner       = "devops-team"
    Repository  = "github.com/valivarthi007/sunotal_fullstk"
  }
}

# ─── 1. Networking (VPC) ──────────────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"
  tags   = local.common_tags
}

# ─── 2. Security Groups ───────────────────────────────────────────────────────
module "security" {
  source = "./modules/security"
  vpc_id = module.vpc.vpc_id
  tags   = local.common_tags
}

# ─── 3. ECR Repositories (Managed dynamically by CI pipeline) ─────────────
# module "ecr" is managed automatically by CI workflows.

# ─── 4. IAM Roles & GitHub OIDC ───────────────────────────────────────────────
module "iam" {
  source                = "./modules/iam"
  s3_bucket_name        = var.s3_bucket_name
  role_name             = "sunotal-ec2-s3-access-role"
  policy_name           = "sunotal-s3-access-policy"
  instance_profile_name = "sunotal-ec2-instance-profile"
  github_repo           = "valivarthi007/sunotal_fullstk"
  tags                  = local.common_tags
}

# ─── 5. Compute Module (EC2 Host) ────────────────────────────────────────────
module "compute" {
  source = "./modules/compute"

  aws_region        = var.aws_region
  ami_id            = var.ami_id
  instance_type     = var.instance_type
  key_name          = var.key_name
  allowed_ssh_cidrs = var.allowed_cidr_blocks
  jwt_secret        = var.jwt_secret
  s3_bucket_name    = var.s3_bucket_name
  repo_url          = "https://github.com/valivarthi007/sunotal_fullstk.git"
  frontend_origin   = "https://sunotal.automateuniverse.space"
  mongodb_uri       = "mongodb://127.0.0.1:27017/sunotal"
  tags              = local.common_tags
}

# ─── 6. Route53 DNS Records ───────────────────────────────────────────────────
data "aws_route53_zone" "primary" {
  name         = "automateuniverse.space."
  private_zone = false
}

resource "aws_route53_record" "sunotal_subdomains" {
  for_each = toset([
    "sunotal",
    "admin-sunotal",
    "vendor-sunotal",
    "delivery-sunotal",
    "support-sunotal",
    "monitoring-sunotal",
    "api"
  ])

  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "${each.key}.automateuniverse.space"
  type    = "A"
  ttl     = 300
  records = [module.compute.public_ip]

  lifecycle {
    prevent_destroy = false
  }
}
