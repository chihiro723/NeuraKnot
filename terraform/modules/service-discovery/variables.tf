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
  description = "VPC ID where the namespace will be created"
  type        = string
}

variable "service_name" {
  description = "Name of the service discovery service"
  type        = string
  default     = "python-ai"
}

variable "enable_go_backend_service" {
  description = "Enable service discovery for Go Backend"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
