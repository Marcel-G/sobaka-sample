module "lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "4.12.1"

  function_name = "${var.name}-lambda" // @todo subscribe?
  handler       = "dist/index.handler"
  runtime       = "nodejs18.x"
  memory_size   = 128
  timeout       = 10

  # https://github.com/terraform-aws-modules/terraform-aws-lambda/issues/36#issuecomment-650217274
  publish = true

  create_package         = false
  // @todo -- deploy lambda source code versions separately from infrastructure
  local_existing_package = "${path.module}/../signaling.zip"
  allowed_triggers = {
    gateway_trigger = {
      service    = "apigateway"
      source_arn = "${module.gateway.apigatewayv2_api_execution_arn}/*/*"
    }
  }

  attach_policy_statements = true
  policy_statements = {
    dynamodb = {
      effect  = "Allow",
      actions = ["dynamodb:*"],
      resources = [
        module.db.dynamodb_table_arn,         // The dynamoDB table itself
        "${module.db.dynamodb_table_arn}/*/*" // The indexes on the table
      ]
    }
    gateway_respond = {
      effect    = "Allow",
      actions   = ["execute-api:*"],
      resources = ["${module.gateway.apigatewayv2_api_execution_arn}/*/*"]
    }
  }

  environment_variables = {
    TOPIC_TABLE_NAME = local.topic_table_name
  }

  tags = {
    Environment = "prod"
  }
}