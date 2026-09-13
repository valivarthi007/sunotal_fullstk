output "amplify_app_id" {
  description = "AWS Amplify Application ID"
  value       = module.amplify.app_id
}

output "amplify_default_domain" {
  description = "AWS Amplify Default Domain Name"
  value       = module.amplify.default_domain
}

output "backend_public_ip" {
  description = "Backend Elastic IP address"
  value       = module.compute.public_ip
}

output "backend_instance_id" {
  description = "Backend EC2 instance ID"
  value       = module.compute.instance_id
}

