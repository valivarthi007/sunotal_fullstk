output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.acm_alb.alb_dns_name
}

output "rds_endpoint" {
  description = "AWS RDS PostgreSQL database endpoint"
  value       = module.rds.rds_endpoint
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
