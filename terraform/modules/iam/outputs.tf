output "role_arn" {
  value       = aws_iam_role.ec2_s3_role.arn
  description = "ARN of the EC2 IAM Role"
}

output "role_name" {
  value       = aws_iam_role.ec2_s3_role.name
  description = "Name of the EC2 IAM Role"
}

output "instance_profile_name" {
  value       = aws_iam_instance_profile.ec2_profile.name
  description = "Name of the IAM Instance Profile"
}

output "policy_arn" {
  value       = aws_iam_policy.s3_artifacts_policy.arn
  description = "ARN of the S3 access policy"
}
