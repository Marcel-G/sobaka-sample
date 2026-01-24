variable "name" {
  description = "Resource name"
  type        = string
}

variable "global_deploy_role" {
  description = "Deployment role name"
  type        = string
}

variable "instance" {
  description = "Instance to deploy to"
  type        = any
}

variable "data_volume_mount" {
  description = "Host path for persistent data volume"
  type        = string
  default     = "/data"
}
