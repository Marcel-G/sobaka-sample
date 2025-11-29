output "deploy_bucket" {
  description = "S3 bucket to deploy to"
  value       = module.storage.s3_bucket_id
}

output "deploy_bucket_domain" {
  description = "S3 bucket domain"
  value       = module.storage.s3_bucket_bucket_regional_domain_name
}
