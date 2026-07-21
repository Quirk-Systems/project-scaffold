# Rulesets

Rulesets translate Quirk principles into inspectable policy.

Each ruleset declares:

- identifier and version
- owner and status
- purpose
- target
- effect: allow, deny, require, or warn
- condition
- human-readable message
- enforcement location
- exception or override procedure

Repository rulesets protect Git behavior. Runtime rulesets protect execution. Semantic rulesets protect meaning. File rulesets protect data and assets.

Rules do not grant their own exceptions. An override requires named human authority and a receipt.

## Main branch desired state

`.github/rulesets/main.json` is intentionally shaped as a direct GitHub repository-ruleset import payload. Keep operational commentary in this document rather than adding non-API fields to that JSON file.

The initial solo-operator posture requires pull requests and resolved review threads but sets the approving-review count to zero. Increase required approvals and enable code-owner review when another trusted maintainer can review without creating a self-approval deadlock.

Apply the file through repository **Settings → Rules → Rulesets → New ruleset → Import a ruleset**, or through the repository rulesets REST API using a token with repository Administration write permission. After application, confirm that `main` requires the `validate`, `e2e`, `security`, `dependency-review`, and `analyze` checks before merging.
