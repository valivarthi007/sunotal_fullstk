variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "alb_security_group_id" { type = string }
variable "domain_name" {
  type    = string
  default = "automateuniverse.space"
}
variable "tags" { type = map(string) }

# ─── 1. ACM Wildcard Certificate ──────────────────────────────────────────────
data "aws_route53_zone" "primary" {
  name         = "${var.domain_name}."
  private_zone = false
}

resource "aws_acm_certificate" "cert" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = merge(var.tags, { Name = "sunotal-wildcard-cert" })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.primary.zone_id
}

resource "aws_acm_certificate_validation" "cert" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ─── 2. Application Load Balancer (ALB) ───────────────────────────────────────
resource "aws_lb" "main" {
  name               = "sunotal-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids
  idle_timeout       = 3600

  enable_deletion_protection = false

  tags = merge(var.tags, { Name = "sunotal-alb" })
}

# ─── 3. Target Groups ─────────────────────────────────────────────────────────
locals {
  services = {
    "public-frontend"     = { port = 80, path = "/healthz", host = "sunotal.${var.domain_name}" }
    "admin-frontend"      = { port = 80, path = "/healthz", host = "admin-sunotal.${var.domain_name}" }
    "vendor-frontend"     = { port = 80, path = "/healthz", host = "vendor-sunotal.${var.domain_name}" }
    "delivery-frontend"   = { port = 80, path = "/healthz", host = "delivery-sunotal.${var.domain_name}" }
    "support-frontend"    = { port = 80, path = "/healthz", host = "support-sunotal.${var.domain_name}" }
    "monitoring-frontend" = { port = 80, path = "/healthz", host = "monitoring-sunotal.${var.domain_name}" }
    "gateway-service"     = { port = 5000, path = "/healthz", host = "api.${var.domain_name}" }
  }
}


resource "aws_lb_target_group" "targets" {
  for_each    = local.services
  name        = "tg-${each.key}"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  health_check {
    enabled             = true
    path                = each.value.path
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-399"
  }

  tags = merge(var.tags, { Name = "tg-${each.key}" })
}

# ─── 4. HTTP (80) -> HTTPS (443) Redirect Listener ────────────────────────────
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ─── 5. HTTPS (443) Listener with ACM Certificate ─────────────────────────────
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.cert.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.targets["public-frontend"].arn
  }
}

# ─── 6. Host-Based Listener Rules ─────────────────────────────────────────────
resource "aws_lb_listener_rule" "rules" {
  for_each     = local.services
  listener_arn = aws_lb_listener.https.arn
  priority     = 10 + index(keys(local.services), each.key)

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.targets[each.key].arn
  }

  condition {
    host_header {
      values = [each.value.host]
    }
  }
}

output "alb_arn" { value = aws_lb.main.arn }
output "alb_dns_name" { value = aws_lb.main.dns_name }
output "alb_zone_id" { value = aws_lb.main.zone_id }
output "alb_listener_arn" { value = aws_lb_listener.https.arn }
output "target_group_arns" {
  value      = { for k, v in aws_lb_target_group.targets : k => v.arn }
  depends_on = [aws_lb_listener_rule.rules, aws_lb_listener.https]
}

