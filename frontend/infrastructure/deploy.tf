resource "aws_iam_role" "gha_deploy_role" {
  name = "${var.name}-deploy-role"

  inline_policy {
    name   = "deploy_policy"
    policy = data.aws_iam_policy_document.bucket_deploy.json
  }

  assume_role_policy = var.global_deploy_role
}

data "aws_iam_policy_document" "bucket_deploy" {
  statement {
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [module.cdn.cloudfront_distribution_arn]
    effect    = "Allow"
  }
  statement {
    actions = ["s3:*"]
    resources = [
      module.storage.s3_bucket_arn,
      "${module.storage.s3_bucket_arn}/*",
    ]
    effect = "Allow"
  }
}