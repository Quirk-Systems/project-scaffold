# Governed Agent Run Maturity Design

Status: **candidate design / no live effect authority**  
Issue: **#100**  
Depends on: **PR #98 exact head `58d73b083293b745c126b2031b4295e74417e1d5`**  
Canonical location: **Git**  
Projection posture: **Supabase and Google Drive are non-canonical projections**

## 1. Decision

Quirk will implement one governed run protocol with three explicit effect maturity modes:

```text
A. STATE_ONLY
→ B. REVERSIBLE_SANDBOX
→ C. PRODUCTION_GATED
```

The sequence is directional but never automatic. A run, agent, capability, evaluator, component, operator, model, or runtime may not promote itself between modes.

- **A is the immediate implementation target.** It proves persona/context composition, authority resolution, agency locus, policy evaluation, effect candidacy, receipts, and post-run evaluation without executing the proposed effect.
- **B is the first adversarial integration proof.** It executes one exact effect in a disposable sandbox, attacks the containment boundary, rolls the effect back, and independently verifies restoration.
- **C is the controlled destination.** It permits a consequential production effect only after fresh state, fresh authority, fresh policy, an independently authorized decision, atomic execution, and independent postcondition proof.

The protocol composes with the five canonical Tribunal roles from PR #98:

```text
AuthorityGrant
EvaluatorDeclaration
EvidenceClaim
TribunalVerdict
DecisionReceipt
```

It does not copy, rename, or reinterpret those roles.

## 2. Problem

Typical agent systems collapse distinct operations into one opaque chain:

```text
context assembly
→ model proposal
→ assumed permission
→ tool call
→ side effect
→ self-reported success
```

That shape obscures which persona was active, what information was visible or withheld, who originated the goal, which grants applied, who decided, who executed, what changed, and what evidence supports the result.

Quirk requires an inspectable protocol in which no object may impersonate a stronger semantic, epistemic, or authority class than it possesses.

## 3. Goals

The protocol must:

- separate person, identity, persona, character, mask, role, agent, and runtime configuration;
- project actor-specific context from neutral event history without transferring ownership, intent, or permission;
- require agents to propose actions rather than embed approval inside proposals;
- resolve instruction hierarchy and authority outside the language model;
- record agency locus for every consequential stage;
- evaluate policy immediately before any effect boundary;
- represent a proposed transition as an `EffectCandidate`, not an executed effect;
- produce digest-bound trajectories, evidence, and evaluations;
- define explicit A → B and B → C promotion requirements;
- preserve Git as canon while treating databases, documents, dashboards, and graphs as projections;
- fail closed on missing, stale, malformed, ambiguous, over-budget, or unverifiable inputs;
- support the Operator Control Plane without allowing the UI to fabricate authority, evidence, or receipts.

## 4. Non-goals

This design does not:

- create another Tribunal vocabulary;
- activate production effects;
- make an LLM the final policy or authority resolver;
- define a universal persona score or opaque personal algorithm;
- treat roles, credentials, API keys, connected accounts, OAuth sessions, installed plugins, or tool availability as authority grants;
- authorize Supabase or Google Drive to define canon;
- create a general-purpose workflow engine, marketplace, plugin ecosystem, or autonomous swarm;
- prove that every future model follows negative instructions reliably;
- treat successful output as sufficient proof of a valid trajectory.

## 5. Constitutional invariants and positive contracts

Every negative doctrine must compile into a positive executable rule.

| Doctrine | Positive contract |
|---|---|
| Persona selection never implies authority. | Every requested effect resolves an active external `AuthorityGrant`; persona fields contribute zero scopes. |
| Visible context never implies permitted use. | Every projected fact and inference carries an allowed-use class; denial wins. |
| Proposal never implies approval. | `AgentProposal.requestedEffect` remains inert until a separate authority and policy decision exists. |
| Authority resolution must occur outside the LLM. | Deterministic policy/graph logic issues the final resolution over canonical grants and policy state. |
| Role never implies grant. | Role labels may be policy inputs but cannot satisfy a grant reference. |
| Credential never implies authority. | Credential presence enables a connection only; it contributes no governance scope. |
| `EffectCandidate` never implies effect. | Candidate construction cannot access an effect executor and produces no effect receipt. |
| `STATE_ONLY` never executes an effect. | `effectExecutionAllowed` is structurally fixed to `false`. |
| Sandbox authority never crosses into production. | Sandbox grants bind environment, target, credentials, network, write set, and expiry; production targets remain unresolvable. |
| Sandbox success never implies production authority. | C requires a new run, new proposal, fresh state, fresh grant, fresh policy, and fresh decision. |
| Evaluation, confidence, and consensus never increase authority. | Requested effects remain a subset of externally granted effects regardless of scores or evaluator count. |
| Successful output never excuses an invalid trajectory. | Any required identity, authority, evidence, containment, or receipt failure makes the run fail. |

## 6. Protocol decomposition

The protocol contains three composable sub-protocols and one versioned envelope.

```text
Context Integrity
PersonaPlan
→ PerspectiveProjection

Governed Action
AgentProposal
→ ManyTierAuthorityResolution
→ AgencyLocusDeclaration
→ ExecutionPolicyDecision
→ EffectCandidate

Proof and Learning
TrajectoryReceipt
→ EvidenceClaims
→ ExhaustivenessEvaluation
→ DriftEvaluation
→ RegressionEvaluation
```

`GovernedAgentRun` binds the exact revisions and digests across all three.

## 7. Canonical objects

### 7.1 GovernedAgentRun

Purpose: append-only run snapshot binding the current stage of a governed run.

```yaml
governedAgentRun:
  runId:
  runRevision:
  priorRunDigest:
  protocolVersion:
  mode: STATE_ONLY | REVERSIBLE_SANDBOX | PRODUCTION_GATED
  phase:
  status:
  subject:
  realm:
  purposeId:
  tenantId:
  audienceId:
  destinationId:
  policyStateDigest:
  sourceEventDigests: []
  stageDigests:
    personaPlanDigest:
    perspectiveProjectionDigest:
    proposalDigest:
    authorityResolutionDigest:
    agencyLocusDigest:
    executionPolicyDecisionDigest:
    effectCandidateDigest:
    tribunalCaseDigest:
    decisionReceiptDigest:
    trajectoryReceiptDigest:
    evaluationDigests: []
  decisionState: NOT_REQUESTED | PENDING | RECORDED
  createdAt:
  expiresAt:
  contentDigest:
```

Rules:

- A run is represented by immutable revisions; status changes create a new revision linked through `priorRunDigest`.
- Only digests required by the current phase are mandatory. Missing required stage digests fail closed; future-stage digests remain absent rather than fabricated.
- Mode is immutable for the run. A later mode requires a new run ID.
- The run may reference but may not embed mutable copies of canonical upstream objects.
- A run cannot serve as its own authority, evidence, evaluator, or decision source.

### 7.2 PersonaPlan

Purpose: typed runtime composition of persona-related behavior.

```yaml
personaPlan:
  personaPlanId:
  baseIdentityRef:
  roleRefs: []
  traitActivations: []
  register:
  voicePolicy:
  domainStance:
  prohibitedTraits: []
  prohibitedRoleTransfers: []
  contextBoundaryRef:
  requestedEffectCeiling: []
  sourceEvidenceClaimIds: []
  effectiveFrom:
  expiresAt:
  version:
  contentDigest:
```

Rules:

- `requestedEffectCeiling` is a self-imposed proposal limit, not an authority grant.
- Persona plans may affect expression, framing, and proposal strategy, not policy state.
- Persona plans cannot rewrite identity, memory truth, preference truth, or authority grants.
- Persona selection never changes the principal that owns, authorizes, executes, or accepts an action.

### 7.3 PerspectiveProjection

Purpose: actor-specific context derived from neutral event history.

```yaml
perspectiveProjection:
  projectionId:
  personaPlanId:
  actorPrincipalId:
  sourceEventDigests: []
  visibleFactRefs: []
  permittedInferenceRefs: []
  prohibitedInferenceRefs: []
  withheldSourceRefs: []
  uncertaintyRefs: []
  privacyClasses: []
  useClasses: []
  projectionCutoff:
  contentDigest:
```

Rules:

- Shared history does not imply shared perspective.
- Visibility does not imply permission to act on, quote, disclose, retain, or infer from information.
- The projection records exclusions and prohibitions, not only inclusions.
- Inferences remain labeled and cannot silently become facts, identity, memory, preference, policy, or authority.
- Source events remain immutable and the projection is rebuildable.

### 7.4 AgentProposal

Purpose: bounded action recommendation without embedded authority.

```yaml
agentProposal:
  proposalId:
  runId:
  proposerPrincipalId:
  objective:
  proposedCapabilityId:
  proposedMoveId:
  target:
  requestedEffect:
  expectedPriorStateDigest:
  expectedStateDelta:
  alternativesConsidered: []
  rejectedAlternatives: []
  assumptions: []
  evidenceClaimIds: []
  estimatedCost:
  estimatedDuration:
  effectClass:
  expiration:
  contentDigest:
```

Rules:

- `approved`, `authorized`, `safe`, and similar authority booleans are prohibited inside the proposal.
- Every consequential proposal names at least one alternative or records why none exists.
- The requested effect is exact, typed, bounded, and expiring.
- A proposal cannot be replayed against a different state digest.

### 7.5 ManyTierAuthorityResolution

Purpose: deterministic resolution of instruction precedence, grants, policies, prohibitions, and conflicts.

```yaml
manyTierAuthorityResolution:
  resolutionId:
  proposalId:
  instructionNodes: []
  instructionEdges: []
  canonicalPrincipalIds: []
  activeAuthorityGrantIds: []
  applicablePolicyIds: []
  winningInstructionIds: []
  suppressedInstructionIds: []
  unresolvedConflictIds: []
  permittedEffects: []
  prohibitedEffects: []
  requiredHumanReview: []
  result: PERMITTED_CANDIDATE_ONLY | PROHIBITED | HUMAN_REVIEW | UNRESOLVED
  policyStateDigest:
  evaluatedAt:
  contentDigest:
```

Rules:

- The LLM may identify candidate conflicts but cannot issue the final resolution.
- Denial wins where policy declares a prohibition.
- Scope cannot be unioned across personas, roles, evaluators, or unrelated grants.
- A later grant cannot retroactively authorize an earlier proposal or evaluation.
- Unresolved principal aliases, stale grants, unknown policy versions, or ambiguous tiers fail closed.

### 7.6 AgencyLocusDeclaration

Purpose: explicit attribution of agency, ownership, and accountability.

```yaml
agencyLocusDeclaration:
  declarationId:
  goalOriginatorPrincipalId:
  proposalAuthorPrincipalId:
  plannerPrincipalId:
  authorityIssuerPrincipalIds: []
  policyDeciderId:
  candidateBuilderPrincipalId:
  intendedExecutorPrincipalId:
  affectedPrincipalIds: []
  acceptanceOwnerPrincipalId:
  reversalOwnerPrincipalId:
  accountablePrincipalId:
  triggerOrigin: USER | DELEGATE | POLICY | SCHEDULE | ENVIRONMENT | AGENT_DERIVED
  humanInterventionPoints: []
  contentDigest:
```

Rules:

- One principal may occupy multiple loci only where policy explicitly permits it.
- Scheduled execution is not agent-originated intent.
- Proposal ownership, decision ownership, execution ownership, acceptance ownership, and accountability remain distinct.
- Production policy may require evaluator, operator, issuer, executor, and human-authority separation.

### 7.7 ExecutionPolicyDecision

Purpose: final pre-effect policy decision over the exact current run state.

```yaml
executionPolicyDecision:
  policyDecisionId:
  runId:
  proposalDigest:
  authorityResolutionDigest:
  agencyLocusDigest:
  mode:
  decision: ALLOW_CANDIDATE_ONLY | ALLOW_SANDBOX_EFFECT | ALLOW_PRODUCTION_EFFECT | DENY | REQUIRE_HUMAN_REVIEW
  effectExecutionAllowed:
  permittedPreparatoryOperations: []
  deniedOperations: []
  grantIds: []
  policyReasonCodes: []
  policyStateDigest:
  evaluatedAt:
  expiresAt:
  contentDigest:
```

Rules:

- Mode A fixes `effectExecutionAllowed` to `false`.
- Mode B permits only the exact sandbox effect against the exact sandbox target.
- Mode C requires a valid `DecisionReceipt` and execution-time currentness recheck.
- Preparatory operations are classified separately and cannot conceal side effects.
- Stale policy decisions cannot authorize execution.

### 7.8 EffectCandidate

Purpose: content-addressed proposed transition.

```yaml
effectCandidate:
  effectCandidateId:
  runId:
  intendedRunMode: STATE_ONLY | REVERSIBLE_SANDBOX | PRODUCTION_GATED
  effectClass: REVERSIBLE | COMPENSATABLE | IRREVERSIBLE | EXTERNAL_CONSEQUENTIAL
  targetClass:
  targetLocator:
  expectedPriorStateDigest:
  proposedNextStateDigest:
  actionManifestDigest:
  candidateByteDigests: []
  exactWriteSet: []
  exactExternalCalls: []
  exactToolBindings: []
  expectedOutputs: []
  requiredPostconditions: []
  rollbackPlanRef:
  compensationPlanRef:
  expiration:
  contentDigest:
```

Rules:

- Mode A may describe a future effect class but cannot execute it.
- Any write, call, tool, target, or output not declared in the signed candidate fails closed.
- The prior-state digest must match immediately before execution.
- Candidate bytes are resolved and hashed independently.
- Reversibility labels must be proved by mode-specific tests; compensation is never mislabeled rollback.

### 7.9 TrajectoryReceipt

Purpose: append-only proof of the complete run path.

```yaml
trajectoryReceipt:
  receiptId:
  runId:
  mode:
  priorReceiptId:
  principalIds: []
  objectDigests: []
  toolCalls: []
  blockedCalls: []
  policyChecks: []
  effectExecuted:
  executionReceiptIds: []
  stateDelta:
  terminationReason:
  startedAt:
  completedAt:
  cost:
  latency:
  contentDigest:
```

Every consequential receipt answers:

1. What happened?
2. Why was it allowed or blocked?
3. What changed?

A success badge without those answers is not a receipt.

### 7.10 Evaluation subjects

`ExhaustivenessEvaluation`, `DriftEvaluation`, and `RegressionEvaluation` are evaluation subjects bound to canonical `EvaluatorDeclaration`, `EvidenceClaim`, and `TribunalVerdict` objects. They do not create a second evidence vocabulary.

Minimum concerns:

- constraint inventory and all-constraints success;
- hypothesis and branch coverage;
- omitted surfaces and residual uncertainty;
- authority-transition coverage;
- tool and state-mutation coverage;
- persona identity, role, preference, memory, and authority drift;
- protected-property preservation;
- baseline and holdout separation;
- explicit stopping rule.

## 8. Mode A — STATE_ONLY

### Allowed

- read explicitly permitted sources;
- build persona and perspective objects;
- propose a bounded action;
- resolve authority and policy;
- declare agency locus;
- construct an exact `EffectCandidate`;
- run deterministic validators and offline evaluators;
- construct a Tribunal case and, when needed, a state-only human decision;
- store candidate, evidence, evaluation, and receipt projections;
- request review.

### Prohibited

- external writes;
- production database mutation;
- Git canon mutation;
- publication, social posting, customer communication, payments, purchases, or other third-party effects;
- destructive file operations;
- secret-bearing calls whose side effects cannot be excluded;
- autonomous grant creation or modification;
- effect execution disguised as preview, validation, preparation, sync, test, or dry run.

### Required final state

```text
Candidate state may change.
Evidence state may change.
Receipt state may change.
No external target state may change.
```

### Fail closed when

- a required canonical object cannot be resolved;
- principal identity is ambiguous;
- policy or grant state is stale or malformed;
- source, context, evidence, time, or cost budgets are exceeded;
- a preparatory tool has undeclared side effects;
- the proposal lacks an exact candidate;
- the trajectory attempts an effect-capable call;
- evidence is circular, stale, contaminated, out of scope, or unavailable.

## 9. Mode B — REVERSIBLE_SANDBOX

### Sandbox contract

```yaml
sandboxContract:
  sandboxId:
  provider:
  environmentDigest:
  isolatedCredentialRefs: []
  productionCredentialsAllowed: false
  filesystemAllowlist: []
  networkAllowlist: []
  networkDefault: DENY
  runtimeLimit:
  costLimit:
  memoryLimit:
  exactWriteTargets: []
  destructiveOperations: DENY
  immutableLogSink:
  initialStateDigest:
  expiration:
  contentDigest:
```

### Execution flow

```text
Validated Mode A run
→ fresh sandbox provision
→ fresh authority and policy recheck
→ exact candidate execution
→ boundary-violation capture
→ postcondition inspection
→ rollback
→ independent restoration verification
→ effect and rollback receipts
```

### First adversarial proof

A hostile tool or component response attempts to:

- expand the write set;
- call an unlisted endpoint;
- access production credentials;
- change realm, tenant, audience, destination, or target;
- suppress rollback;
- declare its own success;
- promote sandbox output to canon;
- convert evaluator confidence into approval.

Expected behavior:

- only the original exact sandbox candidate executes;
- every expansion is blocked and receipted;
- rollback executes;
- independent verification matches the initial state digest;
- no production, canonical, customer, or external consequential state changes.

### Required receipts

- `SandboxProvisionReceipt`
- `AuthorityRecheckReceipt`
- `EffectReceipt`
- `BoundaryViolationReceipt`
- `RollbackReceipt`
- `RestorationVerificationReceipt`

These bind into the canonical receipt/evidence graph and do not replace `DecisionReceipt`.

## 10. Mode C — PRODUCTION_GATED

C remains unavailable until all of the following exist and receive independent review:

- canonical principal resolver;
- issuer-bound signing-key registry with rotation and revocation;
- active grant lifecycle/currentness store;
- content-addressed evidence and candidate-byte resolvers;
- complete evidence derivation closure;
- current policy snapshot resolver;
- receipt-chain-head compare-and-swap;
- replay and nonce protection;
- trusted transition-digest store;
- atomic state compare-and-swap plus transactional outbox;
- idempotency and partial-failure recovery;
- effect classification and recovery contract;
- human/codeowner approval where required;
- incident, pause, kill-switch, rollback, and compensation procedures;
- independent postcondition verifier.

### Production flow

```text
A evidence
→ B adversarial and rollback proof
→ new production run
→ fresh production state snapshot
→ fresh authority and policy resolution
→ independently authorized decision
→ DecisionReceipt
→ trusted transition construction
→ atomic precondition check
→ effect execution
→ receipt and outbox
→ independent postcondition verification
→ projection refresh
```

A or B evidence cannot be replayed as C authorization.

### Effect classes

- `REVERSIBLE`: exact rollback restores prior state.
- `COMPENSATABLE`: prior state cannot be restored, but a declared compensating action exists.
- `IRREVERSIBLE`: no rollback or compensation; heightened approval required.
- `EXTERNAL_CONSEQUENTIAL`: affects a third party, public surface, financial state, legal/compliance state, or external account.

## 11. State machine

Core phases:

```text
DRAFT
→ CONTEXT_COMPOSED
→ PROPOSED
→ AUTHORITY_RESOLVED
→ AGENCY_DECLARED
→ POLICY_DECIDED
→ CANDIDATE_BUILT
→ EVALUATED
→ DECISION_RECORDED or DECISION_NOT_REQUESTED
→ MODE_COMPLETE
```

Mode B adds:

```text
SANDBOX_PROVISIONED
→ AUTHORITY_RECHECKED
→ EFFECT_EXECUTED
→ POSTCONDITION_CHECKED
→ ROLLBACK_EXECUTED
→ RESTORATION_VERIFIED
```

Mode C adds:

```text
PRODUCTION_CURRENTNESS_VERIFIED
→ ATOMIC_COMMIT_STARTED
→ EFFECT_COMMITTED
→ OUTBOX_RECORDED
→ POSTCONDITION_VERIFIED
→ PROJECTION_REFRESHED
```

Terminal failures:

```text
DENIED
UNRESOLVED
EXPIRED
CANCELLED
BUDGET_EXHAUSTED
BOUNDARY_VIOLATION
PARTIAL_FAILURE_CONTAINED
ROLLBACK_FAILED
POSTCONDITION_FAILED
INCIDENT_ESCALATED
```

No terminal failure may be rewritten as success.

## 12. Retry, idempotency, cancellation, and partial failure

- Reads and pure validation may retry only within declared budgets.
- Proposals and candidates are content-addressed and reconstructed rather than mutated in place.
- Effect execution requires an idempotency key bound to run, candidate, target, and prior state.
- Retries never bypass fresh authority and currentness checks.
- Cancellation produces a receipt and prevents replay.
- Mode B rollback failure blocks promotion and escalates immediately.
- Mode C partial failure uses the transactional outbox plus declared compensation or incident paths.
- Timeouts are explicit failures, not permission to continue asynchronously without authority.

## 13. Security, privacy, and secrets

- Secrets are runtime credentials, not canon, evidence payloads, prompt text, projection content, screenshots, or logs.
- Persona and perspective objects classify personal, confidential, regulated, and prohibited information.
- Projections may contain secret references or presence metadata, never plaintext or recoverable derivatives.
- Tool outputs are untrusted and cannot issue state transitions.
- Unicode normalization, strict parsing, raw-payload budgets, and credential-pattern scanning occur before model context ingestion.
- State transitions are authenticated outside the model.
- A malicious or compromised model may propose; it cannot grant, decide, or execute by assertion.
- Retention and deletion classes are explicit for events, projections, trajectories, evidence, and receipts.
- Deletion may preserve non-secret provenance tombstones where lineage or legal hold requires them.

## 14. Cross-system responsibilities

### GitHub — canonical

Owns contracts, Zod schemas, fixtures, policies, invariant definitions, implementation source, reviewed decisions, canonical history, CI evidence, and exact-head provenance.

A GitHub workflow or green PR does not itself create runtime authority.

### Supabase — runtime projection and operational state

Existing adjacent projections:

```text
quirk_sync.object_registry
quirk_sync.manifest_registry
quirk_sync.proposed_moves
quirk_sync.run_receipts
quirk_sync.manifest_transition_ledger
quirk_sync.projection_outbox
```

Candidate future projection tables:

```text
quirk_runtime.governed_runs
quirk_runtime.persona_plans
quirk_runtime.perspective_projections
quirk_runtime.agent_proposals
quirk_runtime.authority_resolutions
quirk_runtime.agency_locus_declarations
quirk_runtime.policy_decisions
quirk_runtime.effect_candidates
quirk_runtime.trajectory_receipts
quirk_runtime.evaluation_refs
```

Rules:

- projections preserve canonical path, schema version, commit SHA, content digest, and projection-run ID;
- no projection row mutates Git canon;
- RLS/access posture is designed before exposure;
- state-only writes are limited to candidate, evidence, evaluation, and receipt projections;
- effect/outbox paths remain disabled until the relevant mode is admitted.

### Google Drive — review projection

Drive may contain readable review copies, diagrams, tables, and comments.

Rules:

- every Drive copy is labeled non-canonical;
- Drive edits do not change Git canon;
- comments become proposed changes or evidence only after explicit capture;
- duplicated documents do not create duplicate architecture authority;
- sensitive content follows explicit sharing and retention policy.

## 15. Operator Control Plane contract

The UI always exposes a truth bar:

```text
CANON       <commit or digest>
PROJECTION  <snapshot or projection run>
POLICY      <policy-state digest>
OPERATOR    <canonical principal>
RUN MODE    STATE_ONLY | REVERSIBLE_SANDBOX | PRODUCTION_GATED
EFFECTS     DISABLED | SANDBOX_ONLY | PRODUCTION_GATED
```

UI commands never directly mutate authoritative state.

- `Accept Interpretation` creates a candidate, not canon.
- `Approve Proposed Transition` records a decision or candidate transition, not an effect.
- `Admitted` does not mean canonical.
- Roles do not display as grants.
- Confidence appears on a specific verdict, not on an object.
- Fixture and demo data is visibly labeled.
- Every blocked effect exposes the authority, policy, currentness, containment, or evidence reason.

## 16. Observability and evidence

Every run emits stable correlation identifiers:

```text
run_id
trace_id
span_id
principal_id
persona_plan_digest
perspective_projection_digest
proposal_digest
authority_resolution_digest
agency_locus_digest
policy_decision_digest
effect_candidate_digest
decision_receipt_digest
trajectory_receipt_digest
```

Operational telemetry answers whether the system ran, retried, failed, cost money, or exceeded limits. Quirk evidence answers whether claims are supported, the trajectory was legitimate, and state actually changed.

Telemetry is not automatically evidence. Evidence is not automatically a decision.

## 17. Adversarial fixture matrix

### Persona and perspective

- persona-selection-is-not-authority
- persona-mask-is-not-identity
- role-is-not-grant
- visible-context-is-not-permitted-use
- shared-history-is-not-shared-perspective
- inferred-state-is-not-memory-truth
- persona-drift-does-not-change-policy

### Proposal and authority

- proposal-claims-approval
- many-tier-conflict-depth-12
- stale-grant
- later-grant-retroactive-authorization
- evaluator-self-promotion
- ensemble-coup
- confidence-laundering
- unresolved-principal-alias
- cross-realm-scope-laundering

### Policy and effect boundary

- state-only-tool-has-hidden-side-effect
- preparation-is-undeclared-effect
- candidate-is-not-effect
- candidate-write-set-expansion
- tool-output-injects-state-ack
- stale-policy-decision
- target-state-digest-mismatch
- replayed-cancelled-run

### Sandbox

- production-credential-access
- unlisted-network-egress
- rollback-suppression
- sandbox-to-canon-promotion
- sandbox-to-production-target-swap
- partial-rollback
- restoration-verifier-correlation
- sandbox-success-is-not-production-authority

### Evidence and evaluation

- verdict-as-primary-evidence
- circular-evidence
- stale-derived-evidence-wrapper
- contaminated-holdout
- incomplete-constraint-coverage
- stopping-rule-omitted
- correct-output-invalid-trajectory
- evaluator-out-of-scope

### Production

- stale-production-snapshot
- receipt-chain-head-race
- duplicate-idempotency-key-different-payload
- outbox-write-without-effect
- effect-without-outbox
- postcondition-failure-reported-as-success
- irreversible-effect-with-reversible-label
- external-consequential-effect-without-human-decision

## 18. Promotion gates

### A → B

Requires a complete Mode A trajectory, resolved authority conflicts, exact candidate, approved sandbox contract, isolated credentials, deny-by-default network, reversibility classification, adversarial fixture plan, and no unresolved identity, secret, scope, or currentness ambiguity.

An `AtoBPromotionReceipt` records eligibility evidence. It grants no B authority by itself.

### B → C

Requires hostile sandbox success, rollback and independent restoration proof, post-fix replay, durable runtime ports, current production policy and grant state, independent human/codeowner approval where applicable, atomic effect/receipt path, incident and kill-switch procedure, and a production-specific candidate built from fresh state.

A `BtoCEligibilityReceipt` records eligibility. Eligibility is not production authorization.

## 19. Versioning and compatibility

- Zod remains the editable schema source where PR #98 established it.
- JSON Schema, database types, docs, and UI types are generated or drift-checked projections.
- New contracts use strict camelCase canon.
- Unknown fields and unsupported aliases fail closed.
- Protocol versions are explicit and immutable per run.
- Compatibility adapters bind canonical objects; they may not reinterpret authority or evidence.
- Superseded runs and schemas remain recoverable through lineage without remaining active.

## 20. Implementation sequence after written-spec approval

This is sequencing, not the executable implementation plan.

1. Strict Mode A contracts and fixture generator.
2. Deterministic authority-resolution and policy-decision ports with in-memory test implementations.
3. State-only run assembler and trajectory receipt.
4. Persona/perspective drift and exhaustiveness evaluation subjects.
5. Private Supabase projections for Mode A.
6. Operator Control Plane in read/candidate mode with effects disabled.
7. Sandbox contract and first hostile Mode B adapter.
8. Independent rollback and restoration proof.
9. Durable C runtime-port design and independent review.
10. No production activation until C receives its own decision and receipts.

## 21. Forgotten-edge checklist

The implementation plan must cover:

- clock skew and canonical time;
- principal alias changes;
- key rotation during a long run;
- policy changes between proposal and execution;
- evidence/source revocation during a run;
- model/provider substitution;
- tool schema drift;
- sandbox provider outage and image tampering;
- logs containing sensitive context;
- partial evidence availability;
- human approval timeout and revocation;
- duplicate decisions and simultaneous operators;
- browser replay, stale projections, and offline/stale-but-visible UI;
- resource exhaustion and cancellation during rollback;
- retention expiry before audit completion and legal hold;
- provider portability and exit;
- accessibility of authority, uncertainty, and failure states;
- fixture data mistaken for live evidence;
- evaluation changes after model updates;
- verifier correlation through shared model/operator lineage;
- reversible internal state with irreversible external consequences;
- compensation mislabeled as rollback;
- agent-derived goals surviving after delegation expiry.

## 22. Risks

### Overbuilding

The protocol could become a universal workflow ontology. Implement only what Mode A requires, then B.

### False formality

Digests and receipts can imitate rigor without independent currentness, identity, evidence, or postcondition verification. Every digest must resolve to a canonical object or exact bytes.

### Policy complexity

Many-tier authority can become unreadable. Keep tier vocabulary small, expose the resolution path, and test deep conflicts adversarially.

### Projection drift

Supabase, Drive, UI, and generated schemas can diverge from Git. Preserve projection-run IDs and run drift checks.

### Human-gate theater

A button click is not sufficient authority. The decision binds the exact case, effect, evidence, state, and active grant.

## 23. Definition of done for this design

The design is ready for implementation planning when:

- it is committed in Git;
- a non-canonical Google Drive review projection exists;
- PR #98 remains the only authority/evidence contract source;
- A, B, and C boundaries are explicit with no silent escalation;
- every object has one responsibility and clear digest/provenance semantics;
- failure, retry, cancellation, replay, rollback, compensation, and incident paths are specified;
- Git, Supabase, Drive, and UI responsibilities are unambiguous;
- the fixture matrix is concrete enough to write failing tests first;
- Bryan reviews and approves the written spec for implementation planning.

## 24. Closing rule

```text
Reason about the effect.
Prove the boundary.
Earn the right to execute.
```
