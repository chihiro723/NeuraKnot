# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend_go" {
  name              = "/ecs/${var.project_name}-${var.environment}-backend-go"
  retention_in_days = var.log_retention_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-backend-go-logs"
  })
}

resource "aws_cloudwatch_log_group" "python_ai" {
  name              = "/ecs/${var.project_name}-${var.environment}-python-ai"
  retention_in_days = var.log_retention_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-python-ai-logs"
  })
}

resource "aws_cloudwatch_log_group" "frontend" {
  count = var.enable_frontend ? 1 : 0

  name              = "/ecs/${var.project_name}-${var.environment}-frontend"
  retention_in_days = var.log_retention_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-frontend-logs"
  })
}

# Security Group for ECS
resource "aws_security_group" "ecs" {
  name_prefix = "${var.project_name}-${var.environment}-ecs-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.backend_go_port
    to_port         = var.backend_go_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    description     = "Backend Go from ALB"
  }

  ingress {
    from_port       = var.python_ai_port
    to_port         = var.python_ai_port
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    description     = "Python AI from Backend Go"
  }

  ingress {
    from_port       = var.frontend_port
    to_port         = var.frontend_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    description     = "Frontend from ALB"
    count           = var.enable_frontend ? 1 : 0
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ecs-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.backend_go.name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cluster"
  })
}

# ECS Task Definition for Backend Go
resource "aws_ecs_task_definition" "backend_go" {
  family                   = "${var.project_name}-${var.environment}-backend-go"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_go_cpu
  memory                   = var.backend_go_memory
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "backend-go"
      image = var.backend_go_image
      portMappings = [
        {
          containerPort = var.backend_go_port
          hostPort      = var.backend_go_port
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "SERVER_PORT"
          value = tostring(var.backend_go_port)
        },
        {
          name  = "SERVER_HOST"
          value = "0.0.0.0"
        },
        {
          name  = "DB_HOST"
          value = var.db_host
        },
        {
          name  = "DB_PORT"
          value = tostring(var.db_port)
        },
        {
          name  = "DB_USER"
          value = var.db_username
        },
        {
          name  = "DB_NAME"
          value = var.db_name
        },
        {
          name  = "DB_SSLMODE"
          value = "require"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "COGNITO_USER_POOL_ID"
          value = var.cognito_user_pool_id
        },
        {
          name  = "COGNITO_CLIENT_ID"
          value = var.cognito_client_id
        },
        {
          name  = "COGNITO_REDIRECT_URL"
          value = var.cognito_redirect_url
        },
        {
          name  = "AI_SERVICE_URL"
          value = "http://${var.python_ai_service_discovery_name}.${var.python_ai_service_discovery_namespace}:${var.python_ai_port}"
        },
        {
          name  = "AI_SERVICE_TIMEOUT"
          value = "120"
        },
        {
          name  = "LOG_LEVEL"
          value = var.log_level
        },
        {
          name  = "LOG_FORMAT"
          value = "json"
        }
      ]
      secrets = var.secrets_manager_arns
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend_go.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      essential = true
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-backend-go"
  })
}

# ECS Task Definition for Python AI
resource "aws_ecs_task_definition" "python_ai" {
  family                   = "${var.project_name}-${var.environment}-python-ai"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.python_ai_cpu
  memory                   = var.python_ai_memory
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "python-ai"
      image = var.python_ai_image
      portMappings = [
        {
          containerPort = var.python_ai_port
          hostPort      = var.python_ai_port
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "HOST"
          value = "0.0.0.0"
        },
        {
          name  = "PORT"
          value = tostring(var.python_ai_port)
        },
        {
          name  = "API_V1_PREFIX"
          value = "/api/v1"
        },
        {
          name  = "PROJECT_NAME"
          value = "NeuraKnot AI Server"
        },
        {
          name  = "VERSION"
          value = "1.0.0"
        },
        {
          name  = "ALLOWED_ORIGINS"
          value = join(",", var.allowed_origins)
        },
        {
          name  = "SERVICE_CONNECTION_TIMEOUT"
          value = "10"
        },
        {
          name  = "SERVICE_TOOL_TIMEOUT"
          value = "30"
        },
        {
          name  = "AGENT_EXECUTION_TIMEOUT"
          value = "120"
        }
      ]
      secrets = var.secrets_manager_arns
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.python_ai.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      essential = true
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-python-ai"
  })
}

# ECS Task Definition for Frontend (optional)
resource "aws_ecs_task_definition" "frontend" {
  count = var.enable_frontend ? 1 : 0

  family                   = "${var.project_name}-${var.environment}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = var.frontend_image
      portMappings = [
        {
          containerPort = var.frontend_port
          hostPort      = var.frontend_port
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "PORT"
          value = tostring(var.frontend_port)
        },
        {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend[0].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      essential = true
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-frontend"
  })
}

# ECS Service for Backend Go
resource "aws_ecs_service" "backend_go" {
  name            = "${var.project_name}-${var.environment}-backend-go"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend_go.arn
  desired_count   = var.backend_go_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.backend_go_target_group_arn
    container_name   = "backend-go"
    container_port   = var.backend_go_port
  }

  service_registries {
    registry_arn = var.python_ai_service_discovery_arn
  }

  depends_on = [aws_ecs_task_definition.backend_go]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-backend-go"
  })
}

# ECS Service for Python AI
resource "aws_ecs_service" "python_ai" {
  name            = "${var.project_name}-${var.environment}-python-ai"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.python_ai.arn
  desired_count   = var.python_ai_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = var.python_ai_service_discovery_arn
  }

  depends_on = [aws_ecs_task_definition.python_ai]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-python-ai"
  })
}

# ECS Service for Frontend (optional)
resource "aws_ecs_service" "frontend" {
  count = var.enable_frontend ? 1 : 0

  name            = "${var.project_name}-${var.environment}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend[0].arn
  desired_count   = var.frontend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.frontend_target_group_arn
    container_name   = "frontend"
    container_port   = var.frontend_port
  }

  depends_on = [aws_ecs_task_definition.frontend]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-frontend"
  })
}
