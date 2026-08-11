# One-Click Scripts

> Paste, run, done. No setup ceremony.

---

## New Developer Onboarding

```bash
# Paste this into terminal after cloning the repo:
cp .env.example .env && bun install && bun run db:push && bun run validate && echo "✓ Ready"
```

What it does:
1. Creates `.env` from the example
2. Installs all dependencies
3. Pushes DB schema (creates `local.db`)
4. Runs full validation suite
5. Prints "Ready" if everything passes

---

## Generate Auth Secret

```bash
# One-liner — copies to clipboard on Mac
openssl rand -base64 32 | pbcopy && echo "AUTH_SECRET copied to clipboard"

# Linux (xclip)
openssl rand -base64 32 | xclip -selection clipboard && echo "Copied"

# Just print it
openssl rand -base64 32
```

Then add to `.env`:
```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
```

---

## Reset and Reseed Database

```bash
# Nuke and rebuild local DB
rm -f local.db && bun run db:push && bun run src/scripts/seed.ts
```

---

## Full Clean Reinstall

```bash
# Nuclear option — fresh state
rm -rf .next out node_modules bun.lockb && bun install && echo "✓ Clean install done"
```

---

## Install shadcn Component + Auto-format

```bash
# Usage: ./scripts/add-component.sh button
component="${1:-button}"
bunx shadcn@latest add "$component" && bun run format && echo "✓ Added $component"
```

---

## Create Feature Branch

```bash
# Usage: branch "feature/user-auth"
function branch() {
  git checkout main && git pull --rebase && git checkout -b "$1" && git push -u origin "$1"
  echo "✓ Branch $1 created and pushed"
}
```

---

## Run Everything in Parallel (Dev Mode)

```bash
# Start Next.js dev + Drizzle Studio simultaneously
bunx concurrently \
  "bun run dev" \
  "bun run db:studio" \
  --names "next,studio" \
  --prefix-colors "cyan,yellow"
```

---

## Check What's Deployed vs Local

```bash
# Compare local main vs remote
git fetch origin && git log --oneline origin/main..main
# Empty = local is behind remote
# Lines = commits not yet pushed
```

---

## One-Line Security Scan

```bash
# Run secret scanner + bun audit
bunx secretlint "**/*.{ts,tsx,js,json,env*}" 2>&1 && bun audit && echo "✓ Security scan passed"
```

---

## Generate Drizzle Types + Validate

```bash
bun run db:generate && bun run type-check && echo "✓ Schema and types in sync"
```

---

## Format + Lint Fix + Type Check

```bash
bun run format && bun run lint:fix && bun run type-check && echo "✓ Code cleaned"
```

---

## Pre-PR Checklist (One Command)

```bash
# Run before opening every PR
bun run validate && \
  bun audit --audit-level=high && \
  git diff main...HEAD --stat && \
  echo "✓ Ready to open PR"
```

---

## Tag a Release

```bash
# Usage: tag-release v1.2.3
function tag-release() {
  local version="$1"
  if [[ -z "$version" ]]; then echo "Usage: tag-release v1.2.3"; return 1; fi

  bun run validate && \
  git tag "$version" && \
  git push --tags && \
  echo "✓ Tagged $version and pushed"
}
```

---

## Docker Build + Run Locally

```bash
docker build -t project-scaffold:local . && \
docker run -p 3000:3000 --env-file .env project-scaffold:local
```

---

## Find All TODOs in Source

```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" --include="*.tsx" | \
  grep -v ".test." | \
  awk -F: '{print $1":"$2"\t"$3}' | \
  column -t
```

---

## Count Lines of Code by Type

```bash
# Quick LoC summary
echo "TypeScript:" && find src -name "*.ts" -not -name "*.test.ts" | xargs wc -l | tail -1
echo "TSX:" && find src -name "*.tsx" -not -name "*.test.tsx" | xargs wc -l | tail -1
echo "Tests:" && find src -name "*.test.*" | xargs wc -l | tail -1
echo "E2E:" && find e2e -name "*.spec.ts" | xargs wc -l | tail -1
```
