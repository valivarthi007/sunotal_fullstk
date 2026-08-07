output "instance_id" {
  description = "Application EC2 instance ID"
  value       = module.compute.web_instance_id
}

output "private_ip" {
  description = "Private IP address of the application EC2 host"
  value       = module.compute.web_private_ip
}

output "bastion_public_ip" {
  description = "Public IP address of the Bastion / Jump Host"
  value       = module.compute.bastion_public_ip
}

output "alb_dns_name" {
  description = "Public DNS Endpoint of the Application Load Balancer"
  value       = module.cdn.alb_dns_name
}

output "db_endpoint" {
  description = "Connection endpoint address for the RDS PostgreSQL database"
  value       = module.database.db_instance_address
}

output "db_port" {
  description = "Port number of the RDS PostgreSQL database"
  value       = 5432
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution for S3 assets"
  value       = module.cdn.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.cdn.cloudfront_distribution_id
}

output "ecr_frontend_url" {
  description = "ECR Repository URL for frontend"
  value       = module.ecr.frontend_repository_url
}

output "ecr_auth_url" {
  description = "ECR Repository URL for auth service"
  value       = module.ecr.auth_repository_url
}

output "ecr_operations_url" {
  description = "ECR Repository URL for operations service"
  value       = module.ecr.operations_repository_url
}

output "ecr_inventory_url" {
  description = "ECR Repository URL for inventory service"
  value       = module.ecr.inventory_repository_url
}

output "ecr_user_url" {
  description = "ECR Repository URL for user service"
  value       = module.ecr.user_repository_url
}

output "sonarqube_public_ip" {
  description = "Public IP address of the SonarQube server"
  value       = module.sonarqube.sonarqube_public_ip
}

output "test_server_public_ip" {
  description = "Public IP address of the Test Server"
  value       = module.test_server.test_server_public_ip
}

