module "storage" {
  source = "terraform-aws-modules/s3-bucket/aws"
  bucket = "${var.name}-storage"

  attach_policy = true
  policy = data.aws_iam_policy_document.this.json

}

data "aws_iam_policy_document" "this" {
  statement {
    principals {
      type        = "AWS"
      identifiers = [module.instance.iam_role_arn]
    }
    actions = ["s3:*"]
    resources = [
      module.storage.s3_bucket_arn,
      "${module.storage.s3_bucket_arn}/*",
    ]
    effect = "Allow"
  }
}
