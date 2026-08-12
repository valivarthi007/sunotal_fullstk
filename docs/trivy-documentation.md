# Trivy Vulnerability Scanner Documentation

This document describes the configuration, integration, and security policy rules of the **Trivy Vulnerability Scanner** in the Sunotal project.

---

## 1. Overview of Trivy Scanner
Trivy (by Aqua Security) is the primary vulnerability scanner used in the Sunotal project to secure both static codebase directories and built container images. It detects:
* **Package Vulnerabilities**: Outdated dependencies with known CVEs (Common Vulnerabilities and Exposures) in `npm`/`pnpm` packages.
* **OS-level Vulnerabilities**: Vulnerabilities in Alpine Linux packages used in the production Docker images.
* **Secrets & Misconfigurations**: Exposed keys, configurations, or credentials in codebase files.

---

## 2. Pipeline Integration

Trivy runs automatically as part of the **CI Pipeline** ([.github/workflows/ci.yml](file:///.github/workflows/ci.yml)) in two different phases:

```
                  [CI Pipeline Run]
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
[Filesystem Scan (fs)]      [Container Image Scans]
Scan source tree (exit 0)    Scan 5 microservice images
Reports findings but        Fails build (exit 1) if any
doesn't block pipeline.     CRITICAL CVEs are detected.
```

### 2.1 Filesystem Scanning (Static Code Analysis)
* **Configuration**:
  ```yaml
  - name: Run Trivy vulnerability scanner (Filesystem)
    uses: aquasecurity/trivy-action@master
    with:
      scan-type: 'fs'
      scan-ref: '.'
      exit-code: '0'
      severity: 'CRITICAL,HIGH'
  ```
* **Purpose**: Scans the root directory to find dependency vulnerabilities and alerts developers without failing the pipeline (`exit-code: '0'`).

### 2.2 Container Image Scanning (Gatekeeper)
* **Configuration**:
  ```yaml
  - name: Run Trivy vulnerability scanner (Auth Image)
    uses: aquasecurity/trivy-action@master
    with:
      image-ref: ${{ steps.login-ecr.outputs.registry }}/sunotal-auth:latest
      exit-code: '1'
      severity: 'CRITICAL'
      trivyignores: .trivyignore
  ```
* **Gatekeeper Policy**: Runs independently on all 5 container images (`frontend`, `auth`, `operations`, `inventory`, `user`) after they are compiled but **before** they are pushed to AWS ECR. 
* **Pipeline Block**: Configured with `exit-code: '1'` and `severity: 'CRITICAL'`. If Trivy detects any unignored `CRITICAL` severity vulnerability, the step fails, aborting the workflow to prevent pushing insecure containers to the cloud registry.

---

## 3. Ignore Vulnerability Policy (`.trivyignore`)

Certain vulnerabilities are bypassed by referencing [.trivyignore](file:///.trivyignore) at the project root. This prevents false positives or issues outside of development control from halting deployment pipelines:

* **`CVE-2022-23529`**: Ignored for `jsonwebtoken` as version `9.0.2` is a rejected/faulty CVE report and is the latest secure release of the module.
* **`CVE-2026-59873`**: Ignored for the `tar` package.
* **`CVE-2024-24790` / `CVE-2025-68121`**: Ignored for `esbuild` dependency libraries.
