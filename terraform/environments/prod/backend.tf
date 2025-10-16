# S3 Backend Configuration
# This file is used to configure the S3 backend for storing Terraform state
# 
# To use this backend, run:
# terraform init -backend-config="bucket=your-terraform-state-bucket" \
#                -backend-config="key=prod/terraform.tfstate" \
#                -backend-config="region=ap-northeast-1" \
#                -backend-config="dynamodb_table=terraform-state-lock" \
#                -backend-config="encrypt=true"

# Example backend configuration (uncomment and modify as needed):
# terraform {
#   backend "s3" {
#     bucket         = "your-terraform-state-bucket"
#     key            = "prod/terraform.tfstate"
#     region         = "ap-northeast-1"
#     dynamodb_table = "terraform-state-lock"
#     encrypt        = true
#   }
# }
