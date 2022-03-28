output "website_cdn_root_id" {
  description = "Main CloudFront Distribution ID"
  value       = aws_cloudfront_distribution.website_cdn_root.id
}

output "website_root_s3_bucket" {
  description = "The website root bucket where resources are uploaded"
  value       = aws_s3_bucket.website_root.bucket
}

output "website_logs_s3_bucket" {
  description = "The s3 bucket of the website logs"
  value       = aws_s3_bucket.website_logs.bucket
}

output "role-to-assume" {
  description = "AWS role arn to assume in order to make deployments"
  value       = aws_iam_role.gha_deploy_role.arn
}