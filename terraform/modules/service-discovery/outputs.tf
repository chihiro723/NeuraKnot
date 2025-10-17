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

output "backend_python_service_arn" {
  description = "ARN of the Backend Python service discovery service"
  value       = aws_service_discovery_service.backend_python.arn
}

output "backend_python_service_name" {
  description = "Name of the Backend Python service discovery service"
  value       = aws_service_discovery_service.backend_python.name
}

output "backend_python_service_id" {
  description = "ID of the Backend Python service discovery service"
  value       = aws_service_discovery_service.backend_python.id
}

output "go_backend_service_arn" {
  description = "ARN of the Backend Go service discovery service"
  value       = var.enable_go_backend_service ? aws_service_discovery_service.go_backend[0].arn : null
}

output "go_backend_service_name" {
  description = "Name of the Backend Go service discovery service"
  value       = var.enable_go_backend_service ? aws_service_discovery_service.go_backend[0].name : null
}

output "go_backend_service_id" {
  description = "ID of the Backend Go service discovery service"
  value       = var.enable_go_backend_service ? aws_service_discovery_service.go_backend[0].id : null
}
