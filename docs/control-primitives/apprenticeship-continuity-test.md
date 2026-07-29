# Quirk Apprenticeship Continuity Test

## Doctrine

A new agent version must prove continuity with trusted judgment before it is
allowed to operate independently. The apprentice shadows a human or trusted
agent on real tasks; its decisions are compared to the mentor's decisions. High
agreement is the gate to solo operation.

Continuity is task-specific. Passing on curation does not grant continuity on
billing or infrastructure tasks.

## Required fields

| Field                 | Type              | Description                                    |
| --------------------- | ----------------- | ---------------------------------------------- |
| `test_id`             | string            | Stable UUID.                                   |
| `apprentice_agent_id` | string            | New agent version under test.                  |
| `mentor_id`           | string            | Human or trusted agent acting as ground truth. |
| `task_domain`         | string            | Domain of the continuity test.                 |
| `task_distribution`   | array             | Task samples with mentor/apprentice judgments. |
| `minimum_tasks`       | integer           | Minimum number of tasks required.              |
| `agreement_rate`      | number            | Fraction of tasks where judgments match.       |
| `threshold`           | number            | Minimum agreement rate to pass.                |
| `evaluated_at`        | string (ISO 8601) | Timestamp.                                     |

## Example YAML

```yaml
test_id: act-curation-2026-q3
apprentice_agent_id: agent-curator-v3
mentor_id: alice@quirk.systems
task_domain: curation
minimum_tasks: 50
agreement_rate: 0.91
threshold: 0.88
task_distribution:
  - task_id: task-01
    mentor_judgment: approve
    apprentice_judgment: approve
    aligned: true
  - task_id: task-02
    mentor_judgment: reject
    apprentice_judgment: approve
    aligned: false
evaluated_at: "2026-07-29T09:30:00Z"
```

## Schema

See [`/schemas/quirk-apprenticeship-continuity-test.schema.json`](../schemas/quirk-apprenticeship-continuity-test.schema.json).

## Enforcement note

The Vercel operator UI shows continuity test status per agent version.
`promoteRun()` rejects promotion of an apprentice version until the continuity
test passes. Disagreements become training annotations for the Judgment Ranker.
