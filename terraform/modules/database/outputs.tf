output "db_instance_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "Connection endpoint for PostgreSQL DB"
}

output "db_instance_address" {
  value       = aws_db_instance.postgres.address
  description = "Database hostname address"
}

output "db_instance_id" {
  value       = aws_db_instance.postgres.id
  description = "DB Instance ID"
}
