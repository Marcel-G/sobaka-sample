locals {
  container_name = "${var.name}-ecr"

  azs      = slice(data.aws_availability_zones.available.names, 0, 3)
}

data "aws_availability_zones" "available" {}

module "container_image_ecr" {
  source  = "terraform-aws-modules/ecr/aws"
  version = "~> 1.4"

  repository_name = local.container_name

  repository_read_write_access_arns = [var.global_deploy_role]
  repository_read_access_arns       = [module.ecs_service_definition.task_exec_iam_role_arn]

  repository_image_tag_mutability   = "MUTABLE"
  repository_force_delete           = true
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
}

module "ecs_cluster" {
  source = "terraform-aws-modules/ecs/aws//modules/cluster"

  cluster_name = "${var.name}-libp2p"

  # Capacity provider
  fargate_capacity_providers = {
    FARGATE = {
      default_capacity_provider_strategy = {
        weight = 50
        base   = 20
      }
    }
    FARGATE_SPOT = {
      default_capacity_provider_strategy = {
        weight = 50
      }
    }
  }
}

module "ecs_service_definition" {
  source  = "terraform-aws-modules/ecs/aws//modules/service"

  name          = "${var.name}-libp2p"
  cluster_arn = module.ecs_cluster.arn
  assign_public_ip = true
  desired_count = 1

  security_group_rules = {
    ingress_udp = {
      type              = "ingress"
      from_port         = 9090
      to_port           = 9091
      protocol          = "udp"
      cidr_blocks = ["0.0.0.0/0"]
    }
    egress_all = {
      type        = "egress"
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  # Task Definition
  enable_execute_command = true
  create_task_exec_iam_role   = true

  subnet_ids = module.vpc.public_subnets

  container_definitions = {
    main_container = {
      name                     = local.container_name
      image                    = module.container_image_ecr.repository_url
      readonly_root_filesystem = false

      port_mappings = [
        { protocol : "udp", containerPort : 9090, },
        { protocol : "udp", containerPort : 9091, }
      ]
    }
  }

  ignore_task_definition_changes = true
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 4.0"

  name = "${var.name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = local.azs
  private_subnets         = ["10.0.141.0/24"]
  public_subnets          = ["10.0.142.0/24"]


  enable_nat_gateway = true
  single_nat_gateway = false
}

output "ecr_repository_url" {
  value = module.container_image_ecr.repository_url
}