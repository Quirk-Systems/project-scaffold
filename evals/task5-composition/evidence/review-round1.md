# Task 5 composition adapter review

## Verdict

**CHANGES REQUIRED — the bounded candidate proof is not yet spec-compliant.** The implementation is readable, pure, narrowly scoped, and backed by a useful 12-cell base matrix plus focused attack tests. The fixtures carry the full planned top-level `GovernedRunResult`, `ManyTierAuthorityResolution`, and `ExecutionPolicyDecision` shapes; the wrapper retains both source results and their digests; grant/effect/review/conflict data is retained; the blind-reference restriction is scoped to one candidate; and every returned result keeps `effectExecutionAllowed: false`.

The report also states the proof limits accurately: this is a trusted-harness contract-shape adapter, not runtime Zod validation, canonical digest verification, authority/grant validation, policy issuance, or effect execution. The supplied final evidence is GREEN at 9/9, but the suite misses three material fail-closed boundaries below.

## Critical findings

None. This code is a test-only proof and cannot execute an effect. The important findings nevertheless contradict central acceptance requirements and should be fixed before accepting the proof.

## Important findings

### 1. Contradictory authority obligations and inconsistent review decisions can change or bypass the required Task 4 outcome

**Files:** `evals/task5-composition/adapter.mjs:142-166`, especially `:151-165`; missing cases in `evals/task5-composition/adapter.test.mjs:306-335`.

The adapter detects `requiredHumanReview`, `unresolvedConflictIds`, and Task 4/5 decision inconsistency, but those facts do not gate the allow branch. A `PERMITTED_CANDIDATE_ONLY` authority value with a nonempty review or unresolved-conflict array therefore returns `ALLOW_CANDIDATE_ONLY`, `candidateEligible: true`, and simultaneous `HUMAN_REVIEW_REQUIRED` / `UNRESOLVED_CONFLICT_RETAINED` block reasons. This contradicts the requirements to preserve those obligations and to prevent Task 4/5 inconsistencies from creating permission.

There is a second branch-order manifestation: `policy.decision === "REQUIRE_HUMAN_REVIEW"` takes precedence over the Task 4 authority result. Pairing that inconsistent policy result with `PROHIBITED` or `UNRESOLVED` returns `REQUIRE_HUMAN_REVIEW`, even though the explicit matrix requires both authority outcomes to remain `DENY` for every history. The adapter records `TASK4_TASK5_INCONSISTENT` while still changing the effective outcome.

A targeted counterexample produced:

```text
PERMITTED_CANDIDATE_ONLY + nonempty review/conflict obligations -> ALLOW_CANDIDATE_ONLY, candidateEligible=true
PROHIBITED + policy REQUIRE_HUMAN_REVIEW                    -> REQUIRE_HUMAN_REVIEW
UNRESOLVED + policy REQUIRE_HUMAN_REVIEW                    -> REQUIRE_HUMAN_REVIEW
```

Gate candidate eligibility on empty review and unresolved-conflict obligations. Make the authority result control the exact terminal outcome: `HUMAN_REVIEW` remains review, while `PROHIBITED` and `UNRESOLVED` remain deny even when the policy result is inconsistent. Add counterexamples for all three shapes.

### 2. The simulation predicate admits receipt-shaped and executed-effect evidence

**File:** `evals/task5-composition/adapter.mjs:53-66`.

`simulationOnly` checks `eventKind`, a short blacklist of top-level keys, empty `assertions`, classification, and secret material. It does not require `item.kind === "Task5CompositionHistoryEvent"`, and the blacklist omits the planned `effectExecuted` marker. After recomputing the trusted and supplied history bindings, both of these histories pass as simulation-only and retain candidate eligibility:

```text
{ kind: "EffectReceipt", eventKind: "SIMULATED", ...valid operation fields }
{ kind: "Task5CompositionHistoryEvent", eventKind: "SIMULATED", effectExecuted: true, ... }
```

This violates the explicit requirement that simulated history never become executed-effect evidence and that EffectReceipt assertions cannot enter this proof. Require the fixture history-event kind and reject `effectExecuted` (as well as the already covered committed/executed/receipt fields). Add re-bound hostile-history tests so the rejection comes from the simulation boundary rather than a stale digest.

### 3. The returned evaluation does not identify the context it was bound to

**File:** `evals/task5-composition/adapter.mjs:100-127, 169-192`.

The adapter compares expected and supplied policy revision, scope/target, and taxonomy values, but returns only booleans for those bindings. Except for history heads and canonical source-result fields, it does not carry the trusted values or a domain-separated test-only digest of them. Consequently, changing both trusted and supplied `policyRevision` and taxonomy version/digest produces a deeply identical evaluation artifact with every binding marked `true`.

That is validation during a call, but it does not satisfy the requirement that the output contain an explicit binding to the proposal, policy revision/state, scoped session, history, and taxonomy. A downstream reader cannot tell which revision or taxonomy a successful evaluation used.

Return either a copied test-only `boundContext` containing the required values or a clearly labeled test-only binding digest over all of them. Do not add the canonical `contentDigest` field reserved for issued policy decisions. Test that two otherwise identical evaluations under different trusted revision/taxonomy contexts produce distinguishable binding output.

## Minor findings

None within this bounded review.

## Validation assessment

The supplied hashes match the reported final adapter and test sources, and the final Node test log reports 9/9 passing. I did not rerun the full suite. I ran only the targeted counterexamples described above, as permitted by the review brief. The three failures are test-coverage gaps rather than evidence that the existing GREEN log is inaccurate.

This review supplies no human approval.
