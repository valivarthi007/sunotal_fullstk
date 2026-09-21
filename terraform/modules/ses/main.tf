variable "domain_name" {
  type    = string
  default = "automateuniverse.space"
}

variable "tags" {
  type = map(string)
}

resource "aws_ses_domain_identity" "sunotal" {
  domain = "sunotal.${var.domain_name}"
}

resource "aws_ses_domain_dkim" "sunotal" {
  domain = aws_ses_domain_identity.sunotal.domain
}

output "ses_domain_identity_arn" {
  value = aws_ses_domain_identity.sunotal.arn
}
