#!/usr/bin/env bash
# Sunotal Farms — automated Ubuntu setup
# Run as a regular user (NOT root). Uses sudo where needed.
set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
info()  { echo -e "${G}[INFO]${N}  $*"; }
warn()  { echo -e "${Y}[WARN]${N}  $*"; }
error() { echo -e "${R}[ERROR]${N} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── 1. System packages ─────────────────────────────────────────────────
info "Updating package list…"
sudo apt-get update -qq
sudo apt-get install -y -qq curl git build-essential

# ── 2. Node.js 20 LTS ─────────────────────────────────────────────────
if ! node --version 2>/dev/null | grep -q "^v20"; then
  info "Installing Node.js 20 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  info "Node.js already installed: $(node -v)"
fi

# ── 3. pnpm ───────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  info "Installing pnpm…"
  npm install -g pnpm
else
  info "pnpm: $(pnpm -v)"
fi

# ── 4. Docker (for PostgreSQL) ─────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker…"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  warn "Docker installed. You need to log out and back in (or run 'newgrp docker') before continuing."
  warn "After re-login, run this script again."
  exit 0
fi

# ── 5. Start PostgreSQL ───────────────────────────────────────────────
info "Starting PostgreSQL via Docker Compose…"
cd "$SCRIPT_DIR"
docker compose up -d postgres

info "Waiting for PostgreSQL to accept connections…"
for i in $(seq 1 15); do
  docker exec sunotal-db pg_isready -U sunotal &>/dev/null && break
  sleep 2
done
docker exec sunotal-db pg_isready -U sunotal || error "PostgreSQL not ready after 30s"

# ── 6. Backend setup ──────────────────────────────────────────────────
info "Setting up backend…"
cd "$SCRIPT_DIR/backend"

if [[ ! -f .env ]]; then
  cp .env.example .env
  info ".env created — edit backend/.env to set a strong JWT_SECRET for production."
fi

info "Installing backend dependencies…"
pnpm install

info "Running DB migrations…"
pnpm db:push

info "Seeding database…"
docker exec -i sunotal-db psql -U sunotal -d sunotal < "$SCRIPT_DIR/database/seed.sql" \
  && info "Seed data inserted." || warn "Seed may already exist — skipped."

# ── 7. Frontend setup ─────────────────────────────────────────────────
info "Setting up frontend…"
cd "$SCRIPT_DIR/frontend"
pnpm install

# ── Done ──────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
echo ""
echo -e "${G}══════════════════════════════════════════════${N}"
echo -e "${G}  Sunotal Farms — Setup Complete! 🌱          ${N}"
echo -e "${G}══════════════════════════════════════════════${N}"
echo ""
echo "  Start dev servers:   ./start-dev.sh"
echo "  Or manually:"
echo "    Terminal 1 → cd backend  && pnpm dev"
echo "    Terminal 2 → cd frontend && pnpm dev"
echo ""
echo "  Open: http://localhost:3000"
echo ""
echo "  Admin login:  admin@sunotal.com / admin123"
echo ""
echo -e "${Y}  Remember: change JWT_SECRET in backend/.env before deploying!${N}"
