provider "aws" {
  region = var.aws_region
}

module "storage" {
  source = "terraform-aws-modules/s3-bucket/aws"
  bucket = var.s3_bucket_name
}

resource "aws_s3_object" "private_key" {
  depends_on = [ module.storage ]
  bucket = var.s3_bucket_name
  key = "${var.common_name}.key"
  content = acme_certificate.certificate.private_key_pem
}

resource "aws_s3_object" "certificate" {
  depends_on = [ module.storage ]
  bucket = var.s3_bucket_name
  key = "${var.common_name}.crt"
  content = acme_certificate.certificate.certificate_pem
}

resource "aws_s3_object" "issuer_pem" {
  depends_on = [ module.storage ]
  bucket = var.s3_bucket_name
  key = "${var.common_name}.pem"
  content = acme_certificate.certificate.issuer_pem
}

output "s3_bucket_arn" {
  value = module.storage.s3_bucket_arn
}