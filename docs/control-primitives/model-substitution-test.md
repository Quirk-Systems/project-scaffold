# Quirk Model Substitution Test

## Doctrine

Prompts and tools must work across model lanes. The Model Substitution Test
runs the same task through the frontier lane (OpenAI) and an open-model lane
(Hugging Face or a local open-weight model) and compares outputs against the
same criteria. Discrepancies outside tolerance block promotion.

Substitution tests are not parity tests; they are safety tests. Some variance
is expected, but the agent must not become ungoverned when the model changes.

## Required fields

| Field                      | Type              | Description                                                  |
| -------------------------- | ----------------- | ------------------------------------------------------------ |
| `test_id`                  | string            | Stable UUID.                                                 |
| `baseline_model`           | string            | Production model lane (e.g. `openai:gpt-5`).                 |
| `substitute_model`         | string            | Open-model lane (e.g. `huggingface:meta-llama/Llama-4-...`). |
| `prompt_lane`              | string            | Name of the prompt or tool lane under test.                  |
| `input_fixture`            | object            | Canonical inputs, referenced by digest.                      |
| `expected_output_criteria` | array             | Criteria each output must satisfy.                           |
| `tolerance`                | object            | Acceptable divergence per criterion.                         |
| `result`                   | enum              | `pass`, `fail`, `inconclusive`.                              |
| `evaluated_at`             | string (ISO 8601) | Timestamp.                                                   |

## Example YAML

```yaml
test_id: mst-ranker-1107
baseline_model: openai:gpt-5
substitute_model: huggingface:meta-llama/Llama-4-70B-Instruct
prompt_lane: quirk.judgment.rank_assets
input_fixture:
  digest: sha256:7d9e...
  path: fixtures/ranker-input-1107.json
expected_output_criteria:
  - criterion: output_is_valid_json
    required: true
  - criterion: top_candidate_has_explanation
    required: true
tolerance:
  rank_order_kendall_tau: 0.85
  explanation_semantic_similarity: 0.80
result: pass
evaluated_at: "2026-07-29T08:00:00Z"
```

## Schema

See [`/schemas/quirk-model-substitution-test.schema.json`](../schemas/quirk-model-substitution-test.schema.json).

## Enforcement note

CI runs substitution tests for every prompt lane before merge. The OpenAI lane
proves production capability; the Hugging Face lane proves open-model
resilience. A failed substitution test blocks promotion in `promoteRun()`.
