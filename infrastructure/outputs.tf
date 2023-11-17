output "deploy_bucket" {
  description = "S3 bucket to deploy to"
  value       = module.frontend.deploy_bucket
}

output "cdn_distribution_id" {
  description = "Main CloudFront Distribution ID"
  value       = module.frontend.cloudfront_distribution_id
}

output "deploy_role" {
  description = "AWS role ARN to assume in order to make deployments"
  value       = module.global.global_deploy_role.arn
}

output "ecr_repository_helia" {
  value = module.backend.ecr_repository_helia
}

output "instance_id_helia" {
  value = module.backend.instance_id_helia
}