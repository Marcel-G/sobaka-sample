locals {
  name = var.name
  container_name = "webrtc-relay"
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)

  user_data = <<-EOT
    #!/bin/bash
    sudo yum update -y
    sudo yum install docker -y
    sudo service docker start
    sudo chkconfig docker on
    sudo usermod -a -G docker ec2-user
    newgrp docker
  EOT
}

data "aws_availability_zones" "available" {}

data "aws_iam_role" "deploy" {
  name = var.global_deploy_role
}

module "container_image_ecr" {
  source  = "terraform-aws-modules/ecr/aws"
  version = "~> 1.6"

  repository_name = "${local.container_name}-ecr"

  repository_read_write_access_arns = [data.aws_iam_role.deploy.arn]
  repository_read_access_arns       = [module.instance.iam_role_arn]

  repository_image_tag_mutability   = "MUTABLE"
  create_lifecycle_policy           = true
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

  repository_force_delete           = true
}

resource "aws_iam_policy" "ecr" {
  name   = "AccessECRReadOnly"
  policy = data.aws_iam_policy_document.ecr.json
}

data "aws_iam_policy_document" "ecr" {
  statement {
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken","ecr:BatchGetImage","ecr:GetDownloadUrlForLayer"]
    resources = ["*"]
  }
}

module "instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "~> 4.0"

  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.micro"
  subnet_id                   = element(module.vpc.public_subnets, 0)
  vpc_security_group_ids      = [module.security_group.security_group_id]
  associate_public_ip_address = true

  create_iam_instance_profile = true
  iam_role_description        = "IAM role for EC2 instance"
  iam_role_policies = {
    AccessECRReadOnly = aws_iam_policy.ecr.arn
    AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  }

  user_data_base64            = base64encode(local.user_data)
  user_data_replace_on_change = true
}

module "security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 4.0"

  name        = local.name
  description = "Security group for example usage with EC2 instance"
  vpc_id      = module.vpc.vpc_id

  ingress_cidr_blocks = ["0.0.0.0/0"]
  ingress_with_cidr_blocks = [
    {
      from_port   = 9090
      to_port     = 9090
      protocol    = "udp"
      description = "Allow WebRTC ports"
      cidr_blocks = "0.0.0.0/0"
    },
     {
      from_port   = 9091
      to_port     = 9091
      protocol    = "udp"
      description = "Allow Quic ports"
      cidr_blocks = "0.0.0.0/0"
    }
  ]
  egress_rules        = ["all-all"]
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 4.0"

  name = "${local.name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = local.azs
  private_subnets         = ["10.0.141.0/24"]
  public_subnets          = ["10.0.142.0/24"]

  enable_nat_gateway = false
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn-ami-hvm-*-x86_64-gp2"]
  }
}

output "ecr_repository_url" {
  value = module.container_image_ecr.repository_url
}

output "ssm_connect_command" {
  description = "The AWS CLI command to connect to the instance using Session Manager"
  value       = "aws ssm start-session --target ${module.instance.id}"
}