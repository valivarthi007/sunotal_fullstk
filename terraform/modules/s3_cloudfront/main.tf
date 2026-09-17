variable "s3_bucket_name" { type = string }
variable "tags" { type = map(string) }
variable "enable_cloudfront" {
  type    = bool
  default = false
}

resource "aws_s3_bucket" "assets" {
  bucket        = var.s3_bucket_name
  force_destroy = true

  tags = merge(var.tags, { Name = var.s3_bucket_name })
}

# Configure public access block (Unblock public access if CloudFront is disabled so direct S3 URLs work)
resource "aws_s3_bucket_public_access_block" "public_access" {
  count  = var.enable_cloudfront ? 0 : 1
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Public read policy for S3 bucket when CloudFront is disabled
resource "aws_s3_bucket_policy" "public_read" {
  count      = var.enable_cloudfront ? 0 : 1
  bucket     = aws_s3_bucket.assets.id
  depends_on = [aws_s3_bucket_public_access_block.public_access]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.assets.arn}/*"
      }
    ]
  })
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  count   = var.enable_cloudfront ? 1 : 0
  comment = "OAI for Sunotal S3 Assets"
}

resource "aws_cloudfront_distribution" "cdn" {
  count = var.enable_cloudfront ? 1 : 0

  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.assets.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai[0].cloudfront_access_identity_path
    }
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "Sunotal Media Assets CDN"

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
output "cloudfront_domain" {
  value = var.enable_cloudfront ? aws_cloudfront_distribution.cdn[0].domain_name : aws_s3_bucket.assets.bucket_regional_domain_name
}
output "bucket_regional_domain_name" { value = aws_s3_bucket.assets.bucket_regional_domain_name }

