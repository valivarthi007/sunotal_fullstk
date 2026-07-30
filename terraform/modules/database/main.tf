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
