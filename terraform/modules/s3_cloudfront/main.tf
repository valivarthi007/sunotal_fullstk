variable "s3_bucket_name" { type = string }
variable "tags" { type = map(string) }

resource "aws_s3_bucket" "assets" {
  bucket        = var.s3_bucket_name
  force_destroy = true

  tags = merge(var.tags, { Name = var.s3_bucket_name })
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for Sunotal S3 Assets"
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.assets.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Sunotal Media Assets CDN"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.assets.id}"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(var.tags, { Name = "sunotal-cloudfront" })
}

output "bucket_name" { value = aws_s3_bucket.assets.id }
output "cloudfront_domain" { value = aws_cloudfront_distribution.cdn.domain_name }
