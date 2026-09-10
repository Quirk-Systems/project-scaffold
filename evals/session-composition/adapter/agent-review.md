# Agent review of the candidate adapter

Status: **CANDIDATE**. Independent human review: **OPEN**.
Reviewer: separate Codex agent `adapter_review`; author/repair operator: root Codex
agent. Both operate in the same task and environment. This is supporting analysis,
not an independent human approval or release warrant.

The reviewer inspected the adapter, fixture construction, pinned plan loader, and
candidate decision document, and reproduced source-consistency failures.

| Finding                                                                                                     | Repair and executable evidence                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A permitted enum could coexist with missing permission, an exact prohibition, or a different effect target. | Require consistent effect membership and target identity. Tests cover these three contradictions and missing grants. Task 4 resolution is not recalculated. |
| Appending a denial beyond canonical array limits discarded the original human-review objects.               | Failed construction blocks eligibility and preserves parsed originals. Tests exercise maximum reason-code and denied-operation arrays.                      |
| The fixture resolver trusted a mutable request handle.                                                      | Capture the initial opaque Symbol in a separate closure. A caller's replacement handle is rejected.                                                         |
| A policy could expire before its own evaluation.                                                            | Reject inconsistent source time intervals. Live-clock verification remains outside this simulation proof.                                                   |
| The loader claimed execution after only importing the planned function.                                     | Loader records `plannedTask5Loaded`; the verifier records actual Task 5 execution after the fixtures and tests run.                                         |

Root reran the focused suite after the repairs; [verification.json](verification.json)
records the final counts and hashes. The review observations preceded that final
receipt. No independent post-repair human assessment has occurred. Remaining gates
include actual module/consumer integration, durable history and grant authentication,
concurrency, full repository validation, and review of the exact published revision.

## September 10 repair round

Baseline: `5f27d1c3ec5aa15e991c63582b5d8d25f55ca58e`. The baseline replay passed
103 adapter tests and 48 original tests; it did not cover the two failures below.

| Finding | Repair and evidence |
| --- | --- |
| A proposal with prohibited history could select another candidate's legitimate clean scope and history handle within the same run, retaining its own proposal and source digests. | The resolver attests an immutable proposal/scope association. Coherent substitution is denied across all four authority states; the other candidate remains eligible for its own proposal. |
| The original verifier accepted an edited receipt asserting runtime authority, effect execution, human approval and no remaining proof gaps. | Complete invariant comparison, a strict known-log set, and recorded-byte digest verification reject those edits. Historical runtime observations remain separately visible and are not authenticated by replay. |

Separate implementers handled the adapter and verifier repairs. Separate reviewers
then checked their respective changes; [scope review](repair-evidence/scope-review.md)
and [receipt review](repair-evidence/receipt-review.md) identify scope, observations,
limitations and reviewed source hashes. [Historical repair evidence](repair-evidence/README.md)
preserves genuine failures and distinguishes subsequent mutation results.

The current receipt reports 126 adapter tests, 93 receipt-integrity tests and 48
original tests separately. These are deterministic checks, not independent attack
samples or a runtime safety estimate. Nine expected history-erasure failures
demonstrate the intact tests still depend on history. Root replays the combined
source-bound pack after review. Independent human approval remains **OPEN**.

Before publication, #106 advanced to `3f61af2d9a4dbc966e35bc757db14e5fbbee4a86`.
Its 13 additional tests, full source-group mapping, retained first-run log and
development evidence were preserved. The strict log registry now requires four
logs, including the immutable historical consolidation log. The
[integration review](repair-evidence/integration-review.md) covers the combined
changes; earlier review hashes continue to identify their pre-integration versions.
