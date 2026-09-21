locals {
  targets = [
    "sunotal-gateway-service",
    "sunotal-public-backend",
    "sunotal-public-frontend",
    "sunotal-admin-backend",
    "sunotal-admin-frontend",
    "sunotal-vendor-backend",
    "sunotal-vendor-frontend",
    "sunotal-delivery-backend",
    "sunotal-delivery-frontend",
    "sunotal-support-monitoring-backend",
    "sunotal-support-frontend",
    "sunotal-monitoring-frontend"
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
