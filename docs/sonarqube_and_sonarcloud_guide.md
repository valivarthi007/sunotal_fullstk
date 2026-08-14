# SonarCloud & SonarQube: Configuration & Quality Gate Guide

This guide details how static code analysis and code quality scanning are configured in **Sunotal Farms**, comparing self-hosted SonarQube with SonarCloud SaaS, and providing a step-by-step tutorial on SonarCloud setup.

---

## Part 1: Self-Hosted SonarQube vs SonarCloud Comparison

| Feature | Self-Hosted SonarQube (EC2) | SonarCloud (SaaS) |
|---|---|---|
| **Resource Demand** | Requires 2 GB - 4 GB RAM + Java OpenJDK + Elasticsearch engine. Fails on AWS Free Tier (`t3.micro` 1 GB). | Zero server infrastructure. Scans run in GitHub Actions runner cloud. |
| **Maintenance** | Requires OS patching, DB backups, certificate renewal, and port security. | Fully managed by SonarSource. |
| **Cost** | EC2 and EBS storage costs. | 100% Free for public / open-source repositories. |
| **Integration** | Requires `SONAR_HOST_URL` + `SONAR_TOKEN`. | Native GitHub Actions action (`sonarcloud-github-action`). |

---

## Part 2: Sunotal `sonar-project.properties` Configuration

The project root contains `sonar-project.properties` which dictates what files are scanned and what paths are ignored:

```properties
# Organization & Project Keys (from SonarCloud)
sonar.organization=valivarthi007
sonar.projectKey=valivarthi007_sunotal_fullstk
sonar.projectName=sunotal_fullstk

# Source Code Directories to Scan
sonar.sources=backend/src,backend/services,frontend/src

# Test Directories
sonar.tests=backend/src,frontend/src

# File Patterns to Include / Exclude
sonar.inclusions=**/*.ts,**/*.tsx,**/*.js,**/*.jsx
sonar.exclusions=**/node_modules/**,**/dist/**,**/.next/**,**/coverage/**,**/build/**,**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx

# Test File Inclusions
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx

# Character Encoding & Language Settings
sonar.sourceEncoding=UTF-8
sonar.typescript.tsconfigPath=backend/tsconfig.json
```

---

## Part 3: Step-by-Step SonarCloud Setup Tutorial

1. **Sign in to SonarCloud:**
   - Go to [sonarcloud.io](https://sonarcloud.io) and log in with your GitHub account.

2. **Generate Access Token:**
   - Click on your avatar (top-right corner) -> **My Account**.
   - Navigate to the **Security** tab.
   - Under **Generate Token**, enter a name (e.g. `github-actions-ci`) and click **Generate**.
   - Copy the token string immediately.

3. **Store Token in GitHub Repository Secrets:**
   - Open your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions**.
   - Click **New repository secret**.
   - Name: `SONAR_TOKEN`
   - Value: `<paste-the-access-token>`
   - Click **Add secret**.
   - *(Note: `SONAR_HOST_URL` is NOT needed for SonarCloud and should be deleted).*

4. **Import Project in SonarCloud:**
   - On SonarCloud, click **"+"** (top-right) -> **Analyze new project**.
   - Select organization `valivarthi007` and select repository `sunotal_fullstk`.
   - Choose analysis method **"With GitHub Actions"**.

5. **Trigger CI Workflow:**
   - Any Git push to `main` will automatically trigger the scan step in `.github/workflows/ci.yml`:
     ```yaml
     - name: SonarCloud Code Analysis
       uses: SonarSource/sonarcloud-github-action@master
       continue-on-error: true
       env:
         GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
         SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
     ```

---

## Part 4: Understanding Code Quality Metrics

- **Bugs:** Code that is demonstrably wrong or likely to yield unexpected runtime exceptions.
- **Vulnerabilities:** Security flaws (e.g. SQL injection, unprotected secrets, insecure algorithms).
- **Security Hotspots:** Sensitive code areas that require human manual review (e.g. password comparison routines).
- **Code Smells:** Maintainability issues that make the codebase difficult to understand or extend.
- **Duplication:** Percentage of identical code blocks across different files.
