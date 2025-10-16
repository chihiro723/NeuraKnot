output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_host" {
  description = "RDS instance host"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "Database username"
  value       = aws_db_instance.main.username
}

output "db_password" {
  description = "Database password"
  value       = var.db_password != "" ? var.db_password : random_password.db_password[0].result
  sensitive   = true
}

output "db_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "db_security_group_id" {
  description = "Security group ID of RDS"
  value       = aws_security_group.rds.id
}

output "db_subnet_group_name" {
  description = "DB subnet group name"
  value       = aws_db_subnet_group.main.name
}

output "db_parameter_group_name" {
  description = "DB parameter group name"
  value       = aws_db_parameter_group.main.name
}
