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

# ECS Task Role Policy for Secrets Manager (only if secrets are used)
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
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_service_discovery_policy.arn
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

# ============================================================================
# GitHub Actions OIDC Configuration
# ============================================================================

# GitHub Actions OIDC Identity Provider
resource "aws_iam_openid_connect_provider" "github_actions" {
  count = var.github_username != "" && var.github_repository != "" ? 1 : 0

  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-github-actions-oidc"
  })
}

# GitHub Actions IAM Role
resource "aws_iam_role" "github_actions_role" {
  count = var.github_username != "" && var.github_repository != "" ? 1 : 0

  name = "${var.project_name}-${var.environment}-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_actions[0].arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_username}/${var.github_repository}:ref:refs/heads/main"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-github-actions-role"
  })
}

# GitHub Actions IAM Policy for ECR
resource "aws_iam_policy" "github_actions_ecr_policy" {
  count = var.github_username != "" && var.github_repository != "" ? 1 : 0

  name        = "${var.project_name}-${var.environment}-github-actions-ecr-policy"
  description = "Policy for GitHub Actions to access ECR"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = var.ecr_repository_arns
      }
    ]
  })

  tags = var.tags
}

# GitHub Actions IAM Policy for ECS
resource "aws_iam_policy" "github_actions_ecs_policy" {
  count = var.github_username != "" && var.github_repository != "" ? 1 : 0

  name        = "${var.project_name}-${var.environment}-github-actions-ecs-policy"
  description = "Policy for GitHub Actions to manage ECS services"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:ListServices",
          "ecs:DescribeClusters",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService"
        ]
        Resource = var.ecs_service_arns
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          "arn:aws:iam::*:role/${var.project_name}-${var.environment}-ecs-task-execution-role",
          "arn:aws:iam::*:role/${var.project_name}-${var.environment}-ecs-task-role"
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = var.tags
}

# Attach policies to GitHub Actions role
resource "aws_iam_role_policy_attachment" "github_actions_ecr_policy" {
  count = var.github_username != "" && var.github_repository != "" ? 1 : 0

  role       = aws_iam_role.github_actions_role[0].name
  policy_arn = aws_iam_policy.github_actions_ecr_policy[0].arn
}

resource "aws_iam_role_policy_attachment" "github_actions_ecs_policy" {
  count = var.github_username != "" && var.github_repository != "" ? 1 : 0

  role       = aws_iam_role.github_actions_role[0].name
  policy_arn = aws_iam_policy.github_actions_ecs_policy[0].arn
}
