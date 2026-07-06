# CLAUDE.md

## Project Overview

**project-scaffold** is the fully-loaded boilerplate for Quirk Systems projects. It provides a production-ready Next.js 15 scaffold with all tooling, testing, CI/CD, and conventions configured out of the box.

## Tech Stack

| Category                  | Tool                                   |
| ------------------------- | -------------------------------------- |
| Runtime / Package Manager | Bun                                    |
| Framework                 | Next.js 16 (App Router, Turbopack)     |
| Language                  | TypeScript (strict mode)               |
| Styling                   | Tailwind CSS v4 (CSS-first config)     |
| Components                | shadcn/ui (new-york style)             |
| Server State              | TanStack Query v5                      |
| Client State              | (per-project: Zustand or Jotai)        |
| Forms                     | React Hook Form + Zod                  |
| Database                  | Drizzle ORM (Supabase Postgres)        |
| Auth                      | Auth.js v5 (Credentials provider)      |
| Unit Testing              | Vitest + React Testing Library         |
| E2E Testing               | Playwright (Chromium, Firefox, WebKit) |
| Linting                   | ESLint 9 (flat config) + Prettier      |
| Git Hooks                 | Lefthook                               |
| CI/CD                     | GitHub Actions                         |

## Directory Structure

```
project-scaffold/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI pipeline (validate + e2e jobs)
├── docs/
│   └── recommendations/        # Architecture and tooling guidance docs
├── e2e/
│   └── home.spec.ts            # Playwright E2E tests
├── src/
│   ├── __tests__/
│   │   ├── setup.ts            # Vitest setup (jest-dom, cleanup, mock reset)
│   │   └── page.test.tsx       # Unit tests for Home page
│   ├── app/                    # Next.js App Router pages and layouts
│   │   ├── api/
│   │   │   └── auth/           # Auth.js route handlers
│   │   ├── globals.css         # Tailwind v4 CSS config + theme variables
│   │   ├── layout.tsx          # Root layout (providers, fonts, metadata)
│   │   ├── page.tsx            # Home page
│   │   ├── loading.tsx         # Root loading state
│   │   ├── error.tsx           # Root error boundary
│   │   └── not-found.tsx       # 404 page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (button, card, input, label, separator, sonner)
│   │   ├── providers.tsx       # Client providers (QueryClient + ThemeProvider)
│   │   └── theme-toggle.tsx    # Dark mode toggle (Sun/Moon)
│   ├── hooks/
│   │   └── use-media-query.ts  # Media query hook (returns boolean)
│   ├── lib/
│   │   ├── db/                 # Drizzle ORM setup and schema
│   │   │   ├── index.ts        # Database client (better-sqlite3)
│   │   │   └── schema.ts       # Table definitions (users table)
│   │   ├── auth.ts             # Auth.js configuration
│   │   ├── env.ts              # Environment variable validation (t3-env)
│   │   ├── logger.ts           # Structured pino logger
│   │   ├── result.ts           # Result<T, E> type + combinators
│   │   └── utils.ts            # Utility functions (cn helper)
│   └── types/
│       └── index.ts            # Shared TypeScript types (WithRequired<T, K>)
├── .env.example
├── components.json             # shadcn/ui CLI config
├── commitlint.config.ts        # Conventional commits config
├── drizzle.config.ts           # Drizzle Kit config (sqlite, local.db)
├── eslint.config.mjs           # ESLint 9 flat config
├── lefthook.yml                # Git hook definitions
├── next.config.ts              # Next.js config (imports env for validation)
├── playwright.config.ts        # Playwright config (3 browsers, retries in CI)
├── postcss.config.mjs          # PostCSS with @tailwindcss/postcss
├── prettier.config.mjs         # Prettier config + tailwindcss plugin
├── tsconfig.json               # TypeScript strict config, @/* alias
└── vitest.config.ts            # Vitest config (jsdom, v8 coverage)
```

## Commands

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `bun run dev`           | Start dev server with Turbopack       |
| `bun run build`         | Production build                      |
| `bun run start`         | Start production server               |
| `bun run preview`       | Build then start (production preview) |
| `bun run lint`          | Run ESLint                            |
| `bun run lint:fix`      | Run ESLint with auto-fix              |
| `bun run format`        | Format all files with Prettier        |
| `bun run format:check`  | Check formatting                      |
| `bun run type-check`    | TypeScript type checking              |
| `bun run test`          | Run Vitest in watch mode              |
| `bun run test:ui`       | Run Vitest with browser UI            |
| `bun run test:run`      | Run Vitest once                       |
| `bun run test:coverage` | Run tests with v8 coverage            |
| `bun run test:e2e`      | Run Playwright E2E tests              |
| `bun run test:e2e:ui`   | Run Playwright with browser UI        |
| `bun run db:generate`   | Generate Drizzle migrations           |
| `bun run db:push`       | Push schema changes to DB             |
| `bun run db:studio`     | Open Drizzle Studio                   |
| `bun run db:migrate`    | Run migrations                        |
| `bun run db:embed`      | Backfill `quirk_assets.embedding`     |
| `bun run validate`      | Run lint + type-check + test + build  |
| `bun run clean`         | Remove .next, out, node_modules       |

## Environment Variables

Defined in `src/lib/env.ts` using t3-env with Zod validation. Copy `.env.example` to `.env` to get started.

| Variable                   | Required | Description                                               |
| -------------------------- | -------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`      | No       | Public app URL                                            |
| `DATABASE_URL`             | No       | Postgres connection string (Supabase pooler in prod)      |
| `AUTH_SECRET`              | No       | Auth.js secret (generate with `openssl rand -base64 32`)  |
| `AUTH_EMAIL_FROM`          | No       | Transactional sender address (verified Resend domain)     |
| `RESEND_API_KEY`           | No       | Resend API key (email sending)                            |
| `STRIPE_SECRET_KEY`        | No       | Stripe secret key                                         |
| `STRIPE_WEBHOOK_SECRET`    | No       | Stripe webhook signing secret (from `stripe listen`)      |
| `STRIPE_PRICE_ID`          | No       | Default price for the `/pricing` checkout button          |
| `ANTHROPIC_API_KEY`        | No       | Claude API key for the `src/lib/ai` persona layer         |
| `EMBEDDINGS_API_KEY`       | No       | Key for the OpenAI-compatible embeddings endpoint         |
| `EMBEDDINGS_BASE_URL`      | No       | Embeddings endpoint (default `https://api.openai.com/v1`) |
| `EMBEDDINGS_MODEL`         | No       | Embedding model (default `text-embedding-3-small`)        |
| `NEXT_PUBLIC_POSTHOG_KEY`  | No       | PostHog project key (analytics + flags); unset = no-op    |
| `NEXT_PUBLIC_POSTHOG_HOST` | No       | PostHog host (default `https://us.i.posthog.com`)         |
| `SKIP_ENV_VALIDATION`      | No       | Set to `1` to skip env validation (CI/Docker)             |

Server variables are optional in the scaffold so it boots without a `.env` file. Tighten validation when configuring for a real project (`requireProductionEnv()` already enforces `AUTH_SECRET`/`DATABASE_URL` in production builds).

## Integrations

### Third-party clients (shared pattern)

- `src/lib/lazy-client.ts` — `createLazyClient({ name, requires, create })` memoizes the client, defers construction until first use (so the scaffold builds without secrets), and `assertConfigured()` throws an aggregated `"<name> not configured: set X, Y"` when required env vars are missing
- Billing, Email, and AI clients are thin wrappers over it — add new integrations the same way

### Billing (Stripe)

- Module: `src/lib/billing/` — `client.ts` (lazy `getStripe()`), `checkout.ts` (`createCheckoutSession`), `webhooks.ts` (`handleStripeEvent`), `index.ts` (barrel)
- Webhook route: `src/app/api/webhooks/stripe/route.ts` (nodejs runtime, force-dynamic, raw body via `req.text()`)
- Customer-facing route: `src/app/pricing/` — Server Component + Server Action (`startCheckout`, uses `auth()`)
- Tables: `customers` (1:1 with `users`), `subscriptions` (keyed on `stripeSubscriptionId`, status typed via `Stripe.Subscription.Status`)
- Local dev: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, copy the `whsec_…` into `.env`, checkout with `4242 4242 4242 4242`

### Email (Resend + react-email)

- Module: `src/lib/email/` — `sendEmail()` accepts either `react` (rendered to HTML + plaintext) or raw `html` (discriminated union — pass exactly one)
- Templates in `src/emails/` (`magic-link.tsx`, `welcome.tsx`, shared layout); `bun run email:dev` previews them on port 3001
- All outgoing mail goes through `sendEmail()` so providers can be swapped in one file

### AI (Claude persona/register layer)

- Module: `src/lib/ai/` — lazy `getAnthropic()` (`DEFAULT_MODEL` `claude-opus-4-7`), `personas.ts` (frozen cacheable house voice), `registers.ts` (tonal modes with animation vocabularies), `compose.ts` (cache breakpoint on the persona prefix), `generate.ts` (`generateText`/`streamText`/`createStream`), `animation.ts` (`AiState` lifecycle)
- **No `temperature`/`top_p`/`top_k`** — removed on Opus 4.7 (they 400); tune via prompt + `effort`
- Defaults tuned for snappy tone responses: `effort: "low"`, thinking off, `max_tokens: 1024`
- Embeddings: `embeddings.ts` — Anthropic has no embeddings API, so `embedText`/`embedTexts` speak the OpenAI-compatible `/embeddings` format over fetch (no SDK); `EMBEDDINGS_API_KEY`/`EMBEDDINGS_BASE_URL`/`EMBEDDINGS_MODEL` select the provider. `src/lib/db/embed.ts` adds `embedPendingAssets()` (backfill, run via `bun run db:embed`) and `semanticSearchAssets(query)` on top of `searchAssets()`

### Analytics & flags (PostHog)

- `src/lib/analytics.ts` (server `capture()`/`isFeatureEnabled()`) and `src/components/posthog-provider.tsx` (client, wired into `Providers`) — both **no-op when `NEXT_PUBLIC_POSTHOG_KEY` is unset**
- `src/lib/flags.ts` — `flag(name, { distinctId, default })` resolves `FLAG_<UPPER_SNAKE>` env override → PostHog → default
- `src/instrumentation.ts` — Next `register()` + `onRequestError` (routed through the pino logger); the documented hook for Sentry/OTel

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
- Tables: `users` plus the Quirk OS registry (`quirk_assets`, `quirk_asset_versions`, `quirk_annotations`, `quirk_tags`, `quirk_diffs`, `quirk_experiments`, `quirk_runs`, `quirk_pipelines`, `quirk_pipeline_steps`, `quirk_pipeline_runs`)

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

## Adding shadcn/ui Components

```bash
bunx shadcn@latest add <component-name>
```

The `components.json` is pre-configured with correct aliases and Tailwind v4 settings (new-york style, neutral base color, CSS variables).

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main`. In-progress runs for the same ref are automatically cancelled.

1. **validate** job: `bun install --frozen-lockfile` → lint → type-check → test → build
2. **e2e** job (needs validate): install → `playwright install --with-deps` → E2E tests

Both jobs use `SKIP_ENV_VALIDATION=1` for the build/E2E steps. Playwright retries failed tests twice in CI (0 retries locally) and uses a single worker in CI.

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
