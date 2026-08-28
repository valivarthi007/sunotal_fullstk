resource "aws_sqs_queue" "order_events" {
  name                      = "sunotal-order-events-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 864000 # 10 days
  receive_wait_time_seconds = 10     # Long polling
  visibility_timeout_seconds = 60

  tags = var.tags
}

resource "aws_sns_topic" "delivery_notifications" {
  name = "sunotal-delivery-notifications-topic"

  tags = var.tags
}

variable "tags" {
  type        = map(string)
  description = "Common resource tags"
}

output "sqs_queue_id" {
  value = aws_sqs_queue.order_events.id
}

output "sqs_queue_arn" {
  value = aws_sqs_queue.order_events.arn
}

output "sns_topic_arn" {
  value = aws_sns_topic.delivery_notifications.arn
}
