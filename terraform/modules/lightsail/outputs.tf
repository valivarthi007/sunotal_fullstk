output "static_ip" {
  value       = aws_lightsail_static_ip.sunotal.ip_address
  description = "Static Public IP of the Lightsail host"
}

output "instance_name" {
  value       = aws_lightsail_instance.sunotal.name
  description = "Lightsail instance name"
}

output "arn" {
  value       = aws_lightsail_instance.sunotal.arn
  description = "Lightsail instance ARN"
}
