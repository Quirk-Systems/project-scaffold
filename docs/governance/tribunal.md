# Tribunal compatibility contract

Status: **candidate / draft PR**  
Protocol: `1.0.0`  
Canonical runtime: Zod contracts in `src/lib/quirk/design-tribunal/`  
Human authority: preserved

Tribunal is a main-based compatibility slice for evidence-bearing evaluation.
It composes the already-merged authority and Design Tribunal contracts; it is
not a service, an evaluator, an authority issuer, a database projection, or a
second Tribunal vocabulary. PR #98 does not remain stacked on a foundation
branch.

## Decision

Keep the five executable roles, but give each role exactly one canonical
representation. Compatibility bindings add cross-domain identity, provenance,
and runtime checks without copying an upstream contract into a new dialect.

| Tribunal role          | Canonical source                                  | Compatibility responsibility                                                                                                                                                                |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthorityGrant`       | `governance/authority.ts`                         | Uses the existing signed camelCase grant unchanged; runtime verification binds its subject, scopes, lifecycle, issuer, and evaluator owner                                                  |
| `EvaluatorDeclaration` | `design-tribunal/protocol.ts`                     | Declares evaluator identity, exact inspection boundary, fallibility and calibration, provenance, and the requested subset of an existing grant                                              |
| `EvidenceClaim`        | canonical `DesignEvidence` plus protocol bindings | Preserves the Design evidence source and binds subject, inspector, exact tool and locator, freshness, retention, derivation, and content digests                                            |
| `TribunalVerdict`      | canonical `DesignFinding` plus protocol bindings  | Resolves the exact finding, then binds its criterion, evaluator, grant, subject revision, evidence closure, uncertainty, dissent, and requested evaluator effect                            |
| `DecisionReceipt`      | canonical `HumanDecision` plus protocol bindings  | Preserves the human decision and binds the case basis, receipt predecessor, verdicts, evidence accounting, grants, effect, time, replay nonce, reversibility, digest, and human attestation |

`TribunalCase` is a compatibility envelope, not a sixth authority source. It
binds the canonical request digest, case identity, human authority, trajectory,
evaluation time, criteria, source references, subject revision, proposed
effect, operating scope, five role collections, and effective receipt.

## One canon, no duplicate dialect

The unmerged #98 snake_case grant and handwritten JSON Schema are retired.
They are neither migration inputs nor compatibility aliases. A legacy object
fails with `LEGACY_DIALECT_UNSUPPORTED`; an object mixing canonical and legacy
names fails with `AMBIGUOUS_ALIAS`.

Zod is the only editable schema source in this slice. Any future JSON Schema is
a generated, drift-checked projection of that source. It cannot become a
parallel hand-maintained definition. Adapters may bind canonical objects, but
they may not rename or reinterpret their fields.

## Canonical object resolution

The case is not allowed to authenticate its own copy of upstream state. The
runtime resolves every upstream object from its canonical digest and checks
both its digest and its complete binding to the case:

| Runtime port                                  | Required check                                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolveDesignReviewRequest(requestDigest)`   | Strictly parse the canonical `DesignReviewRequest`, recompute its digest, and match the case ID, purpose, approval requirement, human authority, artifact, criteria, and exact source-reference set                       |
| `resolveDesignFinding(sourceFindingDigest)`   | Strictly parse each canonical `DesignFinding`, recompute its digest, require a non-terminal resolution status, and match its criterion, run, evidence, severity, release block, evaluator, and adapted verdict provenance |
| `resolveTribunalActionManifest(actionDigest)` | Strictly parse the action manifest, recompute its digest, and match its case, request, subject, effect, purpose, tenant, audience, and destination                                                                        |
| `resolveCandidate(candidateDigest)`           | Resolve every declared candidate as bytes and recompute its domain-separated digest; substitutions, missing bytes, and digest mismatches fail closed                                                                      |
| `verifyActionManifest(...)`                   | Authenticate the complete strict manifest out of band, including candidate selection, measured usage, baseline, and prohibited-change checks; only the exact boolean `true` succeeds                                      |
| `verifyEvidenceClaim(...)`                    | Authenticate the exact claim and its signed declaration out of band; a self-computed content digest is integrity metadata, never evaluator identity                                                                       |
| `verifyTribunalVerdict(...)`                  | Authenticate the exact verdict, declaration, canonical finding, and evidence closure out of band; only the exact boolean `true` succeeds                                                                                  |
| `resolvePrincipalId(identity)`                | Resolve issuers, operators, evaluators, and human authorities to stable canonical principals before ownership, trust, self-promotion, independence, or separation checks                                                  |
| `resolvePolicyState()`                        | Return the global versioned authorization snapshot covering principal aliases, trusted issuers and humans, canonical request/finding currentness, and authority, evaluator, action, and receipt attestation keys          |

Resolver values share one cumulative count-and-byte budget and are memoized per
locator or digest for the validation run. Once that budget is exhausted, later
resolution fails closed. Resolved strings, bytes, and canonical objects are
scanned for forbidden credential material before they can influence a digest.
A resolver that throws, returns an asynchronous value, returns malformed data,
or changes identity through an unresolved alias cannot authorize an effect.

## Signed authority binding

Authority tokens use one canonical three-segment form:

```text
base64url(protected header).base64url(canonical grant).base64url(HS256 signature)
```

The protected header is strict and binds `alg: "HS256"`, `issuer`, `keyId`,
the Tribunal authority-token type, and its version. The header issuer must
equal the grant issuer. `resolveAuthorityKey({ issuer, keyId })` selects the
verification key, and accepted HMAC key material must contain at least 256
bits. Rotation assigns a new issuer-bound key ID; revocation removes or denies
that issuer/key-ID resolution and advances policy state. Unknown, malformed,
undersized, cross-issuer, or revoked key material fails closed.

The retired two-segment shared-secret token is rejected as malformed. There is
no shared-secret fallback. An authorized verifier decision returns its exact
`keyReference`. Tribunal preserves that reference in
`verifiedAuthorityGrants`; each effect's grant-lifecycle precondition copies it
to `signingKey` beside the issuer, grant ID, grant digest, nonce, active state,
and lifecycle version. A later commit therefore cannot silently switch the key
identity that authenticated validation.

The existing `AuthorityGrant` has a general `subject` and string scopes. The
compatibility layer reserves exact signed values rather than creating an
unsigned scope projection:

```text
subject = tribunal-case:<caseId>

quirk.tribunal.evaluate
quirk.tribunal.evaluator:<evaluatorId>
quirk.tribunal.realm:<realm>
quirk.tribunal.subject-id:<subjectId>
quirk.tribunal.subject:<sha256 subject revision>
quirk.tribunal.target-class:<targetClass>
quirk.tribunal.effect:<effect>
quirk.tribunal.purpose:<purposeId>
quirk.tribunal.tenant:<tenantId>
quirk.tribunal.audience:<audienceId>
quirk.tribunal.destination:<destinationId>
quirk.tribunal.action:<sha256 action manifest>
```

Every declaration and verdict resolves one signed grant. The signed
declaration scope also binds the declaration core, so inspection boundaries,
fallibility, independence, and requested authority cannot change after the
grant is issued. Unowned, declaration-only, shared, self-issued, and proxy
grants are invalid. Scope cannot be unioned across evaluators. Confidence,
consensus, history, evaluator type, and meta-evaluation never add scopes.

An owned grant contains exactly one evaluator scope, belongs to one
declaration, and cannot be issued by that evaluator or its canonical operator
principal. Shared operator, model-family, or independence axes remain
correlated even when surface IDs differ. The canonical human principal must be
separate from every evaluator principal before a positive effect can proceed.
Grant validity is checked at validation time and at the governed verdict time;
a later grant cannot retroactively authorize an earlier evaluation.

## Evidence and inspection boundary

Inspection is exact, not prefix based. Every non-internal evidence source must
match an explicitly allowed locator, must not match an explicitly denied
locator, and must name an inspection tool declared by that evaluator. Denial
wins. Evidence kind, criterion, subject digest, stable claim, evaluator,
source digest, and content digest must all agree with the canonical request,
finding, declaration, and verdict that consume it.

Evidence and calibration are resolved at execution time through the bounded
runtime adapter. The validator verifies the exact bytes, current expiry,
inspection cutoff, calibration window, confidence ceiling, and separate
content-addressed holdout. A holdout that shares a locator or digest with
calibration, the subject, or case evidence is contaminated. Resolver
memoization prevents a source from changing between checks in one run.

Temporal validity is transitive. Every evidence claim reachable through a
source or `derivedFromEvidenceClaims` reference must exist, match the
reference's `evidenceClaimId` and `contentDigest`, obey the evaluator's exact
source and tool boundary, predate the applicable inspection/evaluation cutoff,
and remain unexpired at execution time. A fresh wrapper cannot launder a stale
or out-of-scope dependency. Cycles, missing edges, verdicts or receipts
presented as primary evidence, and unsupported derived claims fail closed.

Every request criterion must be evaluated, including its required evidence
kinds and evaluator gate. Every case evidence claim must be consumed by a
verdict or by an authenticated action-manifest baseline/prohibition check; an
orphan cannot be included merely to inflate support. Disagreement is grouped
by canonical criterion and subject digest, not caller prose or claim IDs.
Mixed dispositions and `DISPUTED` counter-signals require explicit human
acknowledgment.

## Action boundary for agentic and experimental use

The action digest identifies the complete `TribunalActionManifest`, not a
description of an intended action. The manifest binds the canonical request
and subject to:

- `candidates`, where every entry binds its `digest`, `generatorId`, and
  `independenceKey`, plus exactly one `selectedCandidateDigest`;
- measured rounds, input tokens, output tokens, and wall-clock usage;
- one `prohibitedChangeChecks` entry for every prohibited change, with exact
  `evidenceClaims` references;
- the canonical `baselineEvidence` reference when the request requires one;
  and
- the proposed effect plus exact purpose, tenant, audience, and destination.

The runtime resolves and digest-verifies the bytes for every candidate, then
authenticates the manifest out of band. The canonical request's maximum
candidates, rounds, tokens, and wall-clock budgets are hard ceilings.
`one_of_one` mode requires the configured comparison set rather than silently
collapsing to a single candidate. Every prohibited change must be represented
and clear before a positive effect; unresolved or violated checks block it.
The baseline locator and evidence digest must match canon.

Agents receive no ambient network, filesystem, credential, deployment, or
canon-writing permission from this contract. Adapters resolve only the
declared objects and bytes within bounded ports. Missing infrastructure,
expired evidence, uncertain prohibitions, budget overrun, unresolved identity,
or unavailable human authority pauses the run with typed issues.

## Decision receipts and human gate

Evaluator effects and candidate effects are separate. A signed evaluator grant
may authorize observation, recommendation, or blocking without authorizing the
selected candidate. Approval, publication, canon mutation, and verdict
promotion require an exact authenticated `DecisionReceipt` owned by the named
trusted human principal. `rejected`, `waived`, and `superseded` decisions
never authorize execution. A receipt that omits any verdict or fails to account
for every evidence claim is invalid.

An approved effect additionally requires the receipt to accept every claim in
the complete action-safety evidence closure and every claim in at least one
verdict closure that both requests the proposed effect and remains within its
verified grant. Listing safety or permitting evidence only as rejected or
disputed does not authorize activation.

Negative decisions are still durable decisions. An authenticated rejected or
waived receipt remains atomically appendable with `effect: null`, including
when the case contains a blocking counter-signal or the decision authority and
evaluator resolve to the same canonical principal. Principal separation is an
activation constraint: it blocks a positive effect, not the recording of a
negative decision. A blocking counter-signal on a positive proposal requires a
human decision, but it does not force that decision to approve.

The case-basis digest excludes decision history and the effective-receipt
selector. The genesis receipt has a null predecessor. Each append binds the
immediately previous receipt digest and has a strictly later timestamp; prior
content and attestations never change. The case selects the unique latest
receipt as effective. Historical receipts may already have the same stored
replay digest, but the effective receipt must be unconsumed. A different stored
digest at any chain position is tampering. The trusted external receipt head
prevents a truncated import from replacing known history.

Receipt reversibility is a strict discriminated union. `reversible` requires a
non-empty rollback reference and deadline; `irreversible` forbids both fields.
The commit snapshot mirrors that distinction: a reversible `decisionReceipt`
carries both values, while an irreversible snapshot carries
`rollbackRef: null` and `rollbackDeadline: null`. An approved reversible effect
also requires its rollback deadline to remain open at execution time. Receipt
authentication, head state, replay state, and rollback validity are runtime
checks, not self-authenticating fields in the case.

## Validation output, commit, and activation

`validateTribunalCase(raw, context)` is deterministic and side-effect free. It
returns stable `{ code, path, refs }` issues and does not throw on untrusted
input. On any issue it withholds verified grants, sets every
`evaluatorEffectWithinGrant` entry false, and returns no `commitTransition`.

An issue-free result returns one `commitTransition`. Its `stateWrites` are
present for every valid decision, including a rejection, waiver, observation,
already-applied effect, or other result with no executable effect. They bind:

- `receiptHead`, a compare-and-set from `expectedHead` to `nextHead`; and
- `replayWrites`, each from an expected missing value to the exact receipt
  digest; and
- `receiptAppends`, each from an expected missing receipt ID to the exact
  authenticated receipt snapshot and digest.

`commitTransition.effect` is optional. A null effect means “commit the valid
decision state, execute nothing”; it is not an error and must not discard the
receipt or replay writes. A non-null effect binds the action, selected
candidate, proposed effect, exact operating scope, validation and expiry times,
effective receipt and reversibility data, commit preconditions, and its
idempotency compare-and-set. `selectedCandidate` carries the digest, byte
length, and canonical base64 encoding of the exact byte sequence that was
resolved, hashed, and authenticated during validation.

The validator computes `transitionDigest` over the complete strict transition,
including all receipt-head, append, replay, effect, scope, expiry, lifecycle,
and idempotency fields. The executor must retain that digest through a trusted
out-of-band channel and pass it separately to
`verifyTribunalCommitPreconditions`; a digest supplied only by an untrusted
serialized transition is not an authorization token.

For example, trusted job state stores the digest produced for that job before
the transition leaves the validation boundary:

```ts
const expectedTransitionDigest = trustedJobState.get(jobId);
if (
  !expectedTransitionDigest ||
  !verifyTribunalCommitPreconditions(
    submittedTransition,
    expectedTransitionDigest,
    commitPorts,
  )
) {
  abortWithoutEffect();
}
```

Never recompute the expected value from `submittedTransition`. An attacker can
change a destination or candidate and rehash their submitted object; they
cannot make that digest equal the independently retained trusted-job value.

Every transition also carries
`preconditions.policyState.expectedVersion`. The policy version must advance
whenever principal aliases, trusted issuers or humans, canonical-state policy,
any canonical request or finding becomes fixed, waived, superseded, withdrawn,
or otherwise non-current, or any authority, evaluator, action, or receipt
attestation key changes. A canonical lifecycle change without a policy-version
advance violates the port contract and must keep activation disabled.

The executor must apply the complete `commitTransition` through one atomic
commit boundary. It must first compare the current policy state to
`preconditions.policyState.expectedVersion`, then compare and set the receipt
head, exact receipt appends, and all replay writes. When `effect` is non-null,
the same boundary must also:

1. require the commit-time clock to be strictly earlier than
   `effect.preconditions.executeBefore`;
2. re-read every referenced grant lifecycle and compare both
   `expectedState: "active"` and `expectedVersion` against the exact issuer,
   grant ID, grant digest, and nonce, while retaining the authorized
   issuer-bound `signingKey` reference;
3. compare and set `effect.idempotencyWrite` from its expected missing value to
   its exact next digest; and
4. decode only the canonical base64 in `effect.selectedCandidate.bytes`,
   confirm its length and digest against the rest of `selectedCandidate`, and
   execute that exact byte sequence.

If any time, lifecycle, receipt-head, replay, or idempotency comparison loses,
the whole transition aborts without executing the effect. The executor must
never substitute regenerated or semantically equivalent bytes. If the
external effect cannot share a database transaction, the durable executor must
provide an equivalent idempotent outbox, saga, or compensation boundary before
activation. Reading `ok`, `evaluatorEffectWithinGrant`, a receipt decision, or
an action digest alone must never trigger an effect.

## Compatibility adapters

Adapters are explicit and fail closed. Each accepts a strict top-level envelope
with strict nested bindings and role containers; missing containers, extra
fields, unsafe graphs, and sparse arrays are rejected before mapping or
hashing. Arrays must be dense, and role object IDs are globally unique across
all five role collections so one map cannot shadow another.

Adapter mappings are:

- `DesignReviewRequest -> TribunalCase` preserves the complete canonical
  request, artifact, criteria, source references, budget, mode, prohibited
  changes, baseline, and human-approval fields. The caller supplies only the
  runtime compatibility bindings the canonical request does not own.
- `DesignEvidence -> EvidenceClaim` preserves the source exactly. A missing or
  mismatched digest is rejected rather than synthesized.
- `DesignFinding -> TribunalVerdict` resolves the exact canonical finding,
  maps pass/fail/unresolved to supported/contradicted/insufficient, derives the
  stable claim and evidence bindings, rejects terminal findings, and
  preserves severity and release-blocking counter-signals. Callers cannot
  substitute a finding, claim ID, or evidence set. `blocksRelease` never
  becomes authority.
- `TribunalActionManifest` binds action candidates and execution claims to the
  canonical request before validation; neither the adapter nor caller may
  replace candidate bytes after digesting them.
- `DesignHumanDecision -> DecisionReceipt` embeds the strict canonical human
  decision and requires explicit case, role, effect, reversibility, time,
  nonce, and predecessor bindings.

`DesignReviewReport.status` remains supporting context. It is not a receipt and
does not grant permission.

## Deliberate non-goals and next authority gates

This slice does not activate a database, model call, UI, deployment,
delegation graph, durable keyring, revocation store, or canon mutation. It does
define issuer-bound signing and verification semantics; key lookup, rotation,
revocation, and custody remain the external `resolveAuthorityKey` port rather
than an in-case secret. Issue #97 owns that durable keyring and the durable
grant lifecycle, principal, policy-version, receipt-head, replay, idempotency,
candidate-byte, outbox/rollback, projection, and generated-schema
infrastructure. Implementing those ports is a separate authority and data
decision.

The canonical fixture is generated from runtime digest functions and CI checks
it for drift. PR #66 is conceptual provenance only, not branch ancestry.

## Release decision

**Constrain.** PR #98 remains a draft, main-based compatibility candidate until
the exact head passes full CI and receives independent review. Do not merge,
deploy, admit to canon, mutate canon, or enable autonomous effects from this
document or this PR.
