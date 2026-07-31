variable "s3_bucket_name" {
  description = "The S3 bucket name where product assets are stored"
  type        = string
}

variable "tags" {
  description = "A mapping of tags to assign to all resources"
  type        = map(string)
  default     = {}
}
