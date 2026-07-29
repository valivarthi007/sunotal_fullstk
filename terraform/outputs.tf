output "instance_id" {
  description = "Application EC2 instance ID"
  value       = aws_instance.web.id
}

output "private_ip" {
  description = "Private IP address of the application EC2 host"
  value       = aws_instance.web.private_ip
}

output "bastion_public_ip" {
  description = "Public IP address of the Bastion / Jump Host"
  value       = aws_instance.bastion.public_ip
}

output "alb_dns_name" {
  description = "Public DNS Endpoint of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "db_endpoint" {
  description = "Connection endpoint address for the RDS PostgreSQL database"
  value       = aws_db_instance.postgres.address
}

output "db_port" {
  description = "Port number of the RDS PostgreSQL database"
  value       = aws_db_instance.postgres.port
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution for S3 assets"
  value       = aws_cloudfront_distribution.s3_cdn.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.s3_cdn.id
}



