data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/src/index.py"
  output_path = "${path.module}/src/lambda.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name = "sunotal-lambda-s3-delete-role"

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

# Attach basic execution role for CloudWatch logs
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# S3 Delete policy for Lambda
resource "aws_iam_policy" "lambda_s3_delete_policy" {
  name        = "sunotal-lambda-s3-delete-policy"
  description = "Allows Lambda function to delete objects in the S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}/*"
        ]
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_s3_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_s3_delete_policy.arn
}

resource "aws_lambda_function" "delete_s3_object" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "sunotal-delete-s3-object"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.11"
  timeout          = 15

  tags = var.tags
}
