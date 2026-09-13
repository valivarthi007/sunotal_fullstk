output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.backend.id
}

output "public_ip" {
  description = "Elastic IP address of the backend server"
  value       = aws_eip.backend.public_ip
}

output "public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.backend.public_dns
}

output "security_group_id" {
  description = "Backend security group ID"
  value       = aws_security_group.backend.id
}

output "iam_role_arn" {
  description = "IAM role ARN for the EC2 instance"
  value       = aws_iam_role.ec2_backend.arn
}
