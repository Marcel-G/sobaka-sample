variable "name" {
  description = "Resource name"
  type        = string
}

variable "global_deploy_role" {
  description = "Deployment role name"
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