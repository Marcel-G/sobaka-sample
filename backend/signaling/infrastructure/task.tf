module "jwt_secret" {
  source  = "terraform-aws-modules/secrets-manager/aws"

  name        =  "${var.name}-jwt-secret"
  description = "Private key for issuing JWTs"

  create_random_password = true
  random_password_length = 1024 

  recovery_window_in_days = 7 # Optional: for recovery
}

module "task" {
  source             = "../../infrastructure/task"
  name               = var.name
  repository_url     = module.container_image_ecr.repository_url
  instance           = var.instance
  global_deploy_role = var.global_deploy_role
  ports              = ["8000:8000"]
  secrets = {
    JWT_PRIVATE_KEY = {
      name = module.jwt_secret.secret_name
      arn  = module.jwt_secret.secret_arn
    }
  }
}

