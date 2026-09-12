variable "app_name" {
  type        = string
  description = "AWS Amplify Application Name"
  default     = "sunotal-grocery-app"
}

variable "domain_name" {
  type        = string
  description = "Primary domain for Amplify domain association"
  default     = "automateuniverse.space"
}

variable "repository" {
  type        = string
  description = "GitHub repository URL for Amplify auto-builds"
  default     = "https://github.com/valivarthi007/sunotal_fullstk"
}

variable "github_access_token" {
  type        = string
  description = "GitHub Personal Access Token for Amplify webhook"
  default     = ""
  sensitive   = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
