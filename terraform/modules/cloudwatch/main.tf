variable "tags" {
  type = map(string)
}

variable "dev_mode" {
  type    = bool
  default = false
}

resource "aws_cloudwatch_log_group" "sunotal_logs" {
  name              = "/aws/sunotal/platform-logs"
  retention_in_days = var.dev_mode ? 7 : 30
  tags              = merge(var.tags, { Name = "sunotal-cloudwatch-logs" })
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "sunotal-high-cpu-utilization"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 120
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This alarm monitors ECS cluster CPU utilization"
  tags                = merge(var.tags, { Name = "sunotal-high-cpu-alarm" })
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.sunotal_logs.name
}
