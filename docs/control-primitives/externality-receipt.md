# Quirk Externality Receipt

## Doctrine

Agent actions that touch the outside world (email, billing, git, storage)
produce side effects that outlive the run. An Externality Receipt declares the
external system, the affected resource, the consent reference, and a tested
rollback plan before the action executes.

No external action runs without a rollback plan that has been verified at
least once in a non-production environment.

## Required fields

| Field               | Type              | Description                                                  |
| ------------------- | ----------------- | ------------------------------------------------------------ |
| `receipt_id`        | string            | Stable UUID.                                                 |
| `agent_id`          | string            | Agent performing the action.                                 |
| `run_id`            | string            | Run context.                                                 |
| `external_system`   | string            | System touched (e.g. `github`, `resend`, `stripe`).          |
| `action`            | string            | Action performed (e.g. `issue.create`, `email.send`).        |
| `affected_resource` | string            | Identifier of the affected resource.                         |
| `consent_ref`       | string            | Reference to consent or approval that authorized the action. |
| `rollback_plan`     | object            | `{ compensating_action, pre_state_digest, verified_at }`.    |
| `timestamp`         | string (ISO 8601) | UTC timestamp.                                               |

## Example YAML

```yaml
receipt_id: rcpt-ext-2291
agent_id: agent-curator-v2
run_id: run-2026-07-29-abc
external_system: github
action: issue.create
affected_resource: Quirk-Systems/project-scaffold#65
consent_ref: containment-contract-v2.3.0
rollback_plan:
  compensating_action: issue.close_with_comment
  pre_state_digest: sha256:aa11...
  verified_at: "2026-07-28T12:00:00Z"
timestamp: "2026-07-29T10:07:00Z"
```

## Schema

See [`../schemas/quirk-externality-receipt.schema.json`](../schemas/quirk-externality-receipt.schema.json).

## Enforcement note

The rollback plan is stored in the [Reversibility Ledger](reversibility-ledger.md).
GitHub issues created by agents carry an `agent-generated` label and link back
to the externality receipt. External actions without a verified rollback plan
are refused by the [Refusal Receipt](refusal-receipt.md) path.
