module "gateway" {
  source  = "terraform-aws-modules/apigateway-v2/aws"
  version = "2.2.2"

  name = "${var.name}-gateway"

  domain_name = "${var.subdomain}.${var.domain_name}"
  domain_name_certificate_arn = var.global_acm_certificate_arn

  protocol_type = "WEBSOCKET"
  route_selection_expression = "$request.body.action"

  integrations = {
    "$connect" = {
      lambda_arn = module.lambda.lambda_function_arn
    }
    "$disconnect" = {
      lambda_arn = module.lambda.lambda_function_arn
    }
    "$default" = {
      lambda_arn = module.lambda.lambda_function_arn
    }
  }

  tags = {
    Environment = "prod"
  }
}