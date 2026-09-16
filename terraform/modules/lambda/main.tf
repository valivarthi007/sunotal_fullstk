variable "tags" { type = map(string) }

resource "aws_iam_role" "lambda_role" {
  name = "sunotal-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "dummy_lambda" {
  type        = "zip"
  output_path = "${path.module}/dummy_lambda.zip"

  source {
    content  = "exports.handler = async (event) => { return { statusCode: 200, body: 'Hello' }; };"
    filename = "index.js"
  }
}

resource "aws_lambda_function" "photo_manager" {
  filename         = data.archive_file.dummy_lambda.output_path
  function_name    = "sunotal-s3-photo-manager"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.dummy_lambda.output_base64sha256

  tags = merge(var.tags, { Name = "sunotal-s3-photo-manager" })
}

output "function_arn" { value = aws_lambda_function.photo_manager.arn }
