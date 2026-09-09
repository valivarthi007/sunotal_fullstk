resource "aws_lb" "main" {
  name               = "sunotal-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  tags = merge(var.tags, {
    Name = "sunotal-alb"
  })
}

# Temporarily restore to break deletion deadlock
resource "aws_lb_target_group" "app" {
  name     = "sunotal-app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id
}

# Frontend Target Group
resource "aws_lb_target_group" "frontend" {
  name        = "sunotal-frontend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

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

  tags = merge(var.tags, {
    Name = "sunotal-frontend-tg"
  })
}

# Auth Target Group
resource "aws_lb_target_group" "auth" {
  name        = "sunotal-auth-tg"
  port        = 5001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/api/healthz"
    protocol            = "HTTP"
    port                = "5001"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }

  tags = merge(var.tags, {
    Name = "sunotal-auth-tg"
  })
}

# Operations Target Group
resource "aws_lb_target_group" "operations" {
  name        = "sunotal-operations-tg"
  port        = 5002
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    protocol            = "HTTP"
    port                = "5002"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-499"
  }

  tags = merge(var.tags, {
    Name = "sunotal-operations-tg"
  })
}

# Inventory Target Group
resource "aws_lb_target_group" "inventory" {
  name        = "sunotal-inventory-tg"
  port        = 5003
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    protocol            = "HTTP"
    port                = "5003"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-499"
  }

  tags = merge(var.tags, {
    Name = "sunotal-inventory-tg"
  })
}

# User Target Group
resource "aws_lb_target_group" "user" {
  name        = "sunotal-user-tg"
  port        = 5004
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    protocol            = "HTTP"
    port                = "5004"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-499"
  }

  tags = merge(var.tags, {
    Name = "sunotal-user-tg"
  })
}

# Delivery Target Group
resource "aws_lb_target_group" "delivery" {
  name        = "sunotal-delivery-tg"
  port        = 5006
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/api/healthz"
    protocol            = "HTTP"
    port                = "5006"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-499"
  }

  tags = merge(var.tags, {
    Name = "sunotal-delivery-tg"
  })
}

# Support Target Group
resource "aws_lb_target_group" "support" {
  name        = "sunotal-support-tg"
  port        = 5007
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/api/healthz"
    protocol            = "HTTP"
    port                = "5007"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-499"
  }

  tags = merge(var.tags, {
    Name = "sunotal-support-tg"
  })
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "support_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 55

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.support.arn
  }

  condition {
    path_pattern {
      values = [
        "/api/support",
        "/api/support/*"
      ]
    }
  }
}


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

  tags = merge(var.tags, {
    Name = "sunotal-s3-cdn"
  })
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

data "aws_route53_zone" "primary" {
  name         = "automateuniverse.space"
  private_zone = false
}

# 1. Customer Grocery Storefront Subdomain
resource "aws_route53_record" "sunotal_main" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "sunotal.automateuniverse.space"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# 2. Farmer & Vendor Portal Subdomain
resource "aws_route53_record" "sunotal_vendor" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "vendor-sunotal.automateuniverse.space"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# 3. Admin Control Center Subdomain
resource "aws_route53_record" "sunotal_admin" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "admin-sunotal.automateuniverse.space"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# 4. Delivery Partner Application Subdomain
resource "aws_route53_record" "sunotal_delivery" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "delivery-sunotal.automateuniverse.space"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# 5. Support Portal Microservice Subdomain
resource "aws_route53_record" "sunotal_support" {
  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = "support-sunotal.automateuniverse.space"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
