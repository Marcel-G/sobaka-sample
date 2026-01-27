module "storage" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 4.6"

  bucket        = "${var.name}-storage"
  force_destroy = true
}

data "aws_iam_policy_document" "storage_policy" {
  # Origin Access Identities
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${module.storage.s3_bucket_arn}/*"]

    principals {
      type        = "AWS"
      identifiers = var.cdn.cloudfront_origin_access_identity_iam_arns
    }
  }

  # Origin Access Controls
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${module.storage.s3_bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [var.cdn.cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = module.storage.s3_bucket_id
  policy = data.aws_iam_policy_document.storage_policy.json
}
