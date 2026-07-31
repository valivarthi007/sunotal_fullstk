output "lambda_arn" {
  description = "The ARN of the Lambda function"
  value       = aws_lambda_function.delete_s3_object.arn
}

output "lambda_function_name" {
  description = "The name of the Lambda function"
  value       = aws_lambda_function.delete_s3_object.function_name
}
