variable "alb_dns_name" { type = string }
variable "alb_zone_id" { type = string }
variable "domain_name" {
  type    = string
  default = "automateuniverse.space"
}
variable "tags" { type = map(string) }

data "aws_route53_zone" "primary" {
  name         = "${var.domain_name}."
  private_zone = false
}

locals {
  subdomains = [
    "sunotal",
    "admin-sunotal",
    "vendor-sunotal",
    "delivery-sunotal",
    "support-sunotal",
    "monitoring-sunotal",
    "api"
  ]
}

resource "aws_route53_record" "subdomains" {
  for_each = toset(local.subdomains)

  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "${each.key}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

output "registered_subdomains" {
  value = [for k, v in aws_route53_record.subdomains : v.fqdn]
}
