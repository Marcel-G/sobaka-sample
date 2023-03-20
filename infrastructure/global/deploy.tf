data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
}

# use Babbel's https://registry.terraform.io/modules/babbel/iam-role-for-github-repository/aws/latest?tab=inputs
data "aws_iam_policy_document" "assume_deploy_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type = "Federated"
      identifiers = [
        "arn:aws:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com"
      ]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"

      values = ["repo:${var.repo_org}/${var.repo_name}:*"]
    }
  }
}
