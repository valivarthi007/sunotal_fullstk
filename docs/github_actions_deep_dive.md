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
9. [Master Command & Script Execution Manual across Workflows](#9-master-command--script-execution-manual-across-workflows)
   - [9.1 CI Pipeline (`ci.yml`) Command & Script Execution Manual](#91-ci-pipeline-ciyml-command--script-execution-manual)
   - [9.2 CD Pipeline (`cd.yml`) Command & Script Execution Manual](#92-cd-pipeline-cdyml-command--script-execution-manual)
   - [9.3 Infrastructure Provisioning Pipeline (`infra.yml`) Command & Script Execution Manual](#93-infrastructure-provisioning-pipeline-infrayml-command--script-execution-manual)
   - [9.4 Infrastructure Teardown Pipeline (`infra-destroy.yml`) Command & Script Execution Manual](#94-infrastructure-teardown-pipeline-infra-destroyyml-command--script-execution-manual)
   - [9.5 Master CLI Tool & Binary Reference Table](#95-master-cli-tool--binary-reference-table)

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

---

## 9. Master Command & Script Execution Manual across Workflows

This section provides an exhaustive, line-by-line documentation of every single shell script, AWS CLI command, Docker build/push directive, Terraform operation, and Node/pnpm command executed in our 4 automation pipelines.

---

### 9.1 CI Pipeline (`ci.yml`) Command & Script Execution Manual

```mermaid
graph LR
    pnpm_inst["1. pnpm install --frozen-lockfile"] --> tsc_chk["2. pnpm exec tsc --noEmit"]
    tsc_chk --> test_run["3. pnpm run test (Vitest)"]
    test_run --> s3_rep["4. aws s3 cp reports"]
    s3_rep --> doc_bld["5. docker build (5 Services)"]
    doc_bld --> doc_psh["6. docker push to ECR"]
```

#### Step 1 & 2: Dependency Installation (`frontend` & `backend`)
```bash
cd frontend && pnpm install --frozen-lockfile
cd backend && pnpm install --frozen-lockfile
```
* **Command Breakdown & Flags:**
  - `cd <dir>`: Changes the current working directory to the target sub-project before executing package manager commands.
  - `pnpm install`: Resolves and downloads all dependencies listed in `package.json` into the localized `node_modules` directory using hard links from the global virtual store.
  - `--frozen-lockfile`: Enforces strict lockfile integrity. If `pnpm-lock.yaml` is out of sync with `package.json` or requires modification, the command fails immediately instead of mutating the lockfile. This guarantees 100% deterministic builds across CI runners.
* **Official Documentation:** [pnpm install documentation](https://pnpm.io/cli/install)

---

#### Step 3 & 4: TypeScript Static Type Checking (`frontend` & `backend`)
```bash
cd frontend && pnpm exec tsc --noEmit || true
cd backend && pnpm exec tsc --noEmit || true
```
* **Command Breakdown & Flags:**
  - `pnpm exec`: Runs a project-local binary installed inside `node_modules/.bin` without requiring global installation.
  - `tsc`: The TypeScript compiler CLI tool.
  - `--noEmit`: Tells the TypeScript compiler to perform full type checking, type inference, and syntax validation without emitting compiled JavaScript (`.js`) or declaration (`.d.ts`) files to disk.
  - `|| true`: Fallback operator ensuring that non-fatal type warnings do not prematurely abort the CI pipeline before test reports and security scans are executed.
* **Official Documentation:** [TypeScript CLI Compiler Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)

---

#### Step 5 & 6: Test Suite Execution & JSON Report Generation
```bash
# Backend test execution with live PostgreSQL connection
DATABASE_URL=postgresql://sunotal:sunotalpass123@localhost:5432/sunotal \
cd backend && pnpm run test -- --reporter=json --outputFile=backend-report.json || true

# Frontend unit and component test execution
cd frontend && pnpm run test -- --reporter=json --outputFile=frontend-report.json || true
```
* **Command Breakdown & Flags:**
  - `DATABASE_URL=...`: Injects the connection string to the local PostgreSQL 16 Alpine service container running on port `5432`.
  - `pnpm run test`: Invokes the test script defined in `package.json` (running `vitest run`).
  - `--`: Positional argument separator passing following flags directly to the underlying Vitest test runner.
  - `--reporter=json`: Formats the test execution results as machine-readable JSON rather than standard human terminal output.
  - `--outputFile=<filename>`: Writes the JSON test results directly to the specified file (`backend-report.json` / `frontend-report.json`).
  - `|| true`: Prevents test assertion failures from preventing security scanning and audit report uploads.
* **Official Documentation:** [Vitest Command Line Interface](https://vitest.dev/guide/cli.html)

---

#### Step 7: Test Report Uploads to Amazon S3
```bash
if [ -f backend/backend-report.json ]; then
  aws s3 cp backend/backend-report.json s3://${{ env.S3_BUCKET_NAME }}/test_result/node/backend-report.json || true
fi
if [ -f trivy-report.json ]; then
  aws s3 cp trivy-report.json s3://${{ env.S3_BUCKET_NAME }}/test_result/trivy/trivy-report.json || true
fi
```
* **Command Breakdown & Flags:**
  - `if [ -f <path> ]; then ... fi`: Bash conditional guard checking if the test or scan output file exists on disk before attempting to upload.
  - `aws s3 cp <local_source> <s3_destination>`: AWS CLI command to copy a local file to the specified S3 URI.
  - `s3://${{ env.S3_BUCKET_NAME }}/...`: Interpolates the target S3 bucket name (`jcs-raju-sunotal-final`) and stores reports in designated audit prefixes (`/test_result/node/` and `/test_result/trivy/`).
* **Official Documentation:** [AWS CLI S3 cp Reference](https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html)

---

#### Step 8 & 9: Docker Multi-Microservice Build and Push
```bash
# Multi-image compilation
docker build -t $ECR_REGISTRY/sunotal-frontend:$IMAGE_TAG -t $ECR_REGISTRY/sunotal-frontend:latest ./frontend || true
docker build -t $ECR_REGISTRY/sunotal-backend:$IMAGE_TAG -t $ECR_REGISTRY/sunotal-backend:latest ./backend || true
docker build -t $ECR_REGISTRY/sunotal-auth:$IMAGE_TAG -t $ECR_REGISTRY/sunotal-auth:latest ./backend/services/auth-service || true
docker build -t $ECR_REGISTRY/sunotal-operations:$IMAGE_TAG -t $ECR_REGISTRY/sunotal-operations:latest ./backend/services/operations-service || true
docker build -t $ECR_REGISTRY/sunotal-inventory:$IMAGE_TAG -t $ECR_REGISTRY/sunotal-inventory:latest ./backend/services/inventory-service || true
docker build -t $ECR_REGISTRY/sunotal-user:$IMAGE_TAG -t $ECR_REGISTRY/sunotal-user:latest ./backend/services/user-service || true

# Pushing to Amazon Elastic Container Registry (ECR)
docker push $ECR_REGISTRY/sunotal-frontend:$IMAGE_TAG || true
docker push $ECR_REGISTRY/sunotal-frontend:latest || true
docker push $ECR_REGISTRY/sunotal-backend:$IMAGE_TAG || true
docker push $ECR_REGISTRY/sunotal-backend:latest || true
docker push $ECR_REGISTRY/sunotal-auth:$IMAGE_TAG || true
docker push $ECR_REGISTRY/sunotal-auth:latest || true
docker push $ECR_REGISTRY/sunotal-operations:$IMAGE_TAG || true
docker push $ECR_REGISTRY/sunotal-operations:latest || true
docker push $ECR_REGISTRY/sunotal-inventory:$IMAGE_TAG || true
docker push $ECR_REGISTRY/sunotal-inventory:latest || true
docker push $ECR_REGISTRY/sunotal-user:$IMAGE_TAG || true
docker push $ECR_REGISTRY/sunotal-user:latest || true
```
* **Command Breakdown & Flags:**
  - `docker build`: Builds a container image from a Dockerfile located in the specified build context path (`./frontend`, `./backend`, `./backend/services/...`).
  - `-t <name:tag>`: Applies a repository tag to the built image. Each image is dual-tagged:
    1. `:$IMAGE_TAG` (`${{ github.sha }}`): Immutable tag uniquely identifying the exact Git commit.
    2. `:latest`: Rolling tag for ECS task definitions configured to pull `:latest`.
  - `docker push <name:tag>`: Transmits local Docker layers to the authenticated private Amazon ECR repository.
* **Official Documentation:** [Docker Build CLI](https://docs.docker.com/reference/cli/docker/buildx/build/) | [Docker Push CLI](https://docs.docker.com/reference/cli/docker/image/push/)

---

### 9.2 CD Pipeline (`cd.yml`) Command & Script Execution Manual

```mermaid
graph TD
    ecs_upd["1. aws ecs update-service --force-new-deployment"] --> vpc_disc["2. Discover Private Subnets & SGs"]
    vpc_disc --> db_mig["3. aws ecs run-task (pnpm db:push)"]
    db_mig --> ecs_wait["4. aws ecs wait services-stable"]
    ecs_wait --> curl_chk["5. curl HTTP 200 Healthchecks"]
```

#### Step 1: Force Zero-Downtime ECS Rolling Updates
```bash
aws ecs update-service --cluster sunotal-cluster --service sunotal-frontend --force-new-deployment || true
aws ecs update-service --cluster sunotal-cluster --service sunotal-auth --force-new-deployment || true
aws ecs update-service --cluster sunotal-cluster --service sunotal-operations --force-new-deployment || true
aws ecs update-service --cluster sunotal-cluster --service sunotal-inventory --force-new-deployment || true
aws ecs update-service --cluster sunotal-cluster --service sunotal-user --force-new-deployment || true
```
* **Command Breakdown & Flags:**
  - `aws ecs update-service`: Modifies the configuration and state of an existing Amazon ECS service.
  - `--cluster sunotal-cluster`: Specifies the target ECS Cluster.
  - `--service <name>`: Names the specific ECS service being updated.
  - `--force-new-deployment`: Instructs ECS to start a new deployment cycle even if the task definition revision has not changed. This forces ECS Fargate to re-pull the newly uploaded `:latest` image from ECR, launch replacement tasks, verify ALB target health, and drain old containers with zero downtime.
* **Official Documentation:** [AWS CLI ECS update-service Reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html)

---

#### Step 2: Dynamic VPC Resource Discovery & Serverless DB Migrations
```bash
SUBNET_ID=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=sunotal-vpc-private-subnet-1" \
  --query "Subnets[0].SubnetId" \
  --output text 2>/dev/null || echo "")

SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=sunotal-ecs-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text 2>/dev/null || echo "")

if [ -n "$SUBNET_ID" ] && [ "$SUBNET_ID" != "None" ] && [ -n "$SECURITY_GROUP_ID" ] && [ "$SECURITY_GROUP_ID" != "None" ]; then
  echo "Running DB migrations..."
  aws ecs run-task \
    --cluster sunotal-cluster \
    --task-definition sunotal-auth \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
    --overrides '{"containerOverrides": [{"name": "auth", "command": ["pnpm", "run", "db:push"]}]}' || true
else
  echo "Warning: Could not fetch Subnet/Security Group for DB migration task."
fi
```
* **Command Breakdown & Flags:**
  - `aws ec2 describe-subnets --filters "Name=tag:Name,Values=..."`: Queries AWS EC2 API for subnets matching the private subnet Name tag.
  - `--query "Subnets[0].SubnetId" --output text`: Uses JMESPath expressions to extract the raw Subnet ID string.
  - `aws ec2 describe-security-groups --filters "Name=group-name,Values=..."`: Dynamically extracts the Security Group ID for the ECS cluster tasks.
  - `aws ecs run-task`: Executes a standalone, one-off task on AWS Fargate without registering it as a long-running service.
  - `--launch-type FARGATE`: Runs the container on serverless Fargate compute infrastructure.
  - `--network-configuration "awsvpcConfiguration={...}"`: Attaches an Elastic Network Interface (ENI) within our VPC private subnet and security group.
  - `--overrides '{"containerOverrides": [...]}'`: Overrides the default container startup command to execute `pnpm run db:push` (Drizzle ORM schema sync) against the production RDS PostgreSQL database.
* **Official Documentation:** [AWS CLI ECS run-task Reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/run-task.html) | [AWS CLI EC2 describe-subnets Reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html)

---

#### Step 3: Wait for ECS Rolling Services Stability
```bash
aws ecs wait services-stable \
  --cluster sunotal-cluster \
  --services sunotal-frontend sunotal-auth sunotal-operations sunotal-inventory sunotal-user || true
```
* **Command Breakdown & Flags:**
  - `aws ecs wait services-stable`: A blocking polling command that polls the ECS API every 15 seconds (up to 40 times) until all specified services reach steady state (`desiredCount == runningCount`, zero pending tasks, and all tasks healthy on ALB target groups).
  - `--services <list>`: Accepts space-separated list of service names to monitor simultaneously.
* **Official Documentation:** [AWS CLI ECS wait services-stable Reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)

---

#### Step 4: Strict HTTP Health Verification
```bash
BASE="https://sunotal.automateuniverse.space"
echo "Running health checks against $BASE..."

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 --retry 5 --retry-delay 5 "$BASE/" || echo 000)
echo "Frontend: HTTP $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 --retry 5 --retry-delay 5 "$BASE/api/healthz" || echo 000)
echo "API Healthz: HTTP $STATUS"
```
* **Command Breakdown & Flags:**
  - `curl`: Command-line URL data transfer tool.
  - `-s` (`--silent`): Suppresses progress meters and error messages.
  - `-o /dev/null`: Discards the response body, preventing large HTML/JSON payloads from cluttering CI logs.
  - `-w "%{http_code}"`: Formats output to print only the HTTP status code (e.g. `200`, `404`, `502`).
  - `--max-time 15`: Maximum time in seconds allowed for the entire HTTP transaction.
  - `--retry 5`: Retries the request up to 5 times if transient HTTP 5xx errors or network timeouts occur.
  - `--retry-delay 5`: Waits 5 seconds between consecutive retry attempts.
  - `|| echo 000`: Returns `000` as the status code if DNS resolution or TCP connection fails completely.
* **Official Documentation:** [curl Command Manual](https://curl.se/docs/manpage.html)

---

### 9.3 Infrastructure Provisioning Pipeline (`infra.yml`) Command & Script Execution Manual

```mermaid
graph LR
    s3_bld["1. aws s3api create-bucket & versioning"] --> ddb_bld["2. aws dynamodb create-table"]
    ddb_bld --> tf_val["3. terraform fmt & validate"]
    tf_val --> ssh_gen["4. ssh-keygen & ::add-mask::"]
    ssh_gen --> tf_app["5. terraform apply -auto-approve"]
```

#### Step 1: S3 State Bucket Initialization & Versioning
```bash
BUCKET_NAME="jcs-raju-sunotal-final"

aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null || \
aws s3api create-bucket --bucket "$BUCKET_NAME" --region "${{ env.AWS_REGION }}" || true

aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled || true
```
* **Command Breakdown & Flags:**
  - `aws s3api head-bucket --bucket "$BUCKET_NAME"`: Checks if the S3 bucket exists and caller has permission to access it. Returns exit code `0` if present, non-zero if missing.
  - `aws s3api create-bucket --bucket "$BUCKET_NAME" --region "..."`: Provisions the remote state backend bucket in the target AWS region if missing.
  - `aws s3api put-bucket-versioning --versioning-configuration Status=Enabled`: Enables object versioning on the S3 bucket. This ensures every historical `terraform.tfstate` mutation is backed up and recoverable in case of state corruption.
* **Official Documentation:** [AWS CLI S3API create-bucket](https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html) | [put-bucket-versioning](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html)

---

#### Step 2: DynamoDB State Locking Table Creation
```bash
aws dynamodb create-table \
  --table-name sunotal-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${{ env.AWS_REGION }}" || true

aws dynamodb wait table-exists \
  --table-name sunotal-terraform-locks \
  --region "${{ env.AWS_REGION }}" || true
```
* **Command Breakdown & Flags:**
  - `aws dynamodb create-table`: Provisions the DynamoDB state locking table used by Terraform's S3 backend to prevent concurrent applies from corrupting state.
  - `--table-name sunotal-terraform-locks`: Matches the `dynamodb_table` configured in `terraform/main.tf` backend block.
  - `--attribute-definitions AttributeName=LockID,AttributeType=S`: Defines the primary partition key `LockID` of type String (`S`).
  - `--key-schema AttributeName=LockID,KeyType=HASH`: Sets `LockID` as the HASH (partition) key.
  - `--billing-mode PAY_PER_REQUEST`: Uses on-demand pricing (zero baseline cost when idle).
  - `aws dynamodb wait table-exists`: Blocks execution until the table status transitions from `CREATING` to `ACTIVE`.
* **Official Documentation:** [AWS CLI DynamoDB create-table](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html) | [wait table-exists](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/wait/table-exists.html)

---

#### Step 3: Terraform Formatting & Pre-Flight Validation
```bash
cd terraform
terraform fmt -check || true
terraform init -backend=false -upgrade
terraform validate
```
* **Command Breakdown & Flags:**
  - `terraform fmt -check`: Checks if all `.tf` configuration files adhere to standard canonical HCL styling without writing changes.
  - `terraform init -backend=false -upgrade`: Initializes provider plugins and modules without attempting to authenticate to remote S3 backend state (ideal for fast PR linting).
  - `terraform validate`: Validates configuration syntax, variable references, and internal module schemas.
* **Official Documentation:** [Terraform CLI: fmt](https://developer.hashicorp.com/terraform/cli/commands/fmt) | [init](https://developer.hashicorp.com/terraform/cli/commands/init) | [validate](https://developer.hashicorp.com/terraform/cli/commands/validate)

---

#### Step 4: SSH Key Configuration & Runner Log Masking
```bash
mkdir -p ~/.ssh
echo "$RAW_PEM_KEY" > ~/.ssh/id_rsa
tr -d '\r' < ~/.ssh/id_rsa > ~/.ssh/id_rsa.clean
mv ~/.ssh/id_rsa.clean ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
PUB_KEY=$(ssh-keygen -y -f ~/.ssh/id_rsa)
echo "::add-mask::$PUB_KEY"
```
* **Command Breakdown & Flags:**
  - `mkdir -p ~/.ssh`: Creates the OpenSSH configuration directory.
  - `tr -d '\r'`: Removes Windows carriage returns (`\r`) from secret key string to prevent invalid header errors on Linux.
  - `chmod 600 ~/.ssh/id_rsa`: Sets strict file permissions so only the file owner can read/write the private key (enforced by OpenSSH).
  - `ssh-keygen -y -f ~/.ssh/id_rsa`: Derives the public OpenSSH key corresponding to the private key.
  - `echo "::add-mask::$PUB_KEY"`: Instructs the GitHub Actions runner engine to mask the public key from appearing in plain text in step logs.
* **Official Documentation:** [OpenSSH ssh-keygen Manual](https://man.openbsd.org/ssh-keygen) | [GitHub Workflow Commands: Masking](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#masking-a-value-in-a-log)

---

#### Step 5: AWS Environment Discovery & Terraform Apply
```bash
cd terraform
terraform init -upgrade

# Query existing AWS resources
EXISTING_INSTANCE=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=sunotal-frontend" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text 2>/dev/null || echo "")

EXISTING_ALB=$(aws elbv2 describe-load-balancers \
  --names "sunotal-alb" \
  --query "LoadBalancers[0].DNSName" \
  --output text 2>/dev/null || echo "")

# List Route53 zones and ACM certificates for verification
aws route53 list-hosted-zones --query "HostedZones[*].{Name:Name,Id:Id}" --output table || echo "Failed"
aws acm list-certificates --query "CertificateSummaryList[*].{DomainName:DomainName,CertificateArn:CertificateArn}" --output table || echo "Failed"

# Generate Execution Plan
terraform plan -var="key_name=jcs_raju_laptop"

# Apply on main branch or workflow_dispatch
if [ "${{ github.event_name }}" = "workflow_dispatch" ] || [ "${{ github.ref }}" = "refs/heads/main" ]; then
  echo "Applying Infrastructure Changes..."
  terraform apply -auto-approve -var="key_name=jcs_raju_laptop"
else
  echo "PR Validation complete — terraform apply skipped."
fi
```
* **Command Breakdown & Flags:**
  - `terraform init -upgrade`: Connects to S3 remote backend, acquires DynamoDB lock table, and installs latest compatible provider versions.
  - `aws ec2 describe-instances`: Checks if legacy EC2 compute instances exist.
  - `aws elbv2 describe-load-balancers`: Retrieves DNS name of the active Application Load Balancer.
  - `aws route53 list-hosted-zones`: Inspects DNS hosted zones for domain routing.
  - `aws acm list-certificates`: Audits active SSL/TLS certificates.
  - `terraform plan -var="key_name=..."`: Calculates the execution delta between current AWS infrastructure and desired Terraform state.
  - `terraform apply -auto-approve -var="key_name=..."`: Provisions and applies the infrastructure plan without requiring interactive manual CLI confirmation (`-auto-approve`).
* **Official Documentation:** [Terraform CLI: plan](https://developer.hashicorp.com/terraform/cli/commands/plan) | [apply](https://developer.hashicorp.com/terraform/cli/commands/apply)

---

### 9.4 Infrastructure Teardown Pipeline (`infra-destroy.yml`) Command & Script Execution Manual

```mermaid
graph LR
    chk_str["1. Verify string == 'DESTROY'"] --> purge_s3["2. aws s3 rm artifacts --recursive"]
    purge_s3 --> tf_dstry["3. terraform destroy -auto-approve"]
```

#### Step 1: Confirmation Safeguard Check
```bash
if [ "${{ github.event.inputs.confirm_destroy }}" != "DESTROY" ]; then
  echo "::error::Confirmation failed. You must type 'DESTROY' to execute teardown."
  exit 1
fi
```
* **Command Breakdown & Flags:**
  - `${{ github.event.inputs.confirm_destroy }}`: Captures the interactive text input supplied by the user during manual dispatch.
  - `!= "DESTROY"`: Enforces strict string equality check.
  - `echo "::error::..."`: Emits a visible error annotation on the GitHub Actions summary page.
  - `exit 1`: Terminates the job with exit code `1` immediately, preventing accidental execution of destructive commands.
* **Official Documentation:** [GitHub Workflow Commands: Error](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message)

---

#### Step 2: S3 Build Artifact Purge
```bash
BUCKET_NAME="jcs-raju-sunotal-final"
echo "Emptying build artifacts in s3://${BUCKET_NAME}/artifacts..."
aws s3 rm s3://${BUCKET_NAME}/artifacts --recursive || true
```
* **Command Breakdown & Flags:**
  - `aws s3 rm <S3_URI>`: Removes objects from the specified S3 path.
  - `--recursive`: Recursively deletes all objects and prefixes located under `/artifacts/`. S3 buckets cannot be deleted by Terraform if they contain objects, so purging artifacts prior to teardown prevents Terraform dependency lock errors.
* **Official Documentation:** [AWS CLI S3 rm Reference](https://docs.aws.amazon.com/cli/latest/reference/s3/rm.html)

---

#### Step 3: Terraform Infrastructure Decommissioning
```bash
cd terraform
terraform init -upgrade
echo "Destroying managed infrastructure..."
terraform destroy -auto-approve -var="key_name=jcs_raju_laptop"
```
* **Command Breakdown & Flags:**
  - `cd terraform && terraform init -upgrade`: Initializes backend connection to download state lock.
  - `terraform destroy`: Deletes all managed AWS infrastructure resources (ECS tasks, target groups, ALB, RDS PostgreSQL database, security groups, VPC subnets, IAM policies) in reverse dependency order.
  - `-auto-approve`: Bypasses interactive confirmation prompts for non-interactive automated CI/CD runners.
* **Official Documentation:** [Terraform CLI: destroy](https://developer.hashicorp.com/terraform/cli/commands/destroy)

---

### 9.5 Master CLI Tool & Binary Reference Table

| Tool / Binary | Used in Pipelines | Primary Commands Executed | Purpose in Sunotal Architecture | Official Documentation Link |
|---|---|---|---|---|
| **`pnpm`** | `ci.yml`, `cd.yml` | `pnpm install`, `pnpm exec tsc`, `pnpm run test`, `pnpm run db:push` | Fast, disk-efficient package management, compilation, and ORM database migration runner. | [pnpm Documentation](https://pnpm.io/) |
| **`tsc`** | `ci.yml` | `tsc --noEmit` | Validates TypeScript syntax, type safety, and interface adherence without emitting build files. | [TypeScript Compiler Docs](https://www.typescriptlang.org/docs/handbook/compiler-options.html) |
| **`vitest`** | `ci.yml` | `vitest run --reporter=json --outputFile=...` | Runs unit, API, and integration test suites, outputting structured JSON metrics. | [Vitest CLI Documentation](https://vitest.dev/guide/cli.html) |
| **`docker`** | `ci.yml` | `docker build`, `docker push` | Compiles container images for 5 microservices, tags them with SHA/latest, and pushes to ECR. | [Docker CLI Documentation](https://docs.docker.com/reference/cli/docker/) |
| **`aws s3` / `aws s3api`** | `ci.yml`, `infra.yml`, `infra-destroy.yml` | `aws s3 cp`, `aws s3 rm`, `aws s3api head-bucket`, `create-bucket`, `put-bucket-versioning` | Manages remote Terraform state storage buckets, uploads test reports, and purges build artifacts. | [AWS CLI S3 Reference](https://docs.aws.amazon.com/cli/latest/reference/s3/) |
| **`aws dynamodb`** | `infra.yml` | `aws dynamodb create-table`, `wait table-exists` | Provisions and waits for Terraform state locking table to ensure atomic infrastructure deployments. | [AWS CLI DynamoDB Reference](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/) |
| **`aws ec2` / `aws elbv2`** | `cd.yml`, `infra.yml` | `describe-subnets`, `describe-security-groups`, `describe-instances`, `describe-load-balancers` | Discovers VPC private subnets, security groups, compute instances, and load balancer DNS endpoints. | [AWS CLI EC2 Reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/) |
| **`aws ecs`** | `cd.yml` | `update-service --force-new-deployment`, `run-task`, `wait services-stable` | Orchestrates rolling zero-downtime microservice updates, serverless DB migrations, and service stabilization. | [AWS CLI ECS Reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/) |
| **`aws route53` / `aws acm`** | `infra.yml` | `list-hosted-zones`, `list-certificates` | Audits public DNS records and ACM SSL/TLS certificates for HTTPS domain termination. | [AWS CLI Route53](https://docs.aws.amazon.com/cli/latest/reference/route53/) / [ACM](https://docs.aws.amazon.com/cli/latest/reference/acm/) |
| **`terraform`** | `infra.yml`, `infra-destroy.yml` | `fmt -check`, `init`, `validate`, `plan`, `apply`, `destroy` | Declarative Infrastructure-as-Code engine provisioning and tearing down AWS cloud infrastructure. | [Terraform CLI Documentation](https://developer.hashicorp.com/terraform/cli/commands) |
| **`ssh-keygen`** | `infra.yml` | `ssh-keygen -y -f ...` | Extracts OpenSSH public key from secret RSA private key for EC2 key pair deployment. | [OpenSSH Manual](https://man.openbsd.org/ssh-keygen) |
| **`curl`** | `cd.yml` | `curl -s -o /dev/null -w "%{http_code}" --retry 5 ...` | Executes automated post-deployment synthetic HTTP status verification against live endpoints. | [curl Documentation](https://curl.se/docs/manpage.html) |

---


