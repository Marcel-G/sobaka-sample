terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.59.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

// @todo -- create or use existing https://github.com/terraform-aws-modules/terraform-aws-acm/blob/master/examples/complete-dns-validation/main.tf#L18
data "aws_route53_zone" "main" {
  name         = var.global_domain_zone
}
