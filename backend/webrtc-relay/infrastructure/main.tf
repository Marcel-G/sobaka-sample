locals {
  name           = var.name
  container_name = "webrtc-relay"
  azs            = slice(data.aws_availability_zones.available.names, 0, 3)

  user_data = <<-EOT
    #!/bin/bash
    sudo yum update -y
    sudo yum install docker -y
    sudo service docker start
    sudo chkconfig docker on
    sudo usermod -a -G docker ec2-user
    newgrp docker

    mkdir -p /cert
    if file -sL /dev/sdh | grep -q "SGI XFS filesystem data"
    then
      echo "Filesystem already formatted"
    else
      mkfs -t xfs /dev/sdh 
    fi
    mount /dev/sdh /cert
  EOT
}

data "aws_availability_zones" "available" {}

module "container_image_ecr" {
  source  = "terraform-aws-modules/ecr/aws"
  version = "~> 1.6"

  repository_name = "${local.container_name}-ecr"

  repository_read_write_access_arns = [data.aws_iam_role.deploy.arn]
  repository_read_access_arns       = [module.instance.iam_role_arn]

  repository_image_tag_mutability = "MUTABLE"
  create_lifecycle_policy         = true
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

  repository_force_delete = true
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

data "aws_iam_policy_document" "deploy_ssm" {
  statement {
    effect  = "Allow"
    actions = ["ssm:SendCommand"]
    resources = [
      "arn:aws:ssm:*:*:document/AWS-RunShellScript",
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

module "instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "~> 5.4"

  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.micro"
  subnet_id                   = element(module.vpc.public_subnets, 0)
  vpc_security_group_ids      = [module.security_group.security_group_id]
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
    },
    {
      from_port   = 9092
      to_port     = 9092
      protocol    = "tcp"
      description = "Allow TCP ports"
      cidr_blocks = "0.0.0.0/0"
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

resource "aws_volume_attachment" "this" {
  device_name = "/dev/sdh"
  volume_id   = aws_ebs_volume.this.id
  instance_id = module.instance.id
}

resource "aws_ebs_volume" "this" {
  availability_zone = module.instance.availability_zone
  size              = 1
  snapshot_id = "snap-011b14a72d48e06d2"
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn-ami-hvm-*-x86_64-gp2"]
  }
}

output "ecr_repository" {
  value = module.container_image_ecr.repository_url
}

output "instance_id" {
  value = module.instance.id
}