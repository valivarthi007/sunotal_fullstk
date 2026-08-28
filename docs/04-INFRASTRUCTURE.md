# Chapter 4: Cloud Infrastructure as Code (AWS & Terraform)

## 1. What is Infrastructure as Code (IaC)?

Instead of manually logging into the AWS Web Console and clicking buttons to create servers, networks, and databases, Sunotal uses **Terraform**. 

Terraform allows us to define our entire cloud footprint in code files (`.tf` files located under `terraform/`). When we execute Terraform commands, AWS automatically creates, updates, or destroys resources to match our exact code definitions.

---

## 2. AWS Infrastructure Topology Diagram

```mermaid
graph TD
    subgraph AWS Cloud (Region: us-east-1)
        subgraph VPC: sunotal-vpc (10.0.0.0/16)
            subgraph Public Subnets (10.0.1.0/24, 10.0.2.0/24)
                ALB["Application Load Balancer\n(sunotal-alb)"]
                SonarEC2["SonarQube EC2 Server"]
                TestEC2["Test Runner EC2 Server"]
            end

            subgraph Private Subnets (10.0.3.0/24, 10.0.4.0/24)
                EKSNodeGroup["EKS Worker Node Group\n(t3.medium instances)"]
                ECSService["ECS Fargate Services\n(Alternate Compute)"]
            end

            subgraph Database Subnets (Private)
                RDS[("AWS RDS PostgreSQL\n(sunotal-postgres)")]
            end
        end

        subgraph Global & Edge Services
            Route53["AWS Route53\nsunotal.automateuniverse.space"]
            CloudFront["AWS CloudFront CDN"]
            S3["AWS S3 Bucket\njcs-raju-sunotal-final"]
            ECR["AWS ECR Registries\n(6 Repositories)"]
            IAM["IAM Roles & OIDC Provider"]
        end
    end

    Route53 --> ALB
    ALB --> EKSNodeGroup
    EKSNodeGroup --> RDS
    CloudFront --> S3
```

---

## 3. Modular Terraform Architecture

The Terraform codebase (`terraform/`) is organized into reusable modules:

| Module | Directory | Managed AWS Resources |
| :--- | :--- | :--- |
| **vpc** | `terraform/modules/vpc` | VPC, 2 Public Subnets, 2 Private Subnets, Internet Gateway, Route Tables. |
| **security** | `terraform/modules/security` | Security Groups for ALB, EKS Nodes, ECS Tasks, RDS PostgreSQL, and SSH Access. |
| **database** | `terraform/modules/database` | AWS RDS PostgreSQL DB Instance (`sunotal-postgres`), DB Subnet Group, Storage Autoscaling. |
| **cdn** | `terraform/modules/cdn` | Application Load Balancer (`sunotal-alb`), 5 Target Groups, Route53 Alias Record, S3 Bucket Policy, CloudFront CDN Distribution. |
| **ecr** | `terraform/modules/ecr` | 6 ECR Repositories (`sunotal-frontend`, `sunotal-backend`, `sunotal-auth`, `sunotal-operations`, `sunotal-inventory`, `sunotal-user`). |
| **eks** | `terraform/modules/eks` | EKS Control Plane Cluster (`sunotal-cluster`), Managed Node Group, OIDC Identity Provider for IRSA. |
| **ecs** | `terraform/modules/ecs` | ECS Cluster, Task Definitions, Fargate Services (used when compute target is set to `ecs`). |
| **iam** | `terraform/modules/iam` | IAM Roles, S3 Access Policies, EC2 Instance Profiles, GitHub Actions OIDC Role. |
| **lambda** | `terraform/modules/lambda` | AWS Lambda function for PDF invoice generation. |
| **sonarqube** | `terraform/modules/sonarqube` | Dedicated EC2 instance running SonarQube for static code analysis. |
| **test_server** | `terraform/modules/test_server` | Dedicated EC2 test runner instance. |

---

## 4. How to Operate Terraform (Step-by-Step)

### Prerequisites:
Ensure your machine or runner has AWS CLI configured:
```bash
aws configure
# Enter AWS Access Key ID, AWS Secret Access Key, Region: us-east-1
```

### Step 1: Initialize Terraform
Navigating to the `terraform/` directory initializes the backend and downloads AWS provider plugins:
```bash
cd terraform
terraform init
```

### Step 2: Preview Planned Infrastructure Changes
```bash
terraform plan -var-file="terraform.tfvars"
```

### Step 3: Apply Infrastructure Changes
```bash
terraform apply -var-file="terraform.tfvars" -auto-approve
```

### Step 4: Automated Setup & Teardown Shell Scripts
- **Full Automated Setup**: Running `./setup.sh` automatically checks pre-reqs, runs `terraform apply`, syncs AWS credentials, and provisions Kubernetes resources.
- **Teardown / Destroy Infrastructure**:
```bash
./scripts/manual_destroy.sh
```
Or via GitHub Actions workflow: Trigger **Destroy Infrastructure** workflow on GitHub (`infra-destroy.yml`).
