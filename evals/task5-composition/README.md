# Task 5 composition adapter proof

**CANDIDATE / STATE_ONLY / TEST-ONLY. Independent human review remains open.**

Owner: `Quirk-Systems/project-scaffold`.

This proof asks whether one composition constraint can narrow Mode A candidate
eligibility while preserving the existing authority result, review obligations,
unresolved conflicts, and no-effect boundary.

## Source and scope

- PR #104 baseline: `58cefdb21164f1e7968d03051dfb52a93a24f4e8`.
- PR #102 plan: `47279f5f9cbee8dfcb97b21ca3da024294f1bad9`.
- Original plan blob: `82a5105dbde190d3145cf8cdf0c4d0c2570b0dbe`.
- Source file: `docs/superpowers/plans/2026-08-28-governed-agent-run-state-only.md`.
- Source interfaces: Task 4 `ManyTierAuthorityResolution`; Task 5
  `ExecutionPolicyDecision` and `GovernedRunResult`.

Task 4/5 exist as planned contracts and code, not implemented runtime modules
in this source tree. Fixtures use the complete planned result shapes. This
exercise does not execute the Task 4 resolver, validate raw grants, run the
planned Zod schemas, or prove a production integration. Task 4 is unchanged.
Canonical digest fields in the fixtures are synthetic values in the planned
format; this proof does not recompute or authenticate those canonical digests.

The canonical-shaped input results remain intact. The adapter produces a separate
test-only evaluation with an effective eligibility decision and provenance
binding. It does not mint a canonical policy decision, an AuthorityGrant,
an EffectReceipt, or another admitted authority/evidence dialect.

## Candidate restriction and matched control

A blind-review candidate rationale must not be composed from its reference
answer key. Reading the synthetic, non-secret answer key is `PURE`; preparing
the rationale is `CANDIDATE_STATE`. Both are individually inert. Combining
them for the same scoped candidate violates this fixture policy. The matched
control reads a public rubric instead of the answer key.

The restriction is a candidate policy example supplied by this experiment.
Action labels are test taxonomy entries, not a real semantic classifier or an
admitted tool registry. An honestly classified external operation remains
blocked by the existing Task 5 failure result, even with clean composition.

## Expected matrix

| Task 4 outcome | Clean | Prohibited composition | Untrusted required history |
| --- | --- | --- | --- |
| `PERMITTED_CANDIDATE_ONLY` | `ALLOW_CANDIDATE_ONLY` | `DENY` | `DENY` |
| `HUMAN_REVIEW` | `REQUIRE_HUMAN_REVIEW` | `REQUIRE_HUMAN_REVIEW` | `REQUIRE_HUMAN_REVIEW` |
| `PROHIBITED` | `DENY` | `DENY` | `DENY` |
| `UNRESOLVED` | `DENY` | `DENY` | `DENY` |

Review rows never become candidate eligible. Composition/history blocks are
retained alongside the existing human obligation. Unresolved conflict IDs and
grant boundaries survive every evaluation. Every output fixes
`effectExecutionAllowed: false`.

## Trust and evidence boundary

Expected context comes from the trusted local test harness. The adapter compares
the supplied evidence with that separate expected context: proposal, policy
revision and content, session scope, history head and content, and action-taxonomy
version and content. Test-only digests detect substitutions within that model;
they do not authenticate a remote history producer.

The returned evaluation retains explicit expected and supplied binding values,
with a domain-separated test-only evaluation digest. That digest binds the
effective decision to its context and carried canonical identities; it does not
replace a canonical policy digest or constitute authorization.

The history is explicitly simulated. It is never represented as proof that an
operation ran. This probe evaluates nonempty simulated traces, including the
candidate operation, and denies empty input. It does not implement session
initialization or reset; future initial-state handling must bind the same scope
and trusted history head. A malicious or compromised trusted harness can still supply a fabricated
world; external authentication, persistence, revocation, reset/delegation
inheritance, concurrent admission and real event lifecycle handling are unproved.

The wrapper must remain outside production imports. Production adoption requires
an independently reviewed contract binding and integration proof, including
canonical schema validation, real verified-grant handling, full repository
validation, and human approval. This proof supplies no B/C authorization,
deployment, migration, Canon promotion, or merge approval.

## Reproduce

```bash
node --test evals/task5-composition/adapter.test.mjs
node --test evals/session-composition/probe.test.mjs
```

No packages, credentials, database, network, model or executor are required by
these local tests. Full red/green evidence and source identities are recorded
under `evidence/`; consult `evidence/receipt.json` for the observed runtime,
tested source identities, outcomes, and unverified surfaces.

Repository Bun/Vitest/type-check/build validation remains a separate gate. The
existing Vitest include pattern does not discover these Node `.mjs` tests;
these commands must be explicitly executed before relying on this candidate.
