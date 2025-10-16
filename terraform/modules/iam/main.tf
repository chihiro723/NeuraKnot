# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution-role"

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

# ECS Task Role
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-${var.environment}-ecs-task-role"

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

# ECS Task Execution Role Policy Attachment
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role Policy for Secrets Manager
resource "aws_iam_policy" "ecs_task_secrets_policy" {
  count = length(var.secrets_manager_arns) > 0 ? 1 : 0

  name        = "${var.project_name}-${var.environment}-ecs-task-secrets-policy"
  description = "Policy for ECS tasks to access Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.secrets_manager_arns
      }
    ]
  })

  tags = var.tags
}

# ECS Task Role Policy for CloudWatch Logs
resource "aws_iam_policy" "ecs_task_logs_policy" {
  name        = "${var.project_name}-${var.environment}-ecs-task-logs-policy"
  description = "Policy for ECS tasks to write to CloudWatch Logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })

  tags = var.tags
}

# ECS Task Role Policy for Cognito
resource "aws_iam_policy" "ecs_task_cognito_policy" {
  name        = "${var.project_name}-${var.environment}-ecs-task-cognito-policy"
  description = "Policy for ECS tasks to access Cognito"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:ListUsers",
          "cognito-idp:ListUsersInGroup"
        ]
        Resource = var.cognito_user_pool_arn
      }
    ]
  })

  tags = var.tags
}

# ECS Task Role Policy for Service Discovery
resource "aws_iam_policy" "ecs_task_service_discovery_policy" {
  count = var.service_discovery_arn != "" ? 1 : 0

  name        = "${var.project_name}-${var.environment}-ecs-task-service-discovery-policy"
  description = "Policy for ECS tasks to access Service Discovery"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "servicediscovery:DiscoverInstances",
          "servicediscovery:GetOperation",
          "servicediscovery:GetInstancesHealthStatus",
          "servicediscovery:ListInstances",
          "servicediscovery:ListNamespaces",
          "servicediscovery:ListServices"
        ]
        Resource = var.service_discovery_arn
      }
    ]
  })

  tags = var.tags
}

# Attach policies to ECS Task Role
resource "aws_iam_role_policy_attachment" "ecs_task_secrets_policy" {
  count = length(var.secrets_manager_arns) > 0 ? 1 : 0

  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_secrets_policy[0].arn
}

resource "aws_iam_role_policy_attachment" "ecs_task_logs_policy" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_logs_policy.arn
}

resource "aws_iam_role_policy_attachment" "ecs_task_cognito_policy" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_cognito_policy.arn
}

resource "aws_iam_role_policy_attachment" "ecs_task_service_discovery_policy" {
  count = var.service_discovery_arn != "" ? 1 : 0

  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_service_discovery_policy[0].arn
}

# RDS Enhanced Monitoring Role
resource "aws_iam_role" "rds_enhanced_monitoring_role" {
  count = var.enable_rds_enhanced_monitoring ? 1 : 0

  name = "${var.project_name}-${var.environment}-rds-enhanced-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring_role_policy" {
  count = var.enable_rds_enhanced_monitoring ? 1 : 0

  role       = aws_iam_role.rds_enhanced_monitoring_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
