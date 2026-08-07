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

module "lambda" {
  source         = "./modules/lambda"
  s3_bucket_name = var.s3_bucket_name
  tags           = local.common_tags
}

module "iam" {
  source                = "./modules/iam"
  s3_bucket_name        = var.s3_bucket_name
  role_name             = "sunotal-ec2-s3-access-role"
  policy_name           = "sunotal-s3-access-policy"
  instance_profile_name = "sunotal-ec2-instance-profile"
  lambda_arn            = module.lambda.lambda_arn
  tags                  = local.common_tags
}

module "vpc" {
  source                = "./modules/vpc"
  aws_region            = var.aws_region
  vpc_name              = "sunotal-vpc"
  vpc_cidr              = var.vpc_cidr
  public_subnet_1_cidr  = var.public_subnet_1_cidr
  public_subnet_2_cidr  = var.public_subnet_2_cidr
  private_subnet_1_cidr = var.private_subnet_1_cidr
  private_subnet_2_cidr = var.private_subnet_2_cidr
  tags                  = local.common_tags
}

module "security" {
  source              = "./modules/security"
  vpc_id              = module.vpc.vpc_id
  allowed_cidr_blocks = var.allowed_cidr_blocks
  tags                = local.common_tags
}

module "compute" {
  source                    = "./modules/compute"
  instance_type             = var.instance_type
  bastion_instance_type     = var.bastion_instance_type
  public_subnet_id          = module.vpc.public_subnet_1_id
  private_subnet_id         = module.vpc.private_subnet_1_id
  bastion_security_group_id = module.security.bastion_security_group_id
  web_security_group_id     = module.security.web_security_group_id
  key_name                  = var.key_name
  public_key                = var.public_key
  iam_instance_profile_name = module.iam.instance_profile_name
  tags                      = local.common_tags
}

module "database" {
  source                = "./modules/database"
  identifier            = "sunotal-postgres"
  allocated_storage     = 20
  max_allocated_storage = 100
  instance_class        = var.db_instance_class
  db_name               = var.db_name
  db_username           = var.db_username
  db_password           = var.db_password
  subnet_ids            = [module.vpc.private_subnet_1_id, module.vpc.private_subnet_2_id]
  db_security_group_id  = module.security.db_security_group_id
  tags                  = local.common_tags
}

module "cdn" {
  source                = "./modules/cdn"
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = [module.vpc.public_subnet_1_id, module.vpc.public_subnet_2_id]
  alb_security_group_id = module.security.alb_security_group_id
  web_instance_id       = module.compute.web_instance_id
  s3_bucket_name        = var.s3_bucket_name
  tags                  = local.common_tags
}

module "ecr" {
  source = "./modules/ecr"
  tags   = local.common_tags
}

module "sonarqube" {
  source              = "./modules/sonarqube"
  vpc_id              = module.vpc.vpc_id
  public_subnet_id    = module.vpc.public_subnet_2_id
  allowed_cidr_blocks = var.allowed_cidr_blocks
  key_name            = var.key_name
  tags                = local.common_tags
}

module "test_server" {
  source              = "./modules/test_server"
  vpc_id              = module.vpc.vpc_id
  public_subnet_id    = module.vpc.public_subnet_1_id
  allowed_cidr_blocks = var.allowed_cidr_blocks
  key_name            = var.key_name
  tags                = local.common_tags
}

