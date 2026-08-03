# 6. CI/CD Pipeline Automation (GitHub Actions & Jenkins)

This guide describes the automated CI/CD pipelines, build packaging, and deployment orchestration.

---

## 1. Decoupled Pipeline Design

Sunotal enforces a decoupled pipeline design:
- **Infrastructure Provisioning**: Baked via Packer and deployed via Terraform. Triggered manually or on infrastructure code changes (VPC, Security Groups, IAM).
- **Application Deployment**: Focuses on software lifecycle. Triggered automatically on code updates to ensure fast development cycles.

---

## 2. GitHub Actions CI/CD Workflows

Configured inside `.github/workflows/`:

### Infrastructure Workflow (`infra.yml`)
- **Trigger**: Manual dispatch or PRs targeting the `terraform/` or `packer/` directories.
- **Jobs**:
  1. Validates Packer template syntaxes.
  2. Runs `terraform fmt` and `terraform validate`.
  3. Executes `terraform plan` and applies modifications securely.

### Code deployment Workflow (`ci.yml`)
- **Trigger**: On code pushes or merges to the `main` branch.
- **Jobs**:
  1. Runs TypeScript checks (`tsc --noEmit`).
  2. Runs SonarQube static code quality analysis.
  3. Compiles frontend and backend assets.
  4. Packages builds into tarballs (`frontend-build.tgz`, `backend-build.tgz`) and uploads them to `s3://jcs-raju-sunotal-final/artifacts/${BUILD_TAG}/`.
  5. Triggers deployment on the private EC2 server, updates PM2, and runs Drizzle migrations.

---

## 3. Jenkins Declarative Pipelines

Configured via dedicated Jenkinsfiles in the root:

### 1. Infrastructure Pipeline (`Jenkinsfile`)
- Orchestrates Packer golden AMI builds and runs `terraform apply` to provision network and compute layers.

### 2. Application Deployment (`Jenkinsfile-deploy`)
- Clones the repository, installs dependencies, builds static distributions, and deploys changes using `rsync` over SSH through the Bastion proxy.

### 3. Teardown Pipeline (`Jenkinsfile-destroy`)
- Runs `terraform destroy` to decommission AWS cloud infrastructure. Requires manual approvals.
