output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "Public DNS of ALB"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.s3_cdn.domain_name
  description = "CloudFront Distribution Domain Name"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.s3_cdn.id
  description = "CloudFront Distribution ID"
}

output "frontend_target_group_arn" {
  value       = aws_lb_target_group.frontend.arn
  description = "Frontend Target Group ARN"
}

output "auth_target_group_arn" {
  value       = aws_lb_target_group.auth.arn
  description = "Auth Target Group ARN"
}

output "operations_target_group_arn" {
  value       = aws_lb_target_group.operations.arn
  description = "Operations Target Group ARN"
}

output "inventory_target_group_arn" {
  value       = aws_lb_target_group.inventory.arn
  description = "Inventory Target Group ARN"
}

output "user_target_group_arn" {
  value       = aws_lb_target_group.user.arn
  description = "User Target Group ARN"
}
