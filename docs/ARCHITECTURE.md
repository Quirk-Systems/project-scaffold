# Project Scaffold Reference Architecture

The bundled reference application's layout, the module boundaries that matter,
and the asset lifecycle used to exercise the scaffold.

## Shape: single app, workspace-shaped on purpose

The scaffold's bundled reference application is one Next.js 16 application
today. It demonstrates Quirk-domain capabilities; it is not Quirk OS and does
not own Quirk OS canon or kernel authority. Each `src/lib/` module has a clean
boundary so the graduation path to bun workspaces is mechanical, not a rewrite:

```
Today (single app)                Target (when a second app exists)
─────────────────────             ─────────────────────────────────
src/lib/db/          ──────────▶  packages/db          (schema + client)
src/lib/quirk/       ──────────▶  packages/quirk       (data engine + agents)
src/lib/ai/          ──────────▶  packages/voice       (persona/register layer)
src/lib/billing/     ──────────▶  packages/billing
src/lib/email/       ──────────▶  packages/email
src/lib/lazy-client.ts ────────▶  packages/lazy-client (shared factory)
src/app/             ──────────▶  apps/web
```

**Graduation trigger:** a second consumer. Until a CLI, worker, or second
app imports a module, extracting it is ceremony. The boundary rules below
are what keep graduation cheap.

## Boundary rules

1. **Domain logic lives in `src/lib/quirk/`; route handlers stay thin.**
   Routes parse/validate (zod via `quirk/http.ts`), call one domain
   function, and shape the response. No business logic in `src/app/api/`.
2. **Third-party clients go through `createLazyClient`** — lazy, memoized,
   aggregated config errors. The repo must build and `bun run validate`
   green with zero secrets; features no-op or fail loudly at first use.
3. **Agents own lifecycle stages.** Stage logic goes in the owning agent
   module (`src/lib/quirk/agents/`), never scattered across routes.
4. **Schema changes ship with committed migrations** (`drizzle/`).

## The asset lifecycle

```
                ┌──────────────────────────────────────────────────┐
                │                  quirk_assets                    │
                │   (embedded pgvector, typed, statused, versioned)│
                └──────────────────────────────────────────────────┘
capture ──▶ annotate ──▶ mutate ──▶ diff ──▶ experiment ──▶ promote ──▶ publish
   │            │           │         │           │             │
Archivist    Curator     (AI +     Diff       Lab Rat       Foreman
 Goblin                 Curator)   Witch        King       (pipelines)
```

- **Capture** (`quirk/assets.ts`): Archivist Goblin normalizes messy input
  (title, type detection, metadata), embeds text (pgvector 1536), writes
  version 1. Text enters via `POST /api/assets/capture`; binary media via
  `POST /api/assets/upload`.
- **Annotate** (`quirk/annotations.ts`): typed signal — `persona_fit`,
  `spawn_path`, `risk`, `quality`, `theme` — with confidence scores. This is
  the research data that drives curation decisions.
- **Mutate** (`/api/assets/[id]/mutate`): prose manipulation and asset
  transformation produce new versions, never overwrite.
- **Diff** (`quirk/diffs.ts`): Diff Witch computes semantic diffs between
  versions — additions/removals/meaning-shift/score-delta, not line noise.
- **Experiment** (`quirk/experiments.ts`): Lab Rat King tracks
  persona/mask/prompt/model runs against assets; winners get promoted via
  `/api/runs/[id]/promote`.
- **Pipelines** (`quirk/pipelines.ts`): Foreman chains stages into
  repeatable multi-step runs.

Asset status walks `captured → annotated → mutated → approved → published`
(or `rejected`). Status, not storage ACLs, is the publication gate.

## Media storage topology

Binary/visual assets (photography, graphic design, video, audio) follow a
split-brain design:

```
bytes    → Supabase Storage, private `quirk-assets` bucket
           (media/<uuid>/<filename>, auto-created on first upload)
truth    → quirk_assets row (storage_path, content_type, size_bytes,
           embedding of any associated text, annotations, versions)
serving  → GET /api/assets/[id]/media → 302 to a 1-hour signed URL
```

The bucket is **private by design**: whether media is visible is a curation
decision (asset status) enforced in the app layer, not a bucket ACL. Signed
URLs make curated media renderable anywhere an `<img src>` points without
ever exposing the bucket.

## The voice layer

`src/lib/ai/` composes a frozen, prompt-cacheable house persona with
per-moment tonal registers (each carrying an animation vocabulary for the
UI). It is deliberately independent of the data engine — personas consume
annotation signal (`persona_fit`) but the layers couple only through data,
never imports. See CLAUDE.md → "AI (Claude persona/register layer)".

## Data & personalization flow

Annotations and experiment runs are the research substrate: persona-fit
scores and run outcomes accumulate per asset, and downstream surfaces
(personalized content, player-style stats, curated galleries) rank against
that signal plus pgvector similarity (`/api/assets` unified search). The
schema is built for this read pattern — status index, annotation index,
keyed experiment runs — so personalization features are queries, not
migrations.

## Operational spine

- `bun run validate` = lint + type-check + tests + build; CI runs it plus
  `bun audit --prod` (security gate) and Playwright e2e with provisioned
  Postgres.
- `bun.lock` is committed; installs are `--frozen-lockfile`.
- Conventions and the full module map live in [CLAUDE.md](../CLAUDE.md) —
  kept current by the agents that work this repo.
