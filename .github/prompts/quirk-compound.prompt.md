---
name: quirk-compound
description: Turn repository work into reusable Quirk capability
agent: plan
---

Inspect the completed feature, fix, or workflow and determine what should compound.

Look for:

- reusable domain logic
- stable interfaces
- repeatable operating procedures
- prompts or agent skills
- fixtures and evaluation cases
- templates or generators
- observability patterns
- newly proven architectural rules
- documentation worth preserving
- productizable capabilities

Classify each candidate:

- **LOCAL** — should remain repository-specific.
- **SHARED** — belongs in a Quirk package, template, or convention.
- **SKILL** — should become an agent-loadable workflow.
- **CANON** — should become a Quirk Core rule or schema.
- **OFFER** — could become a customer-facing capability.

Recommend only extractions whose future reuse exceeds their maintenance cost.

Return the single highest-value extraction, its evidence, destination, interface, and smallest implementation plan.
