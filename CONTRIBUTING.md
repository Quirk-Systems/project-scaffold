# Contributing to Quirk OS

## The short version

1. Use Node 22.12+ (`nvm use`) and Bun 1.3.14+ (`packageManager` is pinned in
   `package.json`).
2. Branch from `main` (`feature/`, `fix/`, or `chore/` prefix).
3. Make your change following the conventions in [CLAUDE.md](CLAUDE.md) —
   it is the source of truth for structure, naming, and patterns.
4. Run `bun run validate` (lint + type-check + coverage + build). It must be
   green; it's also the CI merge gate.
5. Commit with [conventional commits](https://www.conventionalcommits.org)
   (enforced by commitlint via Lefthook).
6. Open a PR against `main`. Automated review runs on every push — treat
   its findings as real until verified otherwise; fix what's confirmed.

## Ground rules

- **Keep the scaffold nature.** Additions should be broadly useful across
  Quirk projects, not one-off product features.
- **Follow existing patterns before inventing new ones.** Third-party
  clients go through `createLazyClient` (lazy, memoized, aggregated config
  errors). New env vars are `.optional()` so the repo builds with zero
  secrets. Domain logic lives in `src/lib/quirk/`; route handlers stay thin.
- **Never commit secrets.** `.env` is gitignored; `.env.example` documents
  every variable.
- **Write tests** for new lib code (`src/**/*.test.ts`) and E2E specs for
  user-facing flows (`e2e/*.spec.ts`).
- **Migrations are committed.** Schema changes require `bun run db:generate`
  and the resulting `drizzle/` files in the same PR (prettier-format the
  generated JSON).
- **Dependency state is atomic.** Commit `package.json` and `bun.lock`
  together. Runtime-floor or peer-contract changes must also update CI,
  version pins, and documentation in the same PR.
- **Framework majors are migrations.** Vitest, Testing Library, and other
  peer-coupled majors require upstream migration notes plus a green coverage
  run; they are intentionally excluded from routine Dependabot major bumps.

## Working with the asset engine

The lifecycle is `capture → annotate → mutate → diff → experiment →
promote → publish`. Each stage has an owning agent module under
`src/lib/quirk/agents/` — extend the owning agent rather than scattering
stage logic across routes.

## Questions

Open a GitHub issue. Security reports go through [SECURITY.md](SECURITY.md),
not public issues.
