# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend_go" {
  name              = "/ecs/${var.project_name}-${var.environment}-backend-go"
  retention_in_days = var.log_retention_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-backend-go-logs"
  })
}

resource "aws_cloudwatch_log_group" "backend_python" {
  name              = "/ecs/${var.project_name}-${var.environment}-backend-python"
  retention_in_days = var.log_retention_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-backend-python-logs"
  })
}

resource "aws_cloudwatch_log_group" "migrate" {
  name              = "/ecs/${var.project_name}-${var.environment}-migrate"
  retention_in_days = var.log_retention_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-migrate-logs"
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
    from_port   = var.backend_python_port
    to_port     = var.backend_python_port
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Backend Python from VPC"
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
          name  = "GIN_MODE"
          value = var.gin_mode
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
          name  = "DB_PASSWORD"
          value = var.db_password
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
          name  = "COGNITO_CLIENT_SECRET"
          value = var.cognito_client_secret
        },
        {
          name  = "COGNITO_REDIRECT_URL"
          value = var.cognito_redirect_url
        },
        {
          name  = "COGNITO_TOKEN_EXPIRATION"
          value = tostring(var.cognito_token_expiration)
        },
        {
          name  = "AI_SERVICE_URL"
          value = "http://${var.backend_python_service_discovery_name}.${var.backend_python_service_discovery_namespace}:${var.backend_python_port}"
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
        },
        {
          name  = "ENCRYPTION_MASTER_KEY"
          value = var.encryption_master_key
        },
        {
          name  = "FRONTEND_URL"
          value = var.frontend_url
        },
        {
          name  = "S3_BUCKET_NAME"
          value = var.s3_bucket_name
        },
        {
          name  = "S3_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_BASE_URL"
          value = "https://${var.s3_bucket_name}.s3.${var.aws_region}.amazonaws.com"
        }
      ]
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

# ECS Task Definition for Backend Python
resource "aws_ecs_task_definition" "backend_python" {
  family                   = "${var.project_name}-${var.environment}-backend-python"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_python_cpu
  memory                   = var.backend_python_memory
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "backend-python"
      image = var.backend_python_image
      portMappings = [
        {
          containerPort = var.backend_python_port
          hostPort      = var.backend_python_port
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
          value = tostring(var.backend_python_port)
        },
        {
          name  = "API_V1_PREFIX"
          value = "/api/v1"
        },
        {
          name  = "PROJECT_NAME"
          value = "NeuraKnot"
        },
        {
          name  = "VERSION"
          value = "1.0.0"
        },
        {
          name  = "ALLOWED_ORIGINS"
          value = jsonencode(var.allowed_origins)
        },
        {
          name  = "OPENAI_API_KEY"
          value = var.openai_api_key
        },
        {
          name  = "ANTHROPIC_API_KEY"
          value = var.anthropic_api_key
        },
        {
          name  = "GOOGLE_API_KEY"
          value = var.google_api_key
        },
        {
          name  = "LANGSMITH_TRACING_V2"
          value = tostring(var.langsmith_tracing_v2)
        },
        {
          name  = "LANGSMITH_API_KEY"
          value = var.langsmith_api_key
        },
        {
          name  = "LANGSMITH_PROJECT"
          value = var.langsmith_project
        },
        {
          name  = "LANGSMITH_ENDPOINT"
          value = var.langsmith_endpoint
        },
        {
          name  = "MCP_CONNECTION_TIMEOUT"
          value = "10"
        },
        {
          name  = "MCP_TOOL_TIMEOUT"
          value = "30"
        },
        {
          name  = "AGENT_EXECUTION_TIMEOUT"
          value = "120"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend_python.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      essential = true
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-backend-python"
  })
}


# ECS Service for Backend Go
resource "aws_ecs_service" "backend_go" {
  name                   = "${var.project_name}-${var.environment}-backend-go"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.backend_go.arn
  desired_count          = var.backend_go_desired_count
  launch_type            = "FARGATE"
  enable_execute_command = true

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
    registry_arn = var.backend_python_service_discovery_arn
  }

  depends_on = [aws_ecs_task_definition.backend_go]

  # CI/CDでタスク定義が更新されるため、Terraformでは無視
  # Auto Scalingが管理するためdesired_countも無視
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-backend-go"
  })
}

# ECS Service for Backend Python
resource "aws_ecs_service" "backend_python" {
  name                   = "${var.project_name}-${var.environment}-backend-python"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.backend_python.arn
  desired_count          = var.backend_python_desired_count
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = var.backend_python_service_discovery_arn
  }

  depends_on = [aws_ecs_task_definition.backend_python]

  # CI/CDでタスク定義が更新されるため、Terraformでは無視
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-backend-python"
  })
}

# ============================================================
# Auto Scaling Configuration
# ============================================================

# Auto Scaling Target for Backend Go
resource "aws_appautoscaling_target" "backend_go" {
  count              = var.enable_autoscaling ? 1 : 0
  max_capacity       = var.backend_go_autoscaling_max_capacity
  min_capacity       = var.backend_go_autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend_go.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  depends_on = [aws_ecs_service.backend_go]
}

# Auto Scaling Policy for Backend Go - CPU
resource "aws_appautoscaling_policy" "backend_go_cpu" {
  count              = var.enable_autoscaling ? 1 : 0
  name               = "${var.project_name}-${var.environment}-backend-go-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_go[0].resource_id
  scalable_dimension = aws_appautoscaling_target.backend_go[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_go[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.backend_go_cpu_target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy for Backend Go - Memory
resource "aws_appautoscaling_policy" "backend_go_memory" {
  count              = var.enable_autoscaling ? 1 : 0
  name               = "${var.project_name}-${var.environment}-backend-go-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_go[0].resource_id
  scalable_dimension = aws_appautoscaling_target.backend_go[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_go[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.backend_go_memory_target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Target for Backend Python
resource "aws_appautoscaling_target" "backend_python" {
  count              = var.enable_autoscaling ? 1 : 0
  max_capacity       = var.backend_python_autoscaling_max_capacity
  min_capacity       = var.backend_python_autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend_python.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  depends_on = [aws_ecs_service.backend_python]
}

# Auto Scaling Policy for Backend Python - CPU
resource "aws_appautoscaling_policy" "backend_python_cpu" {
  count              = var.enable_autoscaling ? 1 : 0
  name               = "${var.project_name}-${var.environment}-backend-python-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_python[0].resource_id
  scalable_dimension = aws_appautoscaling_target.backend_python[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_python[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.backend_python_cpu_target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy for Backend Python - Memory
resource "aws_appautoscaling_policy" "backend_python_memory" {
  count              = var.enable_autoscaling ? 1 : 0
  name               = "${var.project_name}-${var.environment}-backend-python-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_python[0].resource_id
  scalable_dimension = aws_appautoscaling_target.backend_python[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_python[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.backend_python_memory_target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
