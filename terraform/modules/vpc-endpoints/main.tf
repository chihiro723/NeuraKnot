# VPC Endpoints for ECS Exec (SSM Session Manager)
# プライベートサブネットでECS Execを使用するために必要なエンドポイント

# SSM用VPCエンドポイント
resource "aws_vpc_endpoint" "ssm" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ssm-endpoint"
  })
}

# SSM Messages用VPCエンドポイント（Session Manager通信用）
resource "aws_vpc_endpoint" "ssmmessages" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ssmmessages-endpoint"
  })
}

# EC2 Messages用VPCエンドポイント（ECS Exec通信用）
resource "aws_vpc_endpoint" "ec2messages" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.ec2messages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ec2messages-endpoint"
  })
}

# CloudWatch Logs用VPCエンドポイント（オプション：ログ出力用）
resource "aws_vpc_endpoint" "logs" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-logs-endpoint"
  })
}

# VPCエンドポイント用セキュリティグループ
resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.project_name}-${var.environment}-vpc-endpoints-sg"
  description = "Security group for VPC endpoints (SSM, SSM Messages, EC2 Messages, Logs)"
  vpc_id      = var.vpc_id

  # ECSタスクからのHTTPSアクセスを許可
  ingress {
    description     = "HTTPS from ECS tasks"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }

  # 全てのアウトバウンドを許可
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-vpc-endpoints-sg"
  })
}

