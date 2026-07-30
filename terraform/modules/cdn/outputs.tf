output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "Public DNS name of the Application Load Balancer"
}

output "alb_arn" {
  value       = aws_lb.main.arn
  description = "ARN of the Application Load Balancer"
}

output "target_group_arn" {
  value       = aws_lb_target_group.app.arn
  description = "ARN of ALB target group"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.s3_cdn.domain_name
  description = "CloudFront CDN domain name"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.s3_cdn.id
  description = "CloudFront Distribution ID"
}
