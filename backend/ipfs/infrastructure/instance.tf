locals {
  azs            = slice(data.aws_availability_zones.available.names, 0, 3)

  user_data = <<-EOT
    #!/bin/bash
    sudo yum update -y
    sudo yum install docker jq -y
    sudo service docker start
    sudo chkconfig docker on
    sudo usermod -a -G docker ec2-user
    newgrp docker

    # Format and mount EBS volume
    mkdir -p /ebs
    if file -sL /dev/sdh | grep -q "SGI XFS filesystem data"
    then
      echo "Filesystem already formatted"
    else
      mkfs -t xfs /dev/sdh 
    fi
    mount /dev/sdh /ebs
  EOT
}

data "aws_availability_zones" "available" {}

module "instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "~> 5.4"

  name = var.name

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
      from_port   = 4001
      to_port     = 4001
      protocol    = "udp"
      description = "Allow inbound IPFS swarm QUIC & Webtransport"
      cidr_blocks = "0.0.0.0/0"
    },
    {
      from_port   = 4001
      to_port     = 4001
      protocol    = "tcp"
      description = "Allow inbound tcp"
      cidr_blocks = "0.0.0.0/0"
    }
  ]
  egress_rules = ["all-all"]
}

resource "aws_volume_attachment" "this" {
  device_name = "/dev/sdh"
  volume_id   = aws_ebs_volume.this.id
  instance_id = module.instance.id
}

resource "aws_ebs_volume" "this" {
  availability_zone = module.instance.availability_zone
  size              = 8

  tags = {
    Name = "${local.name}-ebs"
  }
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
    values = ["amzn-ami-hvm-*-x86_64-gp2"]
  }
}

output "instance_id" {
  value = module.instance.id
}