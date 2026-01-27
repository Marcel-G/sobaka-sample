module "container_image_ecr" {
  source  = "terraform-aws-modules/ecr/aws"
  version = "~> 1.6"

  repository_name = "${var.name}-ecr"

  repository_read_write_access_arns = [data.aws_iam_role.deploy.arn]
  repository_read_access_arns       = [var.instance.iam_role_arn]

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

data "aws_iam_role" "deploy" {
  name = var.global_deploy_role
}

resource "aws_iam_role_policy" "ecr_login" {
  name = "${var.name}-ecr-login-policy"
  role = data.aws_iam_role.deploy.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = ["*"]
      }
    ]
  })
}

output "ecr_url" {
  value = module.container_image_ecr.repository_url
}
