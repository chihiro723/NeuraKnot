# Data source for latest Amazon Linux 2 AMI (ARM64)
data "aws_ami" "amazon_linux_2_arm" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-arm64-gp2"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

# Security Group for Bastion Host
resource "aws_security_group" "bastion" {
  name_prefix = "${var.project_name}-${var.environment}-bastion-"
  vpc_id      = var.vpc_id
  description = "Security group for SSM-managed bastion host"

  # SSM 経由でのみアクセスするため、インバウンドルールは不要
  # アウトバウンドは全て許可（yum update、SSM Agent、RDS接続など）
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-bastion-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# IAM Role for Bastion Host
resource "aws_iam_role" "bastion" {
  name_prefix = "${var.project_name}-${var.environment}-bastion-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-bastion-role"
  })
}

# Attach SSM Managed Instance Core policy
resource "aws_iam_role_policy_attachment" "bastion_ssm" {
  role       = aws_iam_role.bastion.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance Profile
resource "aws_iam_instance_profile" "bastion" {
  name_prefix = "${var.project_name}-${var.environment}-bastion-"
  role        = aws_iam_role.bastion.name

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-bastion-profile"
  })
}

# EC2 Bastion Instance
resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.amazon_linux_2_arm.id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  iam_instance_profile        = aws_iam_instance_profile.bastion.name
  associate_public_ip_address = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 8
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # IMDSv2 を強制
    http_put_response_hop_limit = 1
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    # Amazon Linux 2 には SSM Agent がプリインストール済み
    # SSM Agent を起動
    sudo systemctl enable amazon-ssm-agent
    sudo systemctl start amazon-ssm-agent
    
    # PostgreSQL クライアントツールをインストール
    sudo amazon-linux-extras install postgresql14 -y
    
    # システムを最新に更新
    sudo yum update -y
  EOF
  )

  tags = merge(var.tags, {
    Name      = "${var.project_name}-${var.environment}-bastion"
    Purpose   = "RDS Access via SSM"
    ManagedBy = "Terraform"
  })

  lifecycle {
    create_before_destroy = true
  }
}

