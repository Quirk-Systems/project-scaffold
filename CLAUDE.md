# CLAUDE.md

## Project Overview

**project-scaffold** is the fully-loaded boilerplate for Quirk Systems projects. It provides a production-ready Next.js 15 scaffold with all tooling, testing, CI/CD, and conventions configured out of the box. Stack, scripts, and layout are visible in `package.json` and the tree itself.

## Environment Variables

Defined in `src/lib/env.ts` using t3-env with Zod validation. Copy `.env.example` to `.env` to get started.

Server variables are optional in the scaffold so it boots without a `.env` file. Tighten validation when configuring for a real project (`requireProductionEnv()` already enforces `AUTH_SECRET`/`DATABASE_URL` in production builds).

## Integrations

Integration details (lazy-client pattern, media storage, Stripe, Resend, AI layer, PostHog) live in `.claude/rules/integrations.md`, which loads automatically when working on the relevant files.

## Conventions

### File Naming

- Components: PascalCase (`Button.tsx`) or kebab-case for shadcn (`button.tsx`)
- Hooks: `use-<name>.ts`
- Utilities: camelCase
- Route files: lowercase (`page.tsx`, `layout.tsx`, `route.ts`)

### Imports

- Use `@/` path alias for all imports from `src/`
- Example: `import { cn } from "@/lib/utils"`

### Components

- Server Components by default (no directive needed)
- Add `"use client"` only when using hooks, browser APIs, or event handlers
- Use `cn()` from `@/lib/utils` for conditional class names
- shadcn/ui components live in `src/components/ui/`

### Styling

- Tailwind CSS v4 with CSS-first configuration
- Theme variables defined in `src/app/globals.css` using `@theme inline`
- No `tailwind.config.ts` — all customization is in CSS
- OKLCH color space for theme colors (light/dark mode via `.dark` class)
- Dark mode uses `.dark` class variant (not `media`)

### Database

- Drizzle ORM with code-first TypeScript schemas
- Schema defined in `src/lib/db/schema.ts`
- PostgreSQL via `postgres` (postgres-js), pointed at Supabase through `DATABASE_URL`
- pgvector (`vector(1536)`) powers asset embeddings; the migration enables the `vector` extension
- Tables: `users`, billing (`customers`, `subscriptions`), plus the Quirk OS registry (`quirk_assets`, `quirk_asset_versions`, `quirk_annotations`, `quirk_tags`, `quirk_diffs`, `quirk_experiments`, `quirk_runs`, `quirk_pipelines`, `quirk_pipeline_steps`, `quirk_pipeline_runs`, `quirk_offers`)

### Quirk Offers (one-of-one drops)

- Module: `src/lib/quirk/offers.ts` — `mintOffer()` (persona-voiced pitch via the AI layer when `ANTHROPIC_API_KEY` is set, deterministic `fallbackPitch()` otherwise), `claimOffer()` (single conditional `UPDATE … WHERE status='open'` — the 1/1 is race-decided atomically), `listOffers()`/`getOffer()`
- **One offer per asset, ever**: unique constraint on `quirk_offers.asset_id`; double-mint surfaces as `OfferAlreadyMintedError` → 409
- Auto-mint: `promoteRun()` mints the winner's offer best-effort (promotion never fails because minting did) — **gated by Goldilocks**; manual mint via `POST /api/offers` bypasses the gate (heuristics drive, humans overrule)
- **Goldilocks gate** (`src/lib/quirk/goldilocks.ts`): `readGoldilocks(scores)` rules a profile `too_cold` (quality below floor or no pulse — nobody would claim it), `too_hot` (weirdness outrunning quality, or rant energy — hold for human curation), or `just_right` (auto-mint). Pure and deterministic; the reading (verdict, heat, reasons) is returned in the promote response
- Claim: `POST /api/offers/[id]/claim` is auth-gated; losing the race is a 409, not an error
- Retire: `POST /api/offers/[id]/retire` — curatorial pull-back, open offers only (a claimed 1/1 already belongs to someone)
- UI: `/quirk/offers` (OffersBoard — filter chips, claim button, claimed/retired states)

### Testing

- Unit tests: `src/**/*.{test,spec}.{ts,tsx}` — use Vitest + React Testing Library
- E2E tests: `e2e/*.spec.ts` — use Playwright (runs Chromium, Firefox, WebKit)
- Test setup in `src/__tests__/setup.ts` (auto-cleanup, jest-dom matchers, mock reset)
- Server Components cannot be tested with Vitest — use E2E tests for those
- E2E web server: builds then starts (`bun run build && bun run start`) on port 3000

### TypeScript

- Strict mode enabled
- Shared utility types in `src/types/index.ts`
- `WithRequired<T, K>`: make specific optional keys required — e.g. `WithRequired<User, "name">`

### Git

- Conventional commits enforced via commitlint (`@commitlint/config-conventional`)
- Lefthook pre-commit hooks run on **staged files only**: ESLint, Prettier check, and full type-check
- Lefthook commit-msg hook: runs commitlint on the commit message
- Branch naming: `feature/`, `fix/`, `chore/`

## CI/CD

### Dependency-update routine (three layers)

- **Immediate**: `bun audit --prod` gates every PR (`ci.yml` security job); Dependabot security alerts fire on advisory publication. Critical production-path vulnerabilities are fixed the same session, never queued for Monday
- **Weekly sweep**: `.github/workflows/deps-audit.yml` (Mondays + manual dispatch) runs `bun run deps:audit` and opens a severity-labeled issue with the full-tree report; critical findings prefix the title with 🚨 and add the `security` label
- **Mechanical scanner**: `scripts/deps-audit.ts` — parses `bun audit --json` (full + `--prod` for production-path flags) and `bun outdated`; ranks critical/high CVE → major → minor → patch; emits a stable per-finding block (dependency, current → safest recommended, update type, advisory, affected surface, effort, verification status, recommended action); groups advisory-free patch/minors into one maintenance batch; checks GitHub Actions pins for moving branches
- **Intelligent audit**: the `/deps-audit` command (`.claude/commands/deps-audit.md`) wraps the scanner with judgment — advisory research, reachability analysis, migration steps from changelogs, verified upgrade branches, and one recommended action per finding
- Majors on peer-coupled packages (zod, t3-env, hookform/resolvers, next-auth) are dependabot-ignored and land only via coordinated migration PRs

## Extended Documentation

| File                                                           | What's Inside                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                         | Claude Agent SDK, MCP servers, agentic loop, tool patterns, multi-agent, guardrails   |
| [PROJECT.md](PROJECT.md)                                       | PRD/ADR/RFC templates, new project checklist, sprint/retro templates, release process |
| [docs/recommendations/INDEX.md](docs/recommendations/INDEX.md) | Full index of all recommendation docs (30+ files)                                     |

Key recommendation docs:

- **AI**: `docs/recommendations/ai/` — prompt patterns, agent patterns, model selection, memory, evals
- **Voice**: `docs/recommendations/voice/` — AI voice, persona, soul, tone calibration
- **Tips**: `docs/recommendations/tips/` — TypeScript, Next.js, Testing, Debugging, Tailwind, Drizzle, Bun, Git
- **Reports**: `docs/recommendations/reports/` — repo health, security, performance, dependency, code quality
- **Macros**: `docs/recommendations/macros/` — Claude commands, shell aliases, bun scripts, one-click scripts
- **Installs**: `docs/recommendations/installs/` — macOS, Linux, Docker, project bootstrap, dev tools

## Guidelines for AI Assistants

- Run `bun run validate` after making changes to verify nothing is broken
- Follow existing patterns — don't introduce new libraries without good reason
- Keep the scaffold nature — additions should be broadly useful, not project-specific
- Use `@/` path aliases for imports
- Add `"use client"` only when necessary
- Never commit `.env` files or secrets
- Write tests for new components and utilities (`src/**/*.test.tsx` for unit, `e2e/*.spec.ts` for E2E)
- Use conventional commit messages (enforced by commitlint)
- Node.js >=20.0.0 is required (alongside Bun)
- For agent/AI work, see `AGENTS.md` and `docs/recommendations/ai/`
- For project planning, see `PROJECT.md`
