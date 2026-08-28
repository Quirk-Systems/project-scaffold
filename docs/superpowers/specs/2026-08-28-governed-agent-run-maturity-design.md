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

The sequence is directional but not automatic. A run, agent, capability, evaluator, component, operator, or runtime may never promote itself from one mode to another.

- **A is the immediate implementation target.** It proves the complete context, authority, policy, agency-locus, candidate-transition, evidence, and evaluation chain without executing the proposed effect.
- **B is the first adversarial integration proof.** It executes a narrowly declared effect in a disposable sandbox, attacks the boundary, rolls the effect back, and independently verifies exact restoration.
- **C is the controlled destination.** It permits a consequential production effect only after fresh authority, fresh policy, fresh state, independent approval, atomic execution, and postcondition proof.

This protocol composes with the canonical Tribunal roles already defined by PR #98:

```text
AuthorityGrant
EvaluatorDeclaration
EvidenceClaim
TribunalVerdict
DecisionReceipt
```

It does not duplicate or rename those roles.

## 2. Problem

Agent systems frequently collapse several distinct operations into one opaque action:

```text
context assembly
→ model proposal
→ assumed permission
→ tool call
→ side effect
→ self-reported success
```

That shape makes it difficult to answer:

1. Which persona and perspective were active?
2. Which information was visible, withheld, inferred, or prohibited?
3. Who originated the goal?
4. Who proposed the action?
5. Which authority grants and policies applied?
6. Who decided, executed, accepted, and could reverse the effect?
7. What exact change was proposed?
8. What exact change occurred?
9. Which evidence supports the run's claims?
10. Which important alternatives, constraints, and failure classes remain untested?

Quirk needs an inspectable run protocol in which no object may impersonate a stronger epistemic, semantic, or authority class than it possesses.

## 3. Goals

The protocol must:

- separate persona composition from identity and authority;
- project perspective from neutral event history without transferring ownership, intent, or permissions;
- require agents to propose actions rather than embed approval claims inside proposals;
- resolve instruction hierarchy and authority outside the language model;
- record agency locus for every consequential stage;
- evaluate policy immediately before any effect boundary;
- represent a proposed state change as an `EffectCandidate`, not an executed effect;
- produce digest-bound trajectories, evidence, and evaluation records;
- define a complete A → B → C promotion path;
- preserve Git as canon and make every runtime/database/document surface a projection;
- fail closed on missing, stale, malformed, ambiguous, over-budget, or unverified inputs;
- support the Operator Control Plane without allowing the UI to fabricate authority or receipts.

## 4. Non-goals

This design does not:

- create a new Tribunal vocabulary;
- activate production effects;
- make an LLM the final policy or authority resolver;
- define one universal persona score;
- treat roles, credentials, API keys, connected accounts, or OAuth sessions as authority grants;
- authorize Supabase to write canon;
- make Google Drive a source of semantic truth;
- create a general-purpose workflow engine;
- prove that every future tool or model follows instructions reliably;
- define a marketplace, plugin ecosystem, or autonomous swarm;
- treat successful output as sufficient proof of a valid trajectory.

## 5. Constitutional invariants and positive contracts

Each negative doctrine must compile into a positive executable contract.

| Doctrine | Positive contract |
|---|---|
| Persona selection never implies authority. | Every requested effect must resolve an active external `AuthorityGrant`; no persona field contributes scopes. |
| Visible context never implies permitted use. | Every projected fact or inference carries an explicit use class; denied use always wins. |
| Proposal never implies approval. | `AgentProposal.requestedEffect` is inert until authority and policy resolution produce a separately signed decision. |
| Authority resolution must occur outside the LLM. | The final resolution is produced by deterministic policy/graph logic over canonical grants and policy state. |
| Role never implies grant. | Role labels may be policy inputs but cannot satisfy any grant reference. |
| Credential never implies authority. | Credential presence may enable a connection but contributes zero scopes. |
| `EffectCandidate` never implies effect. | Candidate construction writes no external state and has no effect receipt. |
| `STATE_ONLY` never executes an effect. | `effectExecutionAllowed` is structurally fixed to `false` and runtime adapters expose no effect executor. |
| Sandbox authority never crosses into production. | Sandbox grants bind environment, target class, credentials, network, write set, and expiry; production targets are unresolvable. |
| Successful sandbox execution never implies production authority. | C requires a fresh production proposal, fresh state, fresh grant, fresh decision, and fresh policy resolution. |
| Evaluation/confidence/consensus never increase authority. | Requested effects remain a subset of externally granted effects regardless of score or evaluator count. |
| Successful output never excuses an invalid trajectory. | A run fails if any required identity, authority, evidence, containment, or receipt invariant fails. |

## 6. Protocol decomposition

The protocol has three composable sub-protocols and one envelope.

```text
A. Context Integrity
PersonaPlan
→ PerspectiveProjection

B. Governed Action
AgentProposal
→ ManyTierAuthorityResolution
→ AgencyLocusDeclaration
→ ExecutionPolicyDecision
→ EffectCandidate

C. Proof and Learning
TrajectoryReceipt
→ EvidenceClaims
→ ExhaustivenessEvaluation
→ DriftEvaluation
→ RegressionEvaluation
```

`GovernedAgentRun` binds exact versions and digests across all three.

## 7. Canonical objects

### 7.1 GovernedAgentRun

Purpose: immutable envelope binding a complete candidate or executed run.

Required fields:

```yaml
governedAgentRun:
  runId:
  protocolVersion:
  mode: STATE_ONLY | REVERSIBLE_SANDBOX | PRODUCTION_GATED
  status:
  subject:
  realm:
  purposeId:
  tenantId:
  audienceId:
  destinationId:
  policyStateDigest:
  sourceEventDigests: []
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
  createdAt:
  expiresAt:
  contentDigest:
```

Rules:

- The run may reference but may not embed mutable copies of canonical upstream objects.
- Missing digests fail closed.
- Mode is immutable for the run.
- A later mode requires a new run ID and fresh currentness checks.
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
  authorityCeilingRef:
  sourceEvidenceClaimIds: []
  effectiveFrom:
  expiresAt:
  version:
  contentDigest:
```

Rules:

- Person, identity, persona, character, mask, role, agent, and runtime configuration remain distinct.
- `authorityCeilingRef` is descriptive of the maximum authority that may be requested; it grants nothing.
- Persona plans may alter expression, framing, and proposal strategy, not policy state.
- A persona plan cannot rewrite identity, memory truth, or authority grants.

### 7.3 PerspectiveProjection

Purpose: actor-specific context derived from neutral event history.

```yaml
perspectiveProjection:
  projectionId:
  personaPlanId:
  actorPrincipalId:
  sourceEventDigests: []
  visibleFacts: []
  permittedInferences: []
  prohibitedInferences: []
  withheldFacts: []
  uncertainty: []
  privacyClasses: []
  useClasses: []
  projectionCutoff:
  contentDigest:
```

Rules:

- Shared history does not imply shared perspective.
- Visibility does not imply permission to act on, quote, disclose, retain, or infer from information.
- The projection records omissions and prohibitions, not only inclusions.
- Inferences remain labeled as inferences and cannot silently become facts, identity, memory, or policy.
- Source events remain immutable; the projection is rebuildable.

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
  reversibilityClass:
  expiration:
  contentDigest:
```

Rules:

- `approved`, `authorized`, `safe`, and similar booleans are prohibited as proposal authority claims.
- Every consequential proposal names at least one alternative or explicitly records why none exists.
- The requested effect is exact, typed, and bounded.
- The proposal expires and cannot be replayed against new state.

### 7.5 ManyTierAuthorityResolution

Purpose: deterministic resolution of instruction precedence, grants, policies, prohibitions, and unresolved conflicts.

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
- Scope cannot be unioned across evaluators, personas, roles, or unrelated grants.
- A later grant cannot retroactively authorize an earlier proposal or evaluation.
- Any unresolved principal alias, stale grant, unknown policy version, or ambiguous tier fails closed.

### 7.6 AgencyLocusDeclaration

Purpose: explicit attribution of agency and accountability.

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

- One principal may occupy multiple positions only where policy explicitly permits it.
- A positive production effect requires evaluator, operator, issuer, executor, and human authority separation where the applicable policy requires independence.
- Scheduled execution is not agent-originated intent.
- Execution ownership and decision ownership remain separate.

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
- Mode B permits only the exact sandbox effect and exact sandbox target.
- Mode C requires a valid `DecisionReceipt` and execution-time currentness recheck.
- A stale policy decision cannot authorize execution.
- Preparatory operations are separately classified and cannot hide side effects.

### 7.8 EffectCandidate

Purpose: content-addressed proposed transition.

```yaml
effectCandidate:
  effectCandidateId:
  runId:
  effectClass: STATE_ONLY | REVERSIBLE | COMPENSATABLE | IRREVERSIBLE | EXTERNAL_CONSEQUENTIAL
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

- Candidate construction has no effect executor attached in Mode A.
- Any write, call, tool, target, or output not declared in the signed candidate fails closed.
- The prior-state digest must match at execution time.
- Candidate bytes are resolved and hashed independently.
- Reversibility labels must be proven by mode-specific tests.

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

Every consequential receipt must answer:

1. What happened?
2. Why was it allowed or blocked?
3. What changed?

A green status without those answers is not a receipt.

### 7.10 Evaluation objects

`ExhaustivenessEvaluation`, `DriftEvaluation`, and `RegressionEvaluation` are evaluation subjects bound to canonical `EvaluatorDeclaration`, `EvidenceClaim`, and `TribunalVerdict` objects.

They do not create a second evidence vocabulary.

Minimum concerns:

- exhaustive constraint inventory;
- hypothesis and branch coverage;
- omitted surfaces;
- authority-transition coverage;
- tool and state-mutation coverage;
- persona identity/role/authority drift;
- protected-property preservation;
- baseline/holdout separation;
- residual uncertainty;
- explicit stopping rule.

## 8. Mode A — STATE_ONLY

### 8.1 Allowed operations

- read explicitly permitted sources;
- build a `PersonaPlan`;
- derive a `PerspectiveProjection`;
- produce an `AgentProposal`;
- resolve authority and policy;
- declare agency locus;
- build an `EffectCandidate`;
- run deterministic validators and offline evaluators;
- construct a Tribunal case and state-only human decision;
- store candidate/evidence/receipt projections;
- request review.

### 8.2 Prohibited operations

- external writes;
- production database mutation;
- Git canon mutation;
- publication or social posting;
- customer or partner communication;
- payments, purchases, or commerce actions;
- destructive file operations;
- secret-bearing calls whose side effects cannot be excluded;
- autonomous grant creation or modification;
- effect execution disguised as preview, validation, preparation, sync, or dry run.

### 8.3 Required final state

```text
Candidate state may change.
Evidence state may change.
Receipt state may change.
No external target state may change.
```

### 8.4 Failure behavior

Mode A fails closed when:

- any required canonical object cannot be resolved;
- principal identity is ambiguous;
- policy/grant state is stale or malformed;
- source or evidence budgets are exceeded;
- a preparatory tool has undeclared side effects;
- the proposal requests an effect not represented by an exact candidate;
- the trajectory attempts any effect-capable tool call;
- evaluation evidence is circular, stale, contaminated, or out of scope.

## 9. Mode B — REVERSIBLE_SANDBOX

### 9.1 Sandbox contract

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

### 9.2 Execution flow

```text
Validated Mode A run
→ fresh sandbox provision
→ fresh authority/policy recheck
→ exact candidate execution
→ boundary violation capture
→ postcondition inspection
→ rollback
→ independent restoration verification
→ effect and rollback receipts
```

### 9.3 First adversarial integration proof

The first B proof intentionally includes a hostile tool or component response attempting to:

- expand the write set;
- call an unlisted network endpoint;
- access production credentials;
- change the target realm or destination;
- suppress rollback;
- declare its own success;
- promote sandbox output to canon;
- convert evaluation confidence into approval.

Expected behavior:

- only the original exact sandbox candidate may execute;
- every expansion is blocked and receipted;
- rollback executes;
- independent verification reproduces the initial state digest;
- no production, canonical, customer, or external consequential state changes.

### 9.4 Required receipts

- `SandboxProvisionReceipt`
- `AuthorityRecheckReceipt`
- `EffectReceipt`
- `BoundaryViolationReceipt`
- `RollbackReceipt`
- `RestorationVerificationReceipt`

These are domain-specific receipt types that bind into the canonical receipt/evidence graph; they do not replace `DecisionReceipt`.

## 10. Mode C — PRODUCTION_GATED

### 10.1 Entrance requirements

C remains unavailable until all of the following exist and are independently reviewed:

- canonical principal resolver;
- issuer-bound signing-key registry with rotation/revocation;
- active grant lifecycle/currentness store;
- content-addressed evidence and candidate byte resolvers;
- complete evidence derivation closure;
- current policy snapshot resolver;
- receipt-chain head compare-and-swap;
- replay/nonce protection;
- trusted transition-digest store;
- atomic state compare-and-swap plus transactional outbox;
- idempotency and partial-failure recovery;
- effect classification and recovery contract;
- human/codeowner approval where required;
- incident, pause, kill-switch, rollback, and compensation procedures;
- independent postcondition verifier.

### 10.2 Production flow

```text
A evidence
→ B adversarial and rollback proof
→ new production run
→ fresh production state snapshot
→ fresh authority and policy resolution
→ independent authorized decision
→ DecisionReceipt
→ trusted transition construction
→ atomic precondition check
→ effect execution
→ receipt + outbox
→ independent postcondition verification
→ projection refresh
```

A or B result cannot be replayed as C authorization.

### 10.3 Effect classes

- `REVERSIBLE`: exact rollback restores prior state.
- `COMPENSATABLE`: prior state cannot be restored, but a declared compensating action exists.
- `IRREVERSIBLE`: no rollback or compensation; requires explicit heightened approval.
- `EXTERNAL_CONSEQUENTIAL`: affects a third party, public surface, financial state, legal/compliance state, or external account.

Each class has separate policy, evidence, and approval requirements.

## 11. State machine

```text
DRAFT
→ CONTEXT_COMPOSED
→ PROPOSED
→ AUTHORITY_RESOLVED
→ AGENCY_DECLARED
→ POLICY_DECIDED
→ CANDIDATE_BUILT
→ EVALUATED
→ DECISION_RECORDED
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

Terminal failure states include:

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

No terminal failure state may be rewritten as success.

## 12. Retry, idempotency, cancellation, and partial failure

- Reads and pure validation may retry within declared budgets.
- Proposals and candidates are content-addressed and may be reconstructed, not mutated in place.
- Effect execution requires a stable idempotency key bound to run, candidate, target, and current state.
- Retries never bypass fresh authority/currentness checks.
- Cancellation produces a receipt and prevents later replay.
- Mode B rollback failure escalates immediately and blocks promotion.
- Mode C partial failure uses transactional outbox and declared compensation/incident paths.
- Timeouts are explicit failure outcomes, not permission to continue asynchronously without authority.

## 13. Security, privacy, and secrets

- Secrets are runtime credentials, not canon, evidence payload, prompt text, projection content, screenshots, or logs.
- Persona and perspective objects must classify personal, private, confidential, regulated, and prohibited information.
- Projection records may contain secret references or presence metadata, never plaintext or recoverable derivatives.
- Tool outputs are untrusted inputs and cannot issue state transitions.
- Unicode normalization, strict parsing, raw-payload budgets, and credential-pattern scanning occur before model context ingestion.
- State transitions are authenticated outside the model.
- A malicious or compromised model may propose; it cannot grant, decide, or execute by assertion.
- Retention and deletion classes are explicit for source events, projections, trajectories, evidence, and receipts.
- Deletion may remove accessible content while preserving required non-secret provenance/digest tombstones where policy requires lineage.

## 14. Cross-system responsibilities

### GitHub — canonical

Owns:

- contracts and Zod schemas;
- fixtures and adversarial tests;
- policies and invariant definitions;
- design and implementation source;
- reviewed decisions and canonical history;
- CI evidence and exact-head provenance.

GitHub does not own live execution merely because a PR or workflow exists.

### Supabase — runtime projection and operational state

Existing useful projections include:

- `quirk_sync.object_registry`
- `quirk_sync.manifest_registry`
- `quirk_sync.proposed_moves`
- `quirk_sync.run_receipts`
- `quirk_sync.manifest_transition_ledger`
- `quirk_sync.projection_outbox`

Future projection tables may include:

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

- projections preserve canonical path, schema version, commit SHA, content digest, and projection run ID;
- no projection row can mutate Git canon;
- RLS/access posture is designed before exposure;
- state-only writes are restricted to candidate/evidence/receipt projections;
- effect/outbox paths remain disabled until the relevant mode is admitted.

### Google Drive — review projection

Google Drive may contain readable review copies, diagrams, tables, and stakeholder comments.

Rules:

- every Drive copy is labeled non-canonical;
- Drive edits do not change Git canon;
- review comments become evidence or proposed changes only after explicit capture;
- duplicated documents do not create duplicate architecture authority;
- sensitive source content follows its own Drive sharing and retention policy.

## 15. Operator Control Plane contract

The UI must always expose a truth bar:

```text
CANON       <commit/digest>
PROJECTION  <snapshot/projection run>
POLICY      <policy state digest>
OPERATOR    <canonical principal>
RUN MODE    STATE_ONLY | REVERSIBLE_SANDBOX | PRODUCTION_GATED
EFFECTS     DISABLED | SANDBOX_ONLY | PRODUCTION_GATED
```

UI commands never directly mutate authoritative state.

- `Accept Interpretation` creates a candidate, not canon.
- `Approve Proposed Transition` creates a decision/candidate transition, not an effect.
- `Admitted` does not mean canonical.
- Roles do not display as grants.
- Confidence is shown on a specific verdict, not on the object.
- Fixture/demo data is visibly labeled.
- Every blocked effect explains the authority, policy, currentness, or evidence reason.

## 16. Observability and evidence

Every run emits semantic telemetry with stable identifiers:

```text
run_id
trace_id
span_id
principal_id
persona_plan_digest
projection_digest
proposal_digest
authority_resolution_digest
agency_locus_digest
policy_decision_digest
effect_candidate_digest
decision_receipt_digest
trajectory_receipt_digest
```

Operational telemetry answers whether the system ran, retried, failed, cost money, or exceeded limits.

Quirk evidence answers whether a claim is supported, whether the trajectory was permitted, and what changed.

Telemetry is not automatically evidence. Evidence is not automatically a decision.

## 17. Adversarial fixture matrix

Minimum fixtures:

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

Requires:

- complete Mode A run and trajectory receipt;
- all required authority conflicts resolved;
- exact `EffectCandidate`;
- approved sandbox containment contract;
- isolated credentials and deny-by-default network;
- reversibility classification;
- adversarial fixture plan;
- no unresolved identity, secret, scope, or currentness ambiguity.

Produces an `AtoBPromotionReceipt` referencing the exact qualifying evidence. It grants no B authority by itself; an external authority grant enables the sandbox run.

### B → C

Requires:

- successful hostile sandbox effect;
- successful rollback and independent restoration proof;
- post-fix replay of the adversarial suite;
- durable runtime ports;
- current production policy and grant state;
- independent human/codeowner approval where applicable;
- atomic execution and receipt path;
- incident and kill-switch procedure;
- production-specific candidate built from fresh state.

Produces a `BtoCEligibilityReceipt`. Eligibility is not production authorization.

## 19. Versioning and compatibility

- Zod remains the editable schema source where PR #98 established it.
- JSON Schema, docs, database types, and UI types are generated or drift-checked projections.
- New contracts use strict camelCase canon.
- Snake_case aliases and unknown fields fail closed unless a separately reviewed migration adapter exists.
- Protocol versions are explicit and immutable per run.
- Compatibility adapters bind canonical objects; they may not reinterpret authority or evidence.
- Superseded runs and schemas remain recoverable through lineage without remaining active.

## 20. Implementation sequence after spec approval

This section is sequencing, not the executable implementation plan.

1. Implement strict contracts and fixture generator for Mode A.
2. Add deterministic authority-resolution and policy-decision ports with in-memory test implementations.
3. Add state-only run assembler and trajectory receipt.
4. Add persona/perspective drift and exhaustiveness evaluators as Tribunal-compatible evaluation subjects.
5. Project Mode A objects into private Supabase runtime schemas.
6. Integrate the Operator Control Plane in read/candidate mode with effects disabled.
7. Implement sandbox contract and first hostile Mode B adapter.
8. Prove rollback and restoration independently.
9. Design and independently review durable C runtime ports.
10. Activate no production effects until C admission receives its own decision and receipts.

## 21. Forgotten-edge checklist

The implementation plan must explicitly cover:

- clock skew and expiration boundaries;
- canonical time source;
- principal alias changes;
- key rotation during long runs;
- policy changes between proposal and execution;
- source/evidence revocation during a run;
- model/provider substitution;
- tool schema drift;
- sandbox provider outage;
- sandbox image tampering;
- logs containing sensitive context;
- partial evidence availability;
- human approval timeout;
- human approval revocation;
- duplicate decision submissions;
- simultaneous operators;
- back-button/UI replay;
- stale browser projection;
- offline/stale-but-visible UI state;
- cost and resource exhaustion;
- cancellation during rollback;
- retention expiration before audit completion;
- evidence/legal hold;
- portability and provider exit;
- accessibility of authority and error states;
- fixture/demo data being mistaken for live evidence;
- evaluation score changes after model updates;
- independent verifier sharing the same model/operator lineage;
- reversible action whose external consequences are not reversible;
- compensating action being mislabeled rollback;
- agent-generated goals surviving after the originating delegation expires.

## 22. Risks

### Overbuilding

The protocol can become a universal workflow ontology. Avoid this by implementing only the objects needed for the A proof, then B.

### False formality

Digests and receipts can create the appearance of rigor without independent currentness, identity, evidence, or postcondition verification. Every digest must bind a resolvable object or exact bytes.

### Policy complexity

Many-tier authority can become impossible to reason about. Keep tier vocabulary small, make resolution inspectable, and require adversarial depth tests.

### Projection drift

Supabase, Drive, UI, and generated schemas can diverge from Git. Require projection run IDs, content digests, and drift checks.

### Human-gate theater

A button click is not sufficient human authority. The decision must bind the exact case, state, effect, evidence, and current grant.

## 23. Definition of done for this design

This design is ready for implementation planning when:

- the design is committed in Git;
- a non-canonical Drive review projection exists;
- PR #98 remains the only authority/evidence contract source;
- all A, B, and C mode boundaries are explicit;
- no silent mode escalation path exists;
- all candidate protocol objects have one responsibility;
- failure, retry, cancellation, replay, rollback, and incident paths are specified;
- Git/Supabase/Drive boundaries are unambiguous;
- the adversarial matrix is complete enough to write failing tests first;
- Bryan approves the written spec for implementation planning.

## 24. Closing rule

```text
Reason about the effect.
Prove the boundary.
Earn the right to execute.
```
