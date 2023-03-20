locals {
  topic_table_name = "${var.name}-topics-table"
}

module "db" {
  source = "terraform-aws-modules/dynamodb-table/aws"
  version = "3.1.2"

  name = local.topic_table_name

  hash_key   = "topic"
  range_key  = "receiver"

  attributes = [
    {
      name = "topic"
      type = "S"
    },
    {
      name = "receiver"
      type = "S"
    }
  ]

   global_secondary_indexes = [
    {
      name               = "topic-index"
      hash_key           = "topic"
      projection_type    = "ALL"
      read_capacity = 1
      write_capacity = 1
    },
    {
      name               = "receiver-index"
      hash_key           = "receiver"
      projection_type    = "ALL"
      read_capacity = 1
      write_capacity = 1
    }
  ]

  billing_mode = "PROVISIONED"
  read_capacity = 1
  write_capacity = 1

  tags = {
    Environment = "prod"
  }
}