# Quirk OS

**The public monorepo for Quirk Systems** — an asset registry and mutation
engine where unstructured material (prose, photography, graphic design,
audio, prompts, datasets) is captured, annotated, semantically versioned,
mutated, and promoted through data-supported curation.

Built on a production Next.js 16 scaffold: everything here is real, wired,
and validated in CI.

## What lives here

### Proposed: Quirk Conversation Compiler

`Quirk Wrap` specifies how consequential conversation deltas become typed,
source-backed, evaluated repository changes. The proposed runner binds output
to host-owned source hashes, exact canon grants, pinned repository state,
scoped mutation authority, and executor receipts; it preserves corrections and
contradictions and returns an honest no-op when no durable artifact is
justified. See the
[capability pack](docs/capabilities/conversation-compiler/README.md).

### The Quirk Data Engine

A registry for unstructured assets with pgvector embeddings and full
lifecycle tracking:

```
capture → annotate → mutate → diff → experiment → promote → publish
```

| Piece                     | What it does                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `quirk_assets` + versions | Canonical rows for text/image/audio/video/pdf/prompt/song/dataset assets, embedded (pgvector 1536) and semantically versioned |
| Annotations & tags        | `persona_fit`, `spawn_path`, `risk`, `quality`, `theme` — the research signal that drives curation                            |
| Quirk Diff                | Semantic version control: additions/removals/meaning-shift between versions, not line diffs                                   |
| Experiments & runs        | Track persona/mask/prompt/model variations; promote winners                                                                   |
| Pipelines                 | Multi-step asset processing with run tracking                                                                                 |
| Media storage             | Binary assets (photography, design work) in private object storage, served via signed URLs                                    |
| Offers                    | One-of-one claimable drops minted from curated assets — persona-voiced, atomically claimed by exactly one person              |

### The agent crew (`src/lib/quirk/agents/`)

Named agents own lifecycle stages: **Archivist Goblin** (ingest/normalize),
**Curator** (annotation), **Diff Witch** (semantic diffing), **Foreman**
(pipelines), **Lab Rat King** (experiments).

### The voice layer (`src/lib/ai/`)

A persona/register composition layer over the Claude API: a frozen,
prompt-cacheable house persona modulated by tonal registers (deadpan, warm,
hype, mock_panic, swoon), each with an animation vocabulary the UI keys
motion off. Personality as configuration, not copy-paste.

### Production integrations

Stripe billing (checkout, order-safe webhooks, billing portal), Resend +
react-email, PostHog analytics/flags, structured pino logging, Auth.js —
all lazy-initialized so the repo builds and validates with zero secrets.

## Getting started

```bash
bun install
cp .env.example .env   # everything optional; features no-op until configured
bun run dev            # http://localhost:3000 — /quirk is the registry UI
```

Media capture (requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`):

```bash
curl -F "file=@photo.jpg" -F "title=Golden hour test" \
  http://localhost:3000/api/assets/upload
```

## Commands

| Command                          | Description                                        |
| -------------------------------- | -------------------------------------------------- |
| `bun run dev`                    | Dev server (runs migrations first)                 |
| `bun run validate`               | lint + type-check + tests + build — the merge gate |
| `bun run db:migrate` / `db:seed` | Schema + Quirk OS seed data                        |
| `bun run test:e2e`               | Playwright suite                                   |
| `bun run email:dev`              | Preview react-email templates                      |

## Repository structure

Single-app today, workspace-shaped on purpose — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layout, the module
boundaries that graduate to packages, and the asset lifecycle in depth.
[CLAUDE.md](CLAUDE.md) is the source of truth for conventions and is kept
current by the agents that work this repo.

## Contributing & security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

[Apache 2.0](LICENSE)
