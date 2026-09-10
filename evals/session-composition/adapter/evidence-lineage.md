# Composition proof lineage

**CANDIDATE / STATE_ONLY / TEST-ONLY. Authority effect: NONE.**
Owner: `Quirk-Systems/project-scaffold`. Independent human review remains open.

This comparison binds its sources to PR #105 at
`a723d5dbe53c17315ad5013ddb1ac17df39dde60` and the original PR #106 at
`050a2f7a5e5c2d9206205fe22b8a8af3dcafb99c`. Later changes require their own
source identities and verification receipt.

## What is carried forward

| Source expectation from #105                                                                                                                                                 | Contribution to the existing #106 proof                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reading a synthetic, non-secret answer key and preparing its blind-review candidate rationale form a prohibited composition; reading a public rubric is the matched control. | A second declared fixture family, alongside the existing exclusive-selection example. This tests a supplied policy restriction; it does not demonstrate semantic contamination detection. |
| Simulated history must reject execution or receipt claims, including `committed`, `effectExecuted`, `EffectReceipt`, assertions, `executedAt`, and unexpected fields.        | Explicit regression expectations for the existing strict history boundary, with valid recomputed bindings so the rejection cannot be attributed merely to a stale digest.                 |

These expectations come from the [#105 tests](https://github.com/Quirk-Systems/project-scaffold/blob/a723d5dbe53c17315ad5013ddb1ac17df39dde60/evals/task5-composition/adapter.test.mjs).
They are adapted into this proof's fixtures and tests. That attribution does not
claim that #105's original adapter was executed by this continuation. The current
verification receipt identifies the implementation and outcomes actually tested.

The authority/history matrix, obligation preservation, binding checks, forbidden
operation baselines, and nonmutation checks substantially overlap. Maintaining
two adapters would duplicate those obligations. The original [#106 receipt](https://github.com/Quirk-Systems/project-scaffold/blob/050a2f7a5e5c2d9206205fe22b8a8af3dcafb99c/evals/session-composition/adapter/verification.json)
records planned-schema validation, canonical digest recomputation, planned Task 5
execution, and history-erasure mutation evidence. Those are bounded distinctions
in evidence, not runtime integration or Task 4 execution.

## Preserve the meaning of each experiment

- **History input:** #105 evaluates a nonempty whole simulated trace that includes
  the candidate operation. #106 supplies the current operation separately from
  prior history. A verified empty prior history can therefore be legitimate in
  #106; #105's empty-trace denial is not transplanted as an empty-history rule.
- **Human review:** #105 retains `REQUIRE_HUMAN_REVIEW` under prohibited or
  untrusted history. #106 records effective `DENY` while preserving the original
  authority result and its human-review obligation. Both block candidate
  eligibility. The effective denial does not discharge the review obligation.

The source [#105 README](https://github.com/Quirk-Systems/project-scaffold/blob/a723d5dbe53c17315ad5013ddb1ac17df39dde60/evals/task5-composition/README.md)
and original [#106 README](https://github.com/Quirk-Systems/project-scaffold/blob/050a2f7a5e5c2d9206205fe22b8a8af3dcafb99c/evals/session-composition/adapter/README.md)
define these different input and output contracts.

## Historical development evidence

#105's [receipt](https://github.com/Quirk-Systems/project-scaffold/blob/a723d5dbe53c17315ad5013ddb1ac17df39dde60/evals/task5-composition/evidence/receipt.json),
[behavioral RED](https://github.com/Quirk-Systems/project-scaffold/blob/a723d5dbe53c17315ad5013ddb1ac17df39dde60/evals/task5-composition/evidence/red.txt),
[initial GREEN](https://github.com/Quirk-Systems/project-scaffold/blob/a723d5dbe53c17315ad5013ddb1ac17df39dde60/evals/task5-composition/evidence/initial-green.txt),
[repair RED](https://github.com/Quirk-Systems/project-scaffold/blob/a723d5dbe53c17315ad5013ddb1ac17df39dde60/evals/task5-composition/evidence/repair-red.txt),
and [repair GREEN](https://github.com/Quirk-Systems/project-scaffold/blob/a723d5dbe53c17315ad5013ddb1ac17df39dde60/evals/task5-composition/evidence/repair-green.txt)
remain historical sources. They are not #106's development chronology or evidence
that its imported expectations were observed failing before implementation.
Neither these records nor this comparison satisfies independent human review.

A separate agent read the adapted fixture and 18 added tests in this continuation
and reported no concrete issue in scope, controls, recomputed bindings, source
obligation preservation, or simulation-only rejection. That review did not rerun
the tests and is agent review only. The imported expectations first passed against
the existing adapter; the subsequent history-erasure run is mutation evidence.

## Proposed disposition

Continue the bounded proof in #106 and retain #105 as a source candidate pending
human disposition. This recommendation performs no merge or closure and grants
neither merge approval nor runtime authority. Task 4 remains unchanged;
`effectExecutionAllowed` remains false. Simulation remains simulation evidence.
Production integration, actual grant/history authentication, repository validation,
and independent human review retain their separately stated gates.
