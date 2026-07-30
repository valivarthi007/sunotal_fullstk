variable "vpc_id" {
  type        = string
  description = "VPC ID where security groups will be created"
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed for SSH access to Bastion"
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to security groups"
  default     = {}
}
