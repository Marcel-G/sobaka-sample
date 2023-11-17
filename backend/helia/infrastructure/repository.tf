locals {
  container_name = "helia"
}

module "container_image_ecr" {
  source  = "terraform-aws-modules/ecr/aws"
  version = "~> 1.6"

  repository_name = "${local.container_name}-ecr"

  repository_read_write_access_arns = [data.aws_iam_role.deploy.arn]
  repository_read_access_arns       = [module.instance.iam_role_arn]

  repository_image_tag_mutability = "MUTABLE"
  create_lifecycle_policy         = true
  repository_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1,
        description  = "Keep last 3 images",
        selection = {
          tagStatus     = "tagged",
          tagPrefixList = ["v"],
          countType     = "imageCountMoreThan",
          countNumber   = 3
        },
        action = {
          type = "expire"
        }
      }
    ]
  })

  repository_force_delete = true
}

data "aws_iam_policy_document" "ecr_login" {
  statement {
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "ecr_login" {
  name   = "${local.name}-ecr-login-policy"
  policy = data.aws_iam_policy_document.ecr_login.json
}

resource "aws_iam_role_policy_attachment" "deploy_ecr" {
  role       = data.aws_iam_role.deploy.name
  policy_arn = aws_iam_policy.ecr_login.arn
}

output "ecr_repository" {
  value = module.container_image_ecr.repository_url
}
