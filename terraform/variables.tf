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
  default     = "t3.small"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances"
  type        = string
  default     = "ami-09afda054f620959a"
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
