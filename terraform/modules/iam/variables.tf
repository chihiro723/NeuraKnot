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
