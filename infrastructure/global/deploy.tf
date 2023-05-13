module "iam_role" {
  source  = "babbel/iam-role-for-github-repository/aws"
  version = "~> 1.0"

  github_repository           = data.github_repository.this
  iam_openid_connect_provider = data.aws_iam_openid_connect_provider.github
}

data "github_repository" "this" {
  full_name = var.github_repo
}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}