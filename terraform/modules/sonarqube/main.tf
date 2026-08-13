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

resource "aws_security_group" "sonarqube" {
  name        = "sunotal-sonarqube-sg"
  description = "Security group for SonarQube instance"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 9000
    to_port     = 9000
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    from_port   = 22
    to_port     = 22
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
    Name = "sunotal-sonarqube-sg"
  })
}

resource "aws_instance" "sonarqube" {
  ami                         = data.aws_ami.ubuntu.id
  # c5.large: 2 vCPU, 4 GB RAM — fully supports SonarQube + Elasticsearch (~$0.085/hr)
  instance_type               = "c5.large"
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [aws_security_group.sonarqube.id]
  associate_public_ip_address = true
  key_name                    = var.key_name

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io
              systemctl start docker
              systemctl enable docker
              # Required for Elasticsearch embedded in SonarQube
              sysctl -w vm.max_map_count=262144
              echo "vm.max_map_count=262144" >> /etc/sysctl.conf
              # Pull and start SonarQube Community Edition
              docker run -d \
                --name sonarqube \
                --restart unless-stopped \
                -p 9000:9000 \
                -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=false \
                -v sonarqube_data:/opt/sonarqube/data \
                -v sonarqube_logs:/opt/sonarqube/logs \
                sonarqube:community
              EOF

  tags = merge(var.tags, {
    Name = "sunotal-sonarqube"
  })

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3" # c5 supports gp3
    delete_on_termination = true
  }
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_id" {
  type        = string
  description = "Public subnet ID to deploy SonarQube"
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "Allowed CIDR blocks for accessing SonarQube"
}

variable "key_name" {
  type        = string
  description = "Key pair name"
}

variable "tags" {
  type        = map(string)
  description = "Common resource tags"
}

output "sonarqube_public_ip" {
  value = aws_instance.sonarqube.public_ip
}
