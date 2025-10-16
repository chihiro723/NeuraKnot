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
