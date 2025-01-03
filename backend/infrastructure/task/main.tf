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

module "secret" {
  source  = "terraform-aws-modules/secrets-manager/aws"

  name        =  "${var.name}-jwt-secret"
  description = "Private key for issuing JWTs"

  create_random_password = true
  random_password_length = 1024 

  recovery_window_in_days = 7 # Optional: for recovery
}


locals {
  deploy_script = <<-EOT
    sudo su ec2-user

    set -e

    # Fetch the secret from AWS Secrets Manager
    export JWT_PRIVATE_KEY=$(aws secretsmanager get-secret-value --secret-id ${module.secret.secret_name} --query "SecretString" --output text)

    # Login to the Docker registry
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${var.repository_url}

    # Pull the latest Docker image
    docker pull ${var.repository_url}

    # Remove any existing container with the same name
    docker rm -f ${var.name} || true

    # Run the Docker container
    docker run \
      --name ${var.name} \
      ${join(" ", [for port in var.ports : "-p ${port}"])} \
      -e JWT_PRIVATE_KEY \
      --restart always \
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

