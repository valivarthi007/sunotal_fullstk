################################################################################
# Sunotal Quick-Commerce Microservices Cluster — Root Terraform Configuration
# Infrastructure Stack: VPC, Security Groups, ECR, ACM SSL (HTTPS 443), ALB,
#                        ECS Fargate Cluster, DocumentDB, ElastiCache Redis,
#                        S3 + CloudFront, Lambda, SQS/SNS, Route53 A-Alias DNS
################################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.89.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.14.0"
    }
  }


  backend "s3" {
    bucket         = "jcs-raju-sunotal-tfstate"
    key            = "state/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "sunotal-terraform-locks"
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
  source     = "./modules/vpc"
  aws_region = var.aws_region
  tags       = local.common_tags
}

# ─── 2. Security Groups ───────────────────────────────────────────────────────
module "security" {
  source = "./modules/security"
  vpc_id = module.vpc.vpc_id
  tags   = local.common_tags
}

# ─── 3. ECR Repositories ──────────────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"
  tags   = local.common_tags
}

# ─── 4. ACM SSL Certificate & Application Load Balancer ───────────────────────
module "acm_alb" {
  source                = "./modules/acm_alb"
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.security.alb_security_group_id
  tags                  = local.common_tags
}

# ─── 5. ECS Fargate Cluster & Services ────────────────────────────────────────
module "ecs" {
  source                = "./modules/ecs"
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  public_subnet_ids     = module.vpc.public_subnet_ids
  ecs_security_group_id = module.security.ecs_security_group_id
  target_group_arns     = module.acm_alb.target_group_arns
  alb_listener_arn      = module.acm_alb.alb_listener_arn
  aws_region            = var.aws_region
  database_url          = module.rds.database_url
  tags                  = local.common_tags
}


# ─── 6. AWS RDS PostgreSQL Database ───────────────────────────────────────────
module "rds" {
  source               = "./modules/rds"
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  db_security_group_id = module.security.db_security_group_id
  tags                 = local.common_tags
}


# ─── 7. ElastiCache Redis Cluster ─────────────────────────────────────────────
module "elasticache" {
  source               = "./modules/elasticache"
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  db_security_group_id = module.security.db_security_group_id
  tags                 = local.common_tags
}

# ─── 8. S3 Bucket & CloudFront CDN ────────────────────────────────────────────
module "s3_cloudfront" {
  source                  = "./modules/s3_cloudfront"
  s3_bucket_name          = var.s3_bucket_name
  enable_cloudfront       = var.enable_cloudfront
  enable_s3_public_policy = var.enable_s3_public_policy
  tags                    = local.common_tags
}


# ─── 9. Lambda Photo Manager ──────────────────────────────────────────────────
module "lambda" {
  source = "./modules/lambda"
  tags   = local.common_tags
}

# ─── 10. SQS Queues & SNS Event Bus ───────────────────────────────────────────
module "sqs_sns" {
  source = "./modules/sqs_sns"
  tags   = local.common_tags
}

# ─── 11. Route53 Subdomain A-Alias Records ────────────────────────────────────
module "route53" {
  source           = "./modules/route53"
  alb_dns_name     = module.acm_alb.alb_dns_name
  alb_zone_id      = module.acm_alb.alb_zone_id
  s3_bucket_domain = module.s3_cloudfront.cloudfront_domain
  tags             = local.common_tags
}

