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

module "sqs_sns" {
  source = "./modules/sqs_sns"
  tags   = local.common_tags
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

module "cdn" {
  source                = "./modules/cdn"
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = [module.vpc.public_subnet_1_id, module.vpc.public_subnet_2_id]
  alb_security_group_id = module.security.alb_security_group_id
  s3_bucket_name        = var.s3_bucket_name
  tags                  = local.common_tags
}

module "database" {
  source               = "./modules/database"
  subnet_ids           = [module.vpc.private_subnet_1_id, module.vpc.private_subnet_2_id]
  db_security_group_id = module.security.db_security_group_id
  db_username          = var.db_username
  db_password          = var.db_password
  db_name              = var.db_name
  docdb_instance_class = var.docdb_instance_class
  tags                 = local.common_tags
}

module "ecr" {
  source = "./modules/ecr"
  tags   = local.common_tags
}

module "ecs" {
  source                = "./modules/ecs"
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = [module.vpc.public_subnet_1_id, module.vpc.public_subnet_2_id]
  ecs_security_group_id = module.security.ecs_security_group_id
  tags                  = local.common_tags

  ecr_frontend_url   = module.ecr.frontend_repository_url
  ecr_auth_url       = module.ecr.auth_repository_url
  ecr_operations_url = module.ecr.operations_repository_url
  ecr_inventory_url  = module.ecr.inventory_repository_url
  ecr_user_url       = module.ecr.user_repository_url
  ecr_delivery_url   = module.ecr.delivery_repository_url
  ecr_support_url    = module.ecr.support_repository_url

  frontend_target_group_arn   = module.cdn.frontend_target_group_arn
  auth_target_group_arn       = module.cdn.auth_target_group_arn
  operations_target_group_arn = module.cdn.operations_target_group_arn
  inventory_target_group_arn  = module.cdn.inventory_target_group_arn
  user_target_group_arn       = module.cdn.user_target_group_arn
  delivery_target_group_arn   = module.cdn.delivery_target_group_arn
  support_target_group_arn    = module.cdn.support_target_group_arn

  mongodb_uri       = var.mongodb_uri != "" ? var.mongodb_uri : module.database.docdb_connection_string
  cloudfront_domain = module.cdn.cloudfront_domain_name

  s3_bucket_name = var.s3_bucket_name
  s3_policy_arn  = module.iam.policy_arn
  frontend_url   = "https://sunotal.automateuniverse.space"
  admin_email    = var.admin_email
  admin_password = var.admin_password

  depends_on = [module.cdn, module.database]
}

# module "sonarqube" {
#   source              = "./modules/sonarqube"
#   vpc_id              = module.vpc.vpc_id
#   public_subnet_id    = module.vpc.public_subnet_2_id
#   allowed_cidr_blocks = var.allowed_cidr_blocks
#   key_name            = var.key_name
#   tags                = local.common_tags
# }

module "test_server" {
  source              = "./modules/test_server"
  vpc_id              = module.vpc.vpc_id
  public_subnet_id    = module.vpc.public_subnet_1_id
  allowed_cidr_blocks = var.allowed_cidr_blocks
  key_name            = var.key_name
  tags                = local.common_tags
}
