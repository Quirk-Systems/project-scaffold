# Advanced File Management

Quirk file management is classification and controlled movement, not blind folder cleanup.

## Pipeline

`Discover → Fingerprint → Classify → Inspect → Propose → Approve → Move → Verify → Log → Reconcile`

## Every file record includes

- original path
- content hash when movement is proposed
- file class
- sensitivity and risk
- canonical destination
- retention class
- reason
- related project, asset, or system
- proposed action
- human approval for deletion or irreversible movement

## Hard rules

- Never delete automatically.
- Never commit credential-bearing files.
- Never infer file purpose solely from extension when content or context changes the answer.
- Preserve provenance across rename and move operations.
- Generated output stays separable from canonical source.
- Conflicts create a review queue rather than a guessed destination.

Use `bun run quirk -- classify <path>` for a dry-run classification report.
