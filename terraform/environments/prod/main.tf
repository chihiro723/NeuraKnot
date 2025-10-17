# Prod Environment - Full Stack
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

  backend "s3" {
    # S3 backend configuration will be set via terraform init -backend-config
    # Example: terraform init -backend-config="bucket=your-terraform-state-bucket"
  }
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

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  environment   = var.environment
  project_name  = var.project_name
  vpc_cidr      = var.vpc_cidr
  availability_zones = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# ECR Module
module "ecr" {
  source = "../../modules/ecr"

  environment  = var.environment
  project_name = var.project_name
  repositories = var.ecr_repositories

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Cognito Module
module "cognito" {
  source = "../../modules/cognito"

  environment   = var.environment
  project_name  = var.project_name
  user_pool_name = "${var.project_name}-${var.environment}-user-pool"

  password_minimum_length = var.password_minimum_length
  token_validity_access   = var.token_validity_access
  token_validity_refresh  = var.token_validity_refresh
  enable_oauth            = var.enable_oauth

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls
  oauth_providers = var.oauth_providers

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Secrets Manager Module
module "secrets" {
  source = "../../modules/secrets"

  environment  = var.environment
  project_name = var.project_name

  db_password           = var.db_password
  cognito_client_secret = module.cognito.client_secret
  oauth_credentials     = var.oauth_credentials
  ai_api_keys          = var.ai_api_keys
  external_api_keys    = var.external_api_keys

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# IAM Module
module "iam" {
  source = "../../modules/iam"

  environment  = var.environment
  project_name = var.project_name

  secrets_manager_arns     = module.secrets.all_secret_arns
  cognito_user_pool_arn    = module.cognito.user_pool_arn
  service_discovery_arn    = module.service_discovery.backend_python_service_arn
  enable_rds_enhanced_monitoring = var.enable_rds_enhanced_monitoring

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Service Discovery Module
module "service_discovery" {
  source = "../../modules/service-discovery"

  environment  = var.environment
  project_name = var.project_name
  vpc_id       = module.vpc.vpc_id
  service_name = var.backend_python_service_name

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# RDS Module
module "rds" {
  source = "../../modules/rds"

  environment  = var.environment
  project_name = var.project_name

  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  ecs_security_group_id = module.ecs.ecs_security_group_id

  db_password           = var.db_password
  db_name               = var.db_name
  db_username           = var.db_username
  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  backup_retention_period = var.rds_backup_retention_period
  multi_az              = var.rds_multi_az
  deletion_protection   = var.rds_deletion_protection
  monitoring_role_arn   = module.iam.rds_enhanced_monitoring_role_arn

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# ALB Module
module "alb" {
  source = "../../modules/alb"

  environment  = var.environment
  project_name = var.project_name

  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  health_check_path  = var.alb_health_check_path
  enable_deletion_protection = var.alb_enable_deletion_protection
  ssl_certificate_arn = var.ssl_certificate_arn

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# ECS Module
module "ecs" {
  source = "../../modules/ecs"

  environment  = var.environment
  project_name = var.project_name

  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_security_group_id = module.alb.alb_security_group_id

  ecs_task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  ecs_task_role_arn           = module.iam.ecs_task_role_arn

  backend_go_target_group_arn = module.alb.backend_go_target_group_arn

  backend_python_service_discovery_arn    = module.service_discovery.backend_python_service_arn
  backend_python_service_discovery_name   = module.service_discovery.backend_python_service_name
  backend_python_service_discovery_namespace = module.service_discovery.namespace_name

  secrets_manager_arns = module.secrets.all_secret_arns

  # Database configuration
  db_host     = module.rds.db_host
  db_port     = module.rds.db_port
  db_username = module.rds.db_username
  db_name     = module.rds.db_name

  # Cognito configuration
  cognito_user_pool_id    = module.cognito.user_pool_id
  cognito_client_id       = module.cognito.client_id
  cognito_redirect_url    = var.cognito_redirect_url

  # Container images
  backend_go_image = var.backend_go_image
  backend_python_image  = var.backend_python_image
  # Container configuration
  backend_go_cpu    = var.backend_go_cpu
  backend_go_memory = var.backend_go_memory
  backend_python_cpu     = var.backend_python_cpu
  backend_python_memory  = var.backend_python_memory
  # Service configuration
  backend_go_desired_count = var.backend_go_desired_count
  backend_python_desired_count  = var.backend_python_desired_count

  # Logging configuration
  log_retention_in_days = var.log_retention_in_days
  aws_region          = var.aws_region
}
