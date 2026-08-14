# Troubleshooting History & Incident Chronicle

This document chronicles all issues encountered, diagnosed, and resolved during the local development, infrastructure deployment, CI/CD automation, and cloud operationalization of the **Sunotal Farms** platform.

---

## Chronological Incident Log

### Incident 1: SonarQube Out-Of-Memory (OOM) on EC2 Free Tier
- **Symptom:** Self-hosted SonarQube running on an EC2 `t3.micro` instance (1 GB RAM) consistently crashed during scanner initialization or became unresponsive during health checks (`Waiting for SonarQube... (1/30)... (30/30)`).
- **Investigation / Local & CLI Steps:**
  ```bash
  # Check instance state and public IP
  aws ec2 describe-instances --filters "Name=tag:Name,Values=sunotal-sonarqube" --query "Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress]" --output table

  # Check EC2 system log / console output
  aws ec2 get-console-output --instance-id <instance-id> --output text
  ```
- **Root Cause:** SonarQube Server requires an Elasticsearch/OpenSearch engine + JVM heap which demands a minimum of 2 GB to 4 GB RAM. Attempting to run it on `t3.micro` triggered the Linux OOM Killer. Attempting to resize the instance to `c5.large` in Terraform failed with AWS API error: `FreeTierRestrictionError: This operation is not available for free plan accounts.`
- **Resolution:** Reverted Terraform EC2 configuration back to `t3.micro` and migrated code quality analysis to **SonarCloud** (free cloud-hosted SaaS for open source / GitHub projects). Updated `.github/workflows/ci.yml` to use `SonarSource/sonarcloud-github-action@master` and configured `sonar-project.properties` with organization key `valivarthi007`.

---

### Incident 2: CD Pipeline Health Check Failure on `/api/inventory`
- **Symptom:** The GitHub Actions `CD Pipeline` failed during the post-deployment curl verification step when querying `https://sunotal.automateuniverse.space/api/inventory`.
- **Investigation / Local & CLI Steps:**
  ```bash
  # Test public response from ALB
  curl -i https://sunotal.automateuniverse.space/api/inventory
  ```
  Response returned `HTTP/2 401 Unauthorized` with `{"error": "Admin authentication required"}`.
- **Root Cause:** The `/api/inventory` endpoint is protected by `requireAdmin` middleware. The CD workflow step was performing a simple unauthenticated curl check expecting `200 OK`.
- **Resolution:** Added dedicated public health check endpoints:
  - `GET /api/inventory/healthz` in `backend/services/inventory-service/src/index.ts`
  - Updated `.github/workflows/cd.yml` to check `/api/healthz` (which returns HTTP 200 without authentication).

---

### Incident 3: Missing Relational Tables in Amazon RDS PostgreSQL (500 Server Errors & Blank Pages)
- **Symptom:** Accessing `/admin/login`, `/api/admin/login`, `/vendor`, or `/profile` resulted in `HTTP 500 Internal Server Error` or blank pages.
- **Investigation / CloudWatch CLI Steps:**
  ```bash
  # Check target health of all microservices
  for tg in $(aws elbv2 describe-target-groups --query "TargetGroups[*].TargetGroupArn" --output text); do
    aws elbv2 describe-target-health --target-group-arn "$tg" --query "TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Reason]" --output table
  done

  # Inspect recent CloudWatch container logs
  aws logs tail "/ecs/sunotal-user" --since 15m
  aws logs tail "/ecs/sunotal-operations" --since 15m
  ```
  Log output showed:
  ```text
  Error: Failed query: select "id", "name", "email", "password_hash", "role", "active", "phone", "city", "created_at" from "users" where "users"."email" = $1 limit $2
  cause: error: relation "users" does not exist (code: 42P01)
  
  Failed to list product definitions: DrizzleQueryError: Failed query: select "id", "name", "category", "created_at" from "product_definitions"
  cause: error: relation "product_definitions" does not exist (code: 42P01)
  ```
- **Root Cause:** Amazon RDS PostgreSQL was provisioned in a private VPC subnet. Drizzle schema migrations (`pnpm db:push`) were never run against the remote RDS database, leaving the database completely empty with 0 tables. Furthermore, ephemeral migration tasks failed because production Docker containers pruned dev dependencies (`tsx`, `drizzle-kit`).
- **Resolution:** Created an autonomous, self-executing `initDatabase()` function inside `src/lib/db.ts` across all backend services (`auth-service`, `user-service`, `operations-service`, `inventory-service`, and monolithic `backend`).
  - Automatically executes `CREATE TABLE IF NOT EXISTS` for all 9 tables on startup.
  - Automatically seeds default users (`admin@sunotal.com`, `farmer@sunotal.com`, `user@sunotal.com`), categories, product definitions, products, and banners if empty.

---

### Incident 4: ALB Path Pattern Routing Mismatch on `/api/product-definitions`
- **Symptom:** Opening `https://sunotal.automateuniverse.space/admin/products` rendered a blank screen. DevTools console showed:
  `ResponseParseError: Failed to parse response from GET /api/product-definitions (200 OK) as JSON`
- **Investigation / CLI Steps:**
  ```bash
  # Check response content-type
  curl -i https://sunotal.automateuniverse.space/api/product-definitions
  ```
  Response returned `HTTP/2 200 text/html` with `<!DOCTYPE html>...` (the React frontend index.html).
  ```bash
  # Inspect ALB listener rules on AWS
  aws elbv2 describe-rules --listener-arn <listener-arn> --query "Rules[*].[Priority,Conditions[0].Values,Actions[0].TargetGroupArn]" --output json
  ```
- **Root Cause:** In Terraform `terraform/modules/cdn/main.tf`, Rule 21 defined path pattern `["/api/productDefinitions", "/api/productDefinitions/*"]` (camelCase). When the frontend requested `/api/product-definitions` (kebab-case), ALB did not match rule 21 and routed to default target group (frontend Nginx), which returned `index.html`. React `fetch` crashed when attempting `JSON.parse("<!DOCTYPE html>...")`.
- **Resolution:**
  1. Updated AWS ALB Rule 21 via AWS CLI to include `"/api/product-definitions*"`.
  2. Updated `terraform/modules/cdn/main.tf` to persist `"/api/product-definitions*"` and `"/api/productDefinitions*"`.

---

### Incident 5: Banner Router Prefix Mismatch in Express (`operations-service`)
- **Symptom:** Creating, fetching, or deleting hero banners on `/admin/banners` failed with `404 Not Found`.
- **Investigation / Code Inspection:**
  In `operations-service/src/routes/banners.ts`:
  `bannersRouter.get('/', ...)`
  In `operations-service/src/index.ts`:
  `app.use('/api', bannersRouter);`
  Resulting route was `GET /api` instead of `GET /api/banners`.
- **Resolution:** Updated `bannersRouter` to handle both `/` and `/banners` (`GET /`, `GET /banners`, `POST /`, `POST /banners`, `DELETE /:id`, `DELETE /banners/:id`) and mounted at both `/api` and `/api/banners`.

---

### Incident 6: Image Upload CloudFront URL Formatting
- **Symptom:** Image uploads to S3 on Product creation and Banner creation resulted in broken relative URLs like `sunotal.automateuniverse.space/admin/d2ncpl9skd2fp0.cloudfront.net/...`.
- **Investigation:** In `upload.ts`, `imageUrl = ${cdnDomain}/${objectKey}` where `CLOUDFRONT_DOMAIN` environment variable was `d2ncpl9skd2fp0.cloudfront.net` without `https://`. The browser interpreted the protocol-less string as a relative path.
- **Resolution:** Updated `upload.ts` to check if `cdnDomain` starts with `http`, prepending `https://` if missing.

---

### Incident 7: Unhandled TanStack Query Errors Crashing React Component Tree
- **Symptom:** If any backend endpoint returned 401 or 500 (e.g. before login), the entire React UI crashed and rendered blank instead of displaying fallback states.
- **Resolution:**
  1. Configured global `throwOnError: false` and `retry: false` in `App.tsx` QueryClient default options.
  2. Added fallback arrays and error state guards in admin page components (`Products.tsx`, `Inventory.tsx`, `Vendors.tsx`, `Users.tsx`, `Quotations.tsx`, `Dashboard.tsx`).
