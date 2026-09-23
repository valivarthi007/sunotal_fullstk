variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "public_subnet_ids" {
  type    = list(string)
  default = []
}
variable "ecs_security_group_id" { type = string }
variable "target_group_arns" { type = map(string) }
variable "alb_listener_arn" {
  type    = string
  default = ""
}
variable "aws_region" { type = string }
variable "tags" { type = map(string) }

variable "database_url" {
  type      = string
  sensitive = true
  default   = "postgresql://sunotal_admin:SunotalPostgres2026SecurePass!@sunotal-postgres-db.c2d668wu0n34.us-east-1.rds.amazonaws.com:5432/sunotal?sslmode=require"
}

variable "jwt_secret" {
  type      = string
  sensitive = true
  default   = "sunotal_jwt_secret_2026_super_secure"
}

data "aws_caller_identity" "current" {}

# ─── 1. ECS Cluster ───────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "sunotal-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.tags, { Name = "sunotal-ecs-cluster" })
}

# ─── 2. IAM Task Execution & Task Roles ───────────────────────────────────────
resource "aws_iam_role" "ecs_execution_role" {
  name = "sunotal-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow ECS execution role to read Secrets Manager (for future secrets)
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "sunotal-ecs-secrets-access"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "ssm:GetParameters", "kms:Decrypt"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:sunotal/*"
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "sunotal-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = var.tags
}

# Allow tasks to publish to SQS/SNS for event-driven workflows
resource "aws_iam_role_policy" "ecs_task_messaging" {
  name = "sunotal-ecs-task-messaging"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sns:Publish"]
        Resource = "*"
      }
    ]
  })
}

# ─── 3. CloudWatch Log Groups ─────────────────────────────────────────────────
locals {
  microservices = {
    "gateway-service"            = { port = 5000, cpu = 512, memory = 1024, is_public = true, health_path = "/api/healthz" }
    "public-backend"             = { port = 5009, cpu = 256, memory = 512, is_public = false, health_path = "/api/healthz" }
    "admin-backend"              = { port = 5002, cpu = 256, memory = 512, is_public = false, health_path = "/api/healthz" }
    "vendor-backend"             = { port = 5005, cpu = 256, memory = 512, is_public = false, health_path = "/api/healthz" }
    "delivery-backend"           = { port = 5004, cpu = 256, memory = 512, is_public = false, health_path = "/api/healthz" }
    "support-monitoring-backend" = { port = 5007, cpu = 256, memory = 512, is_public = false, health_path = "/api/healthz" }
    "public-frontend"            = { port = 80, cpu = 256, memory = 512, is_public = true, health_path = "/" }
    "admin-frontend"             = { port = 80, cpu = 256, memory = 512, is_public = true, health_path = "/" }
    "vendor-frontend"            = { port = 80, cpu = 256, memory = 512, is_public = true, health_path = "/" }
    "delivery-frontend"          = { port = 80, cpu = 256, memory = 512, is_public = true, health_path = "/" }
    "support-frontend"           = { port = 80, cpu = 256, memory = 512, is_public = true, health_path = "/" }
    "monitoring-frontend"        = { port = 80, cpu = 256, memory = 512, is_public = true, health_path = "/" }
  }
}

resource "aws_cloudwatch_log_group" "ecs" {
  for_each          = local.microservices
  name              = "/ecs/sunotal-${each.key}"
  retention_in_days = 30
  tags              = var.tags
}

# ─── 4. AWS CloudMap Private DNS for Inter-Service Communication ──────────────
resource "aws_service_discovery_private_dns_namespace" "sunotal" {
  name        = "sunotal.local"
  description = "Sunotal Microservices Private DNS Namespace"
  vpc         = var.vpc_id
  tags        = var.tags
}

resource "aws_service_discovery_service" "services" {
  for_each = local.microservices
  name     = "sunotal-${each.key}"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.sunotal.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# ─── 5. ECS Task Definitions ──────────────────────────────────────────────────
resource "aws_ecs_task_definition" "tasks" {
  for_each                 = local.microservices
  family                   = "sunotal-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = "sunotal-${each.key}"
    image     = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/sunotal-${each.key}:latest"
    essential = true

    portMappings = [{
      containerPort = each.value.port
      hostPort      = each.value.port
      protocol      = "tcp"
    }]

    # Container-level health check (independent of ALB health check)
    healthCheck = {
      command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${each.value.port}${each.value.health_path} || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60 # Allow 60s for Node.js cold start + DB init
    }

    environment = [
      { name = "DATABASE_URL", value = var.database_url },
      { name = "PORT", value = tostring(each.value.port) },
      { name = "NODE_ENV", value = "production" },
      { name = "JWT_SECRET", value = var.jwt_secret },
      { name = "AUTH_SERVICE_URL", value = "http://sunotal-auth-service.sunotal.local:5001" },
      { name = "OPERATIONS_SERVICE_URL", value = "http://sunotal-operations-service.sunotal.local:5002" },
      { name = "INVENTORY_SERVICE_URL", value = "http://sunotal-inventory-service.sunotal.local:5003" },
      { name = "DELIVERY_SERVICE_URL", value = "http://sunotal-delivery-service.sunotal.local:5004" },
      { name = "VENDOR_SERVICE_URL", value = "http://sunotal-vendor-service.sunotal.local:5005" },
      { name = "SUPPORT_SERVICE_URL", value = "http://sunotal-support-service.sunotal.local:5007" },
      { name = "USER_SERVICE_URL", value = "http://sunotal-user-service.sunotal.local:5008" },
      { name = "CATALOG_SERVICE_URL", value = "http://sunotal-catalog-service.sunotal.local:5009" },
      { name = "ORDER_SERVICE_URL", value = "http://sunotal-order-service.sunotal.local:5010" },
      { name = "NOTIFICATION_SERVICE_URL", value = "http://sunotal-notification-service.sunotal.local:5011" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs[each.key].name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = merge(var.tags, { Name = "sunotal-${each.key}-task" })
}

# ─── 6. ECS Fargate Services ──────────────────────────────────────────────────
resource "aws_ecs_service" "services" {
  for_each        = local.microservices
  name            = "sunotal-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.tasks[each.key].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Rolling deployment: keep 100% min, allow 200% max (zero-downtime deploy)
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  # Give 90 seconds for Node.js cold start + DB schema init before ALB health checks kick in
  health_check_grace_period_seconds = contains(keys(var.target_group_arns), each.key) ? 90 : null

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.services[each.key].arn
  }

  dynamic "load_balancer" {
    for_each = contains(keys(var.target_group_arns), each.key) ? [1] : []
    content {
      target_group_arn = var.target_group_arns[each.key]
      container_name   = "sunotal-${each.key}"
      container_port   = each.value.port
    }
  }

  # Trigger re-deploy when task definition changes
  force_new_deployment = true

  depends_on = [aws_iam_role_policy_attachment.ecs_execution, var.alb_listener_arn]

  tags = merge(var.tags, { Name = "sunotal-${each.key}-service" })

  lifecycle {
    ignore_changes = [desired_count] # Allow autoscaling to manage count
  }
}

output "cluster_id" { value = aws_ecs_cluster.main.id }
output "cluster_name" { value = aws_ecs_cluster.main.name }
output "service_names" {
  value = [for k, v in aws_ecs_service.services : v.name]
}
