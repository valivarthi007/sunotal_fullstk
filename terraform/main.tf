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



# AWS EC2 Backend Compute Module (Free Tier t2.micro Node.js + MongoDB + Redis)
module "compute" {
  source        = "./modules/compute"
  aws_region    = var.aws_region
  ami_id        = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name
  tags          = local.common_tags
}

# Route53 Hosted Zone lookup for automateuniverse.space
data "aws_route53_zone" "primary" {
  name         = "automateuniverse.space."
  private_zone = false
}

# DNS A Records pointing all Sunotal subdomains to the EC2 Elastic IP
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
    "observability"
  ])

  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "${each.key}.automateuniverse.space"
  type    = "A"
  ttl     = 300
  records = [module.compute.public_ip]
}

