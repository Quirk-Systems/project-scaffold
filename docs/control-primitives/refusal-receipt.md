# Quirk Refusal Receipt

## Doctrine

A refusal is evidence, not a failure. When an agent declines an action, it must
record the authority, the reason, and the requested capability. Refusal
Receipts protect against silent overreach and provide signal for the Judgment
Ranker.

Refusals are first-class ledger rows. They are not exceptions to be logged and
forgotten.

## Required fields

| Field                | Type              | Description                                                             |
| -------------------- | ----------------- | ----------------------------------------------------------------------- |
| `receipt_id`         | string            | Stable UUID.                                                            |
| `agent_id`           | string            | Agent that refused.                                                     |
| `run_id`             | string            | Run context.                                                            |
| `refused_capability` | string            | Capability that was requested.                                          |
| `refusal_type`       | enum              | `out_of_scope`, `expired_grant`, `missing_consent`, `policy`, `safety`. |
| `authority`          | string            | Policy, contract clause, or owner that mandated refusal.                |
| `reason`             | string            | Human-readable explanation.                                             |
| `timestamp`          | string (ISO 8601) | UTC timestamp.                                                          |
| `signature`          | string            | Signature over the canonical receipt bytes.                             |

## Example YAML

```yaml
receipt_id: rcpt-ref-4412
agent_id: agent-curator-v2
run_id: run-2026-07-29-abc
refused_capability: quirk.offers.mint
refusal_type: missing_consent
authority: containment-contract-v2.3.0
reason: >-
  Offer minting requires explicit curator approval; no approval signature
  was present in the spawn gate for this run.
timestamp: "2026-07-29T10:06:12Z"
signature: sig-ed25519-...
```

## Schema

See [`../schemas/quirk-refusal-receipt.schema.json`](../schemas/quirk-refusal-receipt.schema.json).

## Enforcement note

Vercel surfaces refusals in the operator console. The [Judgment Ranker](judgment-ranker.md)
weights refusal patterns when retraining, and a spike in refusals triggers an
incident review.
