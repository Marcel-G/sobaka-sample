locals {
  deploy_script = <<-EOT
    sudo su ec2-user
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${module.container_image_ecr.repository_url}
    docker pull ${module.container_image_ecr.repository_url}
    docker rm -f instance || true
    docker run \
      --name instance \
      -e NODE_DEBUG='tls,https' \
      -e AWS_REGION=${data.aws_region.current.name} \
      -p 443:4001 \
      -d ${module.container_image_ecr.repository_url}:latest
    EOT

  # docker exec instance ipfs id | jq 'Addresses'
  # record = jsonencode({
  #   Comment = "Update ${var.subdomain} dnsaddr",
  #   Changes = [
  #     {
  #       Action = "UPSERT",
  #       ResourceRecordSet = {
  #         Name = "_dnsaddr.${var.subdomain}",
  #         Type = "TXT",
  #         TTL  = 300,
  #         ResourceRecords = [
  #           {
  #             "Value" : "4.4.4.4"
  #           }
  #         ]
  #       }
  #     }
  #   ]
  # })
}

data "aws_region" "current" {}

resource "aws_ssm_document" "deploy" {
  name          = "${local.name}-deploy"
  document_type = "Command"

  content = jsonencode({
    schemaVersion = "2.2",
    description   = "Starts docker helia container",
    mainSteps = [{
      action = "aws:runShellScript",
      name   = "runShellScript",
      inputs = {
        runCommand = compact(split("\n", local.deploy_script))
      }
    }]
  })
}

data "aws_iam_policy_document" "deploy_ssm" {
  statement {
    effect  = "Allow"
    actions = ["ssm:SendCommand"]
    resources = [
      resource.aws_ssm_document.deploy.arn,
      module.instance.arn
    ]
  }
}

resource "aws_iam_policy" "deploy_ssm" {
  name   = "${local.name}-deploy-ssm-policy"
  policy = data.aws_iam_policy_document.deploy_ssm.json
}

resource "aws_iam_role_policy_attachment" "deploy_ssm" {
  role       = data.aws_iam_role.deploy.name
  policy_arn = aws_iam_policy.deploy_ssm.arn
}
