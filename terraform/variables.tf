variable "aws_region" {
  description = "AWS region where the infrastructure will be created"
  type        = string
  default     = "us-east-1"
}

variable "ami_id" {
  description = "AMI ID produced by the Packer build"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Existing EC2 key pair name for SSH access"
  type        = string
  default     = null
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.10.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.10.1.0/24"
}

variable "allowed_cidr_blocks" {
  description = "CIDR ranges allowed to access the instance"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
