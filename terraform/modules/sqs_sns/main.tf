################################################################################
# Module: AWS SQS + SNS Event-Driven Messaging Bus
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

# ─── 1. SNS Topics ────────────────────────────────────────────────────────────
resource "aws_sns_topic" "order_events" {
  name = "sunotal-order-events-${var.environment}"
  tags = var.tags
}

resource "aws_sns_topic" "inventory_events" {
  name = "sunotal-inventory-events-${var.environment}"
  tags = var.tags
}

resource "aws_sns_topic" "delivery_events" {
  name = "sunotal-delivery-events-${var.environment}"
  tags = var.tags
}

# ─── 2. SQS Worker Queues ─────────────────────────────────────────────────────
resource "aws_sqs_queue" "order_processing_queue" {
  name                       = "sunotal-order-processing-queue-${var.environment}"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 864000
  tags                       = var.tags
}

resource "aws_sqs_queue" "inventory_deduction_queue" {
  name                       = "sunotal-inventory-deduction-queue-${var.environment}"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 864000
  tags                       = var.tags
}

resource "aws_sqs_queue" "delivery_dispatch_queue" {
  name                       = "sunotal-delivery-dispatch-queue-${var.environment}"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 864000
  tags                       = var.tags
}

# ─── 3. Subscriptions (SNS → SQS) ─────────────────────────────────────────────
resource "aws_sns_topic_subscription" "order_to_sqs" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.order_processing_queue.arn
}

resource "aws_sns_topic_subscription" "inventory_to_sqs" {
  topic_arn = aws_sns_topic.inventory_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.inventory_deduction_queue.arn
}

resource "aws_sns_topic_subscription" "delivery_to_sqs" {
  topic_arn = aws_sns_topic.delivery_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.delivery_dispatch_queue.arn
}

# ─── Outputs ──────────────────────────────────────────────────────────────────
output "order_events_topic_arn" {
  value = aws_sns_topic.order_events.arn
}

output "inventory_events_topic_arn" {
  value = aws_sns_topic.inventory_events.arn
}

output "delivery_events_topic_arn" {
  value = aws_sns_topic.delivery_events.arn
}

output "order_queue_url" {
  value = aws_sqs_queue.order_processing_queue.id
}
