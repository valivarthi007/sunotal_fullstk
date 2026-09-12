output "lightsail_static_ip" {
  description = "Static Public IP of the Lightsail host"
  value       = module.lightsail.static_ip
}

output "lightsail_instance_name" {
  description = "Lightsail instance name"
  value       = module.lightsail.instance_name
}

output "lightsail_arn" {
  description = "Lightsail instance ARN"
  value       = module.lightsail.arn
}
