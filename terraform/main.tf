terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.89.0"
    }
  }

  backend "s3" {
    bucket         = "jcs-raju-sunotal-final"
    key            = "state/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "sunotal-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name      = "sunotal-terraform-locks"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_iam_role" "ec2_s3_role" {
  name = "sunotal-ec2-s3-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name      = "sunotal-ec2-s3-role"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_iam_policy" "s3_artifacts_policy" {
  name        = "sunotal-s3-artifacts-read-policy"
  description = "Allows EC2 instance to download build artifacts from S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/artifacts/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_s3_attach" {
  role       = aws_iam_role.ec2_s3_role.name
  policy_arn = aws_iam_policy.s3_artifacts_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "sunotal-ec2-instance-profile"
  role = aws_iam_role.ec2_s3_role.name
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name      = "sunotal-vpc"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true
  availability_zone       = data.aws_availability_zones.available.names[0]

  tags = {
    Name      = "sunotal-public-subnet"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name      = "sunotal-igw"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name      = "sunotal-public-rt"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "web" {
  name        = "sunotal-web-sg"
  description = "Allow SSH and web traffic to the Sunotal frontend"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "Backend API"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "sunotal-web-sg"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_key_pair" "deployer" {
  count      = var.public_key != "" ? 1 : 0
  key_name   = "sunotal-deployer-key"
  public_key = var.public_key
}

resource "aws_instance" "web" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.web.id]
  associate_public_ip_address = true
  key_name                    = var.public_key != "" ? aws_key_pair.deployer[0].key_name : var.key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  tags = {
    Name      = "sunotal-frontend"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

