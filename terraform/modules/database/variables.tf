variable "identifier" {
  type        = string
  description = "DB Instance Identifier"
  default     = "sunotal-postgres"
}

variable "allocated_storage" {
  type        = number
  description = "Allocated storage in GB"
  default     = 20
}

variable "max_allocated_storage" {
  type        = number
  description = "Max storage scaling in GB"
  default     = 100
}

variable "instance_class" {
  type        = string
  description = "RDS DB instance class"
  default     = "db.t4g.micro"
}

variable "db_name" {
  type        = string
  description = "Database name"
  default     = "sunotal"
}

variable "db_username" {
  type        = string
  description = "Master database username"
  default     = "sunotal"
}

variable "db_password" {
  type        = string
  description = "Master database password"
  sensitive   = true
  default     = "sunotalpass123"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for database subnet group"
}

variable "db_security_group_id" {
  type        = string
  description = "Database security group ID"
}

variable "tags" {
  type        = map(string)
  description = "Tags for database resources"
  default     = {}
}
