# Quirk Evidence Receipt

## Doctrine

Every significant agent action must leave a signed, timestamped receipt.
Evidence Receipts bind inputs, outputs, identity, and lineage so a future
auditor can reconstruct what happened without trusting the agent's internal
state.

Receipts are immutable. A receipt may be superseded by a later correction
receipt, but it is never edited in place.

## Required fields

| Field            | Type              | Description                                                    |
| ---------------- | ----------------- | -------------------------------------------------------------- |
| `receipt_id`     | string            | Stable UUID.                                                   |
| `agent_id`       | string            | Agent that performed the action.                               |
| `run_id`         | string            | Run this receipt belongs to.                                   |
| `capability_ref` | string            | Capability from the active surface.                            |
| `tool_call`      | object            | `{ tool, arguments_hash, correlation_id }`.                    |
| `input_digest`   | string            | Cryptographic digest of canonical inputs.                      |
| `output_digest`  | string            | Cryptographic digest of canonical outputs.                     |
| `lineage_hash`   | string            | Hash chaining this receipt to the previous receipt in the run. |
| `timestamp`      | string (ISO 8601) | UTC timestamp.                                                 |
| `signature`      | string            | Signature over the canonical receipt bytes.                    |

## Example YAML

```yaml
receipt_id: rcpt-ev-8812
agent_id: agent-curator-v2
run_id: run-2026-07-29-abc
capability_ref: quirk.runs.promote
tool_call:
  tool: quirk.runs.promote
  arguments_hash: sha256:8f2a...
  correlation_id: corr-991
input_digest: sha256:1a2b...
output_digest: sha256:3c4d...
lineage_hash: sha256:9e8f...
timestamp: "2026-07-29T10:05:31Z"
signature: sig-ed25519-...
```

## Schema

See [`/schemas/quirk-evidence-receipt.schema.json`](../schemas/quirk-evidence-receipt.schema.json).

## Enforcement note

Supabase `quirk_receipts` is append-only; RLS permits inserts only from service
roles that attach a valid run lock. Cloudflare Logspush streams are folded into
the lineage hash so runtime logs and ledger rows cannot diverge silently.
