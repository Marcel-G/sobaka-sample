# Only create the IAM role in the primary workspace to avoid conflicts
module "iam_role" {
  count   = var.manage_shared_resources ? 1 : 0
  source  = "babbel/iam-role-for-github-repository/aws"
  version = "~> 1.0"

  github_repository           = data.github_repository.this[0]
  iam_openid_connect_provider = data.aws_iam_openid_connect_provider.github[0]
}

# Reference existing IAM role when not managing it
data "aws_iam_role" "github_actions" {
  count = var.manage_shared_resources ? 0 : 1
  name  = var.deploy_role_name
}

locals {
  # Use created role or referenced role depending on manage_shared_resources
  # Splat operator returns empty list when count is 0, one() extracts the single value
  deploy_role = {
    name = one(concat(module.iam_role[*].this.name, data.aws_iam_role.github_actions[*].name))
    arn  = one(concat(module.iam_role[*].this.arn, data.aws_iam_role.github_actions[*].arn))
  }
}

data "github_repository" "this" {
  count     = var.manage_shared_resources ? 1 : 0
  full_name = var.github_repo
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.manage_shared_resources ? 1 : 0
  url   = "https://token.actions.githubusercontent.com"
}