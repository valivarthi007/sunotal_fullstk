data "aws_ami" "ubuntu" {
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

resource "aws_security_group" "test_server" {
  name        = "sunotal-test-server-sg"
  description = "Security group for Test Server instance"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  # Ingress for testing services/reports if any
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "sunotal-test-server-sg"
  })
}

resource "aws_instance" "test_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.micro" # Satisfies Free Tier constraints
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [aws_security_group.test_server.id]
  associate_public_ip_address = true
  key_name                    = var.key_name

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io git curl
              systemctl start docker
              systemctl enable docker
              
              # Install Node.js 20 & pnpm
              curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
              apt-get install -y nodejs
              npm install -g pnpm
              
              # Install Trivy for OWASP scanning
              apt-get install -y wget apt-transport-https gnupg lsb-release
              wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | tee /usr/share/keyrings/trivy.gpg > /dev/null
              echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | tee /etc/apt/sources.list.d/trivy.list
              apt-get update
              apt-get install -y trivy
              EOF

  tags = merge(var.tags, {
    Name = "sunotal-test-server"
  })
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_id" {
  type        = string
  description = "Public subnet ID to deploy Test Server"
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "Allowed CIDR blocks for accessing Test Server"
}

variable "key_name" {
  type        = string
  description = "Key pair name"
}

variable "tags" {
  type        = map(string)
  description = "Common resource tags"
}

output "test_server_public_ip" {
  value = aws_instance.test_server.public_ip
}
