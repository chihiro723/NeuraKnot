variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "neuraKnot"
}

variable "repositories" {
  description = "List of ECR repository names"
  type        = list(string)
  default     = ["backend-go", "python-ai", "nextjs-frontend"]
}

variable "enable_cross_account_access" {
  description = "Enable cross-account access to ECR repositories"
  type        = bool
  default     = false
}

variable "cross_account_principals" {
  description = "List of AWS account IDs for cross-account access"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
