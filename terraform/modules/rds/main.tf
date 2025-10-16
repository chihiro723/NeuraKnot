# Random password for database
resource "random_password" "db_password" {
  count = var.db_password == "" ? 1 : 0

  length  = 16
  special = true
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  })
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
    description     = "PostgreSQL access from ECS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"

  # Engine settings
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  # Storage settings
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp2"
  storage_encrypted     = true

  # Database settings
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password != "" ? var.db_password : random_password.db_password[0].result

  # Network settings
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup settings
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window

  # Monitoring settings
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_role_arn

  # Performance Insights
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period

  # Multi-AZ deployment
  multi_az = var.multi_az

  # Deletion protection
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db"
  })

  depends_on = [aws_db_subnet_group.main]
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-${var.environment}-db-params"
  family = var.parameter_group_family

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-params"
  })
}
