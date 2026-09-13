variable "aws_region" {
  type        = string
  description = "AWS Region"
  default     = "us-east-1"
}

variable "ami_id" {
  type        = string
  description = "AMI ID (Amazon Linux 2023 us-east-1)"
  default     = "ami-09afda054f620959a"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type — t2.micro is free tier eligible"
  default     = "t2.micro"
}

variable "key_name" {
  type        = string
  description = "EC2 Key Pair name for SSH access"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the instance will be launched (leave empty for default VPC)"
  default     = ""
}

variable "subnet_id" {
  type        = string
  description = "Public subnet ID for the EC2 instance (leave empty for default subnet)"
  default     = ""
}

variable "allowed_ssh_cidrs" {
  type        = list(string)
  description = "CIDR blocks allowed for SSH access — restrict to your IP for security"
  default     = ["0.0.0.0/0"]
}

variable "s3_bucket_name" {
  type        = string
  description = "S3 bucket name for uploads and state"
  default     = "jcs-raju-sunotal-final"
}

variable "jwt_secret" {
  type        = string
  description = "JWT secret for signing auth tokens — use a strong random string"
  sensitive   = true
  default     = "CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_IN_TFVARS"
}

variable "mongodb_uri" {
  type        = string
  description = "MongoDB connection URI"
  default     = "mongodb://127.0.0.1:27017/sunotal"
}

variable "repo_url" {
  type        = string
  description = "GitHub repository URL to clone on EC2"
  default     = "https://github.com/valivarthi007/sunotal_fullstk.git"
}

variable "frontend_origin" {
  type        = string
  description = "Allowed CORS origin for the frontend"
  default     = "https://sunotal.automateuniverse.space"
}

variable "alarm_sns_arn" {
  type        = string
  description = "SNS topic ARN for CloudWatch alarms — leave empty to disable"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Common resource tags"
  default     = {}
}
