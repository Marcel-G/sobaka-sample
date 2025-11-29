variable "name" {
  description = "Resource name"
  type        = string
}

variable "subdomain" {
  description = "Subdomain to use"
  type        = string
}

variable "domain_name" {
  description = "Root domain name to use"
  type        = string
}

variable "cdn" {
  description = "CDN module"
  type        = any
}

variable "global_deploy_role" {
  description = "Deployment role ARN"
  type        = string
}

