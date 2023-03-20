module "acm" {
    source = "terraform-aws-modules/acm/aws"

    domain_name = "${var.subdomain}.${var.global_domain_zone}"
    zone_id     = data.aws_route53_zone.main.zone_id

    subject_alternative_names = [
      "*.${var.subdomain}.${var.global_domain_zone}",
    ]

    wait_for_validation = true

    tags = {
      Name = "${var.global_domain_zone}"
    }
}

data "aws_route53_zone" "main" {
  name         = var.global_domain_zone
}
