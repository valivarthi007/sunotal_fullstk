# Sunotal Maintenance, Support & Future Enhancements Guide

This guide details runtime maintenance operations, monitoring, troubleshooting, and provides instructions for adding future application or DevOps pipeline features.

---

## 1. Application Maintenance & Support

To keep the platform secure, fast, and healthy in production:

### Log Monitoring & Auditing
- **Backend Service Logs**: Review running backend process logs via PM2:
  ```bash
  pm2 logs sunotal-backend
  ```
- **Nginx Web Server Logs**: Review incoming HTTP request logs and error streams:
  ```bash
  sudo tail -f /var/log/nginx/access.log
  sudo tail -f /var/log/nginx/error.log
  ```
- **Database Engine Logs**: PostgreSQL container errors can be checked with:
  ```bash
  docker compose logs db
  ```

### Database Backups & Schema Migrations
- **Manual Database Dump**: Generate SQL dumps for backup storage:
  ```bash
  docker exec -t sunotal-postgres pg_dump -U sunotal -d sunotal > backup.sql
  ```
- **Drizzle Migrations**: When database schemas are updated, push changes immediately:
  ```bash
  pnpm run db:push
  ```

### SSL/TLS Certificate Rotation
- Certificate renewals are managed via AWS Certificate Manager (ACM). 
- Once a new certificate is issued, update the `ssl_certificate_arn` variable in Terraform or the repository secrets block to bind it to the Application Load Balancer (ALB).

---

## 2. Extending the Application (Adding Code Enhancements)

Follow these steps to safely build new features:

### Step 1: Update Database Schemas
Add new fields or tables inside [backend/src/schema/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/src/schema/). For example, to add an order rating:
- Edit the schema file.
- Apply structural updates directly using:
  ```bash
  pnpm run db:push
  ```

### Step 2: Implement Backend Router APIs
Add API endpoints under [backend/src/routes/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/src/routes/).
- Parse incoming request bodies using Zod schemas (`backend/src/lib/schemas.ts`).
- Wire the new router inside [backend/src/index.ts](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/src/index.ts).

### Step 3: Regenerate Frontend API Clients
If your API endpoints change, regenerate the React Query hooks from the OpenAPI specs or update the local API client definition inside `frontend/src/lib/api-client/`.

### Step 4: Build Frontend Views
- Add new React pages under [frontend/src/pages/](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/frontend/src/pages/).
- Define matching routing definitions inside [frontend/src/App.tsx](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/frontend/src/App.tsx).

---

## 3. Extending the DevOps Pipelines & Cloud Tools

Follow these steps to upgrade infrastructure or pipeline steps:

### Modifying Base System Images (Packer & Ansible)
If you need new global operating system dependencies (e.g., system libraries, utility packages):
1. Add the appropriate installation task inside `packer/ansible/site.yml`.
2. Run the base AMI provisioning pipeline (`Jenkinsfile` or GitHub Actions `infra.yml`) to bake a new machine image.

### Modifying Cloud Infrastructure (Terraform)
If you need additional AWS resources (e.g., adding an RDS Read Replica or connecting an Elasticache Redis cluster):
1. Define the resource inside `terraform/main.tf` or under modular configs in `terraform/modules/`.
2. Supply variables in `terraform/variables.tf`.
3. Validate templates locally:
   ```bash
   terraform validate
   ```
4. Deploy the infrastructure modifications via the deployment pipeline.

### Extending Jenkins & GitHub Actions Pipelines
- **Jenkins Pipelines**: Add execution stages inside `Jenkinsfile` (e.g., adding slack notification webhooks, automated end-to-end Cypress test suites).
- **GitHub Actions Workflows**: Update `.github/workflows/ci.yml` to run additional security audits, dependency vulnerability scanners (`npm audit`), or lint checkers.
