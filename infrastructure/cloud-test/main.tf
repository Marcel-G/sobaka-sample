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
      name = "sobaka-sample-test"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

locals {
  domain = "marcelgleeson.com"
  stage = "local"

  subdomain = "test"

  repo_name = "sobaka"
  repo_org = "sobaka"
}

module "global" {
  source = "../global"

  global_domain_zone = local.domain
  repo_name = local.repo_name
  repo_org = local.repo_org

  subdomain = local.subdomain
}

module "signaling" {
  source = "../../backend/signaling/infrastructure"

  name = "signaling-${local.stage}"
  subdomain = "signaling.${local.subdomain}"
  domain_name = local.domain
  global_acm_certificate_arn = module.global.global_acm_certificate_arn
}

# module "frontend" {
#   source = "../../frontend/infrastructure"

#   name = "frontend-${local.stage}"
#   zone_id = module.global.global_zone_id
#   global_acm_certificate_arn = module.global.global_acm_certificate_arn
#   global_deploy_role = module.global.global_deploy_policy
#   domain_name = local.domain
# }
