# CLAUDE.md

## Project Overview

**project-scaffold** is the fully-loaded boilerplate for Quirk Systems projects. It provides a production-ready Next.js 15 scaffold with all tooling, testing, CI/CD, and conventions configured out of the box.

## Tech Stack

| Category                  | Tool                               |
| ------------------------- | ---------------------------------- |
| Runtime / Package Manager | Bun                                |
| Framework                 | Next.js 15 (App Router, Turbopack) |
| Language                  | TypeScript (strict mode)           |
| Styling                   | Tailwind CSS v4 (CSS-first config) |
| Components                | shadcn/ui (new-york style)         |
| Server State              | TanStack Query v5                  |
| Client State              | Zustand                            |
| Forms                     | React Hook Form + Zod              |
| Database                  | Drizzle ORM (SQLite default)       |
| Auth                      | Auth.js v5 (scaffolded)            |
| Unit Testing              | Vitest + React Testing Library     |
| E2E Testing               | Playwright (Chromium, Firefox, WebKit) |
| Linting                   | ESLint 9 (flat config) + Prettier  |
| Git Hooks                 | Lefthook                           |
| CI/CD                     | GitHub Actions                     |

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
│   │   ├── ui/                 # shadcn/ui components (button.tsx, etc.)
│   │   └── providers.tsx       # Client providers (QueryClient)
│   ├── hooks/
│   │   └── use-media-query.ts  # Media query hook (returns boolean)
│   ├── lib/
│   │   ├── db/                 # Drizzle ORM setup and schema
│   │   │   ├── index.ts        # Database client (better-sqlite3)
│   │   │   └── schema.ts       # Table definitions (users table)
│   │   ├── auth.ts             # Auth.js configuration
│   │   ├── env.ts              # Environment variable validation (t3-env)
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

| Command                   | Description                              |
| ------------------------- | ---------------------------------------- |
| `bun run dev`             | Start dev server with Turbopack          |
| `bun run build`           | Production build                         |
| `bun run start`           | Start production server                  |
| `bun run preview`         | Build then start (production preview)    |
| `bun run lint`            | Run ESLint                               |
| `bun run lint:fix`        | Run ESLint with auto-fix                 |
| `bun run format`          | Format all files with Prettier           |
| `bun run format:check`    | Check formatting                         |
| `bun run type-check`      | TypeScript type checking                 |
| `bun run test`            | Run Vitest in watch mode                 |
| `bun run test:ui`         | Run Vitest with browser UI               |
| `bun run test:run`        | Run Vitest once                          |
| `bun run test:coverage`   | Run tests with v8 coverage               |
| `bun run test:e2e`        | Run Playwright E2E tests                 |
| `bun run test:e2e:ui`     | Run Playwright with browser UI           |
| `bun run db:generate`     | Generate Drizzle migrations              |
| `bun run db:push`         | Push schema changes to DB                |
| `bun run db:studio`       | Open Drizzle Studio                      |
| `bun run db:migrate`      | Run migrations                           |
| `bun run validate`        | Run lint + type-check + test + build     |
| `bun run clean`           | Remove .next, out, node_modules          |

## Environment Variables

Defined in `src/lib/env.ts` using t3-env with Zod validation. Copy `.env.example` to `.env` to get started.

| Variable              | Required | Description                                              |
| --------------------- | -------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | No       | Public app URL                                           |
| `DATABASE_URL`        | No       | SQLite file path (default: `local.db`)                   |
| `AUTH_SECRET`         | No       | Auth.js secret (generate with `openssl rand -base64 32`) |
| `SKIP_ENV_VALIDATION` | No       | Set to `1` to skip env validation (CI/Docker)            |

Server variables are optional in the scaffold so it boots without a `.env` file. Tighten validation when configuring for a real project.

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
- Default table: `users` (id UUID, email unique, name optional, timestamps)
- SQLite via `better-sqlite3` for local development
- Switch to PostgreSQL for production by changing the dialect and driver in `drizzle.config.ts` and `src/lib/db/index.ts`

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
