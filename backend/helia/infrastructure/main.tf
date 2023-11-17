locals {
  name = var.name
}

module "ssl" {
  source         = "./ssl"
  common_name    = "bootstrap.${var.subdomain}.${var.domain_name}"
  email          = "admin@next.sobaka.marcelgleeson.com"
  s3_bucket_name = "sobaka-ssl"
  server_url     = "https://acme-v02.api.letsencrypt.org/directory"
}

data "aws_iam_role" "deploy" {
  name = var.global_deploy_role
}

// @todo move this -- readonly access to ssl certs
data "aws_iam_policy_document" "ssl_read" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion"
    ]
    resources = [
      module.ssl.s3_bucket_arn,
      "${module.ssl.s3_bucket_arn}/*",
    ]
    effect = "Allow"
  }
}

resource "aws_iam_policy" "ssl_read_policy" {
  name   = "${var.name}-ssl-read-policy"
  policy = data.aws_iam_policy_document.ssl_read.json
}

resource "aws_iam_role_policy_attachment" "s3_bucket_policy_attachment" {
  policy_arn = aws_iam_policy.ssl_read_policy.arn
  role       = module.instance.iam_role_name
}
