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

# AWS EC2 Backend Compute Module
module "compute" {
  source        = "./modules/compute"
  aws_region    = var.aws_region
  ami_id        = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name
  tags          = local.common_tags
}

# CDN & Application Load Balancer Module (AWS ACM HTTPS SSL Termination & HTTP 301 Redirect)
module "cdn" {
  source                = "./modules/cdn"
  aws_region            = var.aws_region
  vpc_id                = module.compute.security_group_id != "" ? "vpc-default" : ""
  public_subnet_ids     = []
  alb_security_group_id = module.compute.security_group_id
  s3_bucket_name        = var.s3_bucket_name
  tags                  = local.common_tags
}
