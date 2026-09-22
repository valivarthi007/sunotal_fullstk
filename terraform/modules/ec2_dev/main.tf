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
variable "instance_type" {
  type    = string
  default = "c7i-flex.large"
}
variable "ami_id" {
  type    = string
  default = ""
}
variable "tags" { type = map(string) }

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "sunotal_single_ec2" {
  ami                    = var.ami_id != "" ? var.ami_id : data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
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
    CostTarget  = "c4.large"
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
