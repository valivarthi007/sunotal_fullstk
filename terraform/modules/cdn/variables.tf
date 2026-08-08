variable "aws_region" {
  type        = string
  description = "AWS Region"
  default     = "us-east-1"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet IDs for Application Load Balancer"
}

variable "alb_security_group_id" {
  type        = string
  description = "ALB Security Group ID"
}

variable "s3_bucket_name" {
  type        = string
  description = "S3 Bucket Name for asset CDN"
}

variable "tags" {
  type        = map(string)
  description = "Tags for CDN resources"
  default     = {}
}

variable "ssl_certificate_arn" {
  type        = string
  description = "ARN of the SSL certificate for ALB HTTPS listener"
  default     = ""
}
