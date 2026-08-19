# GitHub Actions CI/CD Workflows: Deep Dive & Keyword Documentation Reference

This document provides a comprehensive breakdown and official documentation reference for every single keyword, section, event trigger, service container directive, context expression, workflow command, action plugin, and secret used across all **Sunotal Farms** GitHub Actions automation pipelines.

---

## 📑 Quick Navigation & Table of Contents

1. [Active Workflow Architecture Roster](#1-active-workflow-architecture-roster)
2. [Master GitHub Actions Keywords & Directives Documentation Table](#2-master-github-actions-keywords--directives-documentation-table)
3. [Event Triggers & Filter Directives Documentation Table](#3-event-triggers--filter-directives-documentation-table)
4. [Service Containers & Runner Environment Documentation Table](#4-service-containers--runner-environment-documentation-table)
5. [Contexts, Expressions & Runtime Variables Documentation Table](#5-contexts-expressions--runtime-variables-documentation-table)
6. [Workflow Console & Logging Commands Documentation Table](#6-workflow-console--logging-commands-documentation-table)
7. [Action Plugins (`uses:`) & Marketplace Extensions Reference](#7-action-plugins-uses--marketplace-extensions-reference)
   - [7.1 Anatomy of the `uses:` Keyword](#71-anatomy-of-the-uses-keyword)
   - [7.2 Master `uses:` Plugins Catalog](#72-master-uses-plugins-catalog)
   - [7.3 Detailed Action-by-Action Documentation](#73-detailed-action-by-action-documentation)
     - [`actions/checkout@v4`](#731-actionscheckoutv4)
     - [`pnpm/action-setup@v4`](#732-pnpmaction-setupv4)
     - [`actions/setup-node@v4`](#733-actionssetup-nodev4)
     - [`aws-actions/configure-aws-credentials@v4`](#734-aws-actionsconfigure-aws-credentialsv4)
     - [`aws-actions/amazon-ecr-login@v2`](#735-aws-actionsamazon-ecr-loginv2)
     - [`SonarSource/sonarcloud-github-action@master`](#736-sonarsourcesonarcloud-github-actionmaster)
     - [`aquasecurity/trivy-action@master`](#737-aquasecuritytrivy-actionmaster)
     - [`hashicorp/setup-terraform@v3`](#738-hashicorpsetup-terraformv3)
8. [Secrets & Environment Configuration Variables Table](#8-secrets--environment-configuration-variables-table)
9. [In-Depth Workflow-by-Workflow Explanations](#9-in-depth-workflow-by-workflow-explanations)
   - [9.1 CI Pipeline (`ci.yml`)](#91-ci-pipeline-ciyml)
   - [9.2 CD Pipeline (`cd.yml`)](#92-cd-pipeline-cdyml)
   - [9.3 Infrastructure Provisioning Pipeline (`infra.yml`)](#93-infrastructure-provisioning-pipeline-infrayml)
   - [9.4 Infrastructure Teardown Pipeline (`infra-destroy.yml`)](#94-infrastructure-teardown-pipeline-infra-destroyyml)

---

## 1. Active Workflow Architecture Roster

The Sunotal Farms repository utilizes **4 active GitHub Actions workflows** located in [`.github/workflows/`](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/.github/workflows/):

| Workflow Name | File Path | Trigger Events | Primary Purpose |
|---|---|---|---|
| **CI Pipeline** | [`ci.yml`](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/.github/workflows/ci.yml) | `push`, `pull_request`, `workflow_dispatch` | Runs PostgreSQL service container, pnpm install, TypeScript checks, Vitest unit tests, SonarCloud quality analysis, Trivy security scans, builds 5 Docker images, and pushes to Amazon ECR. |
| **CD Pipeline** | [`cd.yml`](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/.github/workflows/cd.yml) | `workflow_run` (on CI completion), `workflow_dispatch` | Deploys Docker images to Amazon ECS Fargate, launches serverless DB migrations task, waits for ECS service stability, and verifies HTTP 200 health check endpoints. |
| **Infrastructure Automation** | [`infra.yml`](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/.github/workflows/infra.yml) | `push`, `pull_request`, `workflow_dispatch` | Provisions S3 backend state bucket, DynamoDB lock table, validates Terraform HCL formatting, and applies VPC, ALB, ECS, RDS, and CloudFront infrastructure. |
| **Infrastructure Teardown** | [`infra-destroy.yml`](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/.github/workflows/infra-destroy.yml) | `workflow_dispatch` (Manual with "DESTROY" confirmation) | Safely empties build artifacts in S3 and invokes `terraform destroy` with auto-approval to prevent AWS resource leaks. |

---

## 2. Master GitHub Actions Keywords & Directives Documentation Table

The table below lists every core YAML structural keyword and section directive utilized across our pipeline files, along with its scope, concrete repository usage, and official GitHub documentation link:

| Keyword / Directive | Scope / Level | Used in Workflows | Concrete Usage in Sunotal Pipelines | Official Documentation Link |
|---|---|---|---|---|
| `name` | Workflow / Job / Step | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Assigns human-readable labels displayed in the GitHub Actions dashboard, run summaries, and step execution trees. | [Workflow Syntax: `name`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#name) |
| `on` | Workflow Root | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Top-level block defining the events, webhooks, and schedules that trigger the workflow execution. | [Workflow Syntax: `on`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#on) |
| `env` | Workflow / Job / Step | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Defines custom environment variable key-value pairs accessible to actions and shell scripts during execution. | [Workflow Syntax: `env`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#env) |
| `jobs` | Workflow Root | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Root container defining one or more concurrent or sequential automation jobs within the workflow. | [Workflow Syntax: `jobs`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobs) |
| `<job_id>` | Jobs Block | `ci.yml` (`ci_verify`), `cd.yml` (`deploy`), `infra.yml` (`validate_and_deploy`), `infra-destroy.yml` (`destroy_infrastructure`) | Unique identifier representing a distinct unit of work executing on a dedicated runner instance. | [Workflow Syntax: `jobs.<job_id>`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_id) |
| `runs-on` | Job Level | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Defines the virtual machine operating system image hosting the job (`ubuntu-latest`). | [Workflow Syntax: `runs-on`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idruns-on) |
| `if` | Job / Step Level | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Evaluates conditional expressions to decide whether a job or step should execute or skip. | [Workflow Syntax: `jobs.<job_id>.if`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idif) |
| `services` | Job Level | `ci.yml` | Hosts sidecar Docker containers (e.g. PostgreSQL 16) networked alongside runner steps for live integration testing. | [Workflow Syntax: `services`](https://docs.github.com/en/actions/using-containerized-services/about-service-containers) |
| `steps` | Job Level | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | An ordered sequence of individual tasks (actions or bash commands) executed in the runner environment. | [Workflow Syntax: `steps`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idsteps) |
| `uses` | Step Level | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Invokes an external reusable GitHub Action plugin (e.g., `actions/checkout@v4`, `aws-actions/configure-aws-credentials@v4`). | [Workflow Syntax: `steps[*].uses`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsuses) |
| `with` | Step Level | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Supplies input parameters and arguments required by the action specified in `uses`. | [Workflow Syntax: `steps[*].with`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepswith) |
| `run` | Step Level | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Executes command-line shell programs (Bash scripts, CLI tools, Node scripts, Terraform commands) on the runner. | [Workflow Syntax: `steps[*].run`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsrun) |
| `id` | Step Level | `ci.yml` (`login-ecr`) | Assigns a unique identifier to a step so its outcomes, execution state, and output values can be referenced by subsequent steps. | [Workflow Syntax: `steps[*].id`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsid) |
| `continue-on-error` | Step Level | `ci.yml`, `cd.yml`, `infra.yml` | Boolean flag preventing a step failure from aborting the remaining steps in the job (used for non-blocking reports, credentials fallback, etc.). | [Workflow Syntax: `steps[*].continue-on-error`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepscontinue-on-error) |

---

## 3. Event Triggers & Filter Directives Documentation Table

GitHub Actions allows fine-grained trigger conditions. The table below details all trigger types and filtering keywords configured in our workflows:

| Trigger / Filter Keyword | Section / Context | Used in Workflows | Purpose & Repository Configuration | Official Documentation Link |
|---|---|---|---|---|
| `workflow_dispatch` | `on:` | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Enables manual on-demand execution of pipelines directly from the GitHub web interface or GitHub CLI. | [Events that trigger workflows: `workflow_dispatch`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch) |
| `inputs` | `on.workflow_dispatch:` | `infra.yml`, `infra-destroy.yml` | Configures interactive form fields prompted to users when manually triggering a workflow. | [Workflow Syntax: `workflow_dispatch.inputs`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_dispatchinputs) |
| `description` | `on.workflow_dispatch.inputs.<id>:` | `infra.yml`, `infra-destroy.yml` | Descriptive label explaining what the input does (e.g. `Type "DESTROY" to confirm teardown`). | [Workflow Syntax: `inputs.<id>.description`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_dispatchinputsinput_iddescription) |
| `type` | `on.workflow_dispatch.inputs.<id>:` | `infra.yml` (`type: boolean`) | Defines the data type of the input (e.g. `boolean`, `string`, `choice`, `environment`). | [Workflow Syntax: `inputs.<id>.type`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_dispatchinputsinput_idtype) |
| `required` | `on.workflow_dispatch.inputs.<id>:` | `infra.yml` (`false`), `infra-destroy.yml` (`true`) | Enforces whether the user must provide a value before submitting the manual trigger modal. | [Workflow Syntax: `inputs.<id>.required`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_dispatchinputsinput_idrequired) |
| `default` | `on.workflow_dispatch.inputs.<id>:` | `infra.yml` (`false`), `infra-destroy.yml` (`''`) | Sets a default value for the input field. | [Workflow Syntax: `inputs.<id>.default`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_dispatchinputsinput_iddefault) |
| `push` | `on:` | `ci.yml`, `infra.yml` | Triggers the workflow when commits are pushed to the repository matching specified branch and path rules. | [Events that trigger workflows: `push`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#push) |
| `pull_request` | `on:` | `ci.yml`, `infra.yml` | Triggers validation runs when a Pull Request is opened, updated, or synchronized against target branches. | [Events that trigger workflows: `pull_request`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request) |
| `workflow_run` | `on:` | `cd.yml` | Chained event trigger: automatically runs downstream deployment when the upstream `CI Pipeline` finishes. | [Events that trigger workflows: `workflow_run`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run) |
| `workflows` | `on.workflow_run:` | `cd.yml` (`["CI Pipeline"]`) | Specifies which parent workflow names should trigger this downstream pipeline. | [Workflow Syntax: `workflow_run.workflows`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_runworkflows) |
| `types` | `on.workflow_run:` | `cd.yml` (`[completed]`) | Filters the lifecycle activity of the parent workflow (e.g. `completed`, `requested`). | [Workflow Syntax: `workflow_run.types`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_runtypes) |
| `branches` | `on.push` / `on.pull_request` / `on.workflow_run` | `ci.yml`, `cd.yml`, `infra.yml` (`[main]`) | Restricts execution to specific target branches, ensuring production deployments only run on `main`. | [Workflow Syntax: `branches`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onpushpull_requestpull_request_targetbranchesbranches-ignore) |
| `paths` | `on.push` / `on.pull_request` | `ci.yml`, `infra.yml` | Path-based filter ensuring workflows only run when files in matching directories (e.g. `backend/**`, `frontend/**`, `terraform/**`) are modified. | [Workflow Syntax: `paths`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onpushpull_requestpull_request_targetfilterspaths) |

---

## 4. Service Containers & Runner Environment Documentation Table

The table below documents keywords used to spin up sidecar services and configure the execution environment:

| Keyword / Directive | Scope | Used in Workflows | Concrete Usage in Sunotal Pipelines | Official Documentation Link |
|---|---|---|---|---|
| `services` | `jobs.<job_id>:` | `ci.yml` (`postgres`) | Spins up containerized services on the runner Docker network, allowing integration tests to connect via localhost. | [About Service Containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers) |
| `image` | `services.<id>:` | `ci.yml` (`postgres:16-alpine`) | Specifies the Docker Hub container image used for the ephemeral service container. | [Service Containers: `image`](https://docs.github.com/en/actions/using-containerized-services/about-service-containers#servicesimage) |
| `env` (service) | `services.<id>:` | `ci.yml` (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) | Injects initial environment variables into the service container during creation. | [Service Containers: `env`](https://docs.github.com/en/actions/using-containerized-services/about-service-containers#servicesenv) |
| `ports` | `services.<id>:` | `ci.yml` (`5432:5432`) | Maps the container's internal network port to the host runner network for direct TCP connectivity. | [Service Containers: `ports`](https://docs.github.com/en/actions/using-containerized-services/about-service-containers#servicesports) |
| `options` | `services.<id>:` | `ci.yml` (`--health-cmd pg_isready ...`) | Passes additional flags to `docker create` including healthcheck command, intervals, and retries. | [Service Containers: `options`](https://docs.github.com/en/actions/using-containerized-services/about-service-containers#servicesoptions) |
| `--health-cmd` | Docker CLI option | `ci.yml` (`pg_isready`) | Instructs Docker to check container readiness before runner steps start. | [Docker Container Healthcheck Documentation](https://docs.docker.com/reference/dockerfile/#healthcheck) |

---

## 5. Contexts, Expressions & Runtime Variables Documentation Table

GitHub Actions evaluates dynamic expressions wrapped in `${{ <expression> }}`. The table below lists all contexts, properties, and operators used in our workflows:

| Expression / Context Element | Type / Category | Used in Workflows | Purpose & Usage in Pipelines | Official Documentation Link |
|---|---|---|---|---|
| `${{ <expression> }}` | Expression Syntax | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Evaluates contexts, variables, conditions, and operations dynamically before step execution. | [GitHub Actions Expressions](https://docs.github.com/en/actions/learn-github-actions/expressions) |
| `secrets.<SECRET_NAME>` | Context Object | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Securely retrieves encrypted repository secrets (e.g. `AWS_ACCESS_KEY_ID`, `SONAR_TOKEN`, `EC2_SSH_KEY`). | [Contexts: `secrets`](https://docs.github.com/en/actions/learn-github-actions/contexts#secrets-context) |
| `env.<VAR_NAME>` | Context Object | `ci.yml`, `infra.yml` | Reads environment variables defined at workflow or job level (e.g. `env.NODE_VERSION`, `env.S3_BUCKET_NAME`). | [Contexts: `env`](https://docs.github.com/en/actions/learn-github-actions/contexts#env-context) |
| `github.sha` | Context Property | `ci.yml` | The 40-character Git commit SHA; used to tag Docker container images immutably (`sunotal-backend:$IMAGE_TAG`). | [Contexts: `github.sha`](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context) |
| `github.ref` | Context Property | `ci.yml`, `infra.yml` | The Git ref that triggered the workflow (e.g., `refs/heads/main`). | [Contexts: `github.ref`](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context) |
| `github.event_name` | Context Property | `ci.yml`, `cd.yml`, `infra.yml` | The name of the event that triggered the run (`push`, `pull_request`, `workflow_dispatch`, `workflow_run`). | [Contexts: `github.event_name`](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context) |
| `github.event.inputs.<name>` | Context Property | `infra-destroy.yml` (`confirm_destroy`) | Contains values provided by users in the manual dispatch input form. | [Contexts: `github.event.inputs`](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context) |
| `github.event.workflow_run.conclusion` | Context Property | `cd.yml` | Checks if the parent workflow completed with `'success'` before running deployments. | [Contexts: `github.event.workflow_run`](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context) |
| `steps.<id>.outcome` | Context Property | `ci.yml` (`steps.login-ecr.outcome`) | Reads the result of a previous step (`success`, `failure`, `cancelled`, `skipped`) prior to `continue-on-error`. | [Contexts: `steps.<step_id>.outcome`](https://docs.github.com/en/actions/learn-github-actions/contexts#steps-context) |
| `steps.<id>.outputs.<key>` | Context Property | `ci.yml` (`steps.login-ecr.outputs.registry`) | Reads outputs generated by action plugins (e.g. the AWS ECR registry URL returned by the login action). | [Contexts: `steps.<step_id>.outputs`](https://docs.github.com/en/actions/learn-github-actions/contexts#steps-context) |
| `||` (Logical OR) | Operator / Fallback | `ci.yml`, `cd.yml`, `infra.yml` | Returns fallback default values when a secret is unset (e.g. `${{ secrets.AWS_DEFAULT_REGION || 'us-east-1' }}`). | [Expressions: Operators](https://docs.github.com/en/actions/learn-github-actions/expressions#operators) |
| `&&` (Logical AND) | Operator | `ci.yml` | Combines boolean conditions in `if:` guards. | [Expressions: Operators](https://docs.github.com/en/actions/learn-github-actions/expressions#operators) |
| `==`, `!=` | Comparison Operators | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Evaluates string and boolean equality for flow control. | [Expressions: Operators](https://docs.github.com/en/actions/learn-github-actions/expressions#operators) |

---

## 6. Workflow Console & Logging Commands Documentation Table

GitHub Actions supports special stdout escape sequences known as **Workflow Commands** for log masking, warnings, and job annotations:

| Command Sequence | Used in Workflows | Concrete Usage in Sunotal Pipelines | Purpose & Behavior | Official Documentation Link |
|---|---|---|---|---|
| `echo "::add-mask::<value>"` | `infra.yml` | `echo "::add-mask::$PUB_KEY"` | Prevents sensitive values (generated public keys, credentials) from being printed in plain text in runner logs. | [Workflow Commands: Masking a Value](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#masking-a-value-in-a-log) |
| `echo "::error::<message>"` | `infra-destroy.yml` | `echo "::error::Confirmation failed..."` | Emits a high-visibility error annotation directly in the GitHub Actions UI and fails the verification step. | [Workflow Commands: Setting an Error Message](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message) |
| `echo "::warning::<message>"` | General Reference | Useful for reporting non-fatal lint or configuration warnings. | Emits a warning annotation in the workflow run summary. | [Workflow Commands: Setting a Warning Message](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-a-warning-message) |

---

## 7. Action Plugins (`uses:`) & Marketplace Extensions Reference

The `uses:` keyword tells the GitHub Actions runner to download, configure, and execute a reusable action plugin rather than running an arbitrary shell command. Actions encapsulate complex CI/CD logic (such as repository cloning, language runtime provisioning, tool installation, security scanning, and cloud provider authentication) into modular, versioned packages.

### 7.1 Anatomy of the `uses:` Keyword

```yaml
steps:
  - name: <Step Name>
    uses: <owner>/<repository>@<version-tag-or-sha>
    with:
      <input_parameter_1>: <value_1>
      <input_parameter_2>: <value_2>
    env:
      <ENV_VAR>: <value>
```

* **`owner/repository`**: Points to the public GitHub repository hosting the action metadata (`action.yml`).
* **`@<ref>`**: Pins the execution version. Can be a major version tag (`@v4`), an exact semantic version (`@v4.1.2`), a branch (`@master`), or an immutable 40-character commit SHA (`@a1b2c3...`).
* **`with:`**: Supplies input arguments defined in the action's `action.yml` `inputs:` schema.
* **`env:`**: Injects environment variables directly into the action runtime.
* **`id:` & `outputs:`**: Actions export results (e.g. registry URLs, cache hits) that can be accessed downstream via `${{ steps.<id>.outputs.<output_key> }}`.

---

### 7.2 Master `uses:` Plugins Catalog

| Action Identifier | Version | Workflows Used In | Purpose in Sunotal Architecture | Official Documentation Links |
|---|---|---|---|---|
| [`actions/checkout`](#731-actionscheckoutv4) | `@v4` | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Clones the repository into runner workspace (`$GITHUB_WORKSPACE`) with full Git history for SonarCloud attribution. | • [GitHub Repo](https://github.com/actions/checkout)<br>• [Marketplace](https://github.com/marketplace/actions/checkout) |
| [`pnpm/action-setup`](#732-pnpmaction-setupv4) | `@v4` | `ci.yml` | Installs standalone `pnpm` CLI pinned to version `9.15.4` on the runner before Node.js dependency resolution. | • [GitHub Repo](https://github.com/pnpm/action-setup)<br>• [Marketplace](https://github.com/marketplace/actions/pnpm-setup-action) |
| [`actions/setup-node`](#733-actionssetup-nodev4) | `@v4` | `ci.yml` | Installs Node.js 20 LTS runtime and automates caching for `pnpm-lock.yaml` across CI runs. | • [GitHub Repo](https://github.com/actions/setup-node)<br>• [Marketplace](https://github.com/marketplace/actions/setup-node-js-environment) |
| [`aws-actions/configure-aws-credentials`](#734-aws-actionsconfigure-aws-credentialsv4) | `@v4` | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Injects AWS IAM credentials and region into runner environment for AWS CLI, SDK, ECR, and Terraform. | • [GitHub Repo](https://github.com/aws-actions/configure-aws-credentials)<br>• [Marketplace](https://github.com/marketplace/actions/configure-aws-credentials-action-for-github-actions) |
| [`aws-actions/amazon-ecr-login`](#735-aws-actionsamazon-ecr-loginv2) | `@v2` | `ci.yml` | Authenticates runner Docker daemon against Amazon Elastic Container Registry (ECR) and outputs registry URI. | • [GitHub Repo](https://github.com/aws-actions/amazon-ecr-login)<br>• [Marketplace](https://github.com/marketplace/actions/amazon-ecr-login-action-for-github-actions) |
| [`SonarSource/sonarcloud-github-action`](#736-sonarsourcesonarcloud-github-actionmaster) | `@master` | `ci.yml` | Executes SonarCloud CLI scanner for static analysis, security vulnerabilities, code smells, and test coverage metrics. | • [GitHub Repo](https://github.com/SonarSource/sonarcloud-github-action)<br>• [SonarCloud Docs](https://docs.sonarcloud.io/advanced-setup/ci-based-analysis/github-actions/) |
| [`aquasecurity/trivy-action`](#737-aquasecuritytrivy-actionmaster) | `@master` | `ci.yml` | Scans workspace filesystem for CVE vulnerabilities, misconfigurations, and leaked credentials, outputting JSON report. | • [GitHub Repo](https://github.com/aquasecurity/trivy-action)<br>• [Trivy Docs](https://aquasecurity.github.io/trivy/) |
| [`hashicorp/setup-terraform`](#738-hashicorpsetup-terraformv3) | `@v3` | `infra.yml`, `infra-destroy.yml` | Installs HashiCorp Terraform CLI `1.9.3` and configures execution wrapper on the system `$PATH`. | • [GitHub Repo](https://github.com/hashicorp/setup-terraform)<br>• [Marketplace](https://github.com/marketplace/actions/hashicorp-setup-terraform) |

---

### 7.3 Detailed Action-by-Action Documentation

#### 7.3.1 `actions/checkout@v4`
* **Official Links:** [GitHub Repository](https://github.com/actions/checkout) | [Marketplace Listing](https://github.com/marketplace/actions/checkout) | [v4 Release Notes](https://github.com/actions/checkout/releases/tag/v4.0.0)
* **Description:** Official GitHub action used to check out repository code into the runner `$GITHUB_WORKSPACE` so subsequent build and deployment steps can access source files.
* **Why it is used in Sunotal:**
  - In `ci.yml`, `fetch-depth: 0` fetches the complete commit and branch history, which is required by SonarCloud for calculating line blames and code change diffs.
  - In `cd.yml`, `infra.yml`, and `infra-destroy.yml`, it clones the repository to access deployment scripts and Terraform templates.
* **Invocation Example (`ci.yml`):**
  ```yaml
  - name: Checkout code
    uses: actions/checkout@v4
    with:
      fetch-depth: 0
  ```
* **Inputs & Configuration Parameters:**
  | Parameter | Value in Pipeline | Type | Purpose & Description |
  |---|---|---|---|
  | `fetch-depth` | `0` (in `ci.yml`) | Integer | Number of commits to fetch. `0` fetches all history for all branches and tags (vital for SonarCloud analysis). Default is `1` (shallow clone). |
  | `repository` | Default (current) | String | Repository name with owner. |
  | `ref` | Default (trigger ref) | String | Branch, tag, or SHA to check out. |

---

#### 7.3.2 `pnpm/action-setup@v4`
* **Official Links:** [GitHub Repository](https://github.com/pnpm/action-setup) | [Marketplace Listing](https://github.com/marketplace/actions/pnpm-setup-action)
* **Description:** Official pnpm action to install and activate the fast, disk-space efficient `pnpm` package manager executable on GitHub Actions runners.
* **Why it is used in Sunotal:** Sunotal Farms is structured as a pnpm-managed workspace. Running `pnpm/action-setup` ensures that the runner has the exact pinned pnpm CLI binary before Node.js and dependencies are initialized.
* **Invocation Example (`ci.yml`):**
  ```yaml
  - name: Setup pnpm
    uses: pnpm/action-setup@v4
    with:
      version: ${{ env.PNPM_VERSION }}
  ```
* **Inputs & Configuration Parameters:**
  | Parameter | Value in Pipeline | Type | Purpose & Description |
  |---|---|---|---|
  | `version` | `${{ env.PNPM_VERSION }}` (`9.15.4`) | String | Specific pnpm version to install. Prevents unexpected package manager syntax or lockfile version drifts. |
  | `run_install` | Omitted (manual `pnpm install`) | Boolean / String | If specified, runs `pnpm install` automatically during setup. |

---

#### 7.3.3 `actions/setup-node@v4`
* **Official Links:** [GitHub Repository](https://github.com/actions/setup-node) | [Marketplace Listing](https://github.com/marketplace/actions/setup-node-js-environment)
* **Description:** Official GitHub action to download, cache, and install a specific version of Node.js and configure global package manager caching.
* **Why it is used in Sunotal:**
  - Pins Node.js version to `20` (Node 20 LTS) across all CI runners.
  - Automatically configures runner caching for pnpm dependencies using `cache: 'pnpm'` and matching `**/pnpm-lock.yaml`, reducing dependency installation time from minutes to seconds.
* **Invocation Example (`ci.yml`):**
  ```yaml
  - name: Setup Node.js with caching
    uses: actions/setup-node@v4
    with:
      node-version: ${{ env.NODE_VERSION }}
      cache: 'pnpm'
      cache-dependency-path: '**/pnpm-lock.yaml'
  ```
* **Inputs & Configuration Parameters:**
  | Parameter | Value in Pipeline | Type | Purpose & Description |
  |---|---|---|---|
  | `node-version` | `${{ env.NODE_VERSION }}` (`20`) | String | Node.js version range to install. |
  | `cache` | `'pnpm'` | String | Package manager cache engine (`npm`, `yarn`, or `pnpm`). |
  | `cache-dependency-path` | `'**/pnpm-lock.yaml'` | String | Glob pattern for lockfile checksum generation. When lockfiles don't change, cached `node_modules` are restored instantly. |

---

#### 7.3.4 `aws-actions/configure-aws-credentials@v4`
* **Official Links:** [GitHub Repository](https://github.com/aws-actions/configure-aws-credentials) | [Marketplace Listing](https://github.com/marketplace/actions/configure-aws-credentials-action-for-github-actions)
* **Description:** Official AWS action to configure AWS credentials, region, and session tokens as environment variables on the runner instance.
* **Why it is used in Sunotal:**
  - Authenticates AWS CLI and Terraform commands in `ci.yml`, `cd.yml`, `infra.yml`, and `infra-destroy.yml`.
  - Injects `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_DEFAULT_REGION` directly into the runner environment.
  - Accompanied by `continue-on-error: true` in CI so that non-privileged PR forks can still execute local tests and builds.
* **Invocation Example (`ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml`):**
  ```yaml
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      aws-region: ${{ env.AWS_DEFAULT_REGION }}
    continue-on-error: true
  ```
* **Inputs & Configuration Parameters:**
  | Parameter | Value in Pipeline | Type | Purpose & Description |
  |---|---|---|---|
  | `aws-access-key-id` | `${{ secrets.AWS_ACCESS_KEY_ID }}` | String (Secret) | AWS IAM access key ID. |
  | `aws-secret-access-key` | `${{ secrets.AWS_SECRET_ACCESS_KEY }}` | String (Secret) | AWS IAM secret access key. |
  | `aws-region` | `${{ env.AWS_DEFAULT_REGION }}` (`us-east-1`) | String | Target AWS Region where resources (ECR, ECS, RDS, S3) are hosted. |
  | `mask-aws-account-id` | Default (`true`) | Boolean | Automatically masks AWS account numbers from appearing in runner logs. |

---

#### 7.3.5 `aws-actions/amazon-ecr-login@v2`
* **Official Links:** [GitHub Repository](https://github.com/aws-actions/amazon-ecr-login) | [Marketplace Listing](https://github.com/marketplace/actions/amazon-ecr-login-action-for-github-actions)
* **Description:** Official AWS action to authenticate the runner's local Docker daemon to Amazon Elastic Container Registry (ECR).
* **Why it is used in Sunotal:**
  - Executes `aws ecr get-login-password` under the hood and logs in the runner's Docker daemon to our private ECR registry (`*.dkr.ecr.us-east-1.amazonaws.com`).
  - Exports `steps.login-ecr.outputs.registry` containing the full ECR registry URL.
  - Used in step conditions (`if: steps.login-ecr.outcome == 'success'`) to safely gate Docker builds and pushes.
* **Invocation Example (`ci.yml`):**
  ```yaml
  - name: Log in to Amazon ECR
    id: login-ecr
    uses: aws-actions/amazon-ecr-login@v2
    continue-on-error: true
  ```
* **Outputs Exported:**
  | Output Key | Consumed in Pipeline | Description |
  |---|---|---|
  | `registry` | `${{ steps.login-ecr.outputs.registry }}` | The URI of the Amazon ECR registry (e.g. `123456789012.dkr.ecr.us-east-1.amazonaws.com`). |
  | `docker_username` | Internal | Docker authentication username (`AWS`). |
  | `docker_password` | Internal | Ephemeral Docker authentication authorization token. |

---

#### 7.3.6 `SonarSource/sonarcloud-github-action@master`
* **Official Links:** [GitHub Repository](https://github.com/SonarSource/sonarcloud-github-action) | [Marketplace Listing](https://github.com/marketplace/actions/sonarcloud-scan) | [SonarCloud GitHub Actions Documentation](https://docs.sonarcloud.io/advanced-setup/ci-based-analysis/github-actions/)
* **Description:** Official SonarSource action to execute the SonarScanner CLI, transmitting repository source code and metrics to SonarCloud.
* **Why it is used in Sunotal:**
  - Analyzes code quality, maintainability, code smells, duplicate code, and security hotspots across `/frontend` and `/backend`.
  - Reads configuration rules from root [`sonar-project.properties`](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/sonar-project.properties).
  - Uses `GITHUB_TOKEN` for PR status decoration and `SONAR_TOKEN` for cloud authentication.
* **Invocation Example (`ci.yml`):**
  ```yaml
  - name: SonarCloud Code Analysis
    uses: SonarSource/sonarcloud-github-action@master
    continue-on-error: true
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
  ```
* **Environment Variables Passed:**
  | Variable | Value in Pipeline | Purpose & Description |
  |---|---|---|
  | `GITHUB_TOKEN` | `${{ secrets.GITHUB_TOKEN }}` | Built-in GitHub token enabling SonarCloud to decorate pull requests with analysis summaries. |
  | `SONAR_TOKEN` | `${{ secrets.SONAR_TOKEN }}` | Secret user/project token generated in SonarCloud to authorize analysis ingestion. |

---

#### 7.3.7 `aquasecurity/trivy-action@master`
* **Official Links:** [GitHub Repository](https://github.com/aquasecurity/trivy-action) | [Marketplace Listing](https://github.com/marketplace/actions/aqua-security-trivy) | [Aqua Security Trivy Documentation](https://aquasecurity.github.io/trivy/)
* **Description:** Comprehensive vulnerability and misconfiguration scanner for container images, filesystems, and Git repositories.
* **Why it is used in Sunotal:**
  - Performs static filesystem scanning (`scan-type: 'fs'`) across the repository to detect CVE vulnerabilities in third-party dependencies and hardcoded secrets before building Docker containers.
  - Outputs a structured JSON report (`trivy-report.json`) that is archived and uploaded to Amazon S3 for compliance auditing.
* **Invocation Example (`ci.yml`):**
  ```yaml
  - name: Run Trivy vulnerability scanner (Filesystem)
    uses: aquasecurity/trivy-action@master
    with:
      scan-type: 'fs'
      scan-ref: '.'
      exit-code: '0'
      severity: 'CRITICAL,HIGH'
      format: 'json'
      output: 'trivy-report.json'
    continue-on-error: true
  ```
* **Inputs & Configuration Parameters:**
  | Parameter | Value in Pipeline | Type | Purpose & Description |
  |---|---|---|---|
  | `scan-type` | `'fs'` | String | Target scan mode (`'image'`, `'fs'`, `'repo'`, `'config'`). `'fs'` scans local directories. |
  | `scan-ref` | `'.'` | String | Reference path to scan (root directory). |
  | `exit-code` | `'0'` | String / Int | Exit code when vulnerabilities are found. Set to `'0'` for non-blocking report generation. |
  | `severity` | `'CRITICAL,HIGH'` | String | Comma-separated list of vulnerability severities to report (`UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL`). |
  | `format` | `'json'` | String | Report format (`'table'`, `'json'`, `'sarif'`, `'template'`). |
  | `output` | `'trivy-report.json'` | String | File path where the scan report is saved on disk. |

---

#### 7.3.8 `hashicorp/setup-terraform@v3`
* **Official Links:** [GitHub Repository](https://github.com/hashicorp/setup-terraform) | [Marketplace Listing](https://github.com/marketplace/actions/hashicorp-setup-terraform) | [Terraform CLI Documentation](https://developer.hashicorp.com/terraform/cli)
* **Description:** Official HashiCorp action that downloads, installs, and configures the Terraform CLI on GitHub Actions runners.
* **Why it is used in Sunotal:**
  - Standardizes Terraform CLI version to `1.9.3` across provisioning (`infra.yml`) and teardown (`infra-destroy.yml`) pipelines.
  - Sets up wrapper scripts that integrate Terraform outputs into runner console outputs and step logs.
* **Invocation Example (`infra.yml`, `infra-destroy.yml`):**
  ```yaml
  - name: Setup Terraform
    uses: hashicorp/setup-terraform@v3
    with:
      terraform_version: "1.9.3"
  ```
* **Inputs & Configuration Parameters:**
  | Parameter | Value in Pipeline | Type | Purpose & Description |
  |---|---|---|---|
  | `terraform_version` | `"1.9.3"` | String | Specific version of Terraform CLI to install. Prevents state file incompatibility across minor Terraform engine versions. |
  | `terraform_wrapper` | Default (`true`) | Boolean | Installs a wrapper script that outputs stdout, stderr, and exitcode to step outputs. |
  | `cli_config_credentials_token` | Omitted (using AWS IAM) | String | API token for Terraform Cloud / Enterprise if remote backend is used. |

---


## 8. Secrets & Environment Configuration Variables Table

Our pipelines consume both encrypted repository secrets stored in GitHub settings and workflow-level environment variables:

| Variable / Secret Name | Kind | Workflows Used In | Description & Security Role |
|---|---|---|---|
| `AWS_ACCESS_KEY_ID` | Secret | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | IAM User access key authorized to manage ECR, ECS, S3, RDS, ALB, and CloudWatch. |
| `AWS_SECRET_ACCESS_KEY` | Secret | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | IAM User secret access key corresponding to the AWS access key. |
| `AWS_DEFAULT_REGION` / `AWS_REGION` | Secret / Env | `ci.yml`, `cd.yml`, `infra.yml`, `infra-destroy.yml` | Target AWS region (defaults to `us-east-1`). |
| `S3_BUCKET_NAME` | Secret / Env | `ci.yml` | Target Amazon S3 bucket (`jcs-raju-sunotal-final`) where build artifacts and security scan reports are published. |
| `SONAR_TOKEN` | Secret | `ci.yml` | Authentication token for SonarCloud static code analysis integration. |
| `GITHUB_TOKEN` | Automatic Secret | `ci.yml` | Automatically provided by GitHub Actions runner to post commit statuses and PR comments. |
| `EC2_SSH_KEY` | Secret | `infra.yml` | Private RSA/PEM SSH key used to generate public key pair for EC2/bastion instances during Terraform provisioning. |
| `NODE_VERSION` | Env Variable | `ci.yml` | Standardizes Node.js runtime version across all runner environments (`20`). |
| `PNPM_VERSION` | Env Variable | `ci.yml` | Standardizes pnpm package manager version across all runner environments (`9.15.4`). |
| `DATABASE_URL` | Step Env | `ci.yml` | PostgreSQL connection string (`postgresql://sunotal:sunotalpass123@localhost:5432/sunotal`) used for integration test execution. |
| `ECR_REGISTRY` | Step Env | `ci.yml` | Dynamically captured from `steps.login-ecr.outputs.registry` to tag and push Docker images. |
| `IMAGE_TAG` | Step Env | `ci.yml` | Set to `${{ github.sha }}` to uniquely identify immutable Docker image builds. |

---

## 9. In-Depth Workflow-by-Workflow Explanations

### 9.1 CI Pipeline (`ci.yml`)
* **Trigger:** Pushes or Pull Requests to `main` containing changes to `backend/**`, `frontend/**`, `package.json`, `pnpm-lock.yaml`, or CI/CD workflow files, or manual trigger (`workflow_dispatch`).
* **Execution Flow:**
  1. Spawns PostgreSQL 16 Alpine sidecar service container with port `5432` mapped.
  2. Clones repository with full history (`fetch-depth: 0`) for SonarCloud blame attribution.
  3. Installs pnpm 9.15.4 and Node.js 20 with pnpm dependency cache.
  4. Configures AWS Credentials for ECR and S3 report uploads.
  5. Executes SonarCloud quality analysis.
  6. Runs `pnpm install --frozen-lockfile` for frontend and backend.
  7. Performs TypeScript type validation (`tsc --noEmit`) on frontend and backend.
  8. Executes unit test suites emitting structured JSON test reports.
  9. Runs Trivy vulnerability scanner on filesystem (`scan-type: 'fs'`).
  10. Uploads backend test reports and Trivy JSON scan reports to Amazon S3.
  11. Authenticates Docker to Amazon ECR.
  12. Builds 5 microservice Docker images:
      - `sunotal-frontend`
      - `sunotal-backend`
      - `sunotal-auth`
      - `sunotal-operations`
      - `sunotal-inventory`
      - `sunotal-user`
  13. Pushes tagged images (`:${{ github.sha }}` and `:latest`) to ECR on `main` branch pushes or manual dispatch.

### 9.2 CD Pipeline (`cd.yml`)
* **Trigger:** Automatically invoked when `CI Pipeline` completes with a `success` conclusion on `main` via `workflow_run`, or via manual trigger.
* **Execution Flow:**
  1. Configures AWS Credentials on the runner.
  2. Issues `aws ecs update-service --force-new-deployment` for all 5 ECS Fargate microservices to pull latest ECR images.
  3. Automatically fetches VPC private subnets and ECS security groups to run serverless DB migration tasks (`aws ecs run-task` running `pnpm run db:push`).
  4. Invokes `aws ecs wait services-stable` to block until new tasks pass ALB target group health checks and old tasks drain.
  5. Executes post-deployment HTTP health checks against the live domain:
     - Root frontend: `https://sunotal.automateuniverse.space/` (HTTP 200)
     - Auth API health: `https://sunotal.automateuniverse.space/api/healthz` (HTTP 200)

### 9.3 Infrastructure Provisioning Pipeline (`infra.yml`)
* **Trigger:** Changes in `terraform/**` or manual trigger with optional `force_reapply_infra` boolean input.
* **Execution Flow:**
  1. Validates or creates the remote S3 state bucket (`jcs-raju-sunotal-final`) and enables S3 bucket versioning.
  2. Validates or creates the DynamoDB state locking table (`sunotal-terraform-locks`).
  3. Installs Terraform CLI 1.9.3 via `hashicorp/setup-terraform@v3`.
  4. Runs `terraform fmt -check`, `terraform init -backend=false`, and `terraform validate`.
  5. Injects SSH key from secrets, masks generated public key with `::add-mask::`.
  6. Initializes backend and runs `terraform plan` and `terraform apply -auto-approve` on `main`.

### 9.4 Infrastructure Teardown Pipeline (`infra-destroy.yml`)
* **Trigger:** Manual trigger only (`workflow_dispatch`), enforcing typing `"DESTROY"` in the input form.
* **Execution Flow:**
  1. Verifies input string equals `"DESTROY"`; exits with `::error::` annotation if validation fails.
  2. Sets up AWS credentials and Terraform 1.9.3.
  3. Purges build artifacts and test reports from S3 bucket.
  4. Runs `terraform destroy -auto-approve` to cleanly tear down all AWS resources and avoid cloud billing leaks.

