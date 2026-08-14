# Bash Shell Scripting Tutorial & Automation Guide (`setup.sh` & `start-dev.sh`)

This guide explains the production Bash automation scripts developed for **Sunotal Farms** (`setup.sh` and `start-dev.sh`) and provides a tutorial on writing resilient, robust shell scripts.

---

## Part 1: Anatomy of `setup.sh`

`setup.sh` automates the entire local developer onboarding on Ubuntu Linux: installing system build tools, Node.js 20, pnpm, Docker, starting PostgreSQL, seeding the database, and installing all frontend/backend dependencies.

### Script Code Walkthrough:

```bash
#!/usr/bin/env bash
# Strict Error Handling Mode
set -euo pipefail

# ANSI Color Code Definitions
G='\033[0;32m' # Green for INFO
Y='\033[1;33m' # Yellow for WARN
R='\033[0;31m' # Red for ERROR
N='\033[0m'    # Reset

info()  { echo -e "${G}[INFO]${N}  $*"; }
warn()  { echo -e "${Y}[WARN]${N}  $*"; }
error() { echo -e "${R}[ERROR]${N} $*"; exit 1; }

# Determine the absolute directory where this script resides
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
```

### Essential Shell Scripting Techniques Used:

1. **`set -euo pipefail` (Unofficial Strict Mode):**
   - `-e`: Exit immediately if any command exits with a non-zero status.
   - `-u`: Treat unset/unbound variables as an error and exit immediately.
   - `-o pipefail`: Return the exit status of the first command in a pipeline that fails (e.g. `cmd1 | cmd2 | cmd3` fails if `cmd1` fails, rather than hiding it behind `cmd3`).

2. **Dynamic Script Location Resolution (`SCRIPT_DIR`):**
   ```bash
   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
   ```
   Ensures the script functions correctly regardless of which directory the developer calls it from (`./setup.sh` or `cd /tmp && ~/repo/setup.sh`).

3. **Conditional Software Installation with `command -v`:**
   ```bash
   if ! command -v pnpm &>/dev/null; then
     info "Installing pnpm…"
     npm install -g pnpm
   else
     info "pnpm already installed: $(pnpm -v)"
   fi
   ```
   Avoids re-installing tools if they are already present on the host system.

4. **Polling Service Readiness with Retry Loops:**
   ```bash
   info "Waiting for PostgreSQL to accept connections…"
   for i in $(seq 1 15); do
     docker exec sunotal-db pg_isready -U sunotal &>/dev/null && break
     sleep 2
   done
   docker exec sunotal-db pg_isready -U sunotal || error "PostgreSQL not ready after 30s"
   ```
   Prevents race conditions where backend startup or migrations execute before the database container has finished initializing its socket.

---

## Part 2: Anatomy of `start-dev.sh`

`start-dev.sh` launches both the backend and frontend development servers concurrently in a single terminal with graceful shutdown handling.

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure PostgreSQL container is running
if ! docker ps --filter "name=sunotal-db" --filter "status=running" --format "{{.Names}}" | grep -q "sunotal-db"; then
  echo "PostgreSQL container (sunotal-db) is not running. Starting it..."
  docker compose up -d postgres
fi

# 1. Start Backend in background and capture Process ID ($!)
(cd "$SCRIPT_DIR/backend" && pnpm dev) &
BACK_PID=$!

# 2. Wait 2 seconds for backend to bind port 5000
sleep 2

# 3. Start Frontend in background and capture Process ID ($!)
(cd "$SCRIPT_DIR/frontend" && pnpm dev) &
FRONT_PID=$!

# 4. Graceful Cleanup Function on Exit or Ctrl+C (SIGINT / SIGTERM)
cleanup() { 
  echo "Stopping development servers..."
  kill "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM
wait
```

### Key Concepts:

1. **Background Execution (`&`) and PID Capture (`$!`):**
   - Running a subshell in the background with `&` allows multiple long-running server processes (`pnpm dev`) to execute in parallel within the same script.
   - `$!` immediately stores the Process ID (PID) of the most recently spawned background job.

2. **POSIX Signal Trapping (`trap cleanup INT TERM`):**
   - When the user presses `Ctrl+C` in the terminal, the kernel sends a `SIGINT` (Signal Interrupt) to the script.
   - `trap cleanup INT TERM` intercepts the signal and executes the `cleanup()` function, terminating both Node.js background processes cleanly so no orphan processes occupy ports `3000` or `5000`.

3. **`wait` Command:**
   - Keeps the parent script alive until either background job exits or a signal is received.
