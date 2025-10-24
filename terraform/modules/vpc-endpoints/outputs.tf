output "ssm_endpoint_id" {
  description = "ID of the SSM VPC endpoint"
  value       = aws_vpc_endpoint.ssm.id
}

output "ssmmessages_endpoint_id" {
  description = "ID of the SSM Messages VPC endpoint"
  value       = aws_vpc_endpoint.ssmmessages.id
}

output "ec2messages_endpoint_id" {
  description = "ID of the EC2 Messages VPC endpoint"
  value       = aws_vpc_endpoint.ec2messages.id
}

output "logs_endpoint_id" {
  description = "ID of the CloudWatch Logs VPC endpoint"
  value       = aws_vpc_endpoint.logs.id
}

output "vpc_endpoints_security_group_id" {
  description = "Security group ID for VPC endpoints"
  value       = aws_security_group.vpc_endpoints.id
}

