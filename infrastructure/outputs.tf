output "deploy_bucket" {
  description = "S3 bucket to deploy to"
  value       = module.frontend.deploy_bucket
}

output "cdn_distribution_id" {
  description = "Main CloudFront Distribution ID"
  value       = module.cdn.cloudfront_distribution_id
}

output "deploy_role" {
  description = "AWS role ARN to assume in order to make deployments"
  value       = module.global.global_deploy_role.arn
}

output "signaling_ecr_url" {
  value = module.signaling.ecr_url
}

output "instance_id" {
  value = module.backend.instance.id
}
