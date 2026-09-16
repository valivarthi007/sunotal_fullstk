variable "tags" { type = map(string) }

resource "aws_sns_topic" "events" {
  name = "sunotal-platform-events"
  tags = merge(var.tags, { Name = "sunotal-platform-events" })
}

resource "aws_sqs_queue" "orders_queue" {
  name                      = "sunotal-orders-queue"
  message_retention_seconds = 86400
  tags                      = merge(var.tags, { Name = "sunotal-orders-queue" })
}

resource "aws_sns_topic_subscription" "orders_sub" {
  topic_arn = aws_sns_topic.events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.orders_queue.arn
}

output "sns_topic_arn" { value = aws_sns_topic.events.arn }
output "sqs_queue_url" { value = aws_sqs_queue.orders_queue.url }
