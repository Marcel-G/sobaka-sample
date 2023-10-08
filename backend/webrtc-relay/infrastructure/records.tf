locals {
  peer_id  = "12D3KooWCBY1V7j9u8rjf2bE4DbMmUYRVKXSFRMJT6zwWBuackFa"
  certhash = "uEiBnJpbCl6lKEZmXUR2hO8TAO8S3Gf2Eyxwues0umqCCyQ"
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