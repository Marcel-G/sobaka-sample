output "global_acm_certificate_arn" {
  description = "Global ACM Certificate ARN"
  value       = module.acm.acm_certificate_arn
}

output "global_deploy_role" {
  description = "Global deploy role for Github Actions"
  value       = local.deploy_role
}

output "global_zone_id" {
  description = "Global zone ID"
  value       = data.aws_route53_zone.main.zone_id
}

