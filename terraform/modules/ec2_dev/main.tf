terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.89.0"
    }
  }
}

variable "vpc_id" { type = string }
variable "public_subnet_id" { type = string }
variable "security_group_id" { type = string }
variable "key_name" {
  type    = string
  default = "jcs_raju_laptop"
}
variable "tags" { type = map(string) }

resource "aws_instance" "sunotal_single_ec2" {
  ami                    = "ami-0c7217cdde317cfec" # Amazon Linux 2023 AMI
  instance_type          = "t3.medium"
  key_name               = var.key_name
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [var.security_group_id]

  user_data = file("${path.module}/../../user_data_dev.sh")

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = merge(var.tags, {
    Name        = "sunotal-single-ec2-dev"
    Environment = "local_dev"
    CostTarget  = "$30/month"
  })
}

output "instance_id" {
  value = aws_instance.sunotal_single_ec2.id
}

output "public_ip" {
  value = aws_instance.sunotal_single_ec2.public_ip
}

output "public_dns" {
  value = aws_instance.sunotal_single_ec2.public_dns
}
