#!/bin/bash
# Prepares a Claude Code on the web container so `bun run validate` works on
# the first try. Local checkouts already have a toolchain, so this is a no-op
# outside the remote environment.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

# Must return 0 when there is no env file to write to: under `set -e` a
# falsy guard here would abort the whole hook before dependencies install.
persist() {
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "$1" >> "$CLAUDE_ENV_FILE"
  fi
}

# CI resolves `bun-version: latest`, while the base image ships an older bun.
# The two resolve this lockfile differently, so a frozen-lockfile failure here
# would not reproduce in CI — and vice versa. Match CI instead of the image.
if npm install -g bun@latest >/dev/null 2>&1; then
  BUN_BIN="$(npm prefix -g)/bin"
  if [ -x "$BUN_BIN/bun" ]; then
    export PATH="$BUN_BIN:$PATH"
    persist "export PATH=\"$BUN_BIN:\$PATH\""
  fi
fi
echo "bun $(bun --version)"

# --frozen-lockfile is what CI enforces, so drift should surface at session
# start rather than three commands later. Fall back so a drifting lockfile
# leaves a usable session instead of an unusable one.
if ! bun install --frozen-lockfile; then
  echo "warning: lockfile is out of sync with package.json — installing unfrozen" >&2
  bun install
fi

# env.ts validates at build time and a fresh container has no .env, so every
# build and e2e run needs the documented escape hatch.
export SKIP_ENV_VALIDATION=1
persist 'export SKIP_ENV_VALIDATION=1'

# Chromium ships with the image and PLAYWRIGHT_BROWSERS_PATH already points at
# it; `playwright install` would re-download it for nothing. E2E still needs a
# Postgres reachable at DATABASE_URL, which the container does not provide —
# `bun run validate` (lint, type-check, unit tests, build) runs without one.
