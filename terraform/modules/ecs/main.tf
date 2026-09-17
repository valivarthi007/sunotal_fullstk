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

# ─── 3. Fargate Task Definitions & Services ───────────────────────────────────
locals {
  microservices = {
    "api-gateway"          = { port = 5000, cpu = 256, memory = 512,  is_public = true }
    "auth-service"         = { port = 5001, cpu = 256, memory = 512,  is_public = false }
    "operations-service"   = { port = 5002, cpu = 256, memory = 512,  is_public = false }
    "inventory-service"    = { port = 5003, cpu = 256, memory = 512,  is_public = false }
    "user-service"         = { port = 5004, cpu = 256, memory = 512,  is_public = false }
    "vendor-service"       = { port = 5005, cpu = 256, memory = 512,  is_public = false }
    "delivery-service"     = { port = 5006, cpu = 256, memory = 512,  is_public = false }
    "support-service"      = { port = 5007, cpu = 256, memory = 512,  is_public = false }
    "notification-service" = { port = 5008, cpu = 256, memory = 512,  is_public = false }
    "catalog-service"      = { port = 5009, cpu = 256, memory = 512,  is_public = false }
    "order-service"        = { port = 5010, cpu = 256, memory = 512,  is_public = false }
    "user-app"             = { port = 80,   cpu = 256, memory = 512,  is_public = true }
    "admin-app"            = { port = 80,   cpu = 256, memory = 512,  is_public = true }
    "vendor-app"           = { port = 80,   cpu = 256, memory = 512,  is_public = true }
    "delivery-app"         = { port = 80,   cpu = 256, memory = 512,  is_public = true }
    "support-app"          = { port = 80,   cpu = 256, memory = 512,  is_public = true }
    "monitoring-app"       = { port = 80,   cpu = 256, memory = 512,  is_public = true }
  }
}

resource "aws_cloudwatch_log_group" "ecs" {
  for_each          = local.microservices
  name              = "/ecs/sunotal-${each.key}"
  retention_in_days = 7
  tags              = var.tags
}

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

resource "aws_ecs_service" "services" {
  for_each        = local.microservices
  name            = "sunotal-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.tasks[each.key].arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = contains(keys(var.target_group_arns), each.key) ? 30 : null

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }



  dynamic "load_balancer" {
    for_each = contains(keys(var.target_group_arns), each.key) ? [1] : []
    content {
      target_group_arn = var.target_group_arns[each.key]
      container_name   = "sunotal-${each.key}"
      container_port   = each.value.port
    }
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_execution, var.alb_listener_arn]

  tags = merge(var.tags, { Name = "sunotal-${each.key}-service" })
}

output "cluster_id" { value = aws_ecs_cluster.main.id }
output "cluster_name" { value = aws_ecs_cluster.main.name }
output "service_names" {
  value = [for k, v in aws_ecs_service.services : v.name]
}
