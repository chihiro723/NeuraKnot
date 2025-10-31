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

variable "vpc_cidr" {
  description = "CIDR block of the VPC"
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
  description = "ARN of Backend Go target group"
  type        = string
}


variable "backend_python_service_discovery_arn" {
  description = "ARN of Backend Python service discovery service"
  type        = string
}

variable "backend_python_service_discovery_name" {
  description = "Name of Backend Python service discovery service"
  type        = string
  default     = "backend-python"
}

variable "backend_python_service_discovery_namespace" {
  description = "Namespace of Backend Python service discovery service"
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

variable "backend_python_image" {
  description = "Backend Python container image"
  type        = string
}

variable "backend_go_port" {
  description = "Backend Go container port"
  type        = number
  default     = 8080
}

variable "backend_python_port" {
  description = "Backend Python container port"
  type        = number
  default     = 8001
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

variable "backend_python_cpu" {
  description = "Backend Python CPU units"
  type        = number
  default     = 256
}

variable "backend_python_memory" {
  description = "Backend Python memory in MB"
  type        = number
  default     = 512
}

# Service desired counts
variable "backend_go_desired_count" {
  description = "Desired count for Backend Go service"
  type        = number
  default     = 1
}

variable "backend_python_desired_count" {
  description = "Desired count for Backend Python service"
  type        = number
  default     = 1
}

# Auto Scaling configuration
variable "enable_autoscaling" {
  description = "Enable auto scaling for ECS services"
  type        = bool
  default     = true
}

variable "backend_go_autoscaling_min_capacity" {
  description = "Minimum number of tasks for Backend Go"
  type        = number
  default     = 1
}

variable "backend_go_autoscaling_max_capacity" {
  description = "Maximum number of tasks for Backend Go"
  type        = number
  default     = 5
}

variable "backend_python_autoscaling_min_capacity" {
  description = "Minimum number of tasks for Backend Python"
  type        = number
  default     = 1
}

variable "backend_python_autoscaling_max_capacity" {
  description = "Maximum number of tasks for Backend Python"
  type        = number
  default     = 5
}

variable "backend_go_cpu_target_value" {
  description = "Target CPU utilization for Backend Go auto scaling"
  type        = number
  default     = 70
}

variable "backend_go_memory_target_value" {
  description = "Target memory utilization for Backend Go auto scaling"
  type        = number
  default     = 80
}

variable "backend_python_cpu_target_value" {
  description = "Target CPU utilization for Backend Python auto scaling"
  type        = number
  default     = 70
}

variable "backend_python_memory_target_value" {
  description = "Target memory utilization for Backend Python auto scaling"
  type        = number
  default     = 80
}

variable "allowed_origins" {
  description = "Allowed CORS origins for Backend Python"
  type        = list(string)
  default     = ["http://localhost:8080", "http://localhost:3000"]
}

# Logging configuration
variable "log_retention_in_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
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

variable "log_level" {
  description = "Log level for applications"
  type        = string
  default     = "info"
}

# Backend Go specific environment variables
variable "gin_mode" {
  description = "Gin mode (debug, release)"
  type        = string
  default     = "release"
}

variable "cognito_client_secret" {
  description = "Cognito Client Secret"
  type        = string
  sensitive   = true
}

variable "cognito_token_expiration" {
  description = "Cognito token expiration in seconds"
  type        = number
  default     = 3600
}

variable "encryption_master_key" {
  description = "Encryption master key (Base64 encoded)"
  type        = string
  sensitive   = true
}

variable "frontend_url" {
  description = "Frontend URL for CORS configuration"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Backend Python specific environment variables
variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_api_key" {
  description = "Google API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "langsmith_tracing_v2" {
  description = "Enable LangSmith tracing"
  type        = bool
  default     = false
}

variable "langsmith_api_key" {
  description = "LangSmith API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "langsmith_project" {
  description = "LangSmith project name"
  type        = string
  default     = "NeuraKnot"
}

variable "langsmith_endpoint" {
  description = "LangSmith endpoint URL"
  type        = string
  default     = "https://smith.langchain.com"
}
