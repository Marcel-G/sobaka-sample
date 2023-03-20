output "global_acm_certificate_arn" {
  description = "Global ACM Certificate ARN"
  value       = module.acm.acm_certificate_arn
}

output "global_deploy_role" {
  description = "Global deploy role for Github Actions"
  value       = module.iam_role.this
}

output "global_zone_id" {
  description = "Global zone ID"
  value       = data.aws_route53_zone.main.zone_id
}
