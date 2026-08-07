data "aws_ami" "ubuntu_bastion" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "deployer" {
  count      = (var.key_name == null || var.key_name == "") && var.public_key != "" ? 1 : 0
  key_name   = "sunotal-deployer-key"
  public_key = var.public_key
}

resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.ubuntu_bastion.id
  instance_type               = var.bastion_instance_type
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [var.bastion_security_group_id]
  associate_public_ip_address = true
  key_name                    = var.key_name != null && var.key_name != "" ? var.key_name : (length(aws_key_pair.deployer) > 0 ? aws_key_pair.deployer[0].key_name : null)

  tags = merge(var.tags, {
    Name = "sunotal-bastion"
  })
}

resource "aws_instance" "web" {
  ami                         = data.aws_ami.ubuntu_bastion.id
  instance_type               = var.instance_type
  subnet_id                   = var.private_subnet_id
  vpc_security_group_ids      = [var.web_security_group_id]
  associate_public_ip_address = false
  key_name                    = var.key_name != null && var.key_name != "" ? var.key_name : (length(aws_key_pair.deployer) > 0 ? aws_key_pair.deployer[0].key_name : null)
  iam_instance_profile        = var.iam_instance_profile_name

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io git curl awscli
              systemctl start docker
              systemctl enable docker
              
              # Allow ubuntu user to run Docker commands
              usermod -aG docker ubuntu
              EOF

  tags = merge(var.tags, {
    Name = "sunotal-frontend"
  })
}
