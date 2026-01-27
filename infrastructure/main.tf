terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.37.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.7.0"
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

  # Only sobaka-prod manages shared resources (IAM role)
  manage_shared_resources = terraform.workspace == "sobaka-prod"
  
  # Role name for non-primary workspaces to reference
  deploy_role_name = "github-actions-32602335e8a5d3f5d1531471d5a77f10"
}

module "backend" {
  source             = "./backend"
  name               = "sobaka-instance-${terraform.workspace}"
  global_deploy_role = module.global.global_deploy_role.name
}

module "signaling" {
  source = "../apps/signaling/infrastructure"

  name               = "sobaka-signaling-${terraform.workspace}"
  global_deploy_role = module.global.global_deploy_role.name

  instance = module.backend.instance
}

module "persistence" {
  source = "../apps/persistence/infrastructure"

  name               = "sobaka-persistence-${terraform.workspace}"
  global_deploy_role = module.global.global_deploy_role.name

  instance = module.backend.instance
}

module "web" {
  source = "../apps/web/infrastructure"

  name               = "sobaka-web-${terraform.workspace}"
  global_deploy_role = module.global.global_deploy_role.name
  cdn                = module.cdn

  subdomain   = var.subdomain
  domain_name = var.domain_name
}
