terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.89.0"
    }
  }
}

variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_security_group_id" { type = string }
variable "tags" { type = map(string) }

variable "db_name" {
  type    = string
  default = "sunotal"
}

variable "db_username" {
  type    = string
  default = "sunotal_admin"
}

variable "db_password" {
  type      = string
  default   = "SunotalPostgres2026SecurePass!"
  sensitive = true
}

# ─── 1. DB Subnet Group ───────────────────────────────────────────────────────
resource "aws_db_subnet_group" "rds" {
  name       = "sunotal-rds-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, { Name = "sunotal-rds-subnet-group" })
}

# ─── 2. AWS RDS PostgreSQL Instance (Free Tier Eligible) ─────────────────────
resource "aws_db_instance" "postgres" {
  identifier             = "sunotal-postgres-db"
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_type           = "gp3"
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.t4g.micro"
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [var.db_security_group_id]
  publicly_accessible    = false
  skip_final_snapshot    = true
  deletion_protection    = false

  tags = merge(var.tags, { Name = "sunotal-postgres-db" })
}

# ─── 3. Outputs ───────────────────────────────────────────────────────────────
output "rds_endpoint" {
  description = "AWS RDS PostgreSQL Connection Endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "database_url" {
  description = "Full PostgreSQL Connection URL"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}"
  sensitive   = true
}
