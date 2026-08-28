# Sunotal Documentation & Learning Hub

Welcome to the **Sunotal End-to-End Master Documentation**. This documentation is designed as a complete teaching manual—taking anyone from zero technical background to a confident DevOps engineer capable of operating, deploying, and maintaining the Sunotal platform.

---

## 📚 Table of Contents & Learning Path

| Chapter | Document Title | Description & Target Knowledge |
| :--- | :--- | :--- |
| **01** | [System Overview & Core Concepts](01-OVERVIEW.md) | What Sunotal is, the business problem it solves, the full technology stack explained in plain English, and foundational concepts for beginners. |
| **02** | [System Architecture & Database Schemas](02-ARCHITECTURE.md) | Visual architecture diagrams, microservices topology, complete database tables (PostgreSQL/Drizzle ORM), API routes, and S3 asset delivery. |
| **03** | [Local Development & Testing Guide](03-LOCAL-DEVELOPMENT.md) | How to set up the app on your computer, manage environment variables, run local database migrations, start dev servers, and execute unit/E2E test suites. |
| **04** | [Infrastructure as Code (AWS & Terraform)](04-INFRASTRUCTURE.md) | Understanding cloud infrastructure, VPC networking, RDS PostgreSQL, EKS clusters, ALB load balancers, CloudFront CDN, and Terraform deployment automation. |
| **05** | [Containers & Kubernetes Guide](05-CONTAINERS-KUBERNETES.md) | What Docker containers are, multi-stage Dockerfiles explained line-by-line, Kubernetes manifests (Pods, Deployments, Services, Ingress, Jobs), and EKS management. |
| **06** | [CI/CD Pipelines (GitHub Actions)](06-CICD-PIPELINES.md) | Continuous Integration (CI) and Continuous Deployment (CD) pipelines explained step-by-step: automated testing, security scanning, image building, and production deployment. |
| **07** | [Operations Runbook & Troubleshooting](07-OPERATIONS-RUNBOOK.md) | The Layman's Operating Manual: how to trigger deployments, monitor pod health, execute DB migrations, scale resources, rotate secrets, and fix common errors step-by-step. |

---

## 🎯 How to Use This Documentation

1. **If you are new to IT/DevOps**: Read sequentially starting from [01-OVERVIEW.md](01-OVERVIEW.md). Each chapter builds upon the previous concepts using plain English and real-world analogies.
2. **If you need to deploy or manage Sunotal**: Jump straight to [07-OPERATIONS-RUNBOOK.md](07-OPERATIONS-RUNBOOK.md) for step-by-step operational instructions and troubleshooting guides.
3. **If you are contributing code**: Consult [03-LOCAL-DEVELOPMENT.md](03-LOCAL-DEVELOPMENT.md) to set up your local environment in minutes.
