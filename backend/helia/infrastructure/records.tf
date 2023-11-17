module "records" {
  source  = "terraform-aws-modules/route53/aws//modules/records"
  version = "~> 2.0"

  zone_name = var.domain_name

  records = [
    {
      name = "bootstrap.${var.subdomain}"
      type = "A"
      ttl  = 3600
      records = [
        module.instance.public_ip,
      ]
    },
  ]
}
