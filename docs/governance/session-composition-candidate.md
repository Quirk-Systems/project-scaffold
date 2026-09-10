# History-aware candidate eligibility

Status: **CANDIDATE / STATE_ONLY / TEST-ONLY**. Disposition: **Constrain**.
Independent human review: **OPEN**. Authority effect: **NONE**.
Owner: `Quirk-Systems/project-scaffold`; decision owner: Bryan Sayler.

The bounded probe earns a test obligation at the Task 4/5 boundary: demonstrate
useful additional denial while preserving existing authority outcomes. It does
not establish runtime safety or complete the Mode A implementation plan.

## Evidence and decision

| Source                                                                | Exact version                                                                         | What it establishes                                                                                                                                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [PR #104](https://github.com/Quirk-Systems/project-scaffold/pull/104) | `58cefdb21164f1e7968d03051dfb52a93a24f4e8`                                            | Its [research receipt](../../evals/session-composition/research-receipt.json) records 48 local tests, 12 prohibited traces denied, and 12 matched controls preserved in a synthetic model. |
| [PR #102](https://github.com/Quirk-Systems/project-scaffold/pull/102) | `47279f5f9cbee8dfcb97b21ca3da024294f1bad9`                                            | The [Mode A plan](../superpowers/plans/2026-08-28-governed-agent-run-state-only.md) defines the Task 4/5 schemas and planned functions; production implementations do not yet exist.       |
| Adapter follow-up                                                     | See [verification receipt](../../evals/session-composition/adapter/verification.json) | Reports the actual bounded adapter checks and source/file bindings. Claims extend only to recorded successful checks.                                                                      |

The original probe receives a stipulated `baseAllowed` boolean. Task 4 instead
returns four authority outcomes, and successful validation can accompany denial,
human review, or unresolved authority. The follow-up therefore uses the exact
plan-extracted Zod result schemas and executes the planned Task 5 function. It
does not substitute invented booleans for authority decisions or claim to execute
the production Task 4 resolver with real verified grants.

| Approach                                                | Decision and reason                                                                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Defer every composition check until runtime integration | Loses a cheap opportunity to expose adapter mistakes before changing contracts. Retain runtime work as a later gate.                      |
| Change Task 4 authority resolution                      | Reject for this scope: composition evidence supplies no new authority and must not alter grants, conflict resolution, or human review.    |
| Pure post-policy deny filter                            | Selected for the candidate proof: it can test incremental protection and preserve source outcomes without adding an operative capability. |

## Boundary contract

Task 4 remains unchanged. A composition result may only narrow existing candidate
eligibility. Preserve the original authority resolution and policy decision,
including required human review, unresolved conflicts, grant IDs and boundaries,
and `effectExecutionAllowed: false`. A clean history does not independently grant
permission or discharge an obligation. A composition denial does not erase the
underlying review requirement or conflict.

Bind the test result to the exact proposal, original authority and policy digests,
effective policy result, policy revision, validated session scope including run
and decision slot, history head, action-taxonomy version and digest, composition
policy digest, and normalized operations digest. Missing, incomplete, untrusted,
stale, or mismatched required history blocks candidate eligibility.

The fixture-owned resolver supplies scoped history snapshots through opaque
handles. Caller-supplied history payloads and completeness/trust flags cannot
establish trust. This dependency injection tests the boundary's use of supplied
trust; it does not authenticate durable history, principals, or grants.

The trusted resolver must also attest which proposal belongs to which complete
validated scope. Checking the run ID and matching caller-supplied scope/history
digests is insufficient: a caller could coherently substitute another candidate's
clean history within the same run. The test-only attestation binds the proposal
digest and full scope digest to the resolved history. Missing or mismatched
attestations block eligibility, even when the substituted history is itself valid.

The strict canonical `ExecutionPolicyDecision` receives no extra fields in this
proof. A test-only wrapper retains the original objects, effective canonical
policy result, and composition bindings. It is diagnostic evidence for review,
not a second authority/evidence dialect or an enforced runtime decision.

## Smallest useful proof

| Task 4 outcome             | Clean trusted history                | Prohibited composition          | Missing or untrusted required history |
| -------------------------- | ------------------------------------ | ------------------------------- | ------------------------------------- |
| `PERMITTED_CANDIDATE_ONLY` | Preserve otherwise-valid eligibility | Deny                            | Block eligibility                     |
| `HUMAN_REVIEW`             | Preserve review requirement          | Deny; retain review requirement | Block; retain review requirement      |
| `PROHIBITED`               | Remain denied                        | Remain denied                   | Remain denied                         |
| `UNRESOLVED`               | Preserve conflict; no permission     | Deny; retain conflict           | Block; retain conflict                |

The declared fixture policy limits simulated candidate allocations in one decision
slot. A first `SIMULATED_ACCEPTED` allocation makes a conflicting second allocation
ineligible. A rationale-only update is the matched control. Both actions remain
honestly classified within `PURE` or `CANDIDATE_STATE`. This restriction belongs
to that explicit fixture policy; it is not a universal law about Quirk decisions.

An honestly classified `EXTERNAL_EFFECT` must remain denied for every history.
Removing history checking must break the prohibited Mode A case. Changed bindings,
malformed inputs, and unavailable trusted history must block eligibility without
mutating source objects. The [adapter README](../../evals/session-composition/adapter/README.md)
defines reproduction and the recorded coverage; the receipt supplies results.

## History event meaning

All supported events require `SIMULATION` provenance. Every event remains in the
complete, digest-bound ledger, even when excluded from composition matching.

| Event state                                          | Treatment in this bounded adapter                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `PROPOSED`                                           | Retain in ledger; exclude from accepted-composition matching.                                 |
| `DENIED`                                             | Retain in ledger; exclude from accepted-composition matching.                                 |
| `SIMULATED_ACCEPTED`                                 | Contribute to the fixture's accepted-composition history.                                     |
| `RESERVED`, `COMMITTED`, `FAILED`, `UNKNOWN_OUTCOME` | Block eligibility: these states fall outside the simulation-only adapter's supported history. |

Simulation acceptance never becomes an executed-effect receipt or claim. Rejecting
unsupported event states asserts nothing about whether an actual effect happened.
History omission, reset, redaction, delegation, retries, retention, policy changes,
and concurrent admission need separately specified semantics before integration.

## Integration gates and recovery

| Plan boundary                              | Required next evidence                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tasks 2/3: canonical contracts and digests | Review a versioned schema change for the complete bindings, canonical digest coverage, and migration/rejection behavior. Legacy or detached decisions must not be accepted as history-validated.      |
| Task 4: authority resolver                 | Keep semantics and source code unchanged; prove original resolutions, conflicts, review obligations, and grant boundaries survive the adapter. Real verified-grant behavior remains a separate proof. |
| Task 5: policy decision                    | Run the pure adapter checks and review the bounded result. Resolve control false denials, binding failures, or authority broadening before further integration.                                       |
| Task 6: assembly consumer                  | Prove the implemented consumer enforces the reviewed constraint and rejects absent, stale, substituted, or detached results. A passing diagnostic wrapper cannot satisfy this gate.                   |
| Tasks 8/9: fixtures and CI                 | Reproduce the matrix and ablation against actual modules, add drift checks and explicit CI coverage, then collect the plan's full repository validation evidence.                                     |
| Human Gate                                 | Independent human review of exact tested versions, scope, and evidence remains open. Agent authorship, agent review, passing tests, and mergeability do not satisfy it.                               |

On a failure, keep candidate eligibility blocked, preserve the failed receipt and
source objects, and identify the invalid input or broken invariant. Recover by
correcting the input or implementation and rerunning the same frozen expectations;
never weaken a fixture to turn a control failure green. If required history cannot
be established, stop that eligibility decision rather than inventing empty history.

Rollback of this test-only change is removal of the adapter and these candidate
plan amendments; there is no runtime deployment, migration, or effect to reverse.
Retain evidence identifying the reverted version. A later integrated consumer
needs its own rollback plan that blocks affected eligibility when the required
composition check is unavailable.

Completion of this follow-up means the receipt demonstrates added denial, a
preserved legitimate control and authority obligations, binding integrity, and
detected history-removal regression at the tested versions. Repository integration,
durable history/grant authentication, concurrent admission, and independent human
review remain open. Draft status and `Constrain` persist; no runtime, Canon,
Mode B/C, or merge authority is granted.

## September 10 candidate repairs and handoff

Continue implementation and replay in #106. Retain #105 at
`a723d5dbe53c17315ad5013ddb1ac17df39dde60` as an attributed source of expectations
and historical development evidence. This avoids maintaining two copies of the
adapter while preserving their distinct history and human-review semantics.
PR closure and independent human disposition remain open.

Two reproduced gaps in #106 at `5f27d1c3ec5aa15e991c63582b5d8d25f55ca58e`
require regression evidence: trusted clean history from another proposal/scope
could restore eligibility, and edited receipt claims could evade the verifier's
selective comparisons. The continuing proof must reject both attacks while
preserving valid same-proposal histories and honest historical runtime records.
See the [review record](../../evals/session-composition/adapter/agent-review.md)
and [verification receipt](../../evals/session-composition/adapter/verification.json)
for the actual tested changes and results.

The next human decision is whether this exact candidate supports carrying these
test obligations into a separately reviewed canonical integration. Review the
trusted-context boundary, the legitimate controls, preservation of review/conflict
and grant data, and the receipt's explicit unproved surfaces. Record the reviewed
Git head, reviewer identity, decision and unresolved issues. Until then the
disposition is **Constrain**, with no runtime admission or completed human gate.
