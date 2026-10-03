# Evaluator Authority Separation

Evaluator capability and evaluator authority are separate contracts.

- `EvaluatorDeclaration` states what the evaluator can inspect and where it fails.
- `AuthorityGrant` is issued by an external principal and defines allowed effects.
- `TribunalVerdict` references authority; it never mutates grants.
- `DecisionReceipt` records externally authorized decisions.

## OpenAI-backed lanes

`OPENAI_API_KEY` may enable evaluator capability but does not grant authority.

An evaluator lane with model access cannot:

- approve canon changes
- mutate grant canon
- bypass Tribunal contract checks
- self-upgrade permissions

## Projection policy

Supabase may hold query projections, but projection rows must preserve canonical path, schema version, content hash, commit SHA, and projection metadata. Projection state cannot mutate canonical authority.
