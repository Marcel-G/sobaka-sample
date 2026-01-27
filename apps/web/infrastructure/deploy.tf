resource "aws_iam_role_policy" "s3_deploy_policy" {
  name = "${var.name}-s3-deploy-policy"
  role = var.global_deploy_role

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:*"]
        Resource = [
          module.storage.s3_bucket_arn,
          "${module.storage.s3_bucket_arn}/*",
        ]
      }
    ]
  })
}
