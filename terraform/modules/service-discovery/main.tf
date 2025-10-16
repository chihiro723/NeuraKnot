# Private DNS Namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.project_name}-${var.environment}.local"
  description = "Private DNS namespace for ${var.project_name} ${var.environment}"
  vpc         = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-namespace"
  })
}

# Service Discovery Service for Python AI
resource "aws_service_discovery_service" "python_ai" {
  name = var.service_name

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_grace_period_seconds = 30

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-${var.service_name}"
  })
}

# Service Discovery Service for Go Backend (optional)
resource "aws_service_discovery_service" "go_backend" {
  count = var.enable_go_backend_service ? 1 : 0

  name = "go-backend"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_grace_period_seconds = 30

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-go-backend"
  })
}
