# 6. Change Management & Safe Enhancement Guidelines

This document provides protocols and verification workflows for developers to introduce feature updates, database migrations, or DevOps pipeline enhancements without causing regressions or service disruptions.

---

## 1. Safe Application Code Upgrades

### 1.1 Local Sandbox Testing
Before pushing any change to the repository:
1. Start the local database container:
   ```bash
   docker compose up -d db
   ```
2. Run backend and frontend local checks:
   ```bash
   pnpm run dev
   ```
3. Run the complete test suite:
   ```bash
   # Inside backend/
   pnpm run test
   # Inside frontend/
   pnpm run test
   ```

### 1.2 Verification Checklists
* **No Inline Secrets**: Do not commit plaintext API keys, tokens, or credentials. Use `process.env` references.
* **Strict Typechecks**: Ensure `tsc --noEmit` runs successfully locally. The CI pipeline will reject builds with TypeScript warnings.

---

## 2. Database Schema Migrations

Sunotal utilizes **Drizzle ORM** for schema operations. Altering production database structures must follow these rules:

> [!WARNING]
> Running `drizzle-kit push` directly against a production PostgreSQL database can cause schema truncation or unexpected downtime if tables are locked during DDL execution.

### 2.1 Database Change Workflow
1. **Define Schema**: Modify tables inside `backend/src/schema/index.ts`.
2. **Generate Migration Files**: Create SQL migration scripts locally using:
   ```bash
   pnpm exec drizzle-kit generate
   ```
3. **Review Migration Script**: Inspect the generated SQL file in `backend/drizzle/` to ensure it does not include destructive commands (such as `DROP COLUMN` without renaming).
4. **Deploy Migration**: Execute migration scripts inside the staging environment first:
   ```bash
   pnpm exec drizzle-kit migrate
   ```

---

## 3. DevOps & CI/CD Pipeline Changes

Modifying pipeline files (`ci.yml`, `cd.yml`, `infra.yml`) can block delivery channels. Follow this sequence:

1. **Branch Isolation**: Create a dedicated development branch (e.g. `feature/pipeline-update`).
2. **Manual Dispatch testing**: Enable `workflow_dispatch` on your custom branch to test execution steps manually.
3. **Verify IAM Limits**: Verify that any new AWS services or CLI commands introduced are allowed in the EC2 instance role policy or the pipeline execution profile.
4. **Verify Rollback Mechanism**: Before updating deployment commands, ensure you can redeploy the previous stable build using:
   ```bash
   # Copy previous stable build tarball to latest pointer
   aws s3 cp s3://jcs-raju-sunotal-final/artifacts/<STABLE_SHA>/frontend-build.tgz s3://jcs-raju-sunotal-final/artifacts/latest/frontend-build.tgz
   # Re-trigger CD deployment
   ```
