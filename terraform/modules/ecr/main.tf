locals {
  targets = [
    "sunotal-api-gateway",
    "sunotal-auth-service",
    "sunotal-catalog-service",
    "sunotal-delivery-service",
    "sunotal-inventory-service",
    "sunotal-notification-service",
    "sunotal-operations-service",
    "sunotal-order-service",
    "sunotal-support-service",
    "sunotal-user-service",
    "sunotal-vendor-service",
    "sunotal-admin-app",
    "sunotal-delivery-app",
    "sunotal-monitoring-app",
    "sunotal-support-app",
    "sunotal-user-app",
    "sunotal-vendor-app"
  ]
}

resource "aws_ecr_repository" "repos" {
  for_each             = toset(local.targets)
  name                 = each.value
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

variable "tags" {
  type        = map(string)
  description = "Common resource tags"
}

output "repository_urls" {
  value = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}
