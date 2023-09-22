locals {
  name = var.name
}

module "webrtc_relay" {
  source = "../webrtc-relay/infrastructure"
  name   = "${local.name}-webrtc-relay"

  global_deploy_role         = var.global_deploy_role
}