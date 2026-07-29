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
  name        = "sunotal-s3-access-policy"
  description = "Allows EC2 instance to read and write build artifacts and product assets in S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_s3_attach" {
  role       = aws_iam_role.ec2_s3_role.name
  policy_arn = aws_iam_policy.s3_artifacts_policy.arn
}

resource "aws_iam_role_policy_attachment" "ec2_ssm_attach" {
  role       = aws_iam_role.ec2_s3_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
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

resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_1_cidr
  map_public_ip_on_launch = true
  availability_zone       = data.aws_availability_zones.available.names[0]

  tags = {
    Name      = "sunotal-public-subnet-1"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_2_cidr
  map_public_ip_on_launch = true
  availability_zone       = data.aws_availability_zones.available.names[1]

  tags = {
    Name      = "sunotal-public-subnet-2"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_subnet" "private_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_subnet_1_cidr
  map_public_ip_on_launch = false
  availability_zone       = data.aws_availability_zones.available.names[0]

  tags = {
    Name      = "sunotal-private-subnet-1"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_subnet_2_cidr
  map_public_ip_on_launch = false
  availability_zone       = data.aws_availability_zones.available.names[1]

  tags = {
    Name      = "sunotal-private-subnet-2"
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

resource "aws_eip" "nat" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.main]

  tags = {
    Name      = "sunotal-nat-eip"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1.id

  tags = {
    Name      = "sunotal-nat-gateway"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }

  depends_on = [aws_internet_gateway.main]
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

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name      = "sunotal-private-rt"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private.id
}

# --- DATABASE SUBNET GROUP ---

resource "aws_db_subnet_group" "main" {
  name       = "sunotal-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name      = "sunotal-db-subnet-group"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

# --- VPC ENDPOINT FOR S3 ---

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.public.id, aws_route_table.private.id]

  tags = {
    Name      = "sunotal-s3-endpoint"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

# --- SECURITY GROUPS ---

resource "aws_security_group" "alb" {
  name        = "sunotal-alb-sg"
  description = "Allow inbound HTTP/HTTPS traffic to ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "sunotal-alb-sg"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_security_group" "bastion" {
  name        = "sunotal-bastion-sg"
  description = "Allow SSH to Bastion host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from allowed CIDRs"
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

  tags = {
    Name      = "sunotal-bastion-sg"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_security_group" "web" {
  name        = "sunotal-web-sg"
  description = "Security group for private web EC2 instance"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Backend API from ALB"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "SSH from Bastion Host"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
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

resource "aws_security_group" "db" {
  name        = "sunotal-db-sg"
  description = "Security group for RDS PostgreSQL database"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from Private Web EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "sunotal-db-sg"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

# --- KEY PAIR ---

resource "aws_key_pair" "deployer" {
  count      = (var.key_name == null || var.key_name == "") && var.public_key != "" ? 1 : 0
  key_name   = "sunotal-deployer-key"
  public_key = var.public_key
}

# --- COMPUTE INSTANCES ---

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

resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.ubuntu_bastion.id
  instance_type               = var.bastion_instance_type
  subnet_id                   = aws_subnet.public_1.id
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  associate_public_ip_address = true
  key_name                    = var.key_name != null && var.key_name != "" ? var.key_name : (length(aws_key_pair.deployer) > 0 ? aws_key_pair.deployer[0].key_name : null)

  tags = {
    Name      = "sunotal-bastion"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_instance" "web" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.private_1.id
  vpc_security_group_ids      = [aws_security_group.web.id]
  associate_public_ip_address = false
  key_name                    = var.key_name != null && var.key_name != "" ? var.key_name : (length(aws_key_pair.deployer) > 0 ? aws_key_pair.deployer[0].key_name : null)
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  tags = {
    Name      = "sunotal-frontend"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

# --- RDS POSTGRESQL DATABASE ---

resource "aws_db_instance" "postgres" {
  identifier             = "sunotal-postgres"
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_type           = "gp3"
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = var.db_instance_class
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  skip_final_snapshot    = true
  publicly_accessible    = false

  tags = {
    Name      = "sunotal-postgres"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

# --- APPLICATION LOAD BALANCER ---

resource "aws_lb" "main" {
  name               = "sunotal-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name      = "sunotal-alb"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_lb_target_group" "app" {
  name     = "sunotal-app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/"
    protocol            = "HTTP"
    port                = "80"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }

  tags = {
    Name      = "sunotal-app-tg"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_lb_target_group_attachment" "app" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.web.id
  port             = 80
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# --- CLOUDFRONT CDN FOR S3 ASSETS ---

resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "sunotal-s3-oac"
  description                       = "Origin Access Control for Sunotal S3 Asset Bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "s3_cdn" {
  origin {
    domain_name              = "${var.s3_bucket_name}.s3.${var.aws_region}.amazonaws.com"
    origin_id                = "S3-${var.s3_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront CDN for Sunotal S3 Product Assets"
  default_root_object = ""

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.s3_bucket_name}"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name      = "sunotal-s3-cdn"
    Project   = "sunotal"
    ManagedBy = "terraform"
  }
}

resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = var.s3_bucket_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "arn:aws:s3:::${var.s3_bucket_name}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.s3_cdn.arn
          }
        }
      }
    ]
  })
}



