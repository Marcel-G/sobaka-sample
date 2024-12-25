module "cdn" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "~> 3.0"

  aliases = ["${var.subdomain}.${var.domain_name}"]

  comment             = "Main CDN (${terraform.workspace})"
  enabled             = true
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  price_class         = "PriceClass_All"
  retain_on_delete    = false
  wait_for_deployment = false

  create_origin_access_identity = true

  origin_access_identities = {
    storage = "S3 storage origin"
  }

  create_origin_access_control = true
  origin_access_control = {
    storage = {
      description      = "CloudFront access to storage S3"
      origin_type      = "s3"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }

  origin = {
    storage = { # with origin access control settings
      domain_name           = module.frontend.deploy_bucket_domain
      origin_access_control = "storage"
    }
    websocket = {
      domain_name = module.backend.instance.public_dns
      custom_origin_config = {
        origin_protocol_policy = "http-only"
        http_port              = 8000
        https_port             = 443
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior = {
    target_origin_id       = "storage"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    min_ttl                = "0"
    default_ttl            = "300"
    max_ttl                = "1200"

    response_headers_policy_id = aws_cloudfront_response_headers_policy.cross_origin_isolation.id
  }

  ordered_cache_behavior = [
    {
      path_pattern           = "/signaling*"
      target_origin_id       = "websocket"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods         = ["GET", "HEAD"],
      cookies_forward           = "whitelist"
      cookies_whitelisted_names = ["jwt"]
    },
    {
      path_pattern           = "/_app/immutable*"
      target_origin_id       = "storage"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      compress               = true
      min_ttl                = 31536000 # 1 year
      default_ttl            = 31536000 # 1 year
      max_ttl                = 31536000 # 1 year
      response_headers_policy_id = aws_cloudfront_response_headers_policy.cross_origin_isolation.id
    }
  ]

  viewer_certificate = {
    acm_certificate_arn = module.global.global_acm_certificate_arn
    ssl_support_method  = "sni-only"
  }

  default_root_object = "index.html"
  custom_error_response = [{
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
    }, {
    error_code         = 403
    response_code      = 403
    response_page_path = "/404.html"
  }]
}

# Cross origion isolation for SharedArrayBuffer usage
# https://web.dev/cross-origin-isolation-guide/
resource "aws_cloudfront_response_headers_policy" "cross_origin_isolation" {
  name = "${terraform.workspace}-cross-origin-isolation-policy"

  custom_headers_config {
    items {
      header   = "Cross-Origin-Embedder-Policy"
      override = true
      value    = "require-corp"
    }

    items {
      header   = "Cross-Origin-Opener-Policy"
      override = true
      value    = "same-origin"
    }
  }
}

data "aws_iam_policy_document" "this" {
  statement {
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [module.cdn.cloudfront_distribution_arn]
    effect    = "Allow"
  }
}

resource "aws_iam_policy" "deploy_policy" {
  name   = "${terraform.workspace}-deploy-policy"
  policy = data.aws_iam_policy_document.this.json
}

resource "aws_iam_role_policy_attachment" "s3_bucket_policy_attachment" {
  policy_arn = aws_iam_policy.deploy_policy.arn
  role       = module.global.global_deploy_role.name
}
