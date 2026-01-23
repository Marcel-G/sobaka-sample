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

variable "secrets" {
  description = "Map of environment variable names to secret resources"
  type = map(object({
    name = string
    arn = string
  }))

  default = {}
}

variable "env" {
  description = "Map of environment variable names to values"
  type        = map(string)
  default = {}
}

variable "global_deploy_role" {
  description = "Deployment role name"
  type        = string
}

variable "instance" {
  description = "Instance to deploy to"
  type        = any
}

data "aws_iam_policy_document" "secret_access" {
  count = length(var.secrets) > 0 ? 1 : 0
  
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [for secret in var.secrets : secret.arn]
  }
}

resource "aws_iam_policy" "secret_access" {
  count  = length(var.secrets) > 0 ? 1 : 0
  name   = "${var.name}-secret-access-policy"
  policy = data.aws_iam_policy_document.secret_access[0].json
}

resource "aws_iam_role_policy_attachment" "secret_access" {
  count      = length(var.secrets) > 0 ? 1 : 0
  role       = var.instance.iam_role_name
  policy_arn = aws_iam_policy.secret_access[0].arn
}

locals {
  deploy_script = <<-EOT
    sudo su ec2-user

    set -e

    # Fetch secrets from AWS Secrets Manager
    %{for env_name, secret in var.secrets~}
    export ${env_name}=$(aws secretsmanager get-secret-value \
      --secret-id ${secret.name} \
      --query "SecretString" \
      --output text)
    %{endfor~}

    # Login to the Docker registry
    aws ecr get-login-password \
      | docker login \
        --username AWS \
        --password-stdin \
        ${var.repository_url}

    # Pull the latest Docker image
    docker pull ${var.repository_url}

    # Remove any existing container with the same name
    docker rm -f ${var.name} || true

    # Run the Docker container
    docker run \
      --name ${var.name} \
      --restart always \
      --network host \
      --detach \
      ${join(" ", [for env_name, value in var.env : "-e ${env_name}=${value}"])} \
      ${join(" ", [for port in var.ports : "-p ${port}"])} \
      ${join(" ", [for env_name, _ in var.secrets : "-e ${env_name}"])} \
      ${var.repository_url}:latest
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

output "deploy_doc" {
  value = resource.aws_ssm_document.deploy.name
}
