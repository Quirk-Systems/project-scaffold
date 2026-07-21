---
name: quirk-architecture
description: Create an evidence-backed architecture decision
agent: plan
argument-hint: problem or proposed architectural change
---

Analyze the architectural decision using this repository as the primary evidence.

Define:

- decision to be made
- forces and constraints
- current architecture
- desired properties
- non-goals
- viable options
- operational and migration consequences
- reversibility
- unresolved unknowns

Score each option from 1–5 for:

- correctness
- simplicity
- operational burden
- security
- observability
- migration risk
- future compatibility
- solo-operator maintainability

Recommend one option. Explain why it wins, what it sacrifices, and what evidence could overturn the decision.

Produce a proposed ADR, but make no code changes.
