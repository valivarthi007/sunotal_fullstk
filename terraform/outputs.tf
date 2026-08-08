output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = module.ecs.cluster_name
}

output "ecs_frontend_service" {
  description = "Frontend ECS Service Name"
  value       = module.ecs.frontend_service_name
}

output "ecs_auth_service" {
  description = "Auth ECS Service Name"
  value       = module.ecs.auth_service_name
}

output "ecs_operations_service" {
  description = "Operations ECS Service Name"
  value       = module.ecs.operations_service_name
}

output "ecs_inventory_service" {
  description = "Inventory ECS Service Name"
  value       = module.ecs.inventory_service_name
}

output "ecs_user_service" {
  description = "User ECS Service Name"
  value       = module.ecs.user_service_name
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
