---
name: quirk-build
description: Implement a scoped feature with proof
agent: agent
argument-hint: feature, issue, or desired outcome
---

Implement the requested outcome in the smallest coherent change.

Before editing:

1. Inspect relevant repository instructions and nearby patterns.
2. State the intended behavior and acceptance criteria.
3. Identify affected contracts, schemas, APIs, tests, and documentation.
4. Flag ambiguities that would materially alter the implementation.

During implementation:

- Preserve existing architecture unless evidence justifies changing it.
- Reuse established patterns before introducing abstractions.
- Keep domain logic separate from transport and presentation.
- Validate external input at boundaries.
- Add or update proportionate tests.
- Do not silently expand scope.

After implementation:

- Run the relevant checks.
- Report files changed, behavior added, evidence obtained, residual risks, and checks not run.
- Do not claim success without verification.
