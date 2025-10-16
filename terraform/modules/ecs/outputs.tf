output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "backend_go_service_name" {
  description = "Name of the backend Go service"
  value       = aws_ecs_service.backend_go.name
}

output "backend_go_service_arn" {
  description = "ARN of the backend Go service"
  value       = aws_ecs_service.backend_go.id
}

output "python_ai_service_name" {
  description = "Name of the Python AI service"
  value       = aws_ecs_service.python_ai.name
}

output "python_ai_service_arn" {
  description = "ARN of the Python AI service"
  value       = aws_ecs_service.python_ai.id
}

output "frontend_service_name" {
  description = "Name of the frontend service"
  value       = var.enable_frontend ? aws_ecs_service.frontend[0].name : null
}

output "frontend_service_arn" {
  description = "ARN of the frontend service"
  value       = var.enable_frontend ? aws_ecs_service.frontend[0].id : null
}

output "ecs_security_group_id" {
  description = "Security group ID of ECS tasks"
  value       = aws_security_group.ecs.id
}

output "backend_go_task_definition_arn" {
  description = "ARN of the backend Go task definition"
  value       = aws_ecs_task_definition.backend_go.arn
}

output "python_ai_task_definition_arn" {
  description = "ARN of the Python AI task definition"
  value       = aws_ecs_task_definition.python_ai.arn
}

output "frontend_task_definition_arn" {
  description = "ARN of the frontend task definition"
  value       = var.enable_frontend ? aws_ecs_task_definition.frontend[0].arn : null
}

output "backend_go_log_group_name" {
  description = "Name of the backend Go log group"
  value       = aws_cloudwatch_log_group.backend_go.name
}

output "python_ai_log_group_name" {
  description = "Name of the Python AI log group"
  value       = aws_cloudwatch_log_group.python_ai.name
}

output "frontend_log_group_name" {
  description = "Name of the frontend log group"
  value       = var.enable_frontend ? aws_cloudwatch_log_group.frontend[0].name : null
}
