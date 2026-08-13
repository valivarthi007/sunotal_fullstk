resource "aws_ecs_cluster" "main" {
  name = "sunotal-cluster"
  tags = var.tags
}

# ECS Task Execution Role (allows Fargate to pull from ECR and write logs to CloudWatch)
resource "aws_iam_role" "ecs_execution" {
  name = "sunotal-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (used by the running container to call AWS services if needed)
resource "aws_iam_role" "ecs_task" {
  name = "sunotal-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_s3_attach" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = var.s3_policy_arn
}


# Cloudwatch Log Groups
resource "aws_cloudwatch_log_group" "ecs_logs" {
  for_each          = toset(["frontend", "auth", "operations", "inventory", "user"])
  name              = "/ecs/sunotal-${each.key}"
  retention_in_days = 7
  tags              = var.tags
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "sunotal-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${var.ecr_frontend_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs["frontend"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])

  tags = var.tags

  lifecycle {
    ignore_changes = [container_definitions]
  }
}

# Auth Service Task Definition
resource "aws_ecs_task_definition" "auth" {
  family                   = "sunotal-auth"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "auth"
      image     = "${var.ecr_auth_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5001
          hostPort      = 5001
        }
      ]
      environment = [
        { name = "PORT", value = "5001" },
        { name = "NODE_ENV", value = "production" },
        { name = "DATABASE_URL", value = var.database_url },
        { name = "SESSION_SECRET", value = var.session_secret },
        { name = "CLOUDFRONT_DOMAIN", value = var.cloudfront_domain },
        { name = "FRONTEND_URL", value = var.frontend_url }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs["auth"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "auth"
        }
      }
    }
  ])

  tags = var.tags

  lifecycle {
    ignore_changes = [container_definitions]
  }
}

# Operations Service Task Definition
resource "aws_ecs_task_definition" "operations" {
  family                   = "sunotal-operations"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "operations"
      image     = "${var.ecr_operations_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5002
          hostPort      = 5002
        }
      ]
      environment = [
        { name = "PORT", value = "5002" },
        { name = "NODE_ENV", value = "production" },
        { name = "DATABASE_URL", value = var.database_url },
        { name = "SESSION_SECRET", value = var.session_secret },
        { name = "CLOUDFRONT_DOMAIN", value = var.cloudfront_domain },
        { name = "FRONTEND_URL", value = var.frontend_url },
        { name = "S3_BUCKET_NAME", value = var.s3_bucket_name },
        { name = "AWS_REGION", value = var.aws_region }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs["operations"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "operations"
        }
      }
    }
  ])

  tags = var.tags

  lifecycle {
    ignore_changes = [container_definitions]
  }
}

# Inventory Service Task Definition
resource "aws_ecs_task_definition" "inventory" {
  family                   = "sunotal-inventory"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "inventory"
      image     = "${var.ecr_inventory_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5003
          hostPort      = 5003
        }
      ]
      environment = [
        { name = "PORT", value = "5003" },
        { name = "NODE_ENV", value = "production" },
        { name = "DATABASE_URL", value = var.database_url },
        { name = "SESSION_SECRET", value = var.session_secret },
        { name = "CLOUDFRONT_DOMAIN", value = var.cloudfront_domain },
        { name = "FRONTEND_URL", value = var.frontend_url }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs["inventory"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "inventory"
        }
      }
    }
  ])

  tags = var.tags

  lifecycle {
    ignore_changes = [container_definitions]
  }
}

# User Service Task Definition
resource "aws_ecs_task_definition" "user" {
  family                   = "sunotal-user"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "user"
      image     = "${var.ecr_user_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5004
          hostPort      = 5004
        }
      ]
      environment = [
        { name = "PORT", value = "5004" },
        { name = "NODE_ENV", value = "production" },
        { name = "DATABASE_URL", value = var.database_url },
        { name = "SESSION_SECRET", value = var.session_secret },
        { name = "CLOUDFRONT_DOMAIN", value = var.cloudfront_domain },
        { name = "FRONTEND_URL", value = var.frontend_url },
        { name = "S3_BUCKET_NAME", value = var.s3_bucket_name },
        { name = "AWS_REGION", value = var.aws_region }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs["user"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "user"
        }
      }
    }
  ])

  tags = var.tags

  lifecycle {
    ignore_changes = [container_definitions]
  }
}

# Frontend Service
resource "aws_ecs_service" "frontend" {
  name            = "sunotal-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.frontend_target_group_arn
    container_name   = "frontend"
    container_port   = 80
  }

  tags = var.tags
}

# Auth Service
resource "aws_ecs_service" "auth" {
  name            = "sunotal-auth"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.auth.arn
  desired_count   = 1
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.auth_target_group_arn
    container_name   = "auth"
    container_port   = 5001
  }

  tags = var.tags
}

# Operations Service
resource "aws_ecs_service" "operations" {
  name            = "sunotal-operations"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.operations.arn
  desired_count   = 1
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.operations_target_group_arn
    container_name   = "operations"
    container_port   = 5002
  }

  tags = var.tags
}

# Inventory Service
resource "aws_ecs_service" "inventory" {
  name            = "sunotal-inventory"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.inventory.arn
  desired_count   = 1
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.inventory_target_group_arn
    container_name   = "inventory"
    container_port   = 5003
  }

  tags = var.tags
}

# User Service
resource "aws_ecs_service" "user" {
  name            = "sunotal-user"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.user.arn
  desired_count   = 1
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.user_target_group_arn
    container_name   = "user"
    container_port   = 5004
  }

  tags = var.tags
}
