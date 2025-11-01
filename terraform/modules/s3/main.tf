variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_route_table_ids" {
  description = "Private route table IDs for VPC endpoint"
  type        = list(string)
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

# S3バケット
resource "aws_s3_bucket" "media" {
  bucket = "neuraknot-${var.environment}-media"

  tags = {
    Name        = "NeuraKnot Media Storage"
    Environment = var.environment
  }
}

# パブリックアクセスブロックの設定（avatarは公開）
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# バケットポリシー（avatarsフォルダは公開読み取り可能）
resource "aws_s3_bucket_policy" "media_policy" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.media.arn}/avatars/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.media]
}

# バージョニングの有効化
resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = "Enabled"
  }
}

# 暗号化の設定
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ライフサイクルポリシー
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "delete-temp-files"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }

  rule {
    id     = "transition-old-attachments"
    status = "Enabled"

    filter {
      prefix = "attachments/"
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

# CORS設定
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"] # 本番環境では特定のドメインに制限すべき
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# VPC Endpoint（Gateway型 - 無料）
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = var.vpc_id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = var.private_route_table_ids

  tags = {
    Name        = "neuraknot-${var.environment}-s3-endpoint"
    Environment = var.environment
  }
}

# 出力
output "bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.media.id
}

output "bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.media.arn
}

output "bucket_domain_name" {
  description = "S3 bucket domain name"
  value       = aws_s3_bucket.media.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "S3 bucket regional domain name"
  value       = aws_s3_bucket.media.bucket_regional_domain_name
}

output "vpc_endpoint_id" {
  description = "VPC endpoint ID"
  value       = aws_vpc_endpoint.s3.id
}

