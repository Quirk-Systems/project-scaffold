# Planning Docs

---

## PRD — Product Requirements Document

```markdown
# [Feature Name] PRD

## Problem
One paragraph. What breaks, who hurts, why now.

## Goal
What does success look like? Measurable if possible.

## Non-Goals
Explicitly what this does NOT do.

## Users
Who uses this. Personas if you have them.

## Requirements
### Must Have
- [ ] ...
### Should Have
- [ ] ...
### Won't Have (this version)
- [ ] ...

## Design
Link to Figma / ASCII mockup inline.

## Open Questions
- [ ] Question → Owner → Due date

## Timeline
| Milestone | Date |
|-----------|------|
| RFC done  | ...  |
| Build     | ...  |
| Ship      | ...  |
```

---

## ADR — Architecture Decision Record

```markdown
# ADR-001: [Decision Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Context
What forced this decision? What constraints exist?

## Decision
What we chose and exactly why.

## Consequences
### Positive
- ...
### Negative
- ...
### Neutral
- ...

## Alternatives Considered
| Option | Why Rejected |
|--------|-------------|
| ...    | ...         |
```

---

## RFC — Request for Comments

```markdown
# RFC: [Title]

**Author:** @handle
**Created:** YYYY-MM-DD
**Discussion deadline:** YYYY-MM-DD

## Summary
TL;DR in 2-3 sentences.

## Motivation
Why does this need to exist?

## Detailed Design
The actual proposal. Code, diagrams, examples.

## Drawbacks
Honest assessment of what sucks about this.

## Alternatives
What else was considered.

## Unresolved Questions
What's still TBD before this can be accepted.
```

---

## Spike / Research Doc

```markdown
# Spike: [Question We're Answering]

**Time-boxed to:** X hours/days
**Owner:** @handle

## Question
Exactly what we need to know.

## Approach
How we investigated.

## Findings
What we learned.

## Recommendation
What to do next. Concrete next step.

## Artifacts
Links to POC code, benchmarks, notes.
```

---

## Meeting Notes Template

```markdown
# [Meeting Name] — YYYY-MM-DD

**Attendees:** @a, @b, @c
**Facilitator:** @x
**Notes by:** @y

## Agenda
1. ...
2. ...

## Decisions Made
- ...

## Action Items
| Item | Owner | Due |
|------|-------|-----|
| ...  | @x    | ... |

## Next Meeting
Date / agenda items to carry forward
```

---

## Project Kickoff Checklist

```markdown
## Kickoff Checklist

### Clarity
- [ ] Problem defined and agreed on
- [ ] Success metrics defined
- [ ] Scope locked (what's in, what's out)
- [ ] PRD written and reviewed

### Team
- [ ] DRI (Directly Responsible Individual) assigned
- [ ] Stakeholders identified and notified
- [ ] Communication channel created

### Tech
- [ ] Tech approach agreed (ADR written if significant)
- [ ] Repo created, branch strategy defined
- [ ] CI/CD pipeline bootstrapped
- [ ] Environments defined (dev/staging/prod)

### Process
- [ ] Tracking board set up (Linear / GitHub Projects)
- [ ] Definition of Done agreed
- [ ] Review process defined
```

---

## Resources

- [Shape Up (Basecamp)](https://basecamp.com/shapeup) — appetite-based planning
- [RFC process (Rust)](https://github.com/rust-lang/rfcs) — gold standard RFC workflow
- [ADRs (Michael Nygard)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) — original ADR post
- [Linear](https://linear.app) — best project tracker
- [Notion](https://notion.so) / [Obsidian](https://obsidian.md) for doc storage
