data "aws_iam_policy_document" "this" {
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

resource "aws_iam_policy" "deploy_policy" {
  name   = "${var.name}-deploy-policy"
  policy = data.aws_iam_policy_document.this.json
}

resource "aws_iam_role_policy_attachment" "s3_bucket_policy_attachment" {
  policy_arn = aws_iam_policy.deploy_policy.arn
  role       = var.global_deploy_role
}