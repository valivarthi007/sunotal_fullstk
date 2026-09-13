################################################################################
# EC2 Backend Instance — Production Grade (Free Tier: t2.micro)
################################################################################

data "aws_availability_zones" "available" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

locals {
  target_vpc_id    = var.vpc_id != "" ? var.vpc_id : data.aws_vpc.default.id
  target_subnet_id = var.subnet_id != "" ? var.subnet_id : data.aws_subnets.default.ids[0]
}

# ─── IAM Role for EC2 ─────────────────────────────────────────────────────────

resource "aws_iam_role" "ec2_backend" {
  name = "sunotal-ec2-backend-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "ec2.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.tags, { Name = "sunotal-ec2-backend-role" })
}

resource "aws_iam_role_policy" "ec2_s3_access" {
  name = "sunotal-ec2-s3-access"
  role = aws_iam_role.ec2_backend.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/*"
        ]
      },
      {
        Effect   = "Allow",
        Action   = ["cloudwatch:PutMetricData", "logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_backend" {
  name = "sunotal-ec2-backend-profile"
  role = aws_iam_role.ec2_backend.name
  tags = var.tags
}

# ─── Security Group ───────────────────────────────────────────────────────────

resource "aws_security_group" "backend" {
  name        = "sunotal-backend-sg"
  description = "Security group for Sunotal unified backend on EC2"
  vpc_id      = local.target_vpc_id

  # SSH — restrict to your IP in production
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  # HTTP — for Amplify API proxy + health checks
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Node.js API server direct access
  ingress {
    description = "Node.js API"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # WebSocket (Socket.IO) — same port as API
  ingress {
    description = "WebSocket"
    from_port   = 5001
    to_port     = 5001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "sunotal-backend-sg" })
}

# ─── Elastic IP ───────────────────────────────────────────────────────────────

resource "aws_eip" "backend" {
  domain   = "vpc"
  tags     = merge(var.tags, { Name = "sunotal-backend-eip" })
}

resource "aws_eip_association" "backend" {
  instance_id   = aws_instance.backend.id
  allocation_id = aws_eip.backend.id
}

# ─── CloudWatch Log Group ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/sunotal/backend"
  retention_in_days = 7   # Free tier: 5GB logs
  tags              = merge(var.tags, { Name = "sunotal-backend-logs" })
}

# ─── EC2 Instance ─────────────────────────────────────────────────────────────

resource "aws_instance" "backend" {
  ami                    = var.ami_id
  instance_type          = var.instance_type   # t2.micro = Free Tier
  key_name               = var.key_name
  subnet_id              = local.target_subnet_id
  vpc_security_group_ids = [aws_security_group.backend.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_backend.name

  root_block_device {
    volume_type           = "gp2"
    volume_size           = 25    # 25 GB — Free tier allows 30GB
    delete_on_termination = true
    encrypted             = true
    tags                  = merge(var.tags, { Name = "sunotal-backend-root-ebs" })
  }

  # Bootstrap user data — runs once on first boot
  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    jwt_secret      = var.jwt_secret
    mongodb_uri     = var.mongodb_uri
    repo_url        = var.repo_url
    aws_region      = var.aws_region
    s3_bucket       = var.s3_bucket_name
    log_group       = "/sunotal/backend"
    frontend_origin = var.frontend_origin
  }))

  user_data_replace_on_change = false  # Don't destroy instance on script change

  tags = merge(var.tags, { Name = "sunotal-backend" })

  lifecycle {
    ignore_changes = [user_data]  # Never replace instance due to user_data change
  }
}

# ─── CloudWatch Alarms ────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "sunotal-backend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU > 80% for 10 minutes"
  alarm_actions       = var.alarm_sns_arn != "" ? [var.alarm_sns_arn] : []
  ok_actions          = var.alarm_sns_arn != "" ? [var.alarm_sns_arn] : []

  dimensions = { InstanceId = aws_instance.backend.id }
  tags       = var.tags
}

resource "aws_cloudwatch_metric_alarm" "status_check" {
  alarm_name          = "sunotal-backend-status-check"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "EC2 status check failed"
  alarm_actions       = var.alarm_sns_arn != "" ? [var.alarm_sns_arn] : []

  dimensions = { InstanceId = aws_instance.backend.id }
  tags       = var.tags
}
