# Dev Environment - Cognito only
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  # backend "s3" {
  #   # S3 backend configuration will be set via terraform init -backend-config
  #   # Example: terraform init -backend-config="bucket=your-terraform-state-bucket"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}

# Cognito Module
module "cognito" {
  source = "../../modules/cognito"

  environment   = var.environment
  project_name  = var.project_name
  user_pool_name = "${var.project_name}-${var.environment}-user-pool"

  # Dev environment settings
  password_minimum_length = var.password_minimum_length
  token_validity_access   = var.token_validity_access
  token_validity_refresh  = var.token_validity_refresh

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}
