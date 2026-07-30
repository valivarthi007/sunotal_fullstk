output "bastion_instance_id" {
  value       = aws_instance.bastion.id
  description = "Instance ID of Bastion Host"
}

output "bastion_public_ip" {
  value       = aws_instance.bastion.public_ip
  description = "Public IP address of Bastion Host"
}

output "web_instance_id" {
  value       = aws_instance.web.id
  description = "Instance ID of private web server"
}

output "web_private_ip" {
  value       = aws_instance.web.private_ip
  description = "Private IP address of private web server"
}
