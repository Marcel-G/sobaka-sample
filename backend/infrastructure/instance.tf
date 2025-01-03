locals {
  name = var.name
  azs  = slice(data.aws_availability_zones.available.names, 0, 3)
  chunk_size = 50
  ip_chunks  = chunklist(data.aws_ip_ranges.cloudfront.cidr_blocks, local.chunk_size)

  user_data = <<-EOT
    #!/bin/bash
    sudo yum update -y
    sudo yum install docker jq -y
    sudo service docker start
    sudo chkconfig docker on
    sudo usermod -a -G docker ec2-user
    newgrp docker
  EOT
}

data "aws_ip_ranges" "cloudfront" {
  regions  = ["GLOBAL"]
  services = ["CLOUDFRONT"]
}
data "aws_availability_zones" "available" {}

module "instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "~> 4.0"

  name = "${local.name}-ec2"

  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.micro"
  subnet_id                   = element(module.vpc.public_subnets, 0)
  vpc_security_group_ids      = [for sg in module.security_groups : sg.security_group_id]

  associate_public_ip_address = true

  create_iam_instance_profile = true
  iam_role_description        = "IAM role for EC2 instance"
  iam_role_policies = {
    AccessECRReadOnly            = aws_iam_policy.ecr_login.arn
    AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  }

  user_data_base64            = base64encode(local.user_data)
  user_data_replace_on_change = true
}

module "security_groups" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 4.0"

  for_each = { for idx, chunk in local.ip_chunks : idx => chunk }

  name        = "${local.name}-sg-${each.key}"
  description = "Security group for CloudFront chunk ${each.key}"
  vpc_id      = module.vpc.vpc_id

  ingress_with_cidr_blocks = [
    {
      from_port   = 8000
      to_port     = 8000
      protocol    = "tcp"
      description = "Allow HTTP/WebSocket inbound from CloudFront chunk ${each.key}"
      cidr_blocks = join(",", each.value)
    }
  ]

  egress_rules = ["all-all"]
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 4.0"

  name = "${local.name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = local.azs
  private_subnets = ["10.0.141.0/24"]
  public_subnets  = ["10.0.142.0/24"]

  enable_nat_gateway = false
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

data "aws_iam_role" "deploy" {
  name = var.global_deploy_role
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

output "instance" {
  value = module.instance
}
