variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "neuraKnot"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["ap-northeast-1a", "ap-northeast-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway instead of one per AZ (cost saving)"
  type        = bool
  default     = false
}

# ECR Configuration
variable "ecr_repositories" {
  description = "List of ECR repository names"
  type        = list(string)
  default     = ["backend-go", "backend-python"]
}

# Cognito Configuration
variable "password_minimum_length" {
  description = "Minimum password length for Cognito"
  type        = number
  default     = 8
}

variable "token_validity_access" {
  description = "Access token validity in minutes"
  type        = number
  default     = 60
}

variable "token_validity_refresh" {
  description = "Refresh token validity in days"
  type        = number
  default     = 30
}

variable "cognito_redirect_url" {
  description = "Cognito redirect URL"
  type        = string
  default     = ""
}

# Secrets Configuration
variable "db_password" {
  description = "Database password"
  type        = string
  default     = ""
  sensitive   = true
}

# RDS Configuration
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "neuraKnot"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "rds_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "enable_rds_enhanced_monitoring" {
  description = "Enable RDS Enhanced Monitoring"
  type        = bool
  default     = true
}


# ALB Configuration
variable "alb_health_check_path" {
  description = "Health check path for ALB"
  type        = string
  default     = "/health"
}

variable "alb_enable_deletion_protection" {
  description = "Enable deletion protection for ALB"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for HTTPS listener (deprecated, use ACM module)"
  type        = string
  default     = ""
}

# ECS Configuration
variable "backend_go_image" {
  description = "Backend Go container image"
  type        = string
  default     = ""
}

variable "backend_python_image" {
  description = "Backend Python container image"
  type        = string
  default     = ""
}


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
  default     = 512
}

variable "backend_python_memory" {
  description = "Backend Python memory in MB"
  type        = number
  default     = 1024
}

variable "backend_go_desired_count" {
  description = "Desired count for Backend Go service"
  type        = number
  default     = 2
}

variable "backend_python_desired_count" {
  description = "Desired count for Backend Python service"
  type        = number
  default     = 1
}

variable "allowed_origins" {
  description = "Allowed CORS origins for Backend Python"
  type        = list(string)
  default     = ["http://localhost:8080", "http://localhost:3000"]
}

# Logging Configuration
variable "log_retention_in_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "log_level" {
  description = "Log level for applications"
  type        = string
  default     = "info"
}

variable "backend_python_service_name" {
  description = "Name of the Backend Python service"
  type        = string
  default     = "backend-python"
}

# Backend Go specific environment variables
variable "gin_mode" {
  description = "Gin mode (debug, release)"
  type        = string
  default     = "release"
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
  default     = ""
}

variable "frontend_url" {
  description = "Frontend URL for CORS configuration"
  type        = string
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
