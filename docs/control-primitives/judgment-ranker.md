# Quirk Judgment Ranker

## Doctrine

When an agent produces multiple candidate outputs, the Judgment Ranker orders
them by a transparent rubric. The rubric, scores, and final order are recorded
before any action is taken. Human override is always allowed and is logged as a
new training signal.

The ranker makes preference explicit. It prevents implicit or uninspectable
ranking from becoming agent behavior.

## Required fields

| Field            | Type              | Description                                                       |
| ---------------- | ----------------- | ----------------------------------------------------------------- |
| `rank_id`        | string            | Stable UUID.                                                      |
| `agent_id`       | string            | Agent producing candidates.                                       |
| `run_id`         | string            | Run context.                                                      |
| `candidates`     | array             | Candidate outputs with identifiers.                               |
| `rubric`         | array             | Named criteria with weights.                                      |
| `scores`         | object            | Score matrix: candidate × criterion.                              |
| `ranked_order`   | array             | Candidate IDs in final order.                                     |
| `human_override` | object            | `{ overridden, original_order, override_by, reason }` (nullable). |
| `evaluated_at`   | string (ISO 8601) | Timestamp.                                                        |

## Example YAML

```yaml
rank_id: rank-assets-2026-07-29
agent_id: agent-curator-v2
run_id: run-2026-07-29-abc
candidates:
  - candidate_id: cand-a
    summary: "High-contrast street photography, golden hour"
  - candidate_id: cand-b
    summary: "Minimalist portrait, studio lighting"
rubric:
  - criterion: persona_fit
    weight: 0.4
  - criterion: novelty
    weight: 0.3
  - criterion: technical_quality
    weight: 0.3
scores:
  cand-a:
    persona_fit: 0.92
    novelty: 0.78
    technical_quality: 0.88
  cand-b:
    persona_fit: 0.85
    novelty: 0.91
    technical_quality: 0.90
ranked_order:
  - cand-a
  - cand-b
human_override: null
evaluated_at: "2026-07-29T10:04:00Z"
```

## Schema

See [`../schemas/quirk-judgment-ranker.schema.json`](../schemas/quirk-judgment-ranker.schema.json).

## Enforcement note

Vercel renders the ranker output in the operator console; actions cannot
proceed until a rank is recorded. Human overrides are written back to the
annotation store as training signal and included in the next
[Apprenticeship Continuity Test](apprenticeship-continuity-test.md).
