# Design Tribunal Report Format

Use JSON for machine exchange and Markdown for the human dossier. Do not emit an overall numeric quality score.

## Critic report

```json
{
  "critic_role": "design_systems | experience | quirk_distinctiveness",
  "artifact_digest": "sha256-or-stable-version-reference",
  "verdict": "pass | fail | unresolved",
  "findings": [
    {
      "id": "finding.stable-id",
      "run_id": "run.stable-id",
      "criterion_id": "criterion.stable-id",
      "critic_role": "design_systems",
      "verdict": "pass | fail | unresolved",
      "severity": "blocker | major | minor | note",
      "claim": "One falsifiable statement",
      "evidence": [
        {
          "kind": "test_result | screenshot | accessibility_tree | code_reference | token_diff | rendered_output | user_observation | source_reference",
          "locator": "path, URL, test id, screenshot id, or content digest",
          "summary": "What the evidence demonstrates"
        }
      ],
      "remediation": "Smallest repair that satisfies the criterion, or null",
      "confidence": 0.0,
      "blocks_release": true,
      "resolution_status": "open | fixed | waived | false_alarm | verified",
      "created_at": "RFC3339 timestamp"
    }
  ],
  "unknowns": [],
  "scope_notes": []
}
```

## Referee dossier

The referee adds:

- deterministic gate results
- accepted, rejected, and unresolved findings
- conflict notes that preserve critic disagreement
- repair queue sorted `blocker → major → minor → note`
- release status derived from typed findings
- budget consumed and remaining
- human authority required

## Evidence rules

Evidence must identify something another reviewer can inspect. “Looks wrong,” “feels generic,” and “probably inaccessible” are hypotheses, not evidence.

A screenshot can prove rendered appearance but not keyboard behavior, DOM semantics, content provenance, or code quality. A code reference can prove implementation but not final rendering. Combine evidence types when the criterion spans both.
