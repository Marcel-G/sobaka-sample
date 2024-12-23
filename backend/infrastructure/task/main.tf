variable "name" {
  description = "Name of the instance"
  type        = string
}

variable "repository_url" {
  description = "URL of the Docker repository"
  type        = string
}

variable "ports" {
  description = "Ports to expose in the format 'host_port:container_port'"
  type        = list(string)
}

variable "global_deploy_role" {
  description = "Deployment role name"
  type        = string
}

variable "instance" {
  description = "Instance to deploy to"
  type        = any
}

locals {
  deploy_script = <<-EOT
    sudo su ec2-user
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${var.repository_url}
    docker pull ${var.repository_url}
    docker rm -f ${var.name} || true
    docker run \
      --name ${var.name} \
      ${join(" ", [for port in var.ports : "-p ${port}"])} \
      -d ${var.repository_url}:latest
    EOT
}

resource "aws_ssm_document" "deploy" {
  name          = "${var.name}-deploy"
  document_type = "Command"

  content = jsonencode({
    schemaVersion = "2.2",
    description   = "Starts a Docker container",
    mainSteps = [{
      action = "aws:runShellScript",
      name   = "runShellScript",
      inputs = {
        runCommand = compact(split("\n", local.deploy_script))
      }
    }]
  })
}

data "aws_iam_role" "deploy" {
  name = var.global_deploy_role
}

data "aws_iam_policy_document" "deploy_ssm" {
  statement {
    effect  = "Allow"
    actions = ["ssm:SendCommand"]
    resources = [
      resource.aws_ssm_document.deploy.arn,
      var.instance.arn
    ]
  }
}

resource "aws_iam_policy" "deploy_ssm" {
  name   = "${var.name}-deploy-ssm-policy"
  policy = data.aws_iam_policy_document.deploy_ssm.json
}

resource "aws_iam_role_policy_attachment" "deploy_ssm" {
  role       = data.aws_iam_role.deploy.name
  policy_arn = aws_iam_policy.deploy_ssm.arn
}

