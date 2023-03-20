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