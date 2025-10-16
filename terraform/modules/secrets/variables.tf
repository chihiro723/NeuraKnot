variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "neuraKnot"
}

variable "db_password" {
  description = "Database password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cognito_client_secret" {
  description = "Cognito client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "oauth_credentials" {
  description = "OAuth provider credentials"
  type = map(object({
    client_id     = string
    client_secret = string
    team_id       = optional(string) # For Apple
    key_id        = optional(string) # For Apple
  }))
  default = {}
}

variable "ai_api_keys" {
  description = "AI API keys (OpenAI, Anthropic, Google)"
  type = map(string)
  default = {}
  sensitive = true
}

variable "external_api_keys" {
  description = "External service API keys (Slack, Notion, Weather, etc.)"
  type = map(string)
  default = {}
  sensitive = true
}

variable "recovery_window_in_days" {
  description = "Number of days that AWS Secrets Manager waits before it can delete the secret"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
