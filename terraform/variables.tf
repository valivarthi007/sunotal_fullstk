variable "aws_region" {
  description = "AWS region where the infrastructure will be created"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Existing EC2 key pair name for SSH access"
  type        = string
  default     = "jcs_raju_laptop"
}

variable "public_key" {
  description = "Public SSH key to automatically create a key pair"
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.10.0.0/16"
}

variable "public_subnet_1_cidr" {
  description = "CIDR block for public subnet 1 (AZ a)"
  type        = string
  default     = "10.10.1.0/24"
}

variable "public_subnet_2_cidr" {
  description = "CIDR block for public subnet 2 (AZ b)"
  type        = string
  default     = "10.10.2.0/24"
}

variable "private_subnet_1_cidr" {
  description = "CIDR block for private subnet 1 (AZ a)"
  type        = string
  default     = "10.10.10.0/24"
}

variable "private_subnet_2_cidr" {
  description = "CIDR block for private subnet 2 (AZ b)"
  type        = string
  default     = "10.10.20.0/24"
}

variable "bastion_instance_type" {
  description = "EC2 instance size for the Bastion Host"
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS Database Instance Class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "PostgreSQL Database Name"
  type        = string
  default     = "sunotal"
}

variable "db_username" {
  description = "PostgreSQL Database Admin Username"
  type        = string
  default     = "sunotal"
}

variable "db_password" {
  description = "PostgreSQL Database Admin Password"
  type        = string
  sensitive   = true
  default     = "sunotalpass123"
}

variable "allowed_cidr_blocks" {
  description = "CIDR ranges allowed to access the instance"
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

