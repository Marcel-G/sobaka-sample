terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.59.0"
    }
  }

  cloud {
    organization = "marcel-gleeson"

    workspaces {
      tags = ["sobaka"]
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# `Error: Provider configuration not present` (can be removed after rollout)
# https://github.com/hashicorp/terraform/issues/21416
provider "aws" {
  region = "us-east-1"
  alias  = "us-east-1"
}

locals {
  domain = "marcelgleeson.com"
  stage  = "local"
}

module "global" {
  source = "./global"

  global_domain_zone = var.domain_name
  github_repo        = var.github_repo

  subdomain = var.subdomain
}

module "signaling" {
  source = "../backend/signaling/infrastructure"

  name                       = "sobaka-signaling-${terraform.workspace}"
  subdomain                  = "signaling.${var.subdomain}"
  domain_name                = var.domain_name
  global_acm_certificate_arn = module.global.global_acm_certificate_arn
}

module "frontend" {
  source = "../frontend/infrastructure"

  name                       = "sobaka-frontend-${terraform.workspace}"
  global_acm_certificate_arn = module.global.global_acm_certificate_arn
  global_deploy_role         = module.global.global_deploy_role.name

  subdomain   = var.subdomain
  domain_name = var.domain_name
}
