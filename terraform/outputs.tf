

output "backend_public_ip" {
  description = "Backend Elastic IP address"
  value       = module.compute.public_ip
}

output "backend_instance_id" {
  description = "Backend EC2 instance ID"
  value       = module.compute.instance_id
}

