output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "public_subnet_1_id" {
  value       = aws_subnet.public_1.id
  description = "ID of Public Subnet 1"
}

output "public_subnet_2_id" {
  value       = aws_subnet.public_2.id
  description = "ID of Public Subnet 2"
}

output "private_subnet_1_id" {
  value       = aws_subnet.private_1.id
  description = "ID of Private Subnet 1"
}

output "private_subnet_2_id" {
  value       = aws_subnet.private_2.id
  description = "ID of Private Subnet 2"
}


