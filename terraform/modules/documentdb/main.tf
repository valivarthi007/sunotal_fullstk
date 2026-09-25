variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_security_group_id" { type = string }
variable "tags" { type = map(string) }

variable "enable_docdb" {
  description = "Enable AWS DocumentDB cluster creation (disabled by default due to AWS Free Tier restriction)"
  type        = bool
  default     = false
}

variable "mongodb_atlas_project_id" {
  description = "MongoDB Atlas Project ID for automated M0 cluster creation"
  type        = string
  default     = ""
}

variable "mongodb_atlas_connection_string" {
  description = "MongoDB Atlas connection URI string"
  type        = string
  default     = "mongodb+srv://sunotal_admin:SunotalAtlas2026Pass@sunotal-cluster.mongodb.net/sunotal?retryWrites=true&w=majority"
}

# ─── 1. Optional AWS DocumentDB (Disabled by default for Free Tier) ───────────
resource "aws_docdb_subnet_group" "docdb" {
  count      = var.enable_docdb ? 1 : 0
  name       = "sunotal-docdb-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, { Name = "sunotal-docdb-subnet-group" })
}

resource "aws_docdb_cluster" "docdb" {
  count                  = var.enable_docdb ? 1 : 0
  cluster_identifier     = "sunotal-docdb-cluster"
  engine                 = "docdb"
  master_username        = "sunotal_admin"
  master_password        = "SunotalDocDB2026SecurePass!"
  db_subnet_group_name   = aws_docdb_subnet_group.docdb[0].name
  vpc_security_group_ids = [var.db_security_group_id]
  skip_final_snapshot    = true
  deletion_protection    = false

  tags = merge(var.tags, { Name = "sunotal-docdb-cluster" })
}

resource "aws_docdb_cluster_instance" "docdb_instance" {
  count              = var.enable_docdb ? 1 : 0
  identifier         = "sunotal-docdb-instance-1"
  cluster_identifier = aws_docdb_cluster.docdb[0].id
  instance_class     = "db.t3.medium"

  tags = merge(var.tags, { Name = "sunotal-docdb-instance-1" })
}

# ─── 2. Outputs ───────────────────────────────────────────────────────────────
output "endpoint" {
  description = "MongoDB Connection Endpoint (Atlas or DocumentDB)"
  value       = var.enable_docdb ? try("mongodb://${aws_docdb_cluster.docdb[0].master_username}:${aws_docdb_cluster.docdb[0].master_password}@${aws_docdb_cluster.docdb[0].endpoint}:27017/sunotal?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false", "") : var.mongodb_atlas_connection_string
}
