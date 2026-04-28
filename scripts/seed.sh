#!/usr/bin/env bash
# scripts/seed.sh — Seed development data
# Wraps prisma db seed with friendly output
# Usage: ./scripts/seed.sh [--reset]

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[seed]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }

RESET=false
[[ "${1:-}" == "--reset" ]] && RESET=true

if [[ "$RESET" == "true" ]]; then
  warn "Resetting database before seeding..."
  npx prisma migrate reset --force --skip-seed
  info "Database reset ✓"
fi

info "Seeding development data..."
npx prisma db seed

info "Seed complete ✓"
echo ""
echo "  Database UI: make db-studio"
echo "  Or: npx prisma studio"
