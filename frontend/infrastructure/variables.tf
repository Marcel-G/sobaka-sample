variable "name" {
  description = "Resource name"
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

variable "global_deploy_role" {
  description = "Deployment role json"
  type        = string
}

variable "zone_id" {
  description = "Global zone ID"
  type        = string
}
