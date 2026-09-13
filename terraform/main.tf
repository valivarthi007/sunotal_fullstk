terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.89.0"
    }
  }

  backend "s3" {
    bucket         = "jcs-raju-sunotal-final"
    key            = "state/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "sunotal-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = {
    Project     = "sunotal"
    Environment = "production"
    ManagedBy   = "terraform"
    Owner       = "devops-team"
  }
}

# AWS Amplify Module (Zero Operational Overhead Web & Subdomain PaaS)
module "amplify" {
  source              = "./modules/amplify"
  app_name            = "sunotal-grocery-app"
  domain_name         = "automateuniverse.space"
  repository          = "https://github.com/valivarthi007/sunotal_fullstk"
  github_access_token = var.github_access_token
  tags                = local.common_tags
}

# AWS EC2 Backend Compute Module (Free Tier t2.micro Node.js + MongoDB + Redis)
module "compute" {
  source        = "./modules/compute"
  aws_region    = var.aws_region
  ami_id        = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name
  tags          = local.common_tags
}

