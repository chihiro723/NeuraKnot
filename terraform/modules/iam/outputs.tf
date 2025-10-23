output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS Task Execution Role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_execution_role_name" {
  description = "Name of the ECS Task Execution Role"
  value       = aws_iam_role.ecs_task_execution_role.name
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS Task Role"
  value       = aws_iam_role.ecs_task_role.arn
}

output "ecs_task_role_name" {
  description = "Name of the ECS Task Role"
  value       = aws_iam_role.ecs_task_role.name
}

output "rds_enhanced_monitoring_role_arn" {
  description = "ARN of the RDS Enhanced Monitoring Role"
  value       = var.enable_rds_enhanced_monitoring ? aws_iam_role.rds_enhanced_monitoring_role[0].arn : null
}

output "rds_enhanced_monitoring_role_name" {
  description = "Name of the RDS Enhanced Monitoring Role"
  value       = var.enable_rds_enhanced_monitoring ? aws_iam_role.rds_enhanced_monitoring_role[0].name : null
}

# GitHub Actions OIDC Outputs
output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM Role"
  value       = var.github_username != "" && var.github_repository != "" ? aws_iam_role.github_actions_role[0].arn : null
}

output "github_actions_role_name" {
  description = "Name of the GitHub Actions IAM Role"
  value       = var.github_username != "" && var.github_repository != "" ? aws_iam_role.github_actions_role[0].name : null
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC Identity Provider"
  value       = var.github_username != "" && var.github_repository != "" ? aws_iam_openid_connect_provider.github_actions[0].arn : null
}
