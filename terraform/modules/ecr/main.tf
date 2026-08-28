resource "aws_ecr_repository" "frontend" {
  name                 = "sunotal-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

resource "aws_ecr_repository" "auth" {
  name                 = "sunotal-auth"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

resource "aws_ecr_repository" "operations" {
  name                 = "sunotal-operations"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

resource "aws_ecr_repository" "inventory" {
  name                 = "sunotal-inventory"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

resource "aws_ecr_repository" "user" {
  name                 = "sunotal-user"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

resource "aws_ecr_repository" "delivery" {
  name                 = "sunotal-delivery"
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

output "frontend_repository_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "auth_repository_url" {
  value = aws_ecr_repository.auth.repository_url
}

output "operations_repository_url" {
  value = aws_ecr_repository.operations.repository_url
}

output "inventory_repository_url" {
  value = aws_ecr_repository.inventory.repository_url
}

output "user_repository_url" {
  value = aws_ecr_repository.user.repository_url
}

output "delivery_repository_url" {
  value = aws_ecr_repository.delivery.repository_url
}
