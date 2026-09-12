variable "aws_region" {
  type        = string
  description = "AWS region for Lightsail deployment"
  default     = "us-east-1"
}

variable "instance_name" {
  type        = string
  description = "Name of the Lightsail instance"
  default     = "sunotal-lightsail-host"
}

variable "bundle_id" {
  type        = string
  description = "Lightsail bundle ID (large_2_0 = 8 GB RAM, 2 vCPUs, 160 GB SSD)"
  default     = "large_2_0"
}

variable "key_pair_name" {
  type        = string
  description = "SSH key pair name"
  default     = "jcs_raju_laptop"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
