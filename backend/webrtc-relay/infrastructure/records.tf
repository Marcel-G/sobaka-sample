locals {
  peer_id  = "12D3KooWNDcBND5q9S8k1tQVtN4UXZ6y4RjqLH6LS25CuW4RXrPf"
  certhash = "uEiAVIAyvcKet4O79Ys6vaPetV_77dcY6EV9dOfNi_wA5PA"
}

module "records" {
  source  = "terraform-aws-modules/route53/aws//modules/records"
  version = "~> 2.0"

  zone_name = var.domain_name

  records = [
    {
      name = "_dnsaddr.${var.subdomain}"
      type = "TXT"
      records = [
        "dnsaddr=/ip4/${module.instance.public_ip}/udp/9090/webrtc-direct/certhash/${local.certhash}/p2p/${local.peer_id}"
      ]
      ttl = 300
    }
  ]
}