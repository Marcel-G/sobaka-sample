variable "server_url" {
  type = string
  default = "https://acme-staging-v02.api.letsencrypt.org/directory"
}

variable "common_name" {
  type = string
}

variable "email" {
  type = string
}

variable "dns_alt_names" {
  type = list(string)
  default = []
}

variable "s3_bucket_name" {
  type = string
}

variable "aws_region" {
  type = string
  default = "eu-west-1"
}