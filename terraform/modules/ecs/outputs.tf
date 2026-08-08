output "cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS Cluster Name"
}

output "frontend_service_name" {
  value       = aws_ecs_service.frontend.name
  description = "Frontend ECS Service Name"
}

output "auth_service_name" {
  value       = aws_ecs_service.auth.name
  description = "Auth ECS Service Name"
}

output "operations_service_name" {
  value       = aws_ecs_service.operations.name
  description = "Operations ECS Service Name"
}

output "inventory_service_name" {
  value       = aws_ecs_service.inventory.name
  description = "Inventory ECS Service Name"
}

output "user_service_name" {
  value       = aws_ecs_service.user.name
  description = "User ECS Service Name"
}
