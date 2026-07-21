---
name: quirk-core-contract
description: Design or inspect a Quirk Core contract
agent: plan
---

Model this feature across the three Quirk Core layers:

1. **Canonical** — Git-backed definitions, identity, rules, and schemas.
2. **Runtime** — enforcement, permissions, validation, and execution.
3. **Projection** — query-optimized database representations.

Specify:

- authoritative source for every field
- legal writers
- validation location
- version and compatibility rules
- write serialization
- partial-write behavior
- projection delay and reconciliation
- audit events
- override permissions
- failure recovery
- tests proving cross-layer consistency

Reject designs that permit multiple undeclared sources of truth.

Return:

1. Contract table.
2. State transitions.
3. Failure matrix.
4. Minimal schema and API changes.
5. Open decisions requiring Bryan's authority.
