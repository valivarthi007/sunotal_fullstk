variable "tags" { type = map(string) }

resource "aws_sns_topic" "events" {
  name = "sunotal-platform-events"
  tags = merge(var.tags, { Name = "sunotal-platform-events" })
}

resource "aws_sqs_queue" "orders_queue" {
  name                       = "sunotal-orders-queue"
  message_retention_seconds  = 86400
  visibility_timeout_seconds = 30
  receive_wait_time_seconds  = 20   # Long polling — reduces empty receives and cost

  # Dead-letter queue for failed messages
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, { Name = "sunotal-orders-queue" })
}

# Dead Letter Queue for unprocessable order events
resource "aws_sqs_queue" "orders_dlq" {
  name                      = "sunotal-orders-dlq"
  message_retention_seconds = 1209600  # 14 days retention for failed messages
  tags                      = merge(var.tags, { Name = "sunotal-orders-dlq" })
}

# CRITICAL FIX: SNS needs explicit permission to deliver to SQS
resource "aws_sqs_queue_policy" "orders_queue_policy" {
  queue_url = aws_sqs_queue.orders_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSNSDelivery"
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.orders_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.events.arn
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "orders_sub" {
  topic_arn = aws_sns_topic.events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.orders_queue.arn
}

output "sns_topic_arn" { value = aws_sns_topic.events.arn }
output "sqs_queue_url" { value = aws_sqs_queue.orders_queue.url }
output "sqs_dlq_url"   { value = aws_sqs_queue.orders_dlq.url }
