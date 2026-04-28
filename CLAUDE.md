# CLAUDE.md

> Project context for Claude Code. Read this before anything else.

---

## What This Is

A boilerplate/scaffold to quickly start Quirk projects.
Contains opinionated docs, tooling config, and patterns.

---

## Stack (adapt per project)

| Layer | Default |
|-------|---------|
| Language | TypeScript |
| Frontend | Next.js (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Next.js API routes or Hono |
| Auth | Auth.js (NextAuth) |
| Database | PostgreSQL via Prisma |
| Cache | Upstash Redis |
| Queue | Inngest |
| Email | Resend + React Email |
| Payments | Stripe |
| Deploy | Vercel + Railway |
| Errors | Sentry |
| Analytics | PostHog |

---

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run test         # Vitest
npm run test:watch   # watch mode
npm run test:e2e     # Playwright E2E
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run db:studio    # Prisma Studio
npm run db:migrate   # run pending migrations
npm run db:seed      # seed dev data
make dev             # docker + app (Docker Compose)
make setup           # bootstrap local environment
```

---

## Folder Layout

```
src/
  app/              Next.js App Router pages + API routes
  components/
    ui/             Primitives (shadcn)
    features/       Feature-specific components
  lib/              Utilities, clients, helpers
  hooks/            Custom React hooks
  stores/           Zustand state stores
  types/            TypeScript type definitions
  config/           App configuration, constants

docs/
  recommendations/  Reference docs — read these
  adr/              Architecture Decision Records

.claude/
  commands/         Custom slash commands for this project
```

---

## Key Patterns

- **Validation:** Zod at every system boundary
- **Errors:** typed AppError class, consistent JSON error shape
- **Auth:** middleware-based, default-deny on all routes
- **DB queries:** Prisma ORM, parameterized always
- **API routes:** validate → service → typed response
- **Secrets:** `.env.local` only, never in code

---

## Hard Rules

- No `any` in TypeScript — use `unknown` and narrow
- No string interpolation in SQL — parameterized queries only
- No passwords/tokens/secrets in logs or API responses
- No `.env` files with real values committed
- No input validation skipped on API routes
- No `console.log` in production code — use the logger
- No `eslint-disable` without a comment explaining why

---

## Slash Commands

Run these in Claude Code with `/command-name`:

| Command | Does |
|---------|------|
| `/commit` | Analyze diff, write + execute conventional commit |
| `/review` | Security + correctness + performance code review |
| `/spec` | Convert feature description into user stories + ACs |
| `/debug` | Systematic root-cause analysis of any error |
| `/sauce-code` | Document a track's production recipe for reproduction |
| `/verse-vaults` | Manage lyrics with version control and tagging |
| `/ear-worms` | Score hooks for catchiness and replay magnetism |
| `/mood-swings` | Map emotional arc across an album or EP |
| `/tracklist-tyrant` | Architect tracklist flow and sequencing |
| `/ghost-writers` | Generate bios, pitches, DMs, grant applications |
| `/thirst-traps` | Build platform-native content strategy for releases |
| `/money-shots` | Revenue intelligence and royalty tracking |
| `/sample-sluts` | Tag, retrieve, cross-reference sound library elements |
| `/genre-bender` | Generate genre-mash prompts and sonic experiments |
| `/franken-tracks` | Map recombination possibilities across catalog |

---

## Docs Reference

All patterns in `docs/recommendations/`:

| Topic | File |
|-------|------|
| Security | `security/SECURITY.md` |
| Database | `database/DATABASE.md` |
| Testing | `testing/TESTING.md` |
| API Design | `api/API_DESIGN.md` |
| CI/CD | `pipelines/CICD.md` |
| Monitoring | `monitoring/MONITORING.md` |
| Performance | `performance/PERFORMANCE.md` |
| LLMOps | `llmops/LLMOPS.md` |
| Money/Stripe | `money/MONEY.md` |
| Regex | `regex/REGEX.md` |
| Protocols | `protocols/PROTOCOLS.md` |
| Conventions | `conventions/CONVENTIONS.md` |
| Incident | `incident/INCIDENT.md` |
| Onboarding | `onboarding/ONBOARDING.md` |
| Planning | `planning/PLANNING.md` |
| Claude Skills | `ai/CLAUDE_SKILLS.md` |
| OpenAI Skills | `ai/OPENAI_SKILLS.md` |
| Obsidian | `obsidian/OBSIDIAN.md` |
| Terminal | `terminal/TERMINAL.md` |
| Data Structures | `code/DATA_STRUCTURES.md` |
| Apps/SaaS | `apps/APPS.md` |
| Wild Ideas | `wild/WILD.md` |
