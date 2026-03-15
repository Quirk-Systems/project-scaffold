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
| E2E Testing               | Playwright                         |
| Linting                   | ESLint 9 (flat config) + Prettier  |
| Git Hooks                 | Lefthook                           |
| CI/CD                     | GitHub Actions                     |

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── api/                # API routes
│   │   └── auth/           # Auth.js route handlers
│   ├── layout.tsx          # Root layout (providers, fonts, metadata)
│   ├── page.tsx            # Home page
│   ├── loading.tsx         # Root loading state
│   ├── error.tsx           # Root error boundary
│   └── not-found.tsx       # 404 page
├── components/
│   ├── ui/                 # shadcn/ui components (Button, etc.)
│   └── providers.tsx       # Client providers (QueryClient)
├── hooks/                  # Custom React hooks
├── lib/
│   ├── db/                 # Drizzle ORM setup and schema
│   │   ├── index.ts        # Database client
│   │   └── schema.ts       # Table definitions
│   ├── auth.ts             # Auth.js configuration
│   ├── env.ts              # Environment variable validation (t3-env)
│   └── utils.ts            # Utility functions (cn helper)
└── types/                  # Shared TypeScript types
```

## Commands

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `bun run dev`           | Start dev server with Turbopack      |
| `bun run build`         | Production build                     |
| `bun run start`         | Start production server              |
| `bun run lint`          | Run ESLint                           |
| `bun run lint:fix`      | Run ESLint with auto-fix             |
| `bun run format`        | Format all files with Prettier       |
| `bun run format:check`  | Check formatting                     |
| `bun run type-check`    | TypeScript type checking             |
| `bun run test`          | Run Vitest in watch mode             |
| `bun run test:run`      | Run Vitest once                      |
| `bun run test:coverage` | Run tests with coverage              |
| `bun run test:e2e`      | Run Playwright E2E tests             |
| `bun run db:generate`   | Generate Drizzle migrations          |
| `bun run db:push`       | Push schema changes to DB            |
| `bun run db:studio`     | Open Drizzle Studio                  |
| `bun run db:migrate`    | Run migrations                       |
| `bun run validate`      | Run lint + type-check + test + build |
| `bun run clean`         | Remove .next, out, node_modules      |

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
- OKLCH color space for theme colors (light/dark mode)

### Database

- Drizzle ORM with code-first TypeScript schemas
- Schema defined in `src/lib/db/schema.ts`
- SQLite via `better-sqlite3` for local development
- Switch to PostgreSQL for production by changing the dialect and driver

### Testing

- Unit tests: `src/**/*.test.tsx` — use Vitest + React Testing Library
- E2E tests: `e2e/*.spec.ts` — use Playwright
- Test setup in `src/__tests__/setup.ts` (auto-cleanup, jest-dom matchers)
- Server Components cannot be tested with Vitest — use E2E tests for those

### Git

- Conventional commits enforced via commitlint
- Pre-commit hooks run lint, format check, and type-check (via Lefthook)
- Branch naming: `feature/`, `fix/`, `chore/`

## Adding shadcn/ui Components

```bash
bunx shadcn@latest add <component-name>
```

The `components.json` is pre-configured with correct aliases and Tailwind v4 settings.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main`:

1. **validate** job: lint → type-check → test → build
2. **e2e** job: Playwright tests (runs after validate passes)

## Guidelines for AI Assistants

- Run `bun run validate` after making changes to verify nothing is broken
- Follow existing patterns — don't introduce new libraries without good reason
- Keep the scaffold nature — additions should be broadly useful, not project-specific
- Use `@/` path aliases for imports
- Add `"use client"` only when necessary
- Never commit `.env` files or secrets
- Write tests for new components and utilities
- Use conventional commit messages
