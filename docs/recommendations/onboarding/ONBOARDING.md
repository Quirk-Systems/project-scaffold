# Onboarding

> The first week shapes everything.
> Onboarding is product design. Your user is the new team member.
> The best onboarding makes them ship before they feel like an impostor.

---

## Day 1 Checklist

```markdown
## Access
- [ ] GitHub org + relevant teams
- [ ] 1Password / Doppler / secrets manager
- [ ] Slack — relevant channels
- [ ] Linear / Jira — access + workflow walkthrough
- [ ] Cloud console (read-only first)
- [ ] Sentry, PostHog, Grafana
- [ ] Figma (viewer)
- [ ] PagerDuty (with mentor coverage first 2 weeks)

## Local Environment
- [ ] Clone repos
- [ ] `./scripts/setup.sh` completes without errors
- [ ] `npm run dev` starts the app
- [ ] Login works locally
- [ ] Tests pass: `npm test`
- [ ] Lint passes: `npm run lint`
- [ ] .env.local populated (from 1Password, not manual copy)

## Context
- [ ] Architecture walkthrough (1 hour, with senior eng)
- [ ] Codebase tour — key files, patterns, where things live
- [ ] Read CLAUDE.md
- [ ] Understand local vs staging vs production
- [ ] PR process walkthrough
- [ ] First task assigned — small and real
```

---

## Architecture Tour Guide (60 min)

```markdown
### The Big Picture (10 min)
- What does the product do? (non-technical, user-facing)
- Major systems diagram
- Most important user journeys

### Repo Structure (10 min)
- Walk top-level directories
- CLAUDE.md as orientation file
- What lives where and why

### Request End-to-End (20 min)
Pick one important API endpoint, trace it fully:
- Entry point (route file)
- Middleware (auth, validation, logging)
- Business logic (service layer)
- Database access (Prisma / SQL)
- Response shape and why

### Data Model (10 min)
- Schema walkthrough (prisma.schema)
- Key entities and relationships
- The tricky parts (soft deletes, multi-tenancy, etc.)

### Infrastructure (10 min)
- Where it runs
- External dependencies (Stripe, email, etc.)
- Deploy process
- Where logs and errors surface
```

---

## The First Task

```
Must be:
✓ Real work (not a "make the button blue" exercise)
✓ Shippable in < 3 days
✓ Touches a meaningful slice of the stack
✓ Has a clear acceptance criterion
✓ Has a mentor assigned for questions

Goal: build confidence through the full workflow:
  write → PR → review → merge → production
Not: produce output. The journey is the output.
```

---

## Reading List — First 2 Weeks

```
Days 1-2:
  README.md, CLAUDE.md, this ONBOARDING.md

Days 3-5:
  conventions/CONVENTIONS.md
  security/SECURITY.md
  Last 3 postmortems (understand what's broken us)

Week 2:
  api/API_DESIGN.md
  database/DATABASE.md
  testing/TESTING.md
  Last 3 PRDs or spec docs

For product context:
  5 real user sessions (PostHog/FullStory recordings)
  What metrics does leadership track?
  Who are the top 5 customers and what do they care about?
```

---

## Buddy Program

```markdown
## First Week Schedule
| Day | Session | With |
|-----|---------|------|
| 1   | Setup (2h) + Architecture (1h) | Buddy + Tech Lead |
| 2   | Codebase tour (1h) + first task walkthrough | Buddy + PM |
| 3   | First PR review (async) | Buddy |
| 4   | Pair on first task (1h) | Senior dev |
| 5   | Retro: what was confusing? (30min) | Buddy |

## Buddy Responsibilities
→ < 2h Slack response time during first week
→ Check-ins morning + end of day, days 1-3
→ First reviewer on first 3 PRs
→ Weekly 1:1 for 4 weeks
→ No question is too basic — that's the point
```

---

## 30/60/90 Day Goals

```
30 Days — Learning
  → 3+ small features or fixes shipped
  → No environment blockers
  → Understands core user journey
  → Reviewed 5+ PRs as reviewer

60 Days — Contributing
  → 1+ meaningful feature end-to-end
  → Can debug and fix independently
  → Participating in architecture discussions
  → Written at least 1 technical doc

90 Days — Ownership
  → Owns a feature from spec to production
  → Pushes back on decisions with reasoning
  → Shipped 1+ improvement unprompted
  → Contributing to onboarding docs (fresh eyes are valuable)
```

---

## Offboarding Checklist

```markdown
## Knowledge Transfer
- [ ] Document systems they owned (30min Loom per complex system)
- [ ] Update runbooks for services they maintained
- [ ] Transfer open PRs + in-progress work

## Access Revocation
- [ ] GitHub org removed
- [ ] Secrets manager removed
- [ ] Cloud console IAM revoked
- [ ] Slack + comms removed
- [ ] Linear / Jira removed
- [ ] Rotate any service accounts they had sole access to
```
