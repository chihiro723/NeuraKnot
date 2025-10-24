# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

# ECR Outputs
output "ecr_repository_urls" {
  description = "Map of repository names to their URLs"
  value       = module.ecr.repository_urls
}

# Cognito Outputs
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

output "cognito_issuer" {
  description = "Issuer URL of the Cognito User Pool"
  value       = module.cognito.issuer
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_endpoint
}

output "rds_host" {
  description = "RDS instance host"
  value       = module.rds.db_host
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.db_port
}

output "rds_database_name" {
  description = "Database name"
  value       = module.rds.db_name
}

output "rds_username" {
  description = "Database username"
  value       = module.rds.db_username
}

# Bastion Outputs
output "bastion_instance_id" {
  description = "Instance ID of the bastion host"
  value       = module.bastion.instance_id
}

output "bastion_private_ip" {
  description = "Private IP of the bastion host"
  value       = module.bastion.private_ip
}

# ALB Outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.alb.alb_zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.alb.alb_arn
}

# ECS Outputs
output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = module.ecs.cluster_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "backend_go_service_name" {
  description = "Name of the Backend Go service"
  value       = module.ecs.backend_go_service_name
}

output "backend_python_service_name" {
  description = "Name of the Backend Python service"
  value       = module.ecs.backend_python_service_name
}


# Service Discovery Outputs
output "backend_python_service_discovery_name" {
  description = "Name of the Backend Python service discovery service"
  value       = module.service_discovery.backend_python_service_name
}

output "backend_python_service_discovery_namespace" {
  description = "Namespace of the Backend Python service discovery service"
  value       = module.service_discovery.namespace_name
}

# Environment Information
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

# Application URLs
output "application_url" {
  description = "URL of the application"
  value       = "https://${module.alb.alb_dns_name}"
}

output "api_url" {
  description = "URL of the API"
  value       = "https://${module.alb.alb_dns_name}/api"
}

# GitHub Actions OIDC Outputs
output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM Role (set this as AWS_ROLE_ARN in GitHub Secrets)"
  value       = module.iam.github_actions_role_arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC Identity Provider"
  value       = module.iam.github_oidc_provider_arn
}
