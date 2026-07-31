variable "role_name" {
  type        = string
  description = "Name of the IAM role for EC2"
  default     = "sunotal-ec2-s3-access-role"
}

variable "policy_name" {
  type        = string
  description = "Name of the IAM policy for S3 access"
  default     = "sunotal-s3-access-policy"
}

variable "instance_profile_name" {
  type        = string
  description = "Name of the IAM instance profile"
  default     = "sunotal-ec2-instance-profile"
}

variable "s3_bucket_name" {
  type        = string
  description = "Name of the S3 bucket"
}

variable "tags" {
  type        = map(string)
  description = "Tags to assign to IAM resources"
  default     = {}
}

variable "lambda_arn" {
  type        = string
  description = "The ARN of the S3 delete lambda function"
  default     = ""
}
