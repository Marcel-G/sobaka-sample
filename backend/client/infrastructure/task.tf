module "jwt" {
  source  = "terraform-aws-modules/secrets-manager/aws"

  name        =  "${var.name}-jwt"
  description = "JWT for worker"

  secret_string = "none"

  recovery_window_in_days = 7 # Optional: for recovery
}

module "task" {
  source             = "../../infrastructure/task"
  name               = var.name
  repository_url     = module.container_image_ecr.repository_url
  instance           = var.instance
  global_deploy_role = var.global_deploy_role
  ports              = ["3478:3478"]
  env = {
    "PUBLIC_IP" = var.instance.public_ip,
    "PORT" = "3478",
    "SIGNAL_SERVER" = "ws://localhost:8000/signaling"
  }
  secrets = {
    JWT = {
      name = module.jwt.secret_name
      arn  = module.jwt.secret_arn
    }
  }
}

output "deploy_doc" {
  value = module.task.deploy_doc
}
