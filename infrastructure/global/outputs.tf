output "global_acm_certificate_arn" {
  description = "Global ACM Certificate ARN"
  value       = module.acm.acm_certificate_arn
}

output "global_deploy_policy" {
  description = "Global deploy policy for Github Actions"
  value       = data.aws_iam_policy_document.assume_deploy_role.json
}

output "global_zone_id" {
  description = "Global zone ID"
  value       = data.aws_route53_zone.main.zone_id
}
