variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "NeuraKnot"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

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
