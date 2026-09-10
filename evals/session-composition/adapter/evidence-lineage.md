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

## Full source-group coverage map

The source column maps every top-level test group in the exact
[#105 test file](https://github.com/Quirk-Systems/project-scaffold/blob/a723d5dbe53c17315ad5013ddb1ac17df39dde60/evals/task5-composition/adapter.test.mjs).
Target names identify assertions in the current [adapter tests](adapter.test.mjs),
not recorded passes. The [verification receipt](verification.json) identifies the
tested version and observed results. Group counts are navigation aids, not a
measure of proof quality or exhaustive safety.

| #105 source test group                                                                                | Consolidated coverage and adaptation                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `matrix has literal expectations for all authority outcomes and history states`                       | `actual Task 4/5 shapes:` covers the authority/history matrix. Source review obligations remain present when the effective result becomes `DENY`.                                                                                                                                                                                                      |
| `the one Mode A restriction applies to the same-candidate combination`                                | `blind-review inherited expectation:` covers each inert action alone, the public-rubric control, and contamination in both orders. [makeBlindFixture](fixtures.mjs) binds the synthetic case/candidate to one decision slot and proposal target.                                                                                                       |
| `retains canonical results, digests, grants, review and conflict obligations`                         | The `actual Task 4/5 shapes:` matrix and `blind-review contamination preserves` tests compare complete original authority/policy values and retained obligations. Canonical source digests remain intact inside independent snapshots.                                                                                                                 |
| `authority outcome and nonempty obligations prevent inconsistent permission`                          | `inherited integrity: permitted authority with` adds review/conflict obligations to an otherwise permitted result. `inherited integrity: forged` exercises contradictory policy outcomes, including forged review for prohibited/unresolved authority. Recomputed source digests prevent stale hashes from being the sole reason for rejection.        |
| `fixtures carry every planned canonical top-level result field`                                       | [plan-contracts.mjs](plan-contracts.mjs) verifies source pins and loads the exact planned schemas; [fixtures.mjs](fixtures.mjs) and the adapter parse full objects with those schemas. This replaces a manually duplicated list of top-level keys.                                                                                                     |
| `attacks on every required binding fail closed`                                                       | `tampered`, `missing`, history-head substitution, and scoped-history tests cover binding failures. `inherited integrity: unchanged-label` checks policy/taxonomy body substitutions with stale bindings and refreshed-binding controls. Case/candidate identity uses the composite decision-slot scope; no second target contract is introduced.       |
| `missing or reset-looking history is not authorization`                                               | Required missing/incomplete/untrusted-history tests and opaque-handle checks block unavailable context. `blind-review inherited expectation:` permits the trusted fixture's empty prior history for an individual inert action. The source whole-trace restriction is adapted as explained below; no reset authority is inferred.                      |
| `simulation history cannot assert execution, commitment, or an EffectReceipt`                         | `simulation-smuggling inherited expectation` and the original unsupported-status/provenance tests reject execution, commitment, receipt, and unknown-field claims. Bindings are refreshed before testing injected claims. The operation-field check applies to this API's separately supplied current operation.                                       |
| `evaluation snapshots its bound context and test-only decision provenance`                            | `inherited integrity: receipt survives caller mutation after` checks returned snapshots across clean, prohibited, and human-review cases. `inherited integrity: coherent` checks that coherent policy/taxonomy revision and canonical authority-identity changes alter the receipt digest. Canonical rehashing replaces synthetic digest reassignment. |
| `Task 4/5 inconsistencies, failed results, and forbidden operation baselines never create permission` | Actual planned Task 5 external/unknown/secret failures remain blocked. `inherited integrity: an existing policy denial survives clean history and permitted authority` and `inherited integrity: forged` preserve terminal denial against contrary supplied outcomes, including a forged allow for prohibited authority.                               |
| `the adapter does not mutate trusted context, evidence, or either canonical result`                   | `evaluation is deterministic and does not mutate frozen inputs or history` freezes policy, request, and snapshot inputs. The returned-snapshot tests separately check later caller mutation.                                                                                                                                                           |

## Preserve the meaning of each experiment

- **History input:** #105 evaluates a nonempty whole simulated trace that includes
  the candidate operation. #106 supplies the current operation separately from
  prior history. A verified empty prior history can therefore be legitimate in
  #106; #105's empty-trace denial is not transplanted as an empty-history rule.
- **Human review:** #105 retains `REQUIRE_HUMAN_REVIEW` under prohibited or
  untrusted history. #106 records effective `DENY` while preserving the original
  authority result and its human-review obligation. Both block candidate
  eligibility. The effective denial does not discharge the review obligation.
- **Digest and result format:** #105 supplies synthetic canonical-shaped digests
  and a separate test-only evaluation. This continuation recomputes canonical
  source digests and places a schema-checked effective policy result inside a
  diagnostic candidate wrapper. It does not transplant fabricated digest values,
  the original adapter, or its result-object identity assertions. Preserving
  original values through snapshots does not issue an operative policy or grant.

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
the tests and is agent review only. Those initial imported expectations first
passed against the existing adapter; the subsequent history-erasure run is
mutation evidence.

A later read-only agent audit compared the entire #105 test suite and Task 5
prose amendment against the consolidated candidate. It identified explicit
regression assertions still missing for contradictory authority obligations,
forged policy outcomes, post-return mutation, and receipt-digest sensitivity.
The follow-up assertions use the `inherited integrity:` prefix and are mapped
above. This finding concerns coverage; it does not establish an adapter defect.
The current receipt records the follow-up execution results and limitations.
Two new fixtures initially used camelCase identifiers that violate the canonical
identifier format, so their inputs failed schema validation before reaching the
intended contradiction check. The fixtures were corrected to valid
`effect.candidate` and `instruction.primary` identifiers and now explicitly parse
the authority schema. Expected denial, reason, and source-preservation assertions
remain unchanged, as does the adapter. The retained initial-run log records a
fixture correction; it is not red-to-green implementation evidence.
The source Task 5 requirements remain distributed across the [plan amendment](../../../docs/superpowers/plans/2026-08-28-governed-agent-run-state-only.md),
[boundary document](../../../docs/governance/session-composition-candidate.md),
and [adapter README](README.md). Neither audit substitutes for human disposition.

## Proposed disposition

Continue the bounded proof in #106 and retain #105 as a source candidate pending
human disposition. This recommendation performs no merge or closure and grants
neither merge approval nor runtime authority. Task 4 remains unchanged;
`effectExecutionAllowed` remains false. Simulation remains simulation evidence.
Production integration, actual grant/history authentication, repository validation,
and independent human review retain their separately stated gates.
