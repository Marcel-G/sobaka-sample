output "deploy_bucket" {
  description = "S3 bucket to deploy to"
  value       = module.storage.s3_bucket_id
}

output "cloudfront_distribution_id" {
  description = "Main CloudFront Distribution ID"
  value       = module.cdn.cloudfront_distribution_id
}