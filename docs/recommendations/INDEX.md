# Recommendations Index

> Dense drops of useful shit. Jump in anywhere.

---

## Contents

### Engineering & Architecture

| File | What's Inside |
|------|---------------|
| [PLANNING.md](planning/PLANNING.md) | PRDs, ADRs, RFCs, spike docs, meeting templates |
| [FOLDER_STRUCTURES.md](structure/FOLDER_STRUCTURES.md) | Opinionated folder layouts: Next.js, FastAPI, Go, CLI, Monorepo |
| [DATA_STRUCTURES.md](code/DATA_STRUCTURES.md) | TypeScript: Trie, Bloom Filter, LRU, Skip List, LSM Tree, Consistent Hashing |
| [CICD.md](pipelines/CICD.md) | GitHub Actions workflows, Dockerfile, Docker Compose, Makefile |
| [APPS.md](apps/APPS.md) | SaaS patterns, rate limiting, webhooks, background jobs, starter stacks |

### Security & Quality

| File | What's Inside |
|------|---------------|
| [SECURITY.md](security/SECURITY.md) | Argon2id, JWT, RBAC/ABAC/RLS, OWASP Top 10 with code, Zod validation |
| [TESTING.md](testing/TESTING.md) | Vitest, MSW, factory pattern, integration tests, Playwright E2E |
| [CONVENTIONS.md](conventions/CONVENTIONS.md) | Conventional Commits, branch naming, PR template, TypeScript standards, DoD |

### Data & Performance

| File | What's Inside |
|------|---------------|
| [DATABASE.md](database/DATABASE.md) | Postgres patterns, indexes, CTEs, safe migrations, connection pooling, N+1 |
| [PERFORMANCE.md](performance/PERFORMANCE.md) | Core Web Vitals, Next.js optimization, caching hierarchy, profiling |
| [REGEX.md](regex/REGEX.md) | Full syntax reference, validation patterns, extraction patterns, ReDoS |

### Infrastructure & Ops

| File | What's Inside |
|------|---------------|
| [API_DESIGN.md](api/API_DESIGN.md) | REST naming, error shapes, cursor pagination, idempotency, rate limit headers |
| [MONITORING.md](monitoring/MONITORING.md) | Pino logging, OpenTelemetry, Sentry, health check endpoints, alerting |
| [PROTOCOLS.md](protocols/PROTOCOLS.md) | SSE, WebSockets, WebRTC, MQTT, long polling, Redis pub/sub |
| [INCIDENT.md](incident/INCIDENT.md) | SEV levels, 7-step runbook, communication templates, blameless postmortem |

### AI & LLM

| File | What's Inside |
|------|---------------|
| [CLAUDE_SKILLS.md](ai/CLAUDE_SKILLS.md) | CLAUDE.md patterns, slash commands, API streaming, agent loop |
| [OPENAI_SKILLS.md](ai/OPENAI_SKILLS.md) | Function calling, Zod structured outputs, fine-tuning, embeddings |
| [LLMOPS.md](llmops/LLMOPS.md) | Prompt versioning, RAG + pgvector, evals in CI, injection defense, cost optimization |

### Business & Operations

| File | What's Inside |
|------|---------------|
| [MONEY.md](money/MONEY.md) | SaaS metrics, Stripe integration, webhooks, metered billing, dunning, pricing psychology |
| [ONBOARDING.md](onboarding/ONBOARDING.md) | Day 1 checklist, architecture tour, 30/60/90 goals, buddy program, offboarding |

### Tools & Workflow

| File | What's Inside |
|------|---------------|
| [OBSIDIAN.md](obsidian/OBSIDIAN.md) | PARA vault, plugins, Dataview queries, Templater, canvas |
| [TERMINAL.md](terminal/TERMINAL.md) | Zsh config, Starship, aliases, FZF functions, dotfiles strategy |
| [WILD.md](wild/WILD.md) | CS papers, talks, SQL/Git/regex cheatsheets, rabbit holes |

---

## Quick Philosophy

- Flat > nested when possible
- Every doc answers: **what, why, how**
- Templates are starting points, not cages
- If it took you > 30min to figure out, write it down
