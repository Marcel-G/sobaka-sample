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
}

output "deploy_doc" {
  value = module.task.deploy_doc
}
