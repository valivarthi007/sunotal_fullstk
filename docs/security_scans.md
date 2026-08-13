# 3. Security, QA, and Quality Gate Configurations

This document explains the security scanning workflows, static analysis quality gates, test host architectures, and container vulnerability scans integrated into the Sunotal application ecosystem.

---

## 1. SonarQube Static Application Security Testing (SAST)

SonarQube analyzes the source code to find bugs, security hotspots, code smells, and potential vulnerabilities before deployment.

### 1.1 Infrastructure Setup
* **Host**: Managed as an EC2 instance within the public subnet (`module.sonarqube`).
* **Configuration**: Set up inside the `sonar-project.properties` file located at the root of the project workspace.
* **Primary Configuration Properties**:
  ```properties
  sonar.projectKey=sunotal-full-project
  sonar.projectName=Sunotal Farm Produce Marketplace
  sonar.sources=backend/src,frontend/src
  sonar.exclusions=node_modules/**,dist/**,frontend/dist/**,**/test/**,**/*.test.ts,**/*.test.tsx
  sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info,backend/coverage/lcov.info
  ```

### 1.2 Pipeline Integration
The CI workflow triggers SonarQube execution via `SonarSource/sonarqube-scan-action@v8` on pushes and pull requests to the `main` branch.
* **Fallback Behavior**: Configured with `continue-on-error: true` to prevent third-party analysis tool downtime from locking critical developer integration tasks.

---

## 2. Staging / Test Server Verification

The Test Server acts as the staging environment where application artifacts are tested before promotion.

### 2.1 Host Configuration
* **Type**: Provisioned using EC2 (`module.test_server`) in a public subnet to allow test execution from CI runners.
* **Security Rules**: Restricted access using SG firewall rules, only accepting SSH and HTTP traffic from verified GitHub Runner CIDRs.

### 2.2 Integration Flow
1. **Runner Compilation**: GitHub Runners compile frontend/backend artifacts, check type systems, and run unit tests.
2. **Staging Artifact Deployment**: The test runner transfers tarball builds to the Test Server.
3. **Execution**: Migrations are run against a test database, services are started, and integration checks are verified.

---

## 3. Trivy Container Scanning

Trivy scans container images for CVEs (Common Vulnerabilities and Exposures) and package misconfigurations.

### 3.1 scan Execution
The Docker image build task invokes Trivy before images are uploaded to AWS ECR.
* **Command Sequence**:
  ```bash
  # Install Trivy
  curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
  
  # Scan backend image
  trivy image --severity HIGH,CRITICAL --exit-code 1 sunotal-auth:latest
  ```
* **Failure Policies**: If Trivy finds any `HIGH` or `CRITICAL` severity CVEs, the command exits with code `1`, stopping the pipeline to prevent deploying insecure packages.
