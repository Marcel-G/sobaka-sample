variable "website-domain-zone" {
  description = "Root domain zone to use in AWS eg, example.com"
  type        = string
}

variable "website-domain-main" {
  description = "FQDN for the website eg, website.example.com"
  type        = string
}


variable "tags" {
  description = "Tags added to resources"
  default     = {}
  type        = map(string)
}

variable "org" {
  description = "Github organisation name"
  type        = string
}

variable "repo-name" {
  description = "Github repo name"
  type        = string
}