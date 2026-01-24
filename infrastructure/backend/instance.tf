locals {
  name       = var.name
  azs        = slice(data.aws_availability_zones.available.names, 0, 3)
  chunk_size = 50
  ip_chunks  = chunklist(data.aws_ip_ranges.cloudfront.cidr_blocks, local.chunk_size)

  # Data volume configuration
  data_volume_device = "/dev/xvdf"
  data_volume_mount  = "/data"

  user_data = <<-EOT
    #!/bin/bash
    set -e

    # Update system and install required packages
    sudo yum update -y
    sudo yum install -y docker jq awscli

    # Configure and start Docker service
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker ec2-user

    # Configure AWS CLI
    aws configure set default.region ${data.aws_region.current.id}

    # Mount data volume for persistence
    DATA_DEVICE="${local.data_volume_device}"
    DATA_MOUNT="${local.data_volume_mount}"

    # Wait for the EBS volume to be attached
    while [ ! -e "$DATA_DEVICE" ]; do
      echo "Waiting for EBS volume to attach..."
      sleep 1
    done

    # Check if the volume has a filesystem, if not create one
    if ! file -s "$DATA_DEVICE" | grep -q "filesystem"; then
      echo "Creating ext4 filesystem on $DATA_DEVICE"
      sudo mkfs -t ext4 "$DATA_DEVICE"
    fi

    # Create mount point and mount the volume
    sudo mkdir -p "$DATA_MOUNT"
    sudo mount "$DATA_DEVICE" "$DATA_MOUNT"

    # Add to fstab for persistence across reboots
    if ! grep -q "$DATA_DEVICE" /etc/fstab; then
      echo "$DATA_DEVICE $DATA_MOUNT ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
    fi

    # Ensure proper permissions for docker
    sudo chown -R ec2-user:ec2-user "$DATA_MOUNT"
    echo "Data volume mounted at $DATA_MOUNT"
  EOT
}

data "aws_region" "current" {}

data "aws_ip_ranges" "cloudfront" {
  regions  = ["GLOBAL"]
  services = ["CLOUDFRONT"]
}
data "aws_availability_zones" "available" {}

module "instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "~> 6.0"

  name = "${local.name}-ec2"

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = element(module.vpc.public_subnets, 0)
  vpc_security_group_ids = [for sg in module.security_groups : sg.security_group_id]
  availability_zone      = element(local.azs, 0)

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

# Persistent data volume for LMDB storage
resource "aws_ebs_volume" "data" {
  availability_zone = element(local.azs, 0)
  size              = 1 # 1 GB - can be resized later
  type              = "gp3"

  tags = {
    Name = "${local.name}-data"
  }

  # Prevent accidental deletion of data
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_volume_attachment" "data" {
  device_name = local.data_volume_device
  volume_id   = aws_ebs_volume.data.id
  instance_id = module.instance.id

  # Don't destroy the volume when detaching
  force_detach = false
}

module "security_groups" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.0"

  for_each = { for idx, chunk in local.ip_chunks : idx => chunk }

  name        = "${local.name}-sg-${each.key}"
  description = "Security group for CloudFront chunk ${each.key}"
  vpc_id      = module.vpc.vpc_id

  // TODO: can these be configured by task
  ingress_with_cidr_blocks = [
    {
      from_port   = 8000
      to_port     = 8000
      protocol    = "tcp"
      description = "Allow HTTP/WebSocket inbound from CloudFront chunk ${each.key}"
      cidr_blocks = join(",", each.value)
    },
    {
      from_port   = 3478
      to_port     = 3478
      protocol    = "udp"
      description = "Allow UDP/STUN to WebRTC Worker",
      cidr_blocks = "0.0.0.0/0"
    }
  ]

  egress_rules = ["all-all"]
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

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

output "data_volume_mount" {
  value = local.data_volume_mount
}
