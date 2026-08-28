#!/usr/bin/env bash
# Sunotal Farms — Automated Production & Dev Setup Script
# Run as regular user. Follows enterprise standards with error trapping.
set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
info()  { echo -e "${G}[INFO]${N}  $*"; }
warn()  { echo -e "${Y}[WARN]${N}  $*"; }
error() { echo -e "${R}[ERROR]${N} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info "Starting Sunotal Platform Pre-Flight Check…"

# ── 1. System packages ─────────────────────────────────────────────────
info "Updating system packages…"
sudo apt-get update -qq || true
sudo apt-get install -y -qq curl git build-essential wget || true

# ── 2. Node.js 20 LTS ─────────────────────────────────────────────────
if ! node --version 2>/dev/null | grep -q "^v20"; then
  info "Installing Node.js 20 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  info "Node.js ready: $(node -v)"
fi

# ── 3. pnpm ───────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  info "Installing pnpm…"
  npm install -g pnpm
else
  info "pnpm ready: $(pnpm -v)"
fi

# ── 4. Docker ──────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker…"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  warn "Docker installed. Please re-login or run 'newgrp docker' and re-run setup.sh."
  exit 0
fi

# ── 5. Start PostgreSQL & Infrastructure Services ────────────────────
info "Starting PostgreSQL, Prometheus & Grafana via Docker Compose…"
cd "$SCRIPT_DIR"
docker compose up -d postgres prometheus grafana

info "Waiting for PostgreSQL to accept connections…"
for i in $(seq 1 20); do
  docker exec sunotal-db pg_isready -U sunotal &>/dev/null && break
  sleep 1.5
done
docker exec sunotal-db pg_isready -U sunotal || error "PostgreSQL not ready after 30s"

# ── 6. Backend & Schema Push ──────────────────────────────────────────
info "Setting up backend microservices & pushing database schema…"
cd "$SCRIPT_DIR/backend"

if [[ ! -f .env ]]; then
  cp .env.example .env 2>/dev/null || echo "DATABASE_URL=postgresql://sunotal:sunotalpass123@localhost:5432/sunotal" > .env
fi

info "Installing backend dependencies…"
pnpm install --ignore-scripts

info "Applying database schema migrations…"
pnpm run db:push

# ── 7. Frontend Setup ──────────────────────────────────────────────────
info "Setting up frontend application…"
cd "$SCRIPT_DIR/frontend"

if [[ ! -f .env ]]; then
  echo "VITE_API_URL=http://localhost:5000" > .env
fi

info "Installing frontend dependencies…"
pnpm install --ignore-scripts

# ── Complete ─────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
echo ""
echo -e "${G}════════════════════════════════════════════════════════════${N}"
echo -e "${G}  🌱 Sunotal Enterprise Hyperlocal Platform — Ready!       ${N}"
echo -e "${G}════════════════════════════════════════════════════════════${N}"
echo ""
echo "  Endpoints:"
echo "    Frontend Web App:   http://localhost:3000"
echo "    Prometheus Metrics: http://localhost:9090"
echo "    Grafana Dashboard:  http://localhost:3000 (admin/admin)"
echo ""
echo "  Microservices Ports:"
echo "    Auth Service:       http://localhost:5001"
echo "    Operations Service: http://localhost:5002"
echo "    Inventory Service:  http://localhost:5003"
echo "    User/Admin Service: http://localhost:5004"
echo "    Delivery Service:   http://localhost:5006"
echo ""
