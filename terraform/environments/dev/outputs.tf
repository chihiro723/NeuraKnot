output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = module.cognito.user_pool_arn
}

output "cognito_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.cognito.client_id
}

output "cognito_client_secret" {
  description = "Secret of the Cognito User Pool Client"
  value       = module.cognito.client_secret
  sensitive   = true
}

output "cognito_domain" {
  description = "Domain of the Cognito User Pool"
  value       = module.cognito.domain
}

output "cognito_user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = module.cognito.user_pool_endpoint
}

output "cognito_issuer" {
  description = "Issuer URL of the Cognito User Pool"
  value       = module.cognito.issuer
}

# Environment information
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}
