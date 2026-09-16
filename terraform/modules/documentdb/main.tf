variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_security_group_id" { type = string }
variable "tags" { type = map(string) }

resource "aws_docdb_subnet_group" "docdb" {
  name       = "sunotal-docdb-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, { Name = "sunotal-docdb-subnet-group" })
}

resource "aws_docdb_cluster" "docdb" {
  cluster_identifier      = "sunotal-docdb-cluster"
  engine                  = "docdb"
  master_username         = "sunotal_admin"
  master_password         = "SunotalDocDB2026SecurePass!"
  db_subnet_group_name    = aws_docdb_subnet_group.docdb.name
  vpc_security_group_ids  = [var.db_security_group_id]
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = merge(var.tags, { Name = "sunotal-docdb-cluster" })
}

resource "aws_docdb_cluster_instance" "docdb_instance" {
  count              = 1
  identifier         = "sunotal-docdb-instance-1"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = "db.t3.medium"

  tags = merge(var.tags, { Name = "sunotal-docdb-instance-1" })
}

output "endpoint" { value = aws_docdb_cluster.docdb.endpoint }
