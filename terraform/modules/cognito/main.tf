# AWS Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = var.user_pool_name

  # パスワードポリシー
  password_policy {
    minimum_length    = var.password_minimum_length
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
    temporary_password_validity_days = 7
  }

  # ユーザー属性設定
  username_attributes = ["email"]
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

  # サポートする認証プロバイダー
  supported_identity_providers = var.enable_oauth ? [
    "COGNITO",
    "Google",
    "LINE",
    "Apple"
  ] : ["COGNITO"]

  # コールバックURL設定
  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  # スコープ設定
  allowed_oauth_flows = var.enable_oauth ? ["code", "implicit"] : []
  allowed_oauth_scopes = var.enable_oauth ? [
    "email",
    "openid",
    "profile"
  ] : []
  allowed_oauth_flows_user_pool_client = var.enable_oauth

  # セキュリティ設定
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
}

# AWS Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ドメイン用のランダム文字列
resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

# OAuth Identity Providers (条件付き)
resource "aws_cognito_identity_provider" "google" {
  count = var.enable_oauth && contains(keys(var.oauth_providers), "google") ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "email openid profile"
    client_id        = var.oauth_providers["google"].client_id
    client_secret    = var.oauth_providers["google"].client_secret
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }
}

resource "aws_cognito_identity_provider" "line" {
  count = var.enable_oauth && contains(keys(var.oauth_providers), "line") ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "LINE"
  provider_type = "OIDC"

  provider_details = {
    authorize_scopes = "openid profile"
    client_id        = var.oauth_providers["line"].client_id
    client_secret    = var.oauth_providers["line"].client_secret
    oidc_issuer      = "https://access.line.me"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }
}

resource "aws_cognito_identity_provider" "apple" {
  count = var.enable_oauth && contains(keys(var.oauth_providers), "apple") ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Apple"
  provider_type = "Apple"

  provider_details = {
    authorize_scopes = "email name"
    client_id        = var.oauth_providers["apple"].client_id
    client_secret    = var.oauth_providers["apple"].client_secret
    team_id          = var.oauth_providers["apple"].team_id
    key_id           = var.oauth_providers["apple"].key_id
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }
}
