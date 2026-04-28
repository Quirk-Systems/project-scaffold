#!/usr/bin/env bash
# scripts/setup.sh — One-command dev environment bootstrap
# Usage: ./scripts/setup.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
error()   { echo -e "${RED}[error]${NC} $*"; exit 1; }
section() { echo -e "\n${BOLD}── $* ──────────────────────────────────────────${NC}"; }

section "Checking prerequisites"

# Node.js
if ! command -v node &>/dev/null; then
  error "Node.js not installed. Install from https://nodejs.org or use nvm"
fi
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
[[ "$NODE_VER" -lt 20 ]] && error "Node.js 20+ required. Current: $(node -v)"
info "Node.js $(node -v) ✓"

# npm
if ! command -v npm &>/dev/null; then
  error "npm not installed"
fi
info "npm $(npm -v) ✓"

# Docker
if ! command -v docker &>/dev/null; then
  warn "Docker not installed — skipping database setup"
  warn "Install from https://docker.com"
  SKIP_DOCKER=true
else
  info "Docker $(docker --version | awk '{print $3}' | tr -d ',') ✓"
  SKIP_DOCKER=false
fi

section "Installing dependencies"
npm ci
info "Dependencies installed ✓"

section "Environment"
if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  warn ".env.local created from .env.example"
  warn "Fill in real values before running the app"
  warn "Tip: op inject -i .env.example -o .env.local (1Password CLI)"
else
  info ".env.local already exists ✓"
fi

section "Database"
if [[ "$SKIP_DOCKER" == "false" ]]; then
  info "Starting database..."
  docker compose up -d db

  info "Waiting for Postgres to be ready..."
  RETRIES=30
  until docker compose exec -T db pg_isready -U postgres &>/dev/null || [[ $RETRIES -eq 0 ]]; do
    RETRIES=$((RETRIES - 1))
    sleep 1
  done
  [[ $RETRIES -eq 0 ]] && error "Postgres did not start in time"
  info "Postgres ready ✓"

  info "Running migrations..."
  npx prisma migrate dev --skip-generate 2>/dev/null || \
    warn "Migrations skipped — check DATABASE_URL in .env.local"

  info "Seeding development data..."
  npm run db:seed 2>/dev/null || warn "Seed skipped — add 'db:seed' script to package.json"
else
  warn "Skipping database setup (Docker not available)"
fi

section "Prisma client"
npx prisma generate 2>/dev/null && info "Prisma client generated ✓" || true

section "Done"
echo -e "\n${GREEN}${BOLD}✓ Setup complete!${NC}"
echo ""
echo "  Start the app:     npm run dev"
echo "  Run tests:         npm test"
echo "  Database UI:       make db-studio"
echo "  All commands:      make help (or just: make)"
echo ""
