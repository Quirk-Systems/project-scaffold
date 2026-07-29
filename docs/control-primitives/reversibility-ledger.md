# Quirk Reversibility Ledger

## Doctrine

Every mutating action has a compensating action recorded before execution. The
Reversibility Ledger stores pre-state and post-state digests, the compensating
action, and the rollback window. Rollback is a first-class operation, not an
afterthought.

When the kill switch fires or an incident is declared, the ledger provides the
mechanical path back to the previous known-good state.

## Required fields

| Field                 | Type              | Description                                                         |
| --------------------- | ----------------- | ------------------------------------------------------------------- |
| `ledger_id`           | string            | Stable UUID.                                                        |
| `action_receipt_id`   | string            | Receipt of the mutating action this entry compensates.              |
| `compensating_action` | object            | `{ tool, arguments_template, authorization }`.                      |
| `pre_state_digest`    | string            | Digest of state before the action.                                  |
| `post_state_digest`   | string            | Digest of state after the action (nullable until action completes). |
| `rollback_window_ms`  | integer           | Time window in which rollback is valid.                             |
| `expires_at`          | string (ISO 8601) | End of rollback window.                                             |
| `status`              | enum              | `pending`, `available`, `executed`, `expired`.                      |

## Example YAML

```yaml
ledger_id: ledg-rev-5512
action_receipt_id: rcpt-ev-8812
compensating_action:
  tool: quirk.runs.demote
  arguments_template:
    run_id: "{{run_id}}"
  authorization: kill-switch-or-incident-commander
pre_state_digest: sha256:pre11...
post_state_digest: sha256:post22...
rollback_window_ms: 3600000
expires_at: "2026-07-29T11:07:31Z"
status: available
```

## Schema

See [`../schemas/quirk-reversibility-ledger.schema.json`](../schemas/quirk-reversibility-ledger.schema.json).

## Enforcement note

Supabase `quirk_reversibility_ledger` stores the entries. Cloudflare Workflows
execute rollback when the kill switch is triggered or an incident commander
authorizes it. Expired entries are archived but retained for audit.
