output "amplify_app_id" {
  description = "AWS Amplify Application ID"
  value       = module.amplify.app_id
}

output "amplify_default_domain" {
  description = "AWS Amplify Default Domain Name"
  value       = module.amplify.default_domain
}
