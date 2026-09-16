variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_security_group_id" { type = string }
variable "tags" { type = map(string) }

resource "aws_elasticache_subnet_group" "redis" {
  name       = "sunotal-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, { Name = "sunotal-redis-subnet-group" })
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "sunotal-redis-cluster"
  description          = "Sunotal ElastiCache Redis Cluster"
  node_type            = "cache.t3.micro"
  num_cache_clusters   = 1
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [var.db_security_group_id]

  tags = merge(var.tags, { Name = "sunotal-redis-cluster" })
}

output "primary_endpoint_address" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}
