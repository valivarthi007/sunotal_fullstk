variable "aws_region" {
  description = "AWS region where the infrastructure will be created"
  type        = string
  default     = "us-east-1"
}

variable "github_access_token" {
  description = "Optional GitHub Personal Access Token for AWS Amplify App repository integration"
  type        = string
  default     = ""
  sensitive   = true
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "c7i-flex.large"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (leave empty for automatic latest Amazon Linux 2023)"
  type        = string
  default     = ""
}

variable "key_name" {
  description = "Existing EC2 key pair name for SSH access"
  type        = string
  default     = "jcs_raju_laptop"
}

variable "allowed_cidr_blocks" {
  description = "CIDR ranges allowed to access the infrastructure"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for remote state and build artifacts"
  type        = string
  default     = "jcs-raju-sunotal-final"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for Terraform state locking"
  type        = string
  default     = "sunotal-terraform-locks"
}

variable "jwt_secret" {
  description = "JWT secret for microservices authentication"
  type        = string
  default     = "sunotal-production-jwt-secret-2026"
  sensitive   = true
}

variable "mongodb_uri" {
  description = "MongoDB connection URI (MongoDB Atlas or AWS DocumentDB)"
  type        = string
  default     = "mongodb+srv://sunotal_admin:SunotalAtlas2026Pass@sunotal-cluster.mongodb.net/sunotal?retryWrites=true&w=majority"
  sensitive   = true
}

variable "mongodb_atlas_project_id" {
  description = "Optional MongoDB Atlas Project ID"
  type        = string
  default     = ""
}

variable "enable_docdb" {
  description = "Enable AWS DocumentDB cluster creation (disabled by default for Free Tier compatibility)"
  type        = bool
  default     = false
}

variable "enable_cloudfront" {
  description = "Enable AWS CloudFront distribution for S3 bucket assets (set to false if account is unverified for CloudFront)"
  type        = bool
  default     = false
}

variable "enable_s3_public_policy" {
  description = "Attach public read policy to S3 bucket (requires Account-level S3 Block Public Access to be disabled)"
  type        = bool
  default     = false
}

variable "dev_mode" {
  description = "Enable Free Trial / Cost-Optimization Dev Mode (runs single EC2 t3.medium with docker-compose instead of ECS Fargate)"
  type        = bool
  default     = true
}

variable "use_ec2_single_instance" {
  description = "Deploy all 11 containers on a single t3.medium EC2 instance ($30/month) for free trial period"
  type        = bool
  default     = true
}





