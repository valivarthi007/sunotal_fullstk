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

output "docdb_endpoint" {
  value       = aws_docdb_cluster.docdb.endpoint
  description = "Connection endpoint for AWS DocumentDB cluster"
}

output "docdb_connection_string" {
  value       = "mongodb://${var.db_username}:${var.db_password}@${aws_docdb_cluster.docdb.endpoint}:${aws_docdb_cluster.docdb.port}/sunotal?tls=true&tlsAllowInvalidCertificates=true&directConnection=true&retryWrites=false"
  description = "MongoDB connection string for AWS DocumentDB"
}
