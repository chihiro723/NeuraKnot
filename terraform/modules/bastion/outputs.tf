output "instance_id" {
  description = "Bastion host instance ID"
  value       = aws_instance.bastion.id
}

output "instance_arn" {
  description = "Bastion host instance ARN"
  value       = aws_instance.bastion.arn
}

output "security_group_id" {
  description = "Security group ID of bastion host"
  value       = aws_security_group.bastion.id
}

output "iam_role_name" {
  description = "IAM role name of bastion host"
  value       = aws_iam_role.bastion.name
}

output "iam_role_arn" {
  description = "IAM role ARN of bastion host"
  value       = aws_iam_role.bastion.arn
}

output "private_ip" {
  description = "Private IP address of bastion host"
  value       = aws_instance.bastion.private_ip
}

