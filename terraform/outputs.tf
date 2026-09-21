output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.acm_alb.alb_dns_name
}

output "rds_endpoint" {
  description = "AWS RDS PostgreSQL database endpoint"
  value       = module.rds.rds_endpoint
}

output "database_url" {
  description = "Full PostgreSQL connection URL (sensitive)"
  value       = module.rds.database_url
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint address"
  value       = module.elasticache.primary_endpoint_address
}

output "cloudfront_domain" {
  description = "CloudFront CDN domain name"
  value       = module.s3_cloudfront.cloudfront_domain
}

output "live_subdomains" {
  description = "Registered live HTTPS subdomains"
  value       = module.route53.registered_subdomains
}

output "ecs_cluster_name" {
  description = "ECS Fargate cluster name"
  value       = module.ecs.cluster_name
}

output "sns_topic_arn" {
  description = "SNS Platform Events topic ARN"
  value       = module.sqs_sns.sns_topic_arn
}

output "sqs_orders_url" {
  description = "SQS Orders queue URL"
  value       = module.sqs_sns.sqs_queue_url
}
