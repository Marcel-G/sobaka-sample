data "aws_iam_policy_document" "bucket_deploy" {
  statement {
     principals {
      type        = "AWS"
      identifiers = [var.global_deploy_role_arn]
    }

    actions   = ["cloudfront:CreateInvalidation"]
    resources = [module.cdn.cloudfront_distribution_arn]
    effect    = "Allow"
  }
  statement {
     principals {
      type        = "AWS"
      identifiers = [var.global_deploy_role_arn]
    }

    actions = ["s3:*"]
    resources = [
      module.storage.s3_bucket_arn,
      "${module.storage.s3_bucket_arn}/*",
    ]
    effect = "Allow"
  }
}