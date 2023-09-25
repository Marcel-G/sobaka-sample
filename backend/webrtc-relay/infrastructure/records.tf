locals {
  certhash = "uEiDXi6oyueaK7rSLMyYhelA9CLYvj3FM7Zm0cxLVDIFGzA"
  peer_id  = "12D3KooWCgQsSM8K8ypFZAidbB487RtzSsbBQtoyd1h77bKe9xZd"
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