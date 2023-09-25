locals {
  name = var.name
}

module "webrtc_relay" {
  source = "../webrtc-relay/infrastructure"
  name   = "${local.name}-webrtc-relay"

  global_deploy_role = var.global_deploy_role

  subdomain   = var.subdomain
  domain_name = var.domain_name
}

output "ecr_repository_webrtc_relay" {
  value = module.webrtc_relay.ecr_repository
}

output "instance_id_webrtc_relay" {
  value = module.webrtc_relay.instance_id
}