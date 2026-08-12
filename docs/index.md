# Sunotal Documentation Hub

Welcome to the comprehensive, in-depth documentation hub for the Sunotal E-Commerce farm produce marketplace and its AWS cloud infrastructure.

---

## 📖 Overview of Documentation

The documentation is structured to guide developers, QA engineers, and system administrators through all aspects of the Sunotal ecosystem. The files are organized into four operational categories:

### 1. Core Architecture & System Execution
* **[Microservice Architecture & Interactions](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/1-microservice-architecture.md)**: Details the design of the decoupled microservices, ports, request routing flow via Nginx, and system component interactions.
* **[Request Routing & Load Balancing Architecture](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/routing-documentation.md)**: Explains the roles of Vite dev-proxy locally, Nginx host reverse proxy on staging, and AWS ALB path-based routing in production.
* **[AWS Cloud Services & Command Cheat Sheet](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/4-aws-services-ops-cheat-sheet.md)**: Explains ALB configurations, ECS task parameters, RDS database setups, and contains an AWS CLI reference commands table.
* **[Test Server Infrastructure & Deployment](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/8-test-server-documentation.md)**: Outlines the design, firewall rules, and bootstrap operations for the staging EC2 environment.


### 2. Infrastructure-as-Code & Containerization
* **[Infrastructure Code Documentation (Terraform & Docker)](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/2-infrastructure-docker-terraform.md)**: Outlines basic multi-stage builds and Terraform structures.
* **[Docker, ECR, and ECS Deployment Documentation](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/docker-documentation.md)**: Explains the microservice Dockerfiles, ECR repositories, ECS task definitions, one-off DB push/seed tasks, and ALB path-based routing rules.
* **[Terraform Infrastructure-as-Code Documentation](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/terraform-documentation.md)**: Explains the modular directory layout, S3 remote state tracking, and DynamoDB locks.

### 3. Security, Quality Assurance & Scanning
* **[Security, QA, and Quality Gate Configurations](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/3-security-quality-scans.md)**: Summarizes SonarQube quality analysis, staging server verifications, and Trivy image scanning rules.
* **[Trivy Vulnerability Scanner Documentation](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/trivy-documentation.md)**: Deep dive into CI/CD filesystem scans, image scan gatekeepers, and vulnerability exemptions (`.trivyignore`).

### 4. Data Modeling, Operations & Maintenance
* **[Database Schema & Entity Relationship Diagram](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/database.md)**: Defines the Drizzle schema models, column constraints, types, and contains a visual ER diagram.
* **[Change Management & Safe Enhancement Guidelines](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/6-safe-enhancements-guide.md)**: Best practices for adding features, performing safe database migrations, and changing automation pipelines.
* **[Operational Knowledge Artifacts (KA) & Runbooks](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/7-operations-ka-hub.md)**: Troubleshooting runbooks for disk cleanup, SSL rotations, database backups, and process recovery.
* **[Automation Pipelines & Workflow Topologies](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/docs/5-pipelines-automation.md)**: Flowcharts detailing CI code verification, CD deployment steps, and infrastructure decommissioning.
