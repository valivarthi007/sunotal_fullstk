#!/usr/bin/env bash
# Start both backend (port 5000) and frontend (port 3000) in dev mode.
# Requires: ./setup.sh to have been run first.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env so backend can connect to DB
set -a; source "$SCRIPT_DIR/backend/.env" 2>/dev/null || true; set +a

echo "Starting Sunotal Farms dev servers…"
echo ""

# Backend
(cd "$SCRIPT_DIR/backend" && pnpm dev) &
BACK_PID=$!

# Short pause so backend boots before frontend proxy kicks in
sleep 2

# Frontend
(cd "$SCRIPT_DIR/frontend" && pnpm dev) &
FRONT_PID=$!

echo ""
echo "  ✅  Backend  → http://localhost:5000/api/healthz"
echo "  ✅  Frontend → http://localhost:3000"
echo "  ✅  Admin    → http://localhost:3000/admin/login"
echo ""
echo "Press Ctrl+C to stop both servers."

cleanup() { kill "$BACK_PID" "$FRONT_PID" 2>/dev/null; exit; }
trap cleanup INT TERM
wait
