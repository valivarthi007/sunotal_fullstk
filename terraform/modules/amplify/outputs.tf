output "app_id" {
  value       = aws_amplify_app.sunotal.id
  description = "AWS Amplify App ID"
}

output "default_domain" {
  value       = aws_amplify_app.sunotal.default_domain
  description = "AWS Amplify Default Domain"
}

output "domain_association_arn" {
  value       = aws_amplify_domain_association.sunotal.arn
  description = "Amplify Domain Association ARN"
}
