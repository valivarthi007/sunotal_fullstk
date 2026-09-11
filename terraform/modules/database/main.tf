resource "aws_db_subnet_group" "main" {
  name       = "sunotal-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "sunotal-db-subnet-group"
  })
}

resource "aws_db_instance" "postgres" {
  identifier             = var.identifier
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = var.max_allocated_storage
  storage_type           = "gp3"
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = var.instance_class
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.db_security_group_id]
  skip_final_snapshot    = true
  publicly_accessible    = false

  tags = merge(var.tags, {
    Name = var.identifier
  })
}

resource "aws_docdb_subnet_group" "main" {
  name       = "sunotal-docdb-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "sunotal-docdb-subnet-group"
  })
}

resource "aws_docdb_cluster" "docdb" {
  cluster_identifier      = "sunotal-docdb-cluster"
  engine                  = "docdb"
  master_username         = var.db_username
  master_password         = var.db_password
  db_subnet_group_name    = aws_docdb_subnet_group.main.name
  vpc_security_group_ids  = [var.db_security_group_id]
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = merge(var.tags, {
    Name = "sunotal-docdb-cluster"
  })
}

resource "aws_docdb_cluster_instance" "docdb_instances" {
  count              = 1
  identifier         = "sunotal-docdb-instance-1"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = var.docdb_instance_class

  tags = merge(var.tags, {
    Name = "sunotal-docdb-instance-1"
  })
}
