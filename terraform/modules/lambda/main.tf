################################################################################
# Module: AWS Lambda + S3 Photo Manager
# Dynamic product & banner photo uploads, presigned URLs, and S3 deletions
################################################################################

variable "environment" {
  type        = string
  default     = "production"
  description = "Environment name"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}

# ─── 1. S3 Asset Bucket ───────────────────────────────────────────────────────
resource "aws_s3_bucket" "photo_assets" {
  bucket        = "sunotal-product-banner-assets-${var.environment}"
  force_destroy = false

  tags = merge(var.tags, {
    Name = "sunotal-product-banner-assets-${var.environment}"
  })
}

resource "aws_s3_bucket_public_access_block" "photo_assets" {
  bucket = aws_s3_bucket.photo_assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "photo_assets" {
  bucket = aws_s3_bucket.photo_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# ─── 2. IAM Execution Role for Lambda ─────────────────────────────────────────
resource "aws_iam_role" "lambda_exec" {
  name = "sunotal-lambda-photo-manager-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "lambda_s3_policy" {
  name = "sunotal-lambda-s3-access-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.photo_assets.arn,
          "${aws_s3_bucket.photo_assets.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ─── 3. Lambda Function Code Package ──────────────────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/photo_manager.zip"

  source {
    content  = <<EOF
import json
import os
import boto3

s3 = boto3.client('s3')
BUCKET_NAME = os.environ.get('PHOTO_BUCKET_NAME')

def handler(event, context):
    try:
        http_method = event.get('httpMethod', 'POST')
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})
        action = body.get('action')
        file_key = body.get('file_key')

        if action == 'get_presigned_url' and file_key:
            url = s3.generate_presigned_url(
                'put_object',
                Params={'Bucket': BUCKET_NAME, 'Key': file_key},
                ExpiresIn=3600
            )
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'presigned_url': url, 'file_key': file_key})
            }

        elif action == 'delete_photo' and file_key:
            s3.delete_object(Bucket=BUCKET_NAME, Key=file_key)
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': f'Successfully deleted {file_key}'})
            }

        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid action or missing file_key'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
EOF
    filename = "index.py"
  }
}

resource "aws_lambda_function" "photo_manager" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "sunotal-photo-manager-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      PHOTO_BUCKET_NAME = aws_s3_bucket.photo_assets.id
    }
  }

  tags = var.tags
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.photo_assets.id
  description = "Dynamic photo asset S3 bucket name"
}

output "s3_bucket_arn" {
  value       = aws_s3_bucket.photo_assets.arn
  description = "Dynamic photo asset S3 bucket ARN"
}

output "lambda_function_arn" {
  value       = aws_lambda_function.photo_manager.arn
  description = "Photo Manager Lambda function ARN"
}
