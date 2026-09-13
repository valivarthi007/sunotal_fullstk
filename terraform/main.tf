################################################################################
# Sunotal Platform — Root Terraform Configuration
# Manages: EC2 compute, Route53 DNS, ECR registries, IAM roles
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
    bucket = "jcs-raju-sunotal-final"
    key    = "state/terraform.tfstate"
    region = "us-east-1"
    # use_lockfile replaces deprecated dynamodb_table (Terraform >= 1.10)
    # For Terraform < 1.10: comment out use_lockfile and use dynamodb_table instead
    # dynamodb_table = "sunotal-terraform-locks"
    use_lockfile = true
    encrypt      = true
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

# ─── EC2 Compute Module ───────────────────────────────────────────────────────
# Provisions EC2 instance with Elastic IP, IAM roles, CloudWatch alarms,
# security group, and bootstrap user-data script.

module "compute" {
  source = "./modules/compute"

  aws_region    = var.aws_region
  ami_id        = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  # Security
  allowed_ssh_cidrs = var.allowed_cidr_blocks
  jwt_secret        = var.jwt_secret

  # Storage
  s3_bucket_name = var.s3_bucket_name

  # Application
  repo_url        = "https://github.com/valivarthi007/sunotal_fullstk.git"
  frontend_origin = "https://sunotal.automateuniverse.space"
  mongodb_uri     = "mongodb://127.0.0.1:27017/sunotal"

  tags = local.common_tags
}

# ─── ECR Repositories ─────────────────────────────────────────────────────────
# Container registries for all microservices and frontend apps.

module "ecr" {
  source = "./modules/ecr"
  tags   = local.common_tags
}

# ─── IAM Roles & GitHub OIDC ─────────────────────────────────────────────────
# GitHub Actions OIDC trust + EC2 S3 access policy.

module "iam" {
  source                = "./modules/iam"
  s3_bucket_name        = var.s3_bucket_name
  role_name             = "sunotal-ec2-s3-access-role"
  policy_name           = "sunotal-s3-access-policy"
  instance_profile_name = "sunotal-ec2-instance-profile"
  github_repo           = "valivarthi007/sunotal_fullstk"
  tags                  = local.common_tags
}

# ─── Route53 DNS Records ──────────────────────────────────────────────────────
# All subdomains point to the EC2 Elastic IP.

data "aws_route53_zone" "primary" {
  name         = "automateuniverse.space."
  private_zone = false
}

resource "aws_route53_record" "sunotal_subdomains" {
  for_each = toset([
    "sunotal",
    "admin",
    "admin-sunotal",
    "vendor",
    "vendor-sunotal",
    "delivery",
    "delivery-sunotal",
    "support",
    "support-sunotal",
    "observability",
    "api"
  ])

  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "${each.key}.automateuniverse.space"
  type    = "A"
  ttl     = 300
  records = [module.compute.public_ip]

  lifecycle {
    # Prevent accidental record deletion if compute module is temporarily removed
    prevent_destroy = false
  }
}
