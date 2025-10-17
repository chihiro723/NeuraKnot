output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer"
  value       = aws_lb.main.arn_suffix
}

output "backend_go_target_group_arn" {
  description = "ARN of the Backend Go target group"
  value       = aws_lb_target_group.backend_go.arn
}

output "backend_go_target_group_name" {
  description = "Name of the Backend Go target group"
  value       = aws_lb_target_group.backend_go.name
}



output "http_listener_arn" {
  description = "ARN of the HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = var.ssl_certificate_arn != "" ? aws_lb_listener.https[0].arn : null
}
