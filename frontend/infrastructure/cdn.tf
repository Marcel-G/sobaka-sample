module "cdn" {
  source = "terraform-aws-modules/cloudfront/aws"

  aliases = ["${var.subdomain}.${var.domain_name}"]

  comment             = "Frontend web-asset CDN (${var.name})"
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
      domain_name           = module.storage.s3_bucket_bucket_regional_domain_name
      origin_access_control = "storage"
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

  viewer_certificate = {
    acm_certificate_arn = var.global_acm_certificate_arn
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
  name = "${var.name}-cross-origin-isolation-policy"

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
