# Contributing to Quirk OS

## The short version

1. Branch from `main` with `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `security/`, or `chore/`.
2. Read `ARCHITECTURE.md`, `CLAUDE.md`, `AGENTS.md`, and the nearest package README.
3. Map the change to an issue or Work Packet.
4. Run `bun run validate`. It includes formatting, lint, type checking, tests, Quirk foundation validation, and the production build.
5. Use conventional commits and open a focused pull request against `main`.

## Ground rules

- Keep the scaffold broadly reusable across Quirk applications.
- Preserve the canonical/runtime/projection distinction.
- Validate external input at the boundary.
- Every new permission needs an authority review.
- Every event needs a versioned contract.
- Every schema change needs a migration and compatibility statement.
- Every meaningful failure should produce regression coverage or an explicit limitation.
- Never commit secrets, raw private data, or generated credentials.
- Prefer small vertical proofs over disconnected architecture layers.
- Prompts, rulesets, registries, and templates are versioned assets.
- New shared logic belongs in `packages/`; provider logic belongs behind adapters.
- New declarative knowledge belongs in `registries/`; enforceable policy belongs in `rulesets/`.

## Pull request evidence

A pull request must state the outcome, implementation, verification, risk, review focus, and deliberate exclusions. UI changes include screenshots and accessibility evidence. Runtime changes include failure, retry, idempotency, and rollback behavior.

## Quirk CLI

```bash
bun run quirk:doctor
bun run quirk:validate
bun run quirk:graph
bun run quirk -- runtime list
bun run quirk -- semantics inspect asset
bun run quirk -- classify .
bun run quirk -- init system example-system
```

## Security

Use `SECURITY.md` for vulnerability reports. Do not disclose security findings in public issues.
