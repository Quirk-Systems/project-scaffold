# Task 4/5 composition adapter proof

**CANDIDATE / STATE_ONLY / TEST-ONLY. Disposition: Constrain.**
Owner: `Quirk-Systems/project-scaffold`. Independent human review remains open.

This experiment asks whether a composition veto adds useful denial to otherwise
eligible Mode A candidate operations while preserving authority outcomes. It
extends the [original probe](../README.md) at
`58cefdb21164f1e7968d03051dfb52a93a24f4e8` and proposes the documented test obligation
for plan #102 at `47279f5f9cbee8dfcb97b21ca3da024294f1bad9`.

## Reproduce

From a normal repository checkout with Node 20+ and the repository dependencies:

```bash
bun install --frozen-lockfile --ignore-scripts
node --test evals/session-composition/adapter/adapter.test.mjs
node evals/session-composition/adapter/verify.mjs --check
```

The verifier runs the original probe, the adapter suite, the four-authority by
three-history matrix, deterministic examples, and an isolated history-erasure
mutation. It compares results and source hashes to `verification.json`. No network,
model, database, or application effect is called by the proof. The verifier uses
temporary local files and child test processes; the adapter itself performs no I/O.

For a reviewed source change, record new evidence explicitly:

```bash
node evals/session-composition/adapter/verify.mjs --write
```

Review the changed sources and expectations before committing the new receipt.
Never update source pins automatically to suppress a drift failure. `--write`
records `verification.json`, `verification-tests.tap`,
`verification-receipt-tests.tap`, and `history-ablation.tap`.
It also verifies the retained `consolidation-first-run.tap` without rewriting it.
The JSON identifies the precise source hashes, runtime versions, measured outcomes,
and unproved surfaces. The receipt excludes its own bytes to avoid a self-reference;
the containing Git commit identifies the complete published pack. CI replay checks
out the PR head, checks those source hashes, and reports its own runtime separately.

Replay compares the entire receipt contract, including candidate status, authority
and human-review claims, provenance, and unproved surfaces. It requires exactly
the recorded log set and checks those logs against their recorded hashes. The set
includes three generated logs and the retained consolidation log. Historical
Node/TypeScript/Zod versions and raw-log timings may differ from a replay; their
validated observation fields are kept separate from the invariant claims. Replay
does not authenticate the historical environment; it reports the recording and
replay versions separately. A green replay cannot turn an edited
`independentHumanReviewSatisfied: true` into approval.

## What is actually executed

`plan-contracts.mjs` extracts the exact planned action/primitives schemas and Task 5
function from the existing Markdown. It verifies explicit SHA256 pins, transpiles
them, and imports the repository's pinned Tribunal schemas and `digestCanonical`.
Temporary modules are removed on completion or failure. Duplicate or missing blocks,
unrecognized imports, and source drift fail before execution.

The adapter tests parse complete `ManyTierAuthorityResolution` and
`ExecutionPolicyDecision` objects using those Zod schemas, then call the planned
Task 5 function to produce base policy results. Production Task 4/5 modules do not
exist at this baseline. The Task 4 resolver is neither reimplemented nor executed;
its source and semantics remain unchanged. Transpilation is not a semantic
TypeScript check or proof of application integration.

## Candidate contract

`createCompositionAdapter({ contracts, policy, resolveHistory })(request)` consumes
one candidate operation, its proposal, authority result, policy result, agency
declaration, scoped history handle, and explicit bindings. It returns a
`CompositionConstraintCandidate` with immutable snapshots of the originals, a
canonical effective policy result where representable, reasons, bindings, and digest.
`candidateEligible` can only narrow a valid base candidate allowance;
`effectExecutionAllowed` is always false.

The bound data includes proposal and authority digests, the full original policy
result, policy revision, run/session/tenant/environment/decision-slot scope, history
head, taxonomy version, full composition-policy digest (including taxonomy), and
operations digest. It checks source hashes and cross-object consistency, not just
schema validity. The original authority/review/conflict/grant records are retained
when the effective decision becomes `DENY`. If a valid source cannot accommodate
an additional denial within schema limits, the effective result is null, eligibility
is false, and the parsed source obligations remain in the wrapper.

All consumers of this experiment must treat a false eligibility bit or absent
effective result as blocked. The wrapper is test-only. Task 2/3 schema and digest
review and Task 6 consumer enforcement are prerequisites for an operative integration.
The original policy object alone has not acquired history validation.

## Useful Mode A cases

The fixture declares one simulated allocation slot. Accepting candidate A and then
accepting mutually exclusive candidate B violates that fixture policy. Revising the
rationale after A remains eligible. These are in-memory candidate-state/pure actions;
ordinary comparison or drafting of alternatives is not prohibited by this rule.
The `probe.*` action taxonomy is a declared test vocabulary, not admitted Quirk Moves.
An honestly classified external operation remains blocked by the actual planned
Task 5 code under every tested history.

A second fixture declares one synthetic blind-review candidate. Reading its
non-secret answer key and building its blind rationale is a prohibited pair in
either order. Either action alone remains eligible, as does building the rationale
after reading a public rubric. This tests a supplied composition rule; it does not
detect semantic contamination. The cases and execution/receipt-spoofing expectations
are adapted from #105 into this same harness. See the
[source comparison and proposed disposition](evidence-lineage.md) for exact source
identities, retained history semantics, and development-evidence limits.

The history resolver owns the initial opaque handles and returns a test-only
attestation `{ proposalDigest, scopeDigest, history }`. The proposal/scope
association is fixed when the fixture is built. Recomputing request or history
digests does not reissue that association. A valid clean history for another
proposal or scope cannot clear the current proposal. Caller JSON or a replacement
handle cannot manufacture a trusted snapshot. This models an upstream verifier;
it does not implement real history authentication. `PROPOSED` and `DENIED` events
remain digest-bound but do not count as accepted actions. `SIMULATED_ACCEPTED`
contributes. `RESERVED`, `COMMITTED`, `FAILED`, and `UNKNOWN_OUTCOME` block this bounded
simulation-only adapter. Supported events require `SIMULATION` provenance. No
simulation event becomes executed-effect evidence.

## Coverage and limits

The [receipt](verification.json) provides counts and exact matrix outcomes. Tests
cover binding substitution, review/conflict/grant preservation, source contradictions,
misclassification, missing/untrusted history, schema limits, and nonmutation. Erasing
history in a disposable adapter copy must fail both the exclusive-selection and
blind-review fixture families. Execution/receipt claims and unexpected event or
operation fields must be rejected even after their bindings are recomputed. These
are strict schema-boundary tests, not evidence of real history authentication. The
original suite first ran green. A later consolidation audit retained additional
contradictory-obligation, output-isolation, digest-sensitivity, and unchanged-label
policy/taxonomy substitution regressions. Its first run had two invalid fixture
identifiers; the [raw log](consolidation-first-run.tap) and receipt preserve that
correction without claiming an implementation repair. The history mutation is
subsequent disproof evidence, not preimplementation red/green evidence.

History trust, real grant verification, live-clock freshness/revocation, concurrent
admission, child-session inheritance, and production consumers remain unproved.
Timestamp checks reject inconsistent source intervals; they do not establish that a
historical fixture decision is current. Full repository validation is a separate
gate. See [candidate decision and integration obligations](../../../docs/governance/session-composition-candidate.md)
and [agent review](agent-review.md). Agent review cannot satisfy the independent
human gate. Removing this candidate pack requires no runtime rollback or migration.
