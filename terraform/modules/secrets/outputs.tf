output "db_password_secret_arn" {
  description = "ARN of the database password secret"
  value       = var.db_password != "" ? aws_secretsmanager_secret.db_password[0].arn : null
}

output "cognito_client_secret_arn" {
  description = "ARN of the Cognito client secret"
  value       = var.cognito_client_secret != "" ? aws_secretsmanager_secret.cognito_client_secret[0].arn : null
}

output "oauth_credentials_secret_arn" {
  description = "ARN of the OAuth credentials secret"
  value       = length(var.oauth_credentials) > 0 ? aws_secretsmanager_secret.oauth_credentials[0].arn : null
}

output "ai_api_keys_secret_arn" {
  description = "ARN of the AI API keys secret"
  value       = length(var.ai_api_keys) > 0 ? aws_secretsmanager_secret.ai_api_keys[0].arn : null
}

output "external_api_keys_secret_arn" {
  description = "ARN of the external API keys secret"
  value       = length(var.external_api_keys) > 0 ? aws_secretsmanager_secret.external_api_keys[0].arn : null
}

output "all_secret_arns" {
  description = "List of all secret ARNs"
  value = compact([
    var.db_password != "" ? aws_secretsmanager_secret.db_password[0].arn : "",
    var.cognito_client_secret != "" ? aws_secretsmanager_secret.cognito_client_secret[0].arn : "",
    length(var.oauth_credentials) > 0 ? aws_secretsmanager_secret.oauth_credentials[0].arn : "",
    length(var.ai_api_keys) > 0 ? aws_secretsmanager_secret.ai_api_keys[0].arn : "",
    length(var.external_api_keys) > 0 ? aws_secretsmanager_secret.external_api_keys[0].arn : ""
  ])
}
