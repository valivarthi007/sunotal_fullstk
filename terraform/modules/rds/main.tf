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
  tags       = merge(var.tags, { Name = "sunotal-rds-subnet-group" })
}

# ─── 2. PostgreSQL Parameter Group (Tuned for Node.js microservices) ─────────
resource "aws_db_parameter_group" "postgres" {
  name        = "sunotal-postgres16-params"
  family      = "postgres16"
  description = "Sunotal PostgreSQL 16 parameter group"

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "work_mem"
    value = "4096"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  tags = merge(var.tags, { Name = "sunotal-postgres16-params" })
}

# ─── 3. AWS RDS PostgreSQL Instance ──────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier             = "sunotal-postgres-db"
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_type           = "gp3"
  storage_encrypted      = true
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = "db.t4g.micro"
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  parameter_group_name   = aws_db_parameter_group.postgres.name
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [var.db_security_group_id]
  publicly_accessible    = false
  skip_final_snapshot    = true
  deletion_protection    = false
  apply_immediately      = true

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  performance_insights_enabled = true
  auto_minor_version_upgrade   = true

  tags = merge(var.tags, { Name = "sunotal-postgres-db" })
}

# ─── 4. Outputs ───────────────────────────────────────────────────────────────
output "rds_endpoint" {
  description = "AWS RDS PostgreSQL Connection Endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "database_url" {
  description = "Full PostgreSQL Connection URL"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}?sslmode=require"
  sensitive   = true
}
