variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "neuraKnot"
}

variable "secrets_manager_arns" {
  description = "List of Secrets Manager ARNs that ECS tasks can access"
  type        = list(string)
  default     = []
}

variable "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  type        = string
  default     = ""
}

variable "service_discovery_arn" {
  description = "ARN of the Service Discovery service"
  type        = string
  default     = ""
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket for media storage"
  type        = string
  default     = ""
}

variable "enable_rds_enhanced_monitoring" {
  description = "Enable RDS Enhanced Monitoring"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# GitHub Actions OIDC Configuration
variable "github_username" {
  description = "GitHub username or organization name"
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "GitHub repository name"
  type        = string
  default     = ""
}

variable "ecr_repository_arns" {
  description = "List of ECR repository ARNs that GitHub Actions can access"
  type        = list(string)
  default     = []
}

variable "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  type        = string
  default     = ""
}

variable "ecs_service_arns" {
  description = "List of ECS service ARNs that GitHub Actions can update"
  type        = list(string)
  default     = []
}
