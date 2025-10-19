# AWS Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = var.user_pool_name

  # パスワードポリシー
  password_policy {
    minimum_length                   = var.password_minimum_length
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    temporary_password_validity_days = 7
  }

  # ユーザー属性設定
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # アカウント回復設定
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # スキーマ設定
  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }

  schema {
    attribute_data_type = "String"
    name                = "name"
    required            = true
    mutable             = true
  }

  # デバイス設定
  device_configuration {
    challenge_required_on_new_device      = false
    device_only_remembered_on_user_prompt = false
  }

  # ユーザープール設定
  user_pool_add_ons {
    advanced_security_mode = "OFF"
  }

  # タグ
  tags = var.tags
}

# AWS Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # 認証フロー設定
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  # トークン有効期限
  access_token_validity  = var.token_validity_access
  id_token_validity      = var.token_validity_access
  refresh_token_validity = var.token_validity_refresh

  # トークン生成設定
  generate_secret = true

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # サポートする認証プロバイダー（メールとパスワードのみ）
  supported_identity_providers = ["COGNITO"]

  # セキュリティ設定
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
}

# AWS Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${lower(var.project_name)}-${var.environment}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ドメイン用のランダム文字列
resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

