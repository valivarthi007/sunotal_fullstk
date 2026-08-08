output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "ID of ALB security group"
}

output "bastion_security_group_id" {
  value       = aws_security_group.bastion.id
  description = "ID of Bastion security group"
}

output "web_security_group_id" {
  value       = aws_security_group.web.id
  description = "ID of Web security group"
}

output "db_security_group_id" {
  value       = aws_security_group.db.id
  description = "ID of Database security group"
}

output "ecs_security_group_id" {
  value       = aws_security_group.ecs.id
  description = "ID of ECS Fargate security group"
}
