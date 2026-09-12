resource "aws_amplify_app" "sunotal" {
  name       = var.app_name
  repository = try(length(var.github_access_token) > 5, false) ? var.repository : null

  access_token = try(length(var.github_access_token) > 5, false) ? var.github_access_token : null

  build_spec = <<-EOF
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOF

  # Custom Rewrite Rules for API Reverse Proxy and SPA routing
  custom_rule {
    source = "/api/<*>"
    target = "/index.html"
    status = "200"
  }

  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }

  environment_variables = {
    NODE_ENV = "production"
  }

  tags = var.tags
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.sunotal.id
  branch_name = "main"

  framework = "Web"
  stage     = "PRODUCTION"
}

resource "aws_amplify_domain_association" "sunotal" {
  app_id      = aws_amplify_app.sunotal.id
  domain_name = var.domain_name

  # Customer Storefront (Main)
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "sunotal"
  }

  # Vendor Portal
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "vendor-sunotal"
  }

  # Admin / Dark Store Hub WMS
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "admin-sunotal"
  }

  # Delivery / Rider Fulfillment
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "delivery-sunotal"
  }

  # Support Portal
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "support-sunotal"
  }
}
