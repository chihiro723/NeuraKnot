output "zone_id" {
  description = "Route 53 Hosted Zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "Route 53 Name Servers"
  value       = aws_route53_zone.main.name_servers
}

output "zone_arn" {
  description = "Route 53 Hosted Zone ARN"
  value       = aws_route53_zone.main.arn
}

