resource "aws_amplify_app" "sunotal" {
  name       = var.app_name
  repository = try(length(var.github_access_token) > 5, false) ? var.repository : null

  access_token = try(length(var.github_access_token) > 5, false) ? var.github_access_token : null

  build_spec = <<-EOF
    version: 1
    frontend:
      phases:
        build:
          commands:
            - echo "Building client applications..."
            - (cd apps/user-app && npm install --include=dev && npm run build)
            - (cd apps/vendor-app && npm install --include=dev && npm run build)
            - (cd apps/admin-app && npm install --include=dev && npm run build)
            - (cd apps/delivery-app && npm install --include=dev && npm run build)
            - (cd apps/support-app && npm install --include=dev && npm run build)
            - mkdir -p apps/user-app/dist/vendor-app && cp -r apps/vendor-app/dist/* apps/user-app/dist/vendor-app/
            - mkdir -p apps/user-app/dist/admin-app && cp -r apps/admin-app/dist/* apps/user-app/dist/admin-app/
            - mkdir -p apps/user-app/dist/delivery-app && cp -r apps/delivery-app/dist/* apps/user-app/dist/delivery-app/
            - mkdir -p apps/user-app/dist/support-app && cp -r apps/support-app/dist/* apps/user-app/dist/support-app/
      artifacts:
        baseDirectory: apps/user-app/dist
        files:
          - '**/*'
      cache:
        paths:
          - apps/*/node_modules/**/*
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

  # Customer Storefront (Main & Root)
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "sunotal"
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }

  # Vendor / Farmer Procurement Portal
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "vendor-sunotal"
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "vendor"
  }

  # Admin / Dark Store Hub WMS
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "admin-sunotal"
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "admin"
  }

  # Delivery / Rider Fleet Fulfillment
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "delivery-sunotal"
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "delivery"
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "rider"
  }

  # Support Portal
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "support-sunotal"
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "support"
  }
}
