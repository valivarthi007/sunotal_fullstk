variable "aws_region" {
  type        = string
  description = "AWS Region"
  default     = "us-east-1"
}

variable "vpc_name" {
  type        = string
  description = "VPC Name"
  default     = "sunotal-vpc"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.10.0.0/16"
}

variable "public_subnet_1_cidr" {
  type        = string
  description = "CIDR block for Public Subnet 1"
  default     = "10.10.1.0/24"
}

variable "public_subnet_2_cidr" {
  type        = string
  description = "CIDR block for Public Subnet 2"
  default     = "10.10.2.0/24"
}

variable "private_subnet_1_cidr" {
  type        = string
  description = "CIDR block for Private Subnet 1"
  default     = "10.10.10.0/24"
}

variable "private_subnet_2_cidr" {
  type        = string
  description = "CIDR block for Private Subnet 2"
  default     = "10.10.20.0/24"
}

variable "tags" {
  type        = map(string)
  description = "Tags for VPC resources"
  default     = {}
}
