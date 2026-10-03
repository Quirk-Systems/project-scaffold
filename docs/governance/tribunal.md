# Tribunal as a Shared Evaluation Primitive

Tribunal is a protocol layer inside Quirk governance. It is not a standalone service and does not own authority.

## Constitutional invariants

- `capability_implies_authority = false`
- `evaluation_implies_authority = false`
- `confidence_implies_authority = false`
- `consensus_implies_authority = false`
- `projection_implies_canon = false`
- `evaluator_self_escalation = false`

Runtime invariant:

- `authority_after_verdict <= externally_granted_authority`

## Canonical protocol objects

1. `AuthorityGrant`
2. `EvaluatorDeclaration`
3. `EvidenceClaim`
4. `TribunalVerdict`
5. `DecisionReceipt`

These contracts are represented in `schemas/**`, `templates/**`, and validated by `scripts/validate-tribunal-contracts.ts`.

## Fail-closed requirements

- Requested verdict effects must be a subset of granted effects.
- Expired, revoked, and superseded grants are inadmissible.
- Secondary verdicts cannot be treated as primary evidence.
- Out-of-scope or insufficient dispositions cannot self-authorize stronger effects.
- Decision receipts cannot mark inadmissible verdicts as authorized decisions.
