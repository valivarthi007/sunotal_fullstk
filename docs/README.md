# Sunotal Full-Stack Enterprise Documentation

Welcome to the central documentation index for **Sunotal**, an enterprise-grade multi-tenant B2B/B2C agricultural e-commerce platform and marketplace connecting Indian farmers, agricultural vendors, and consumers.

---

## 📚 Table of Contents

| Section | Topic | Summary |
| :--- | :--- | :--- |
| **[01. Application Code](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/01_application_code.md)** | Codebase Architecture & User Operating Manuals | End-to-end architecture, Admin/Vendor/User operating manuals, API workflows, DB schemas, ER diagrams, SQL CRUD queries, manual installation, health querying via curl/wget, troubleshooting, and enhancement blueprints (Payment Gateways). |
| **[02. Docker Infrastructure](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/02_docker.md)** | Containerization & AWS ECS/ECR | Line-by-line Dockerfile breakdown for all services, `docker-compose` architecture, CLI lifecycle commands, `docker exec` querying, resource monitoring, log auditing, network packet inspection, AWS ECR & ECS CLI templates, and service-down triage. |
| **[03. Kubernetes (EKS)](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/03_kubernetes.md)** | K8s Manifests & EKS Operations | Explanation of Kubernetes manifests by `kind` (`Deployment`, `Service`, `Ingress`, `ConfigMap`, `Secret`, `Job`), manifest skeletons/templates, `kubectl` CRUD commands, troubleshooting, log auditing, resource monitoring, and service-down runbooks. |
| **[04. Terraform (IaC)](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/04_terraform.md)** | Infrastructure as Code & AWS Resources | Modular Terraform architecture, manual infrastructure provisioning commands, AWS CLI CRUD commands for VPC, EKS, ECS, RDS, S3, CloudFront, ALB, Route53, and IAM prerequisites. |
| **[05. Nginx Reverse Proxy](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/05_nginx.md)** | Web Server & Gateway Routing | Nginx deployment locations, process management commands, configuration syntax, request routing mechanics, SPA client-side fallback, and step-by-step route creation guide. |
| **[06. CI/CD Workflows](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/06_workflow.md)** | GitHub Actions Pipelines | In-depth breakdown of `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml`, job dependency graphs, automated self-healing EKS Target Group sync, and post-deployment automated test suites. |
| **[07. Version Control (Git)](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/07_git.md)** | Git Operations & Branching Strategy | Daily Git commands, industry-standard GitFlow branching strategies, CRUD operations, commit history inspection, revert/rollback procedures, and emergency patch workflows. |
| **[08. Architecture Diagrams](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/08_architecture_diagrams.md)** | System Architectural Visualizations | Production-grade Mermaid diagrams covering Application Architecture, DevOps Pipeline, AWS Cloud Infrastructure, Docker Container Topology, ER Database Model, and Kubernetes Cluster Topology. |

---

## ⚡ Quick System Status Check

To quickly check the health of the entire deployed production environment:

```bash
# Public Web App
curl -i https://sunotal.automateuniverse.space/

# Microservice Health Endpoint
curl -i https://sunotal.automateuniverse.space/api/healthz

# Admin Login Test
curl -i -X POST https://sunotal.automateuniverse.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sunotal.com","password":"admin123"}'
```
