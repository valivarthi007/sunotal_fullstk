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

# AWS Lightsail Module (Large 8 GB RAM, 2 vCPUs, 160 GB SSD)
module "lightsail" {
  source        = "./modules/lightsail"
  aws_region    = var.aws_region
  instance_name = "sunotal-lightsail-host"
  bundle_id     = "large_2_0"
  key_pair_name = var.key_name
  tags          = local.common_tags
}

# Route 53 DNS Configuration pointing all 5 subdomains to Lightsail Static IP
data "aws_route53_zone" "primary" {
  name         = "automateuniverse.space"
  private_zone = false
}

resource "aws_route53_record" "sunotal_main" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "sunotal.automateuniverse.space"
  type            = "A"
  ttl             = 300
  records         = [module.lightsail.static_ip]
  allow_overwrite = true
}

resource "aws_route53_record" "sunotal_vendor" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "vendor-sunotal.automateuniverse.space"
  type            = "A"
  ttl             = 300
  records         = [module.lightsail.static_ip]
  allow_overwrite = true
}

resource "aws_route53_record" "sunotal_admin" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "admin-sunotal.automateuniverse.space"
  type            = "A"
  ttl             = 300
  records         = [module.lightsail.static_ip]
  allow_overwrite = true
}

resource "aws_route53_record" "sunotal_delivery" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "delivery-sunotal.automateuniverse.space"
  type            = "A"
  ttl             = 300
  records         = [module.lightsail.static_ip]
  allow_overwrite = true
}

resource "aws_route53_record" "sunotal_support" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "support-sunotal.automateuniverse.space"
  type            = "A"
  ttl             = 300
  records         = [module.lightsail.static_ip]
  allow_overwrite = true
}
