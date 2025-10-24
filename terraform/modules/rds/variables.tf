variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "neuraKnot"
}

variable "vpc_id" {
  description = "VPC ID where RDS will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for RDS subnet group"
  type        = list(string)
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC for RDS security group ingress"
  type        = string
}

variable "db_password" {
  description = "Database password (if empty, random password will be generated)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "neuraKnot"
}

variable "db_username" {
  description = "Username for the database"
  type        = string
  default     = "postgres"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.8"
}

variable "allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}

variable "monitoring_role_arn" {
  description = "ARN of the monitoring role for enhanced monitoring"
  type        = string
  default     = null
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Performance Insights retention period in days"
  type        = number
  default     = 7
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when deleting"
  type        = bool
  default     = false
}

variable "parameter_group_family" {
  description = "DB parameter group family"
  type        = string
  default     = "postgres15"
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access RDS (for local development/migration)"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "ecs_security_group_id" {
  description = "Security group ID of ECS tasks (for SSM proxy access)"
  type        = string
  default     = ""
}
