variable "domain_name" {
  description = "Root domain zone name to use in AWS eg, example.com"
  type        = string
}

variable "subdomain" {
  description = "The subomain at which to apply the resources"
  type        = string
}

variable "github_repo" {
  description = "Github repo name"
  type        = string
}