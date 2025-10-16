variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
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

variable "enable_oauth" {
  description = "Enable OAuth providers"
  type        = bool
  default     = false
}

variable "callback_urls" {
  description = "List of callback URLs for OAuth"
  type        = list(string)
  default     = ["http://localhost:3000/auth/callback"]
}

variable "logout_urls" {
  description = "List of logout URLs for OAuth"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "oauth_providers" {
  description = "OAuth provider configurations"
  type = map(object({
    client_id     = string
    client_secret = string
    team_id       = optional(string) # For Apple
    key_id        = optional(string) # For Apple
  }))
  default = {}
}
