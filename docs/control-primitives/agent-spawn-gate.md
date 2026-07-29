# Quirk Agent Spawn Gate

## Doctrine

No agent runs without a containment contract, a named review owner, and a
configured evidence sink. The Spawn Gate is the checkpoint that verifies all
three before a run lock is granted.

The gate is intentionally slow. Speed here is a bug; the operator must be able
to inspect and deny a spawn before execution begins.

## Required fields

| Field                     | Type              | Description                                      |
| ------------------------- | ----------------- | ------------------------------------------------ |
| `spawn_id`                | string            | Stable UUID for the spawn request.               |
| `agent_id`                | string            | Agent requesting spawn.                          |
| `containment_contract_id` | string            | Contract that governs the run.                   |
| `review_owner`            | string            | Human accountable for the run.                   |
| `evidence_sink`           | object            | `{ table, retention_days, encryption_key_id }`.  |
| `max_runtime_ms`          | integer           | Hard kill switch timeout.                        |
| `approved_at`             | string (ISO 8601) | Approval timestamp.                              |
| `approval_signature`      | string            | Signature from the review owner or gate service. |

## Example YAML

```yaml
spawn_id: spawn-2026-07-29-xyz
agent_id: agent-curator-v2
containment_contract_id: cc-curator-v2-001
review_owner: alice@quirk.systems
evidence_sink:
  table: quirk_receipts
  retention_days: 365
  encryption_key_id: kms-key-7
max_runtime_ms: 300000
approved_at: "2026-07-29T10:00:00Z"
approval_signature: sig-ed25519-...
```

## Schema

See [`../schemas/quirk-agent-spawn-gate.schema.json`](../schemas/quirk-agent-spawn-gate.schema.json).

## Enforcement note

Cloudflare Durable Objects hold the run lock and enforce `max_runtime_ms`; the
kill switch releases the lock and triggers the [Reversibility Ledger](reversibility-ledger.md).
Vercel UI blocks manual "Run" buttons until the spawn gate returns a signed
token.
