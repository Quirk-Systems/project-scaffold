# Contributing to Project Scaffold

## The short version

1. Branch from `main` (`feature/`, `fix/`, or `chore/` prefix).
2. Make your change following the conventions in [CLAUDE.md](CLAUDE.md) —
   it is the source of truth for structure, naming, and patterns.
3. Run `bun run validate` (lint + type-check + tests + build). It must be
   green; it's also the CI merge gate.
4. Commit with [conventional commits](https://www.conventionalcommits.org)
   (enforced by commitlint via Lefthook).
5. Open a PR against `main`. Automated review runs on every push — treat
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

## Working with the asset engine

The lifecycle is `capture → annotate → mutate → diff → experiment →
promote → publish`. Each stage has an owning agent module under
`src/lib/quirk/agents/` — extend the owning agent rather than scattering
stage logic across routes.

## Questions

Open a GitHub issue. Security reports go through [SECURITY.md](SECURITY.md),
not public issues.
