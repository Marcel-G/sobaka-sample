variable "global_domain_zone" {
  description = "Root domain zone to use in AWS eg, example.com"
  type        = string
}

// @todo make this optional
variable "subdomain" {
  description = "Sub domain to use"
  type        = string
}

variable "repo_org" {
  description = "Github organisation name"
  type        = string
}

variable "repo_name" {
  description = "Github repo name"
  type        = string
}