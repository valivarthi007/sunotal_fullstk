# 09. Shell Scripting & Automation Masterclass

Welcome to the **Sunotal Shell Scripting & Automation Master Guide**. This document provides an exhaustive, educational, and operational manual for shell scripting, bash automation, process concurrency, subshells, signal traps, and GitHub Actions inline scripting.

---

## 📖 Table of Contents
1. [Shell Scripting 101 for Beginners](#1-shell-scripting-101-for-beginners)
2. [Line-by-Line Walkthrough of `setup.sh`](#2-line-by-line-walkthrough-of-setupsh)
3. [Line-by-Line Walkthrough of `start-dev.sh`](#3-line-by-line-walkthrough-of-start-devsh)
4. [In-Pipeline Shell Scripting Patterns (`cd.yml`)](#4-in-pipeline-shell-scripting-patterns-cdyml)
5. [Shell Scripting Best Practices Used in Sunotal](#5-shell-scripting-best-practices-used-in-sunotal)
6. [Essential Shell Commands & One-Liners Cheatsheet](#6-essential-shell-commands--one-liners-cheatsheet)

---

## 1. Shell Scripting 101 for Beginners

### What is a Shell Script?
A shell script is a plain text file containing a sequence of commands executed by the Bash (Bourne Again SHell) interpreter. Shell scripts automate repetitive system tasks like software installation, container management, process execution, and deployment verification.

### Core Syntax Concepts
- **Shebang (`#!/usr/bin/env bash`)**: First line of the script telling the operating system to execute the file using `bash`.
- **Strict Mode (`set -euo pipefail`)**:
  - `-e`: Exit immediately if any command returns a non-zero exit code (error).
  - `-u`: Treat unset variables as errors and exit.
  - `-o pipefail`: Ensure pipelines (`cmd1 | cmd2`) fail if any intermediate command fails.
- **Variables**: Stored values accessed with `$` (e.g. `PORT=5000`, `echo $PORT`).
- **Subshell `(...)`**: Executes commands inside an isolated child process, preventing directory pollution.
- **Process ID (`$!`)**: Captures the process ID of the most recently executed background command.
- **Signal Trap (`trap cleanup INT TERM`)**: Registers a cleanup function to execute when the script receives cancellation signals (e.g. `Ctrl+C`).

---

## 2. Line-by-Line Walkthrough of `setup.sh`

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

## 3. Line-by-Line Walkthrough of `start-dev.sh` (Process Concurrency & Traps)

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

## 4. In-Pipeline Shell Scripting Patterns (`cd.yml`)

### 1. Extracting Kubernetes Pod IPs via JSONPath
```bash
AUTH_IP=$(kubectl get pods -n sunotal -l app=sunotal-auth --field-selector=status.phase=Running -o jsonpath='{.items[0].status.podIP}' 2>/dev/null || echo "")
```

### 2. Self-Healing Target Registration Loop
```bash
if [ -n "$AUTH_IP" ]; then
  aws elbv2 register-targets \
    --target-group-arn "arn:aws:elasticloadbalancing:${AWS_REGION}:${ACCOUNT_ID}:targetgroup/sunotal-auth-tg/24a0b8296cb65cd9" \
    --targets Id=$AUTH_IP,Port=5001
fi
```

### 3. Extracting Stale Registrations and Deregistering
```bash
AUTH_REG=$(aws elbv2 describe-target-health --target-group-arn "arn:aws:elasticloadbalancing:${AWS_REGION}:${ACCOUNT_ID}:targetgroup/sunotal-auth-tg/24a0b8296cb65cd9" --query "TargetHealthDescriptions[*].Target.Id" --output text)

for ip in $AUTH_REG; do
  if [ "$ip" != "$AUTH_IP" ]; then
    aws elbv2 deregister-targets --target-group-arn "arn:aws:elasticloadbalancing:${AWS_REGION}:${ACCOUNT_ID}:targetgroup/sunotal-auth-tg/24a0b8296cb65cd9" --targets Id=$ip,Port=5001
  fi
done
```

---

## 5. Essential Shell Commands & One-Liners Cheatsheet

```bash
# 1. Search for a string across all TypeScript files
grep -rn "initDatabase" --include="*.ts" backend/

# 2. Find process holding port 5001 and kill it
lsof -i :5001 | awk 'NR>1 {print $2}' | xargs kill -9

# 3. Stream colorized application logs
journalctl -u sunotal.service -f --output=cat

# 4. Measure HTTP API response time
curl -o /dev/null -s -w 'Total Time: %{time_total}s\n' https://sunotal.automateuniverse.space/api/healthz
```
