# Quirk Systems Engineering Instructions

Use repository evidence before assumptions.

## Architecture

Preserve three layers:

1. **Canonical** — Git-backed definitions, rules, schemas, decisions, and ontology.
2. **Runtime** — validation, permission, execution, recovery, and observability.
3. **Projection** — query-optimized databases, indexes, pages, and dashboards.

Never create multiple undeclared sources of truth.

## Change discipline

- Implement the smallest coherent vertical outcome.
- Keep domain logic separate from transport, persistence, and presentation.
- Validate input at system boundaries.
- Model retries, idempotency, partial writes, and cancellation.
- Add tests for public behavior and regression cases for repaired failures.
- Do not grant agents authority merely because a tool is available.
- Keep prompts, schemas, registries, templates, and rulesets versioned.
- Use “asset,” not the deprecated “artifact,” for reusable Quirk outputs.
- Report what was not verified.

## Completion record

Finish with changed files, behavior, checks run, evidence, remaining risk, required human decisions, and the highest-value compounding move.
