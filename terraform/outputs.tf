output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.web.id
}

output "public_ip" {
  description = "Public IP address of the frontend host"
  value       = aws_eip.web.public_ip
}

output "public_dns" {
  description = "Public DNS name of the frontend host"
  value       = aws_instance.web.public_dns
}
