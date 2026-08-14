# Sunotal Farms — Complete Documentation Hub

Welcome to the comprehensive, production-grade documentation hub for the **Sunotal Farms** E-Commerce platform, microservices architecture, AWS cloud infrastructure, and CI/CD pipelines.

---

## 📖 Table of Contents & Documentation Catalog

### 1. Operations, Incident History & Troubleshooting
* **[Troubleshooting History & Incident Chronicle](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/troubleshooting_history.md)**: Full chronicle of all local and cloud incidents diagnosed and resolved across all chats (RDS table generation, ALB kebab-case path routing, SonarCloud migration, S3 URL formatting, etc.).
* **[Production Troubleshooting & Fixing Manual](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/troubleshooting_and_fixing_manual.md)**: Step-by-step diagnostic decision tree, recipes, and fixes for blank screens, 500 errors, broken uploads, and unhealthy target groups.
* **[Safe Application Enhancement Manual](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/safe_application_enhancement_manual.md)**: Standard operating procedures for zero-downtime database migrations, adding API routes, adding frontend pages, and pre-deployment validation.

### 2. Architecture & Cloud Behavior
* **[Application Architecture & Microservices Deep Dive](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/architecture_deep_dive.md)**: In-depth breakdown of the 5 microservices, stateless JWT authentication flow, Drizzle ORM connection pooling, and Layer 7 ALB path-based routing.
* **[API Routes & Cloud Runtime Behavior Catalog](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/api_routes_and_cloud_behavior.md)**: Complete catalog of all REST endpoints across Auth, Operations, Inventory, and User services with request/response schemas and cloud lifecycles.
* **[Database Schema & Entity Relationship Diagram](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/database.md)**: Drizzle schema models, PostgreSQL constraints, and visual ER diagrams.

### 3. AWS Infrastructure & IaC
* **[AWS Cloud Services Tutorial & CLI Reference](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/aws_tutorial_and_cli.md)**: Comprehensive tutorial on AWS ECS Fargate, ECR, RDS, ALB, S3, CloudFront, ACM, VPC, IAM, and complete AWS CLI commands cheatsheet.
* **[Terraform Architecture, Modules & Writing Tutorial](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/terraform_tutorial_and_guide.md)**: Modular structure analysis, Terraform CLI reference, and step-by-step tutorial on writing modular Terraform code.
* **[Amazon S3 & CloudFront Storage Architecture](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/s3_storage.md)**: S3 asset storage, Origin Access Control (OAC), and Lambda-based cleanup routines.

### 4. Containerization, Web Serving & Automation
* **[Docker, Dockerfile & Docker Compose Guide](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/docker_tutorial_and_guide.md)**: Docker command reference, multi-stage Dockerfile anatomy (Node.js & Nginx), and local development Compose tutorial.
* **[Nginx Configuration & Reverse Proxy Tutorial](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/nginx_tutorial_and_config.md)**: Frontend SPA routing fallback, static caching, gzip compression, and reverse proxying tutorial.
* **[Bash Shell Scripting Tutorial (`setup.sh` & `start-dev.sh`)](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/shell_scripting_tutorial.md)**: Shell automation best practices, strict mode (`set -euo pipefail`), PID management, and signal trapping.

### 5. CI/CD & Code Quality
* **[GitHub Actions CI/CD Workflows Deep Dive](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/github_actions_deep_dive.md)**: Line-by-line explanation of `ci.yml` and `cd.yml`, service containers, ECR push matrix, and ECS zero-downtime deployments.
* **[SonarCloud & SonarQube Setup & Quality Guide](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/sonarqube_and_sonarcloud_guide.md)**: Setup tutorial, token configuration, quality gates, and code metrics analysis.
* **[Trivy Vulnerability Scanner Guide](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/trivy.md)**: Filesystem and container vulnerability scanning rules.
