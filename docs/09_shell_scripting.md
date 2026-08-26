# 09. Shell Scripting & Automation Guide

This document details all Bash/Shell scripts (`setup.sh`, `start-dev.sh`) and inline pipeline scripts used for environment setup, process concurrency, automated deployment, target group sync, and post-deployment validation.

---

## 9.1 Overview of Shell Scripts in Sunotal

| Script / Location | Execution Context | Key Responsibilities |
| :--- | :--- | :--- |
| `setup.sh` | Local Workstation / Dev EC2 | System package installation (`curl`, `git`), Node.js 20 & pnpm setup, Docker PostgreSQL spin-up, DB schema migration (`db:push`), database seeding. |
| `start-dev.sh` | Local Workstation | Concurrent background execution of backend (`:5000`) and frontend (`:3000`), DB readiness checks, process signal handling (`trap cleanup INT TERM`). |
| In-Pipeline Scripts (`.github/workflows/cd.yml`) | GitHub Actions CI/CD Runner | EKS/ECS deployment target auto-detection, ECR image tag substitution, Kubernetes JSONPath pod IP extraction, self-healing ALB Target Group registration, and post-deployment verification. |

---

## 9.2 Line-by-Line Breakdown of `setup.sh`

```bash
#!/usr/bin/env bash
# Line 4: Strict error handling mode
set -euo pipefail

# Line 6: Color formatting definitions for logging
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
info()  { echo -e "${G}[INFO]${N}  $*"; }
warn()  { echo -e "${Y}[WARN]${N}  $*"; }
error() { echo -e "${R}[ERROR]${N} $*"; exit 1; }

# Line 11: Determine absolute script directory path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Line 15-16: Install core Linux packages quietly
info "Updating package list…"
sudo apt-get update -qq
sudo apt-get install -y -qq curl git build-essential

# Line 19-25: Node.js 20 LTS detection & installation
if ! node --version 2>/dev/null | grep -q "^v20"; then
  info "Installing Node.js 20 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  info "Node.js already installed: $(node -v)"
fi

# Line 28-33: pnpm package manager setup
if ! command -v pnpm &>/dev/null; then
  info "Installing pnpm…"
  npm install -g pnpm
fi

# Line 46-55: Spin up PostgreSQL container & wait for connection readiness
docker compose up -d postgres
for i in $(seq 1 15); do
  docker exec sunotal-db pg_isready -U sunotal &>/dev/null && break
  sleep 2
done
docker exec sunotal-db pg_isready -U sunotal || error "PostgreSQL not ready after 30s"

# Line 58-74: Backend dependency installation, Drizzle migration & seed execution
cd "$SCRIPT_DIR/backend"
pnpm install
pnpm db:push
docker exec -i sunotal-db psql -U sunotal -d sunotal < "$SCRIPT_DIR/database/seed.sql"

# Line 77-86: Frontend dependency installation
cd "$SCRIPT_DIR/frontend"
pnpm install
```

---

## 9.3 Line-by-Line Breakdown of `start-dev.sh` (Process Concurrency & Traps)

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Line 9: Export environment variables from backend/.env into current subshell
set -a; source "$SCRIPT_DIR/backend/.env" 2>/dev/null || true; set +a

# Line 17-20: Auto-start PostgreSQL container if stopped
if ! docker ps --filter "name=sunotal-db" --filter "status=running" --format "{{.Names}}" | grep -q "sunotal-db"; then
  docker compose up -d postgres
fi

# Line 35-36: Start Backend in background subshell & capture Process ID (PID)
(cd "$SCRIPT_DIR/backend" && pnpm dev) &
BACK_PID=$!

# Line 42-43: Start Frontend in background subshell & capture PID
(cd "$SCRIPT_DIR/frontend" && pnpm dev) &
FRONT_PID=$!

# Line 52-54: Signal trap to cleanly kill both background processes on Ctrl+C (SIGINT/SIGTERM)
cleanup() { kill "$BACK_PID" "$FRONT_PID" 2>/dev/null; exit; }
trap cleanup INT TERM
wait
```

---

## 9.4 In-Pipeline Shell Scripting Patterns (`cd.yml`)

### 1. Auto-Detection of Deployment Target (EKS vs ECS)
```bash
TARGET="${{ inputs.deploy_target }}"

if [ -z "$TARGET" ] || [ "$TARGET" = "auto" ]; then
  # Query SSM parameter or fallback to checking active EKS cluster
  TARGET=$(aws ssm get-parameter --name "/sunotal/compute_target" --query "Parameter.Value" --output text 2>/dev/null || echo "")
fi

if [ -z "$TARGET" ] || [ "$TARGET" = "auto" ]; then
  EKS_STATUS=$(aws eks describe-cluster --name sunotal-cluster --query "cluster.status" --output text 2>/dev/null || echo "")
  if [ "$EKS_STATUS" = "ACTIVE" ]; then TARGET="eks"; else TARGET="ecs"; fi
fi

echo "DEPLOY_TARGET=$TARGET" >> $GITHUB_ENV
```

### 2. Extracting Kubernetes Pod IPs via JSONPath
```bash
AUTH_IP=$(kubectl get pods -n sunotal -l app=sunotal-auth --field-selector=status.phase=Running -o jsonpath='{.items[0].status.podIP}' 2>/dev/null || echo "")
```

### 3. Self-Healing Target Registration Loop
```bash
if [ -n "$AUTH_IP" ]; then
  aws elbv2 register-targets \
    --target-group-arn "arn:aws:elasticloadbalancing:${AWS_REGION}:${ACCOUNT_ID}:targetgroup/sunotal-auth-tg/24a0b8296cb65cd9" \
    --targets Id=$AUTH_IP,Port=5001
fi
```

### 4. Extracting Stale Registrations and Deregistering
```bash
AUTH_REG=$(aws elbv2 describe-target-health --target-group-arn "arn:aws:elasticloadbalancing:${AWS_REGION}:${ACCOUNT_ID}:targetgroup/sunotal-auth-tg/24a0b8296cb65cd9" --query "TargetHealthDescriptions[*].Target.Id" --output text)

for ip in $AUTH_REG; do
  if [ "$ip" != "$AUTH_IP" ]; then
    aws elbv2 deregister-targets --target-group-arn "arn:aws:elasticloadbalancing:${AWS_REGION}:${ACCOUNT_ID}:targetgroup/sunotal-auth-tg/24a0b8296cb65cd9" --targets Id=$ip,Port=5001
  fi
done
```

---

## 9.5 Shell Scripting Best Practices Used in Sunotal

1. **`set -euo pipefail`**:
   - `-e`: Exit immediately if any command returns a non-zero exit code.
   - `-u`: Treat unset variables as an error.
   - `-o pipefail`: Ensure pipelines (`cmd1 | cmd2`) fail if any component command fails.
2. **Subshell Scoping `(cd dir && command)`**: Prevents altering the current working directory of the main shell process.
3. **Signal Trapping (`trap cleanup INT TERM`)**: Ensures background processes (`$BACK_PID`, `$FRONT_PID`) are cleanly terminated upon script exit, preventing orphaned node server processes.
4. **JSONPath Filter Extraction**: Enables non-interactive parsing of complex Kubernetes metadata (`podIP`, `phase`).
