# Quirk Source Resilience Score

## Doctrine

Agents are only as good as the sources they reason over. The Source Resilience
Score ranks sources by verifiability, diversity, latency, and mutation history.
Fragile or manipulated sources are down-weighted or blocked before they reach
agent context.

Scores are recomputed on a schedule and after every detected mutation. The
computation is deterministic and versioned so scores can be reproduced.

## Required fields

| Field               | Type              | Description                                                              |
| ------------------- | ----------------- | ------------------------------------------------------------------------ |
| `source_id`         | string            | Stable source identifier.                                                |
| `score`             | number            | Aggregate score from 0.0 to 1.0.                                         |
| `dimensions`        | object            | `{ verifiability, diversity, latency, mutation_history }`, each 0.0–1.0. |
| `computed_at`       | string (ISO 8601) | Timestamp of computation.                                                |
| `evaluator_version` | string            | Version of the scoring algorithm.                                        |
| `block_threshold`   | number            | Score below which the source is blocked.                                 |

## Example YAML

```yaml
source_id: src-wiki-commons-photography
score: 0.87
dimensions:
  verifiability: 0.92
  diversity: 0.85
  latency: 0.78
  mutation_history: 0.93
computed_at: "2026-07-29T09:00:00Z"
evaluator_version: resilience-v1.2.0
block_threshold: 0.50
```

## Schema

See [`../schemas/quirk-source-resilience-score.schema.json`](../schemas/quirk-source-resilience-score.schema.json).

## Enforcement note

Supabase `quirk_sources` enforces `score >= block_threshold` for sources marked
`active`. Hugging Face datasets and open-model benchmarks provide the offline
evaluation lane; results are imported as versioned score rows.
