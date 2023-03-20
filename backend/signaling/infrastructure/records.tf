module "records" {
  source  = "terraform-aws-modules/route53/aws//modules/records"
  version = "~> 2.0"

  zone_name = var.domain_name

  records = [
    {
      name = var.subdomain
      type = "A"

      alias = {
        name    = module.gateway.apigatewayv2_domain_name_configuration[0].target_domain_name
        zone_id = module.gateway.apigatewayv2_domain_name_configuration[0].hosted_zone_id
      }
    },
  ]
}