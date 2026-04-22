# CLAUDE.md

## Project Overview

**project-scaffold** is the fully-loaded boilerplate for Quirk Systems projects. It provides a production-ready Next.js 15 scaffold with all tooling, testing, CI/CD, and conventions configured out of the box. Keep additions broadly useful — this is a template, not a product.

## Tech Stack

| Category                  | Tool                               |
| ------------------------- | ---------------------------------- |
| Runtime / Package Manager | Bun (Node >= 20)                   |
| Framework                 | Next.js 15 (App Router, Turbopack) |
| UI Runtime                | React 19                           |
| Language                  | TypeScript 5 (strict mode)         |
| Styling                   | Tailwind CSS v4 (CSS-first config) |
| Components                | shadcn/ui (new-york style, Lucide) |
| Server State              | TanStack Query v5                  |
| Client State              | Zustand                            |
| Forms                     | React Hook Form + Zod              |
| Database                  | Drizzle ORM (SQLite default)       |
| Auth                      | Auth.js v5 (scaffolded, no providers) |
| Env Validation            | `@t3-oss/env-nextjs` + Zod         |
| Unit Testing              | Vitest + React Testing Library     |
| E2E Testing               | Playwright (Chromium/Firefox/WebKit) |
| Linting                   | ESLint 9 (flat config) + Prettier  |
| Git Hooks                 | Lefthook                           |
| Commit Convention         | commitlint (conventional-commits)  |
| CI/CD                     | GitHub Actions                     |

## Directory Structure

```
src/
├── app/                       # Next.js App Router pages and layouts
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts   # Auth.js GET/POST handlers
│   ├── globals.css            # Tailwind v4 theme + CSS variables
│   ├── layout.tsx             # Root layout (Providers, metadata)
│   ├── page.tsx               # Home page
│   ├── loading.tsx            # Root loading state
│   ├── error.tsx              # Root error boundary ("use client")
│   └── not-found.tsx          # 404 page
├── components/
│   ├── ui/                    # shadcn/ui components (e.g. button.tsx)
│   └── providers.tsx          # Client providers (QueryClientProvider)
├── hooks/                     # Custom React hooks (e.g. use-media-query.ts)
├── lib/
│   ├── db/
│   │   ├── index.ts           # Drizzle client (better-sqlite3)
│   │   └── schema.ts          # Table definitions (users table scaffolded)
│   ├── auth.ts                # Auth.js configuration (providers: [])
│   ├── env.ts                 # t3-env + Zod server/client env schema
│   └── utils.ts               # `cn()` helper (clsx + tailwind-merge)
├── types/
│   └── index.ts               # Shared TypeScript types
└── __tests__/
    ├── setup.ts               # Vitest setup (cleanup, jest-dom matchers)
    └── page.test.tsx          # Example home page test

e2e/                           # Playwright specs (e.g. home.spec.ts)
docs/recommendations/          # Reference notes on AI tooling, CI/CD, structure, etc.
.github/workflows/ci.yml       # CI pipeline (validate + e2e)
drizzle/                       # Generated migrations output (created by db:generate)
```

## Commands

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `bun run dev`           | Start dev server with Turbopack              |
| `bun run build`         | Production build                             |
| `bun run start`         | Start production server                      |
| `bun run preview`       | `build` then `start`                         |
| `bun run lint`          | Run ESLint                                   |
| `bun run lint:fix`      | Run ESLint with auto-fix                     |
| `bun run format`        | Format all files with Prettier               |
| `bun run format:check`  | Check formatting                             |
| `bun run type-check`    | TypeScript type checking (`tsc --noEmit`)    |
| `bun run test`          | Run Vitest in watch mode                     |
| `bun run test:ui`       | Vitest interactive UI                        |
| `bun run test:run`      | Run Vitest once                              |
| `bun run test:coverage` | Run tests with v8 coverage                   |
| `bun run test:e2e`      | Run Playwright E2E tests                     |
| `bun run test:e2e:ui`   | Playwright interactive UI                    |
| `bun run db:generate`   | Generate Drizzle migrations                  |
| `bun run db:push`       | Push schema changes to DB                    |
| `bun run db:migrate`    | Run migrations                               |
| `bun run db:studio`     | Open Drizzle Studio                          |
| `bun run validate`      | `lint` → `type-check` → `test:run` → `build` |
| `bun run clean`         | Remove `.next`, `out`, `node_modules`        |
| `bun run prepare`       | Install Lefthook hooks (run by Bun postinstall) |

## Environment Variables

Defined in `src/lib/env.ts` using `@t3-oss/env-nextjs` with Zod validation. `next.config.ts` imports `./src/lib/env` so validation runs during `next build` and `next dev`. Copy `.env.example` to `.env` to get started.

| Variable              | Required | Description                                              |
| --------------------- | -------- | -------------------------------------------------------- |
| `NODE_ENV`            | No       | `development` \| `test` \| `production` (default `development`) |
| `NEXT_PUBLIC_APP_URL` | No       | Public app URL (must be a valid URL if set)              |
| `DATABASE_URL`        | No       | SQLite file path (default: `local.db`)                   |
| `AUTH_SECRET`         | No       | Auth.js secret (generate with `openssl rand -base64 32`) |
| `SKIP_ENV_VALIDATION` | No       | Set to `1` to skip env validation (CI/Docker)            |

Server variables are optional in the scaffold so it boots without a `.env` file. Tighten validation (remove `.optional()`) when configuring for a real project. `emptyStringAsUndefined` is enabled, so empty strings are treated as unset.

## Conventions

### File Naming

- Components: PascalCase for custom components (`MyWidget.tsx`), kebab-case for shadcn-generated components (`button.tsx`)
- Hooks: `use-<name>.ts`
- Utilities: camelCase
- Route files: lowercase (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`)

### Imports

- Use `@/` path alias for all imports from `src/` (configured in `tsconfig.json` and `components.json`)
- Example: `import { cn } from "@/lib/utils"`
- shadcn aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`

### Components

- Server Components by default (no directive needed)
- Add `"use client"` only when using hooks, browser APIs, or event handlers
- Use `cn()` from `@/lib/utils` for conditional class names
- shadcn/ui components live in `src/components/ui/` — never hand-edit them beyond the small changes shadcn expects; re-run the CLI to update

### Styling

- Tailwind CSS v4 with CSS-first configuration — **no `tailwind.config.ts`**
- Theme variables defined in `src/app/globals.css` via `@theme inline`
- OKLCH color space for `:root` (light) and `.dark` (dark mode) variables
- `tw-animate-css` provides the animation utilities
- `prettier-plugin-tailwindcss` enforces class ordering

### Database

- Drizzle ORM with code-first TypeScript schemas
- Schema in `src/lib/db/schema.ts`, client in `src/lib/db/index.ts`
- SQLite via `better-sqlite3` for local development (reads `DATABASE_URL`, defaults to `local.db`)
- Migrations land in `./drizzle` (see `drizzle.config.ts`)
- Switch to PostgreSQL for production by changing the dialect (`drizzle.config.ts`) and driver (`src/lib/db/index.ts`)

### Auth

- Auth.js v5 scaffolded in `src/lib/auth.ts` with an empty `providers` array — add providers before use
- Route handler at `src/app/api/auth/[...nextauth]/route.ts` re-exports `GET`/`POST` from `handlers`
- `AUTH_SECRET` is required at runtime once providers are enabled

### Testing

- Unit tests: `src/**/*.{test,spec}.{ts,tsx}` — Vitest + React Testing Library (jsdom environment)
- Test setup: `src/__tests__/setup.ts` (auto-cleanup, `vi.clearAllMocks()`, jest-dom matchers)
- E2E tests: `e2e/*.spec.ts` — Playwright across Chromium, Firefox, and WebKit
- Playwright `webServer` runs `bun run build && bun run start` against `http://localhost:3000`
- Server Components can't be tested with Vitest — cover them with E2E tests instead

### Formatting

- Prettier: `semi: true`, `singleQuote: false`, `tabWidth: 2`, `trailingComma: "all"`, `printWidth: 80`
- ESLint extends `next/core-web-vitals`, `next/typescript`, and `prettier` (flat config)

### Git

- Conventional commits enforced via commitlint (`@commitlint/config-conventional`)
- Lefthook runs on `pre-commit` (parallel): ESLint on staged files, Prettier `--check` on staged files, `bun run type-check`
- Lefthook runs on `commit-msg`: commitlint
- Branch naming: `feature/`, `fix/`, `chore/`
- Do not bypass hooks with `--no-verify` — fix the underlying issue

## Adding shadcn/ui Components

```bash
bunx shadcn@latest add <component-name>
```

`components.json` is pre-configured with correct aliases, Tailwind v4 settings, `new-york` style, `neutral` base color, and Lucide icons.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push and PR to `main` with `concurrency` cancellation:

1. **validate** job: `bun install --frozen-lockfile` → `lint` → `type-check` → `test:run` → `build` (with `SKIP_ENV_VALIDATION=1`)
2. **e2e** job (needs `validate`): installs Playwright browsers via `bunx playwright install --with-deps`, then `bun run test:e2e`

## Guidelines for AI Assistants

- Run `bun run validate` after making changes to verify nothing is broken
- Follow existing patterns — don't introduce new libraries without good reason
- Keep the scaffold nature — additions should be broadly useful, not project-specific
- Use `@/` path aliases for imports
- Add `"use client"` only when necessary
- Never commit `.env` files or secrets
- Write tests for new components and utilities
- Use conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`, …)
- Prefer editing existing files over creating new ones; do not create docs unless asked
