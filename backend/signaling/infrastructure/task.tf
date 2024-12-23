module "task" {
  source             = "../../infrastructure/task"
  name               = var.name
  repository_url     = module.container_image_ecr.repository_url
  instance           = var.instance
  global_deploy_role = var.global_deploy_role
  ports              = ["8000:8000"]
}

