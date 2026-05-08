# PROJECT.md

> Templates, checklists, and process docs for shipping real projects from this scaffold.

---

## Project Lifecycle

```
Idea → Spec → Build → Ship → Measure → Iterate
```

Each phase has artifacts. Don't skip the artifacts — they compress future decision-making.

---

## PRD Template (Product Requirements Doc)

```markdown
# PRD: [Feature Name]

**Status:** Draft | Review | Approved | Shipped
**Author:** [name]
**Date:** [date]
**Stakeholders:** [list]

---

## Problem Statement
[One paragraph. What hurts, who hurts, how often, how much.]

## Goals
- [ ] Goal 1 (measurable)
- [ ] Goal 2 (measurable)

## Non-Goals (explicit)
- Not solving X in this version
- Not supporting Y use case

## User Stories
- As a [user type], I want [action] so that [outcome]
- As a [user type], I want [action] so that [outcome]

## Acceptance Criteria
### Scenario: [name]
- Given [context]
- When [action]
- Then [outcome]

## Technical Approach
[2-3 paragraphs on the approach. Key decisions. Alternatives considered.]

## Schema Changes
[Any DB schema changes. Migration plan.]

## API Changes
[New or modified API endpoints. Breaking changes.]

## Open Questions
- [ ] Question 1 — owner: [name], due: [date]
- [ ] Question 2 — owner: [name], due: [date]

## Success Metrics
- [Metric]: [baseline] → [target] by [date]
```

---

## ADR Template (Architecture Decision Record)

```markdown
# ADR-[number]: [Short Title]

**Date:** [date]
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-[n]

---

## Context
[What situation forced this decision? What constraints exist?]

## Decision
[What we decided to do. One clear statement.]

## Options Considered

### Option A: [name]
**Pros:** ...
**Cons:** ...

### Option B: [name]
**Pros:** ...
**Cons:** ...

### Option C (Chosen): [name]
**Pros:** ...
**Cons:** ...

## Consequences
**Positive:**
- [outcome]

**Negative / Tradeoffs:**
- [tradeoff we accept]

## References
- [link to relevant docs, RFCs, issues]
```

Store ADRs in `docs/adr/ADR-001-*.md`.

---

## RFC Template (Request for Comments)

```markdown
# RFC: [Title]

**Author:** [name]
**Created:** [date]
**Discussion Deadline:** [date]

---

## Summary
[One paragraph. What are you proposing and why?]

## Motivation
[Why does this need to change? What's broken or missing?]

## Detailed Design

### Overview
[High-level description]

### API Design
[Code examples of new APIs / interfaces]

### Implementation Plan
1. Phase 1: [description]
2. Phase 2: [description]
3. Phase 3: [description]

### Migration Plan
[If breaking: how do existing users migrate?]

## Drawbacks
[What are the downsides of this approach?]

## Alternatives
[What else was considered? Why rejected?]

## Unresolved Questions
[Things to figure out during implementation]
```

---

## New Project Checklist

### Day 0 — Setup
- [ ] Clone scaffold: `git clone <repo> my-project`
- [ ] Copy env: `cp .env.example .env`
- [ ] Install: `bun install`
- [ ] Run: `bun run dev` — verify it boots
- [ ] Run: `bun run validate` — verify green
- [ ] Update `package.json` name, version, description
- [ ] Update `CLAUDE.md` project overview section
- [ ] Update `src/app/layout.tsx` metadata (title, description)
- [ ] Set up `.env` with real values
- [ ] Create GitHub repo + push initial commit
- [ ] Enable branch protection on `main`
- [ ] Set required CI checks

### Day 1 — First Feature
- [ ] Write PRD (even a short one)
- [ ] Create ADR if making architecture choices
- [ ] Update DB schema in `src/lib/db/schema.ts`
- [ ] Run `bun run db:push` to apply schema
- [ ] Write the feature
- [ ] Write unit tests
- [ ] Write at least one E2E test
- [ ] `bun run validate` — green
- [ ] Open PR, get review

### Week 1 — Foundation
- [ ] Auth configured (update `src/lib/auth.ts`)
- [ ] First real DB migrations generated
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Analytics set up
- [ ] Deploy pipeline to staging working
- [ ] Domain configured

---

## Sprint Template

```markdown
# Sprint [N] — [dates]

**Goal:** [One sentence. What does success look like?]

## Committed
| Task | Owner | Status |
|------|-------|--------|
| [task] | [name] | Not Started / In Progress / Done |

## Stretch
| Task | Owner |
|------|-------|
| [task] | [name] |

## Blockers
- [blocker] — owner: [name]

## Notes
[anything else]
```

---

## Retro Template

```markdown
# Retro — Sprint [N]

## What Went Well
- [thing]
- [thing]

## What Didn't Go Well
- [thing]
- [thing]

## Action Items
- [ ] [action] — owner: [name], due: [date]
- [ ] [action] — owner: [name], due: [date]

## Metrics
- Velocity: [points/tickets completed]
- Carryover: [points/tickets not completed]
- Bugs shipped: [n]
- Bugs fixed: [n]
```

---

## Versioning

Follow [Semantic Versioning](https://semver.org):
- `MAJOR.MINOR.PATCH`
- MAJOR: breaking API change
- MINOR: new backwards-compatible feature
- PATCH: backwards-compatible bug fix

Bun script to bump version:
```bash
# patch: 0.1.0 → 0.1.1
bun version patch

# minor: 0.1.1 → 0.2.0
bun version minor

# major: 0.2.0 → 1.0.0
bun version major
```

---

## Release Checklist

- [ ] All tests pass: `bun run validate`
- [ ] CHANGELOG updated
- [ ] Version bumped in `package.json`
- [ ] DB migrations tested on staging
- [ ] Feature flags toggled correctly
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Smoke test on staging
- [ ] Tag release: `git tag v1.2.3 && git push --tags`
- [ ] Deploy to production
- [ ] Smoke test on production
- [ ] Notify stakeholders
