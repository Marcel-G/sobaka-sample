terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    acme = {
      source  = "vancluever/acme"
      version = "~> 2.14"
    }
   tls = {
     source = "hashicorp/tls"
     version = "~> 4.0.4"
    }
  }
}