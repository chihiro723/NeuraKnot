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
  description = "Name of the Backend Go service"
  value       = aws_ecs_service.backend_go.name
}

output "backend_go_service_arn" {
  description = "ARN of the Backend Go service"
  value       = aws_ecs_service.backend_go.id
}

output "backend_python_service_name" {
  description = "Name of the Backend Python service"
  value       = aws_ecs_service.backend_python.name
}

output "backend_python_service_arn" {
  description = "ARN of the Backend Python service"
  value       = aws_ecs_service.backend_python.id
}



output "backend_go_task_definition_arn" {
  description = "ARN of the Backend Go task definition"
  value       = aws_ecs_task_definition.backend_go.arn
}

output "backend_python_task_definition_arn" {
  description = "ARN of the Backend Python task definition"
  value       = aws_ecs_task_definition.backend_python.arn
}


output "backend_go_log_group_name" {
  description = "Name of the Backend Go log group"
  value       = aws_cloudwatch_log_group.backend_go.name
}

output "backend_python_log_group_name" {
  description = "Name of the Backend Python log group"
  value       = aws_cloudwatch_log_group.backend_python.name
}

output "service_arns" {
  description = "List of ECS service ARNs"
  value       = [aws_ecs_service.backend_go.id, aws_ecs_service.backend_python.id]
}
