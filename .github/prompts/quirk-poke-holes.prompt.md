---
name: quirk-poke-holes
description: Adversarially test a feature, plan, or architecture
agent: plan
---

Assume the proposed design is attractive, plausible, and incomplete.

Try to break it through:

- invalid assumptions
- conflicting sources of truth
- stale or reordered events
- authorization boundary mistakes
- malformed or adversarial input
- partial writes and retry storms
- concurrency and duplicate execution
- schema evolution
- dependency or provider failure
- observability gaps
- operator confusion
- unjustified abstractions

Return a risk register:

| Risk | Trigger | Consequence | Existing defense | Missing defense | Test |
| --- | --- | --- | --- | --- | --- |

Then identify:

1. The fatal flaw, if one exists.
2. The cheapest uncertainty-reducing experiment.
3. What should be simplified.
4. What must be decided before implementation.
5. **GO**, **REVISE**, or **STOP** guidance.

Do not modify code.
