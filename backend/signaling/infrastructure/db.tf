locals {
  topic_table_name = "${var.name}-topics-table"
}

module "db" {
  source = "terraform-aws-modules/dynamodb-table/aws"
  version = "3.1.2"

  name = local.topic_table_name

  hash_key   = "name"

  attributes = [
    {
      name = "name"
      type = "S"
    },
    # {
    #   name = "receivers"
    #   type = "SS"
    # }
  ]

  billing_mode = "PROVISIONED"
  read_capacity = 1
  write_capacity = 1

  tags = {
    Environment = "prod"
  }
}