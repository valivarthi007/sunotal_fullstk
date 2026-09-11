variable "aws_region" {
  type        = string
  description = "AWS Region"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for ECS Fargate tasks"
}

variable "ecs_security_group_id" {
  type        = string
  description = "Security Group ID for ECS tasks"
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources"
  default     = {}
}

variable "ecr_frontend_url" {
  type        = string
  description = "ECR Repository URL for frontend"
}

variable "ecr_auth_url" {
  type        = string
  description = "ECR Repository URL for auth service"
}

variable "ecr_operations_url" {
  type        = string
  description = "ECR Repository URL for operations service"
}

variable "ecr_inventory_url" {
  type        = string
  description = "ECR Repository URL for inventory service"
}

variable "ecr_user_url" {
  type        = string
  description = "ECR Repository URL for user service"
}

variable "ecr_delivery_url" {
  type        = string
  description = "ECR Repository URL for delivery service"
}

variable "ecr_support_url" {
  type        = string
  description = "ECR Repository URL for support service"
}

variable "frontend_target_group_arn" {
  type        = string
  description = "ALB Target Group ARN for frontend"
}

variable "auth_target_group_arn" {
  type        = string
  description = "ALB Target Group ARN for auth service"
}

variable "operations_target_group_arn" {
  type        = string
  description = "ALB Target Group ARN for operations service"
}

variable "inventory_target_group_arn" {
  type        = string
  description = "ALB Target Group ARN for inventory service"
}

variable "user_target_group_arn" {
  type        = string
  description = "ALB Target Group ARN for user service"
}

variable "delivery_target_group_arn" {
  type        = string
  description = "ALB Target Group ARN for delivery service"
}

variable "support_target_group_arn" {
  type        = string
  description = "ALB Target Group ARN for support service"
}

variable "mongodb_uri" {
  type        = string
  description = "MongoDB Connection URI for backend services"
  default     = "mongodb://localhost:27017/sunotal"
}

variable "session_secret" {
  type        = string
  description = "Session secret for session management"
  default     = "sunotal-session-secret-corporate-prod"
}

variable "cloudfront_domain" {
  type        = string
  description = "CloudFront domain name"
  default     = ""
}

variable "s3_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for remote state and build artifacts"
}

variable "s3_policy_arn" {
  type        = string
  description = "IAM Policy ARN for S3 access"
}

variable "admin_email" {
  type        = string
  description = "Default Admin Email injected at runtime"
  default     = "admin@sunotal.com"
}

variable "admin_password" {
  type        = string
  description = "Default Admin Password injected at runtime"
  default     = "admin123"
}

variable "frontend_url" {
  type        = string
  description = "Public URL of the frontend application for CORS configuration"
  default     = "https://sunotal.automateuniverse.space"
}
