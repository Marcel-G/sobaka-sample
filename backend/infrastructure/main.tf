locals {
  name = var.name
}

module "helia" {
  source = "../helia/infrastructure"
  name   = "${local.name}-helia"

  global_deploy_role = var.global_deploy_role

  subdomain   = var.subdomain
  domain_name = var.domain_name
}

output "ecr_repository_helia" {
  value = module.helia.ecr_repository
}

output "instance_id_helia" {
  value = module.helia.instance_id
}