variable "instance_type" {
  type        = string
  description = "EC2 instance type for private web server"
  default     = "t3.small"
}

variable "bastion_instance_type" {
  type        = string
  description = "EC2 instance type for Bastion Host"
  default     = "t3.micro"
}

variable "public_subnet_id" {
  type        = string
  description = "Subnet ID for Bastion host"
}

variable "private_subnet_id" {
  type        = string
  description = "Subnet ID for private web server"
}

variable "bastion_security_group_id" {
  type        = string
  description = "Security group ID for Bastion host"
}

variable "web_security_group_id" {
  type        = string
  description = "Security group ID for private web server"
}

variable "key_name" {
  type        = string
  description = "Existing AWS key pair name"
  default     = ""
}

variable "public_key" {
  type        = string
  description = "Public SSH key for deployer key pair"
  default     = ""
}

variable "iam_instance_profile_name" {
  type        = string
  description = "IAM Instance Profile Name for private web server"
}

variable "tags" {
  type        = map(string)
  description = "Tags for compute instances"
  default     = {}
}
