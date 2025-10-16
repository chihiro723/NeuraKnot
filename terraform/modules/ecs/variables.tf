variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "neuraKnot"
}

variable "vpc_id" {
  description = "VPC ID where ECS will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security group ID of ALB"
  type        = string
}

variable "ecs_task_execution_role_arn" {
  description = "ARN of ECS task execution role"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ARN of ECS task role"
  type        = string
}

variable "backend_go_target_group_arn" {
  description = "ARN of backend Go target group"
  type        = string
}

variable "frontend_target_group_arn" {
  description = "ARN of frontend target group"
  type        = string
  default     = ""
}

variable "python_ai_service_discovery_arn" {
  description = "ARN of Python AI service discovery service"
  type        = string
}

variable "python_ai_service_discovery_name" {
  description = "Name of Python AI service discovery service"
  type        = string
  default     = "python-ai"
}

variable "python_ai_service_discovery_namespace" {
  description = "Namespace of Python AI service discovery service"
  type        = string
  default     = "neuraKnot-prod.local"
}

variable "secrets_manager_arns" {
  description = "List of Secrets Manager ARNs"
  type        = list(string)
  default     = []
}

# Database configuration
variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "db_username" {
  description = "Database username"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
}

# Cognito configuration
variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito Client ID"
  type        = string
}

variable "cognito_redirect_url" {
  description = "Cognito redirect URL"
  type        = string
}

# Container images
variable "backend_go_image" {
  description = "Backend Go container image"
  type        = string
}

variable "python_ai_image" {
  description = "Python AI container image"
  type        = string
}

variable "frontend_image" {
  description = "Frontend container image"
  type        = string
  default     = ""
}

# Container ports
variable "backend_go_port" {
  description = "Backend Go container port"
  type        = number
  default     = 8080
}

variable "python_ai_port" {
  description = "Python AI container port"
  type        = number
  default     = 8001
}

variable "frontend_port" {
  description = "Frontend container port"
  type        = number
  default     = 3000
}

# Container resources
variable "backend_go_cpu" {
  description = "Backend Go CPU units"
  type        = number
  default     = 256
}

variable "backend_go_memory" {
  description = "Backend Go memory in MB"
  type        = number
  default     = 512
}

variable "python_ai_cpu" {
  description = "Python AI CPU units"
  type        = number
  default     = 512
}

variable "python_ai_memory" {
  description = "Python AI memory in MB"
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "Frontend CPU units"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Frontend memory in MB"
  type        = number
  default     = 512
}

# Service desired counts
variable "backend_go_desired_count" {
  description = "Desired count for backend Go service"
  type        = number
  default     = 1
}

variable "python_ai_desired_count" {
  description = "Desired count for Python AI service"
  type        = number
  default     = 1
}

variable "frontend_desired_count" {
  description = "Desired count for frontend service"
  type        = number
  default     = 1
}

# Frontend configuration
variable "enable_frontend" {
  description = "Enable frontend service"
  type        = bool
  default     = false
}

variable "allowed_origins" {
  description = "Allowed CORS origins for Python AI"
  type        = list(string)
  default     = ["http://localhost:8080", "http://localhost:3000"]
}

# Logging configuration
variable "log_retention_in_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "log_level" {
  description = "Log level for applications"
  type        = string
  default     = "info"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
