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

variable "global_acm_certificate_arn" {
  description = "Global ACM Certificate ARN"
  type        = string
}