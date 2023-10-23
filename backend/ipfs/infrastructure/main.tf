locals {
  name           = var.name
}

data "aws_iam_role" "deploy" {
  name = var.global_deploy_role
}