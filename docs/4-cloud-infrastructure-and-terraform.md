# 4. AWS Cloud Infrastructure & Terraform Configuration

This guide details the cloud architecture topology, infrastructure modularity, remote state management, and load balancer listeners.

---

## 1. Cloud Network Topology (VPC)

Sunotal's infrastructure enforces a **private-by-default** networking standard:
- **Public Subnets**: House the Application Load Balancer (ALB) and public Bastion host.
- **Private Subnets**: Contain the core EC2 Application Server and the PostgreSQL RDS instance. No direct inbound internet traffic is allowed to these resources.
- **Bastion Host / ProxyJump**: All administrative SSH sessions are tunneled securely through the Bastion host before reaching the private EC2 server.

---

## 2. Terraform Modules Structure

Infrastructure is managed modularly in the `/terraform` folder:
- **`vpc`**: Creates the VPC, subnets, internet gateways, NAT gateways, and routing tables.
- **`security`**: Restricts ingress/egress security group rules (port 22 for Bastion; 80 and 443 for ALB; 5432 for RDS private subnets).
- **`iam`**: Provisions `sunotal-ec2-s3-access-role` and `sunotal-s3-access-policy` which allows the EC2 instance profile to pull build packages from S3 and invoke the Lambda function.
- **`compute`**: provisions public Bastion EC2 and private App Server EC2 instances.
- **`database`**: provisions PostgreSQL RDS instance.
- **`cdn`**: Configures the ALB target groups, listener routing, and ACM SSL certificates.
- **`lambda`**: Packages and deploys the S3 auto-deletion function.

---

## 3. Remote State & Locking

State files are shared securely across deployments:
- **S3 Backend**: State resides at `s3://jcs-raju-sunotal-final/state/terraform.tfstate`.
- **Locking**: Prevent concurrent execution state corruption using DynamoDB table `sunotal-terraform-locks`.

---

## 4. ALB HTTPS redirection Listener Rules

The Load Balancer routes web traffic safely using two listener rules:
1. **HTTP Listener (Port 80)**: Automatically redirects incoming requests to HTTPS (Port 443) using a `HTTP_301` status code:
   ```hcl
   resource "aws_lb_listener" "http" {
     load_balancer_arn = aws_lb.main.arn
     port              = "80"
     protocol          = "HTTP"
     default_action {
       type = "redirect"
       redirect {
         port        = "443"
         protocol    = "HTTPS"
         status_code = "HTTP_301"
       }
     }
   }
   ```
2. **HTTPS Listener (Port 443)**: Asserts the SSL certificate (`ssl_certificate_arn`), decrypts traffic, and forwards it to the private EC2 target group.
