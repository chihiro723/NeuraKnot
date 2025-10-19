# Database Password Secret
resource "aws_secretsmanager_secret" "db_password" {
  count = var.db_password != "" ? 1 : 0

  name                    = "${var.project_name}-${var.environment}-db-password"
  description             = "Database password for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-password"
  })
}

resource "aws_secretsmanager_secret_version" "db_password" {
  count = var.db_password != "" ? 1 : 0

  secret_id = aws_secretsmanager_secret.db_password[0].id
  secret_string = jsonencode({
    password = var.db_password
  })
}

# Cognito Client Secret
resource "aws_secretsmanager_secret" "cognito_client_secret" {
  name                    = "${var.project_name}-${var.environment}-cognito-client-secret"
  description             = "Cognito client secret for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cognito-client-secret"
  })
}

resource "aws_secretsmanager_secret_version" "cognito_client_secret" {
  secret_id = aws_secretsmanager_secret.cognito_client_secret.id
  secret_string = jsonencode({
    client_secret = var.cognito_client_secret
  })
}

# AI API Keys Secret
resource "aws_secretsmanager_secret" "ai_api_keys" {
  count = length(var.ai_api_keys) > 0 ? 1 : 0

  name                    = "${var.project_name}-${var.environment}-ai-api-keys"
  description             = "AI API keys for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ai-api-keys"
  })
}

resource "aws_secretsmanager_secret_version" "ai_api_keys" {
  count = length(var.ai_api_keys) > 0 ? 1 : 0

  secret_id     = aws_secretsmanager_secret.ai_api_keys[0].id
  secret_string = jsonencode(var.ai_api_keys)
}

# External Service API Keys Secret
resource "aws_secretsmanager_secret" "external_api_keys" {
  count = length(var.external_api_keys) > 0 ? 1 : 0

  name                    = "${var.project_name}-${var.environment}-external-api-keys"
  description             = "External service API keys for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-external-api-keys"
  })
}

resource "aws_secretsmanager_secret_version" "external_api_keys" {
  count = length(var.external_api_keys) > 0 ? 1 : 0

  secret_id     = aws_secretsmanager_secret.external_api_keys[0].id
  secret_string = jsonencode(var.external_api_keys)
}
