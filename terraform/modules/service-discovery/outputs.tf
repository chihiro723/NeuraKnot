output "namespace_id" {
  description = "ID of the private DNS namespace"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "namespace_name" {
  description = "Name of the private DNS namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "namespace_arn" {
  description = "ARN of the private DNS namespace"
  value       = aws_service_discovery_private_dns_namespace.main.arn
}

output "python_ai_service_arn" {
  description = "ARN of the Python AI service discovery service"
  value       = aws_service_discovery_service.python_ai.arn
}

output "python_ai_service_name" {
  description = "Name of the Python AI service discovery service"
  value       = aws_service_discovery_service.python_ai.name
}

output "python_ai_service_id" {
  description = "ID of the Python AI service discovery service"
  value       = aws_service_discovery_service.python_ai.id
}

output "go_backend_service_arn" {
  description = "ARN of the Go Backend service discovery service"
  value       = var.enable_go_backend_service ? aws_service_discovery_service.go_backend[0].arn : null
}

output "go_backend_service_name" {
  description = "Name of the Go Backend service discovery service"
  value       = var.enable_go_backend_service ? aws_service_discovery_service.go_backend[0].name : null
}

output "go_backend_service_id" {
  description = "ID of the Go Backend service discovery service"
  value       = var.enable_go_backend_service ? aws_service_discovery_service.go_backend[0].id : null
}
