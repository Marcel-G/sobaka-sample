variable "global_domain_zone" {
  description = "Root domain zone to use in AWS eg, example.com"
  type        = string
}

// @todo make this optional
variable "subdomain" {
  description = "Sub domain to use"
  type        = string
}

variable "github_repo" {
  description = "Github repo name"
  type        = string
}

variable "manage_shared_resources" {
  description = "Whether this workspace should manage shared resources (IAM role). Set to true for only one workspace."
  type        = bool
  default     = false
}

variable "deploy_role_name" {
  description = "Name of the existing deploy role to reference (only used when manage_shared_resources is false)"
  type        = string
  default     = null
}