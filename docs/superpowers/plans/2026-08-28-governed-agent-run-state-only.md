# Governed Agent Run — Mode A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete `STATE_ONLY` governed-agent-run protocol so Quirk can compose persona and perspective state, accept an agent proposal, resolve many-tier authority deterministically, declare agency locus, issue a no-effect policy decision, construct an exact `EffectCandidate`, and produce trajectory/evaluation records without executing any external effect.

**Architecture:** Add a focused `src/lib/quirk/governed-runs/` domain beside the existing Tribunal implementation. The new domain consumes PR #98’s canonical `AuthorityGrant`, `EvaluatorDeclaration`, `EvidenceClaim`, `TribunalVerdict`, `DecisionReceipt`, verified-grant type, and canonical digest helper; it introduces no second authority or evidence dialect. Mode A is implemented as pure contracts and deterministic functions with no effect-executor port, then proven through adversarial fixtures and CI.

**Tech Stack:** TypeScript 6, Zod 3, Vitest 3, Bun, Node.js 20+, existing Quirk Tribunal canonical hashing and authority contracts.

**Spec:** `docs/superpowers/specs/2026-08-28-governed-agent-run-maturity-design.md`

**Candidate amendment — 2026-09-09:** The history-aware Task 4/5 test obligation below is `CANDIDATE / STATE_ONLY / TEST-ONLY`, disposition `Constrain`, pending independent human review. It does not mark any implementation task complete. [Decision, boundaries, and next gates](../../governance/session-composition-candidate.md) distinguish the bounded adapter proof from operative integration. Existing code examples remain unchanged; the contract and consumer work identified below must precede any enforced history constraint.

## Global Constraints

- Implement **Mode A only**: `STATE_ONLY` must structurally set `effectExecutionAllowed: false`.
- PR #98 remains the only editable authority/evidence protocol source; import its contracts rather than copying or renaming them.
- Use strict camelCase canonical fields. Reject unknown fields, legacy aliases, sparse arrays, cyclic/shared object graphs, and malformed inputs.
- Git remains canonical. This plan adds no Supabase migration, Google Drive write path, Vercel/UI behavior, sandbox provisioning, or production executor.
- Persona fields, role labels, credentials, tool availability, confidence, consensus, evaluator count, and successful output contribute zero authority scopes.
- `AgentProposal` is inert; `EffectCandidate` is inert; no API in this slice may execute an effect.
- Every negative invariant must have a positive executable contract plus at least one test that was observed failing before implementation.
- Secrets are runtime credentials, never contract payloads, evidence payloads, fixture values, logs, or receipts.
- No new runtime dependency is permitted. Use existing `zod`, `node:crypto`, and Vitest.
- Reuse `digestCanonical`, `TribunalEffectSchema`, `VerifiedTribunalAuthorityGrant`, `EvidenceClaim`, and existing stable-ID/authority helpers from the Tribunal/governance modules.
- Every state transition is represented by an append-only run revision linked through `priorRunDigest`; never mutate a prior run snapshot.
- Tests must prove that correct output cannot rescue an invalid identity, authority, context-use, policy, trajectory, or evidence path.
- Implementation commits stage only the paths named in each task; never use `git add .`, `git add -A`, or `git add --all`.

---

## File Map

### New production files

- `src/lib/quirk/governed-runs/issues.ts` — stable Mode A issue codes and deterministic result shape.
- `src/lib/quirk/governed-runs/contracts/primitives.ts` — strict shared IDs, digests, timestamps, use classes, run modes, phases, and effect request primitives.
- `src/lib/quirk/governed-runs/contracts/context.ts` — `PersonaPlan` and `PerspectiveProjection` schemas.
- `src/lib/quirk/governed-runs/contracts/action.ts` — `AgentProposal`, instruction graph, authority resolution, agency locus, policy decision, and `EffectCandidate` schemas.
- `src/lib/quirk/governed-runs/contracts/run.ts` — append-only `GovernedAgentRun` and `TrajectoryReceipt` schemas.
- `src/lib/quirk/governed-runs/contracts/evaluations.ts` — Exhaustiveness, Drift, and Regression evaluation-subject schemas.
- `src/lib/quirk/governed-runs/contracts/index.ts` — public contract exports.
- `src/lib/quirk/governed-runs/digests.ts` — domain-separated digests and append-only run-revision builder.
- `src/lib/quirk/governed-runs/authority-resolution.ts` — deterministic many-tier authority resolution over already verified grants.
- `src/lib/quirk/governed-runs/agency.ts` — agency-locus validation.
- `src/lib/quirk/governed-runs/state-only-policy.ts` — preparatory-operation classification and Mode A policy decision.
- `src/lib/quirk/governed-runs/state-only.ts` — state-only assembly and trajectory receipt creation; deliberately exposes no executor port.
- `src/lib/quirk/governed-runs/evaluations.ts` — deterministic completeness, drift, and regression checks.
- `src/lib/quirk/governed-runs/index.ts` — governed-run public exports.

### New test and fixture files

- `src/lib/quirk/governed-runs/test-support.ts` — test-only canonical fixture builders; never imported by production modules.
- `src/lib/quirk/governed-runs/contracts/context.test.ts`
- `src/lib/quirk/governed-runs/contracts/action.test.ts`
- `src/lib/quirk/governed-runs/contracts/run.test.ts`
- `src/lib/quirk/governed-runs/digests.test.ts`
- `src/lib/quirk/governed-runs/authority-resolution.test.ts`
- `src/lib/quirk/governed-runs/state-only-policy.test.ts`
- `src/lib/quirk/governed-runs/state-only.test.ts`
- `src/lib/quirk/governed-runs/evaluations.test.ts`
- `src/lib/quirk/governed-runs/fixture.test.ts`
- `scripts/generate-governed-run-fixture.ts`
- `fixtures/governed-runs/state-only.v1.fixture.json`

### Existing files modified at the final integration task

- `package.json` — add `test:governed-run` and `fixture:governed-run` scripts.
- `.github/workflows/ci.yml` — add governed-run format, fixture-drift, and focused-test gates.
- `docs/governance/governed-agent-runs.md` — operator-facing contract and truth-bar behavior.

---

### Task 1: Add strict context-integrity contracts

**Files:**
- Create: `src/lib/quirk/governed-runs/issues.ts`
- Create: `src/lib/quirk/governed-runs/contracts/primitives.ts`
- Create: `src/lib/quirk/governed-runs/contracts/context.ts`
- Create: `src/lib/quirk/governed-runs/contracts/context.test.ts`
- Create: `src/lib/quirk/governed-runs/test-support.ts`

**Interfaces:**
- Consumes: `StableIdSchema` from `src/lib/quirk/design-tribunal/contracts.ts`, `TribunalEffectSchema` from `src/lib/quirk/design-tribunal/protocol.ts`.
- Produces: `PersonaPlanSchema`, `PerspectiveProjectionSchema`, `UseClassSchema`, `PrivacyClassSchema`, `GovernedRunIssue`, and reusable valid fixture builders.

- [ ] **Step 1: Write the failing persona-authority and context-use tests**

```ts
// src/lib/quirk/governed-runs/contracts/context.test.ts
import { describe, expect, test } from "vitest";
import {
  PersonaPlanSchema,
  PerspectiveProjectionSchema,
} from "./context";
import { validPersonaPlan, validPerspectiveProjection } from "../test-support";

describe("PersonaPlanSchema", () => {
  test("accepts a strict persona plan whose requested-effect ceiling grants nothing", () => {
    expect(PersonaPlanSchema.parse(validPersonaPlan()).requestedEffectCeiling).toEqual([
      "observe",
      "recommend",
    ]);
  });

  test("rejects a persona plan that smuggles authority scopes", () => {
    expect(() =>
      PersonaPlanSchema.parse({
        ...validPersonaPlan(),
        authorityScopes: ["quirk.tribunal.effect:approve"],
      }),
    ).toThrow();
  });
});

describe("PerspectiveProjectionSchema", () => {
  test("rejects the same use class as both allowed and denied", () => {
    const projection = validPerspectiveProjection();
    projection.visibleFacts[0].allowedUses = ["READ", "ACT_ON"];
    projection.visibleFacts[0].deniedUses = ["ACT_ON"];
    expect(() => PerspectiveProjectionSchema.parse(projection)).toThrow(
      /allowed and denied/i,
    );
  });

  test("keeps inferences explicitly typed and source-bound", () => {
    const parsed = PerspectiveProjectionSchema.parse(validPerspectiveProjection());
    expect(parsed.permittedInferences[0].kind).toBe("INFERENCE");
    expect(parsed.permittedInferences[0].sourceEventDigests).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
bunx vitest run src/lib/quirk/governed-runs/contracts/context.test.ts
```

Expected: **FAIL** because `./context` and `../test-support` do not exist.

- [ ] **Step 3: Add stable issue/result primitives**

```ts
// src/lib/quirk/governed-runs/issues.ts
export const GOVERNED_RUN_ISSUE_CODES = [
  "CONTRACT_INVALID",
  "PERSONA_AUTHORITY_FORBIDDEN",
  "CONTEXT_USE_CONFLICT",
  "CONTEXT_SOURCE_MISSING",
  "INFERENCE_MISCLASSIFIED",
  "SECRET_MATERIAL_FORBIDDEN",
  "MODE_ESCALATION_FORBIDDEN",
  "PHASE_DIGEST_MISSING",
  "RUN_REVISION_INVALID",
  "INSTRUCTION_GRAPH_CYCLE",
  "AUTHORITY_SCOPE_INCOMPLETE",
  "AUTHORITY_SCOPE_UNION_FORBIDDEN",
  "AUTHORITY_RETROACTIVE",
  "PRINCIPAL_UNRESOLVED",
  "POLICY_STATE_STALE",
  "HUMAN_REVIEW_REQUIRED",
  "EFFECT_OPERATION_FORBIDDEN",
  "PREPARATION_SIDE_EFFECT_FORBIDDEN",
  "EFFECT_CANDIDATE_MISMATCH",
  "TRAJECTORY_INVALID",
  "EXHAUSTIVENESS_INCOMPLETE",
  "STOPPING_RULE_REQUIRED",
  "DRIFT_AUTHORITY_CHANGED",
  "DRIFT_POLICY_CHANGED",
  "REGRESSION_PROTECTED_PROPERTY_CHANGED",
  "HOLDOUT_CONTAMINATED",
] as const;

export type GovernedRunIssueCode =
  (typeof GOVERNED_RUN_ISSUE_CODES)[number];

export type GovernedRunIssue = Readonly<{
  code: GovernedRunIssueCode;
  path: string;
  refs: readonly string[];
}>;

export type GovernedRunResult<T> =
  | Readonly<{ ok: true; value: T; issues: readonly [] }>
  | Readonly<{ ok: false; value: null; issues: readonly GovernedRunIssue[] }>;
```

- [ ] **Step 4: Add strict shared primitives**

```ts
// src/lib/quirk/governed-runs/contracts/primitives.ts
import { z } from "zod";
import { StableIdSchema } from "../../design-tribunal/contracts";
import { TribunalEffectSchema } from "../../design-tribunal/protocol";

export const GOVERNED_RUN_PROTOCOL_VERSION = "0.1.0" as const;
export const GovernedRunProtocolVersionSchema = z.literal(
  GOVERNED_RUN_PROTOCOL_VERSION,
);
export const GovernedStableIdSchema = StableIdSchema.max(128);
export const GovernedDigestSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/);
export const GovernedTimestampSchema = z
  .string()
  .max(64)
  .datetime({ offset: true });
export const GovernedRunModeSchema = z.enum([
  "STATE_ONLY",
  "REVERSIBLE_SANDBOX",
  "PRODUCTION_GATED",
]);
export const StateOnlyModeSchema = z.literal("STATE_ONLY");
export const TribunalRequestedEffectSchema = TribunalEffectSchema;
export const UseClassSchema = z.enum([
  "READ",
  "QUOTE",
  "DISCLOSE",
  "RETAIN",
  "INFER",
  "ACT_ON",
]);
export const PrivacyClassSchema = z.enum([
  "PUBLIC",
  "INTERNAL",
  "PERSONAL",
  "CONFIDENTIAL",
  "REGULATED",
  "PROHIBITED",
]);
```

- [ ] **Step 5: Implement `PersonaPlan` and `PerspectiveProjection`**

```ts
// src/lib/quirk/governed-runs/contracts/context.ts
import { z } from "zod";
import {
  GovernedDigestSchema,
  GovernedStableIdSchema,
  GovernedTimestampSchema,
  PrivacyClassSchema,
  TribunalRequestedEffectSchema,
  UseClassSchema,
} from "./primitives";

const UniqueStringsSchema = z
  .array(z.string().min(1).max(2_048))
  .max(128)
  .superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Collection entries must be unique.",
      });
    }
  });

export const PersonaPlanSchema = z
  .object({
    kind: z.literal("PersonaPlan"),
    protocolVersion: z.literal("0.1.0"),
    personaPlanId: GovernedStableIdSchema,
    baseIdentityRef: GovernedStableIdSchema,
    roleRefs: UniqueStringsSchema,
    traitActivations: z
      .array(
        z
          .object({
            traitId: GovernedStableIdSchema,
            intensity: z.number().min(0).max(1),
          })
          .strict(),
      )
      .max(64),
    register: GovernedStableIdSchema,
    voicePolicy: GovernedStableIdSchema,
    domainStance: GovernedStableIdSchema,
    prohibitedTraits: UniqueStringsSchema,
    prohibitedRoleTransfers: UniqueStringsSchema,
    contextBoundaryRef: GovernedStableIdSchema,
    requestedEffectCeiling: z
      .array(TribunalRequestedEffectSchema)
      .max(7)
      .refine((values) => new Set(values).size === values.length),
    sourceEvidenceClaimIds: UniqueStringsSchema,
    effectiveFrom: GovernedTimestampSchema,
    expiresAt: GovernedTimestampSchema,
    version: z.number().int().positive(),
    contentDigest: GovernedDigestSchema,
  })
  .strict()
  .superRefine((plan, context) => {
    if (Date.parse(plan.effectiveFrom) >= Date.parse(plan.expiresAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "Persona plan expiration must follow activation.",
      });
    }
  });

const PerspectiveFactSchema = z
  .object({
    kind: z.literal("FACT"),
    ref: GovernedStableIdSchema,
    sourceEventDigest: GovernedDigestSchema,
    privacyClass: PrivacyClassSchema,
    allowedUses: z.array(UseClassSchema).max(6),
    deniedUses: z.array(UseClassSchema).max(6),
  })
  .strict()
  .superRefine((fact, context) => {
    const overlap = fact.allowedUses.filter((use) =>
      fact.deniedUses.includes(use),
    );
    if (overlap.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deniedUses"],
        message: "A context use cannot be both allowed and denied.",
      });
    }
  });

const PerspectiveInferenceSchema = z
  .object({
    kind: z.literal("INFERENCE"),
    ref: GovernedStableIdSchema,
    sourceEventDigests: z.array(GovernedDigestSchema).min(1).max(64),
    confidence: z.number().min(0).max(1),
    privacyClass: PrivacyClassSchema,
    allowedUses: z.array(UseClassSchema).max(6),
    deniedUses: z.array(UseClassSchema).max(6),
  })
  .strict();

export const PerspectiveProjectionSchema = z
  .object({
    kind: z.literal("PerspectiveProjection"),
    protocolVersion: z.literal("0.1.0"),
    projectionId: GovernedStableIdSchema,
    personaPlanId: GovernedStableIdSchema,
    actorPrincipalId: GovernedStableIdSchema,
    sourceEventDigests: z.array(GovernedDigestSchema).min(1).max(256),
    visibleFacts: z.array(PerspectiveFactSchema).max(256),
    permittedInferences: z.array(PerspectiveInferenceSchema).max(128),
    prohibitedInferenceRefs: UniqueStringsSchema,
    withheldSourceRefs: UniqueStringsSchema,
    uncertaintyRefs: UniqueStringsSchema,
    projectionCutoff: GovernedTimestampSchema,
    contentDigest: GovernedDigestSchema,
  })
  .strict();

export type PersonaPlan = z.infer<typeof PersonaPlanSchema>;
export type PerspectiveProjection = z.infer<
  typeof PerspectiveProjectionSchema
>;
```

- [ ] **Step 6: Add test-only valid fixture builders**

```ts
// src/lib/quirk/governed-runs/test-support.ts
const digest = (char: string): `sha256:${string}` =>
  `sha256:${char.repeat(64)}`;

export const validPersonaPlan = () => ({
  kind: "PersonaPlan" as const,
  protocolVersion: "0.1.0" as const,
  personaPlanId: "persona.plan.brayn.1",
  baseIdentityRef: "identity.bryan",
  roleRefs: ["role.architect"],
  traitActivations: [{ traitId: "trait.structural", intensity: 0.9 }],
  register: "register.clear",
  voicePolicy: "voice.quirk.structural",
  domainStance: "stance.governance",
  prohibitedTraits: ["trait.false_certainty"],
  prohibitedRoleTransfers: ["role.canon_authority"],
  contextBoundaryRef: "context.boundary.mode_a",
  requestedEffectCeiling: ["observe", "recommend"] as const,
  sourceEvidenceClaimIds: ["evidence.persona.selection.1"],
  effectiveFrom: "2026-08-28T12:00:00.000Z",
  expiresAt: "2026-08-28T13:00:00.000Z",
  version: 1,
  contentDigest: digest("1"),
});

export const validPerspectiveProjection = () => ({
  kind: "PerspectiveProjection" as const,
  protocolVersion: "0.1.0" as const,
  projectionId: "projection.brayn.run.1",
  personaPlanId: "persona.plan.brayn.1",
  actorPrincipalId: "principal.agent.brayn",
  sourceEventDigests: [digest("2")],
  visibleFacts: [
    {
      kind: "FACT" as const,
      ref: "fact.issue.100.approved",
      sourceEventDigest: digest("2"),
      privacyClass: "INTERNAL" as const,
      allowedUses: ["READ", "ACT_ON"] as const,
      deniedUses: ["DISCLOSE"] as const,
    },
  ],
  permittedInferences: [
    {
      kind: "INFERENCE" as const,
      ref: "inference.mode_a.next",
      sourceEventDigests: [digest("2")],
      confidence: 0.8,
      privacyClass: "INTERNAL" as const,
      allowedUses: ["READ"] as const,
      deniedUses: ["DISCLOSE", "ACT_ON"] as const,
    },
  ],
  prohibitedInferenceRefs: ["inference.human_authority"],
  withheldSourceRefs: ["source.secret.runtime"],
  uncertaintyRefs: ["uncertainty.runtime_ports"],
  projectionCutoff: "2026-08-28T12:05:00.000Z",
  contentDigest: digest("3"),
});
```

- [ ] **Step 7: Run the focused test and verify GREEN**

Run:

```bash
bunx vitest run src/lib/quirk/governed-runs/contracts/context.test.ts
```

Expected: **PASS**, with no warnings.

- [ ] **Step 8: Commit the context-integrity slice**

```bash
git add -- \
  src/lib/quirk/governed-runs/issues.ts \
  src/lib/quirk/governed-runs/contracts/primitives.ts \
  src/lib/quirk/governed-runs/contracts/context.ts \
  src/lib/quirk/governed-runs/contracts/context.test.ts \
  src/lib/quirk/governed-runs/test-support.ts
git commit -m "feat(governance): add governed run context contracts"
```

---

### Task 2: Add strict governed-action and run-envelope contracts

**Files:**
- Create: `src/lib/quirk/governed-runs/contracts/action.ts`
- Create: `src/lib/quirk/governed-runs/contracts/run.ts`
- Create: `src/lib/quirk/governed-runs/contracts/action.test.ts`
- Create: `src/lib/quirk/governed-runs/contracts/run.test.ts`
- Modify: `src/lib/quirk/governed-runs/test-support.ts`

**Interfaces:**
- Consumes: Task 1 primitives and context contracts.
- Produces: strict canonical objects for proposals, instruction graphs, deterministic resolution output, agency locus, Mode A policy, effect candidates, run revisions, and trajectory receipts.

**Candidate integration prerequisite:** The strict `ExecutionPolicyDecisionSchema` below has proposal, authority, and policy-state digests but lacks explicit validated-session, history-head, and taxonomy bindings. Before operative composition checking, review a versioned canonical contract amendment with Task 3 digest coverage and migration/rejection rules. Do not attach unchecked fields, accept legacy decisions as history-validated, or introduce a second authority/evidence dialect. The test-only adapter result is a diagnostic envelope, not a replacement canonical decision.

- [ ] **Step 1: Write the failing authority-claim and Mode A contract tests**

```ts
// src/lib/quirk/governed-runs/contracts/action.test.ts
import { describe, expect, test } from "vitest";
import {
  AgentProposalSchema,
  ExecutionPolicyDecisionSchema,
} from "./action";
import { validAgentProposal, validExecutionPolicyDecision } from "../test-support";

describe("AgentProposalSchema", () => {
  test("rejects approval or authorization claims embedded in a proposal", () => {
    expect(() =>
      AgentProposalSchema.parse({ ...validAgentProposal(), approved: true }),
    ).toThrow();
  });

  test("requires a proposed-at timestamp so later grants cannot authorize retroactively", () => {
    const { proposedAt: _removed, ...proposal } = validAgentProposal();
    expect(() => AgentProposalSchema.parse(proposal)).toThrow();
  });
});

describe("ExecutionPolicyDecisionSchema", () => {
  test("structurally forbids effect execution in STATE_ONLY", () => {
    expect(() =>
      ExecutionPolicyDecisionSchema.parse({
        ...validExecutionPolicyDecision(),
        effectExecutionAllowed: true,
      }),
    ).toThrow();
  });
});
```

```ts
// src/lib/quirk/governed-runs/contracts/run.test.ts
import { expect, test } from "vitest";
import { GovernedAgentRunSchema } from "./run";
import { validGovernedAgentRun } from "../test-support";

test("rejects future-stage digests before the phase requires them", () => {
  const run = validGovernedAgentRun();
  run.phase = "CONTEXT_COMPOSED";
  run.stageDigests.proposalDigest = `sha256:${"a".repeat(64)}`;
  expect(() => GovernedAgentRunSchema.parse(run)).toThrow(
    /future-stage digest/i,
  );
});
```

- [ ] **Step 2: Run the action/run tests and verify RED**

```bash
bunx vitest run \
  src/lib/quirk/governed-runs/contracts/action.test.ts \
  src/lib/quirk/governed-runs/contracts/run.test.ts
```

Expected: **FAIL** because `action.ts` and `run.ts` do not exist.

- [ ] **Step 3: Implement the action contracts**

```ts
// src/lib/quirk/governed-runs/contracts/action.ts
import { z } from "zod";
import {
  GovernedDigestSchema,
  GovernedStableIdSchema,
  GovernedTimestampSchema,
  StateOnlyModeSchema,
  TribunalRequestedEffectSchema,
} from "./primitives";

export const RequestedEffectSchema = z
  .object({
    effectId: GovernedStableIdSchema,
    tribunalEffect: TribunalRequestedEffectSchema,
    operationId: GovernedStableIdSchema,
    targetClass: GovernedStableIdSchema,
    targetLocator: z.string().min(1).max(2_048),
  })
  .strict();

export const AgentProposalSchema = z
  .object({
    kind: z.literal("AgentProposal"),
    protocolVersion: z.literal("0.1.0"),
    proposalId: GovernedStableIdSchema,
    runId: GovernedStableIdSchema,
    proposerPrincipalId: GovernedStableIdSchema,
    objective: z.string().min(1).max(8_192),
    proposedCapabilityId: GovernedStableIdSchema,
    proposedMoveId: GovernedStableIdSchema,
    requestedEffect: RequestedEffectSchema,
    expectedPriorStateDigest: GovernedDigestSchema,
    expectedStateDelta: z.string().min(1).max(8_192),
    alternativesConsidered: z.array(z.string().min(1)).min(1).max(32),
    rejectedAlternatives: z.array(z.string().min(1)).max(32),
    assumptions: z.array(z.string().min(1)).max(64),
    evidenceClaimIds: z.array(GovernedStableIdSchema).max(256),
    estimatedCostUsd: z.number().min(0),
    estimatedDurationMs: z.number().int().min(0),
    effectClass: z.enum([
      "REVERSIBLE",
      "COMPENSATABLE",
      "IRREVERSIBLE",
      "EXTERNAL_CONSEQUENTIAL",
    ]),
    proposedAt: GovernedTimestampSchema,
    expiration: GovernedTimestampSchema,
    contentDigest: GovernedDigestSchema,
  })
  .strict();

export const InstructionNodeSchema = z
  .object({
    instructionId: GovernedStableIdSchema,
    issuerPrincipalId: GovernedStableIdSchema,
    sourceKind: z.enum(["CANON", "POLICY", "GRANT", "USER", "TOOL"]),
    tier: z.number().int().min(0).max(11),
    directive: z.enum(["ALLOW", "DENY", "REQUIRE_HUMAN_REVIEW"]),
    effectId: GovernedStableIdSchema,
    issuedAt: GovernedTimestampSchema,
    expiresAt: GovernedTimestampSchema.nullable(),
    sourceDigest: GovernedDigestSchema,
  })
  .strict();

export const InstructionEdgeSchema = z
  .object({
    fromInstructionId: GovernedStableIdSchema,
    toInstructionId: GovernedStableIdSchema,
    relation: z.enum(["OVERRIDES", "CONFLICTS_WITH", "DEPENDS_ON"]),
  })
  .strict();

export const ManyTierAuthorityResolutionSchema = z
  .object({
    kind: z.literal("ManyTierAuthorityResolution"),
    protocolVersion: z.literal("0.1.0"),
    resolutionId: GovernedStableIdSchema,
    proposalId: GovernedStableIdSchema,
    instructionNodes: z.array(InstructionNodeSchema).max(256),
    instructionEdges: z.array(InstructionEdgeSchema).max(512),
    canonicalPrincipalIds: z.array(GovernedStableIdSchema).max(128),
    activeAuthorityGrantIds: z.array(GovernedStableIdSchema).max(64),
    applicablePolicyIds: z.array(GovernedStableIdSchema).max(128),
    winningInstructionIds: z.array(GovernedStableIdSchema).max(128),
    suppressedInstructionIds: z.array(GovernedStableIdSchema).max(128),
    unresolvedConflictIds: z.array(GovernedStableIdSchema).max(128),
    permittedEffects: z.array(RequestedEffectSchema).max(16),
    prohibitedEffects: z.array(RequestedEffectSchema).max(16),
    requiredHumanReview: z.array(GovernedStableIdSchema).max(32),
    result: z.enum([
      "PERMITTED_CANDIDATE_ONLY",
      "PROHIBITED",
      "HUMAN_REVIEW",
      "UNRESOLVED",
    ]),
    policyStateDigest: GovernedDigestSchema,
    evaluatedAt: GovernedTimestampSchema,
    contentDigest: GovernedDigestSchema,
  })
  .strict();

export const AgencyLocusDeclarationSchema = z
  .object({
    kind: z.literal("AgencyLocusDeclaration"),
    protocolVersion: z.literal("0.1.0"),
    declarationId: GovernedStableIdSchema,
    goalOriginatorPrincipalId: GovernedStableIdSchema,
    proposalAuthorPrincipalId: GovernedStableIdSchema,
    plannerPrincipalId: GovernedStableIdSchema,
    authorityIssuerPrincipalIds: z.array(GovernedStableIdSchema).max(64),
    policyDeciderId: GovernedStableIdSchema,
    candidateBuilderPrincipalId: GovernedStableIdSchema,
    intendedExecutorPrincipalId: GovernedStableIdSchema,
    affectedPrincipalIds: z.array(GovernedStableIdSchema).max(128),
    acceptanceOwnerPrincipalId: GovernedStableIdSchema,
    reversalOwnerPrincipalId: GovernedStableIdSchema,
    accountablePrincipalId: GovernedStableIdSchema,
    triggerOrigin: z.enum([
      "USER",
      "DELEGATE",
      "POLICY",
      "SCHEDULE",
      "ENVIRONMENT",
      "AGENT_DERIVED",
    ]),
    humanInterventionPoints: z.array(GovernedStableIdSchema).max(32),
    contentDigest: GovernedDigestSchema,
  })
  .strict();

export const ExecutionPolicyDecisionSchema = z
  .object({
    kind: z.literal("ExecutionPolicyDecision"),
    protocolVersion: z.literal("0.1.0"),
    policyDecisionId: GovernedStableIdSchema,
    runId: GovernedStableIdSchema,
    proposalDigest: GovernedDigestSchema,
    authorityResolutionDigest: GovernedDigestSchema,
    agencyLocusDigest: GovernedDigestSchema,
    mode: StateOnlyModeSchema,
    decision: z.enum([
      "ALLOW_CANDIDATE_ONLY",
      "DENY",
      "REQUIRE_HUMAN_REVIEW",
    ]),
    effectExecutionAllowed: z.literal(false),
    permittedPreparatoryOperationIds: z.array(GovernedStableIdSchema).max(64),
    deniedOperationIds: z.array(GovernedStableIdSchema).max(64),
    grantIds: z.array(GovernedStableIdSchema).max(64),
    policyReasonCodes: z.array(GovernedStableIdSchema).min(1).max(64),
    policyStateDigest: GovernedDigestSchema,
    evaluatedAt: GovernedTimestampSchema,
    expiresAt: GovernedTimestampSchema,
    contentDigest: GovernedDigestSchema,
  })
  .strict();

export const EffectCandidateSchema = z
  .object({
    kind: z.literal("EffectCandidate"),
    protocolVersion: z.literal("0.1.0"),
    effectCandidateId: GovernedStableIdSchema,
    runId: GovernedStableIdSchema,
    intendedRunMode: z.enum(["REVERSIBLE_SANDBOX", "PRODUCTION_GATED"]),
    effectClass: z.enum([
      "REVERSIBLE",
      "COMPENSATABLE",
      "IRREVERSIBLE",
      "EXTERNAL_CONSEQUENTIAL",
    ]),
    targetClass: GovernedStableIdSchema,
    targetLocator: z.string().min(1).max(2_048),
    expectedPriorStateDigest: GovernedDigestSchema,
    proposedNextStateDigest: GovernedDigestSchema,
    actionManifestDigest: GovernedDigestSchema,
    candidateByteDigests: z.array(GovernedDigestSchema).min(1).max(32),
    exactWriteSet: z.array(z.string().min(1).max(2_048)).max(128),
    exactExternalCalls: z.array(z.string().min(1).max(2_048)).max(128),
    exactToolBindings: z.array(GovernedStableIdSchema).max(64),
    expectedOutputs: z.array(z.string().min(1).max(2_048)).max(64),
    requiredPostconditions: z.array(z.string().min(1).max(2_048)).min(1).max(64),
    rollbackPlanRef: GovernedStableIdSchema.nullable(),
    compensationPlanRef: GovernedStableIdSchema.nullable(),
    expiration: GovernedTimestampSchema,
    contentDigest: GovernedDigestSchema,
  })
  .strict();
```

- [ ] **Step 4: Implement the append-only run and trajectory contracts**

```ts
// src/lib/quirk/governed-runs/contracts/run.ts
import { z } from "zod";
import {
  GovernedDigestSchema,
  GovernedStableIdSchema,
  GovernedTimestampSchema,
  StateOnlyModeSchema,
} from "./primitives";

export const GovernedRunPhaseSchema = z.enum([
  "DRAFT",
  "CONTEXT_COMPOSED",
  "PROPOSED",
  "AUTHORITY_RESOLVED",
  "AGENCY_DECLARED",
  "POLICY_DECIDED",
  "CANDIDATE_BUILT",
  "EVALUATED",
  "DECISION_RECORDED",
  "DECISION_NOT_REQUESTED",
  "MODE_COMPLETE",
  "DENIED",
  "UNRESOLVED",
  "EXPIRED",
  "CANCELLED",
  "BUDGET_EXHAUSTED",
]);

const StageDigestsSchema = z
  .object({
    personaPlanDigest: GovernedDigestSchema.optional(),
    perspectiveProjectionDigest: GovernedDigestSchema.optional(),
    proposalDigest: GovernedDigestSchema.optional(),
    authorityResolutionDigest: GovernedDigestSchema.optional(),
    agencyLocusDigest: GovernedDigestSchema.optional(),
    executionPolicyDecisionDigest: GovernedDigestSchema.optional(),
    effectCandidateDigest: GovernedDigestSchema.optional(),
    tribunalCaseDigest: GovernedDigestSchema.optional(),
    decisionReceiptDigest: GovernedDigestSchema.optional(),
    trajectoryReceiptDigest: GovernedDigestSchema.optional(),
    evaluationDigests: z.array(GovernedDigestSchema).max(64),
  })
  .strict();

const REQUIRED_STAGE_DIGESTS: Record<
  z.infer<typeof GovernedRunPhaseSchema>,
  readonly (keyof z.infer<typeof StageDigestsSchema>)[]
> = {
  DRAFT: [],
  CONTEXT_COMPOSED: ["personaPlanDigest", "perspectiveProjectionDigest"],
  PROPOSED: ["personaPlanDigest", "perspectiveProjectionDigest", "proposalDigest"],
  AUTHORITY_RESOLVED: ["proposalDigest", "authorityResolutionDigest"],
  AGENCY_DECLARED: ["authorityResolutionDigest", "agencyLocusDigest"],
  POLICY_DECIDED: ["agencyLocusDigest", "executionPolicyDecisionDigest"],
  CANDIDATE_BUILT: ["executionPolicyDecisionDigest", "effectCandidateDigest"],
  EVALUATED: ["effectCandidateDigest", "evaluationDigests"],
  DECISION_RECORDED: ["tribunalCaseDigest", "decisionReceiptDigest"],
  DECISION_NOT_REQUESTED: ["effectCandidateDigest"],
  MODE_COMPLETE: ["trajectoryReceiptDigest"],
  DENIED: ["trajectoryReceiptDigest"],
  UNRESOLVED: ["trajectoryReceiptDigest"],
  EXPIRED: ["trajectoryReceiptDigest"],
  CANCELLED: ["trajectoryReceiptDigest"],
  BUDGET_EXHAUSTED: ["trajectoryReceiptDigest"],
};

export const GovernedAgentRunSchema = z
  .object({
    kind: z.literal("GovernedAgentRun"),
    protocolVersion: z.literal("0.1.0"),
    runId: GovernedStableIdSchema,
    runRevision: z.number().int().positive(),
    priorRunDigest: GovernedDigestSchema.nullable(),
    mode: StateOnlyModeSchema,
    phase: GovernedRunPhaseSchema,
    status: z.enum(["ACTIVE", "COMPLETE", "FAILED", "CANCELLED"]),
    subjectId: GovernedStableIdSchema,
    realm: GovernedStableIdSchema,
    purposeId: GovernedStableIdSchema,
    tenantId: GovernedStableIdSchema,
    audienceId: GovernedStableIdSchema,
    destinationId: GovernedStableIdSchema,
    policyStateDigest: GovernedDigestSchema,
    sourceEventDigests: z.array(GovernedDigestSchema).min(1).max(256),
    stageDigests: StageDigestsSchema,
    decisionState: z.enum(["NOT_REQUESTED", "PENDING", "RECORDED"]),
    createdAt: GovernedTimestampSchema,
    expiresAt: GovernedTimestampSchema,
    contentDigest: GovernedDigestSchema,
  })
  .strict()
  .superRefine((run, context) => {
    const required = REQUIRED_STAGE_DIGESTS[run.phase];
    for (const key of required) {
      const value = run.stageDigests[key];
      if (key === "evaluationDigests" ? !Array.isArray(value) || value.length === 0 : !value) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stageDigests", key],
          message: `Phase ${run.phase} requires ${key}.`,
        });
      }
    }
    const firstFutureKey = Object.entries(run.stageDigests).find(([key, value]) => {
      if (key === "evaluationDigests") return run.phase === "CONTEXT_COMPOSED" && value.length > 0;
      return run.phase === "CONTEXT_COMPOSED" && key === "proposalDigest" && value !== undefined;
    });
    if (firstFutureKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stageDigests", firstFutureKey[0]],
        message: "A future-stage digest cannot appear before its phase.",
      });
    }
  });

export const TrajectoryReceiptSchema = z
  .object({
    kind: z.literal("TrajectoryReceipt"),
    protocolVersion: z.literal("0.1.0"),
    receiptId: GovernedStableIdSchema,
    runId: GovernedStableIdSchema,
    mode: StateOnlyModeSchema,
    priorReceiptId: GovernedStableIdSchema.nullable(),
    principalIds: z.array(GovernedStableIdSchema).min(1).max(128),
    objectDigests: z.array(GovernedDigestSchema).min(1).max(256),
    toolCalls: z.array(
      z.object({
        callId: GovernedStableIdSchema,
        toolId: GovernedStableIdSchema,
        operationId: GovernedStableIdSchema,
        effectCapability: z.enum(["NONE", "CANDIDATE_ONLY", "EXTERNAL_EFFECT", "UNKNOWN"]),
        status: z.enum(["ALLOWED", "BLOCKED"]),
      }).strict(),
    ).max(256),
    policyChecks: z.array(GovernedStableIdSchema).min(1).max(128),
    effectExecuted: z.literal(false),
    stateDelta: z.object({
      candidateStateChanged: z.boolean(),
      evidenceStateChanged: z.boolean(),
      receiptStateChanged: z.boolean(),
      externalTargetStateChanged: z.literal(false),
    }).strict(),
    answers: z.object({
      whatHappened: z.string().min(1),
      whyAllowedOrBlocked: z.string().min(1),
      whatChanged: z.string().min(1),
    }).strict(),
    terminationReason: GovernedStableIdSchema,
    startedAt: GovernedTimestampSchema,
    completedAt: GovernedTimestampSchema,
    costUsd: z.number().min(0),
    latencyMs: z.number().int().min(0),
    contentDigest: GovernedDigestSchema,
  })
  .strict();
```

- [ ] **Step 5: Extend valid test builders for every new contract**

Add `validAgentProposal`, `validExecutionPolicyDecision`, and `validGovernedAgentRun` to `test-support.ts` using stable IDs, non-secret fixture values, `mode: "STATE_ONLY"`, and `effectExecutionAllowed: false`.

- [ ] **Step 6: Run the action/run tests and verify GREEN**

```bash
bunx vitest run \
  src/lib/quirk/governed-runs/contracts/action.test.ts \
  src/lib/quirk/governed-runs/contracts/run.test.ts
```

Expected: **PASS**.

- [ ] **Step 7: Commit the action/run contract slice**

```bash
git add -- \
  src/lib/quirk/governed-runs/contracts/action.ts \
  src/lib/quirk/governed-runs/contracts/run.ts \
  src/lib/quirk/governed-runs/contracts/action.test.ts \
  src/lib/quirk/governed-runs/contracts/run.test.ts \
  src/lib/quirk/governed-runs/test-support.ts
git commit -m "feat(governance): add state-only run contracts"
```

---

### Task 3: Add canonical digests and append-only run revisions

**Files:**
- Create: `src/lib/quirk/governed-runs/digests.ts`
- Create: `src/lib/quirk/governed-runs/digests.test.ts`
- Modify: `src/lib/quirk/governed-runs/test-support.ts`

**Interfaces:**
- Consumes: `digestCanonical` from PR #98 and Task 2 run contracts.
- Produces: domain-specific digest functions and `appendRunRevision(previous, input)`.

**Candidate integration prerequisite:** Any future composition decision must bind the exact proposal, authority-resolution digest, policy revision, validated session scope, history head, and action-taxonomy version. Canonical digest tests must detect a change to each binding, including stale or substituted inputs. Coordinate the schema/version change with Task 2; copying a supplied digest or a `historyComplete: true` assertion is not authentication.

- [ ] **Step 1: Write failing digest and revision-chain tests**

```ts
// src/lib/quirk/governed-runs/digests.test.ts
import { describe, expect, test } from "vitest";
import {
  appendRunRevision,
  computeGovernedRunDigest,
  computePersonaPlanDigest,
} from "./digests";
import { validGovernedAgentRun, validPersonaPlan } from "./test-support";

describe("governed-run digests", () => {
  test("is stable across object key order", () => {
    const plan = validPersonaPlan();
    const reordered = Object.fromEntries(Object.entries(plan).reverse());
    expect(computePersonaPlanDigest(plan)).toBe(
      computePersonaPlanDigest(reordered),
    );
  });
});

describe("appendRunRevision", () => {
  test("links a new immutable revision to the prior digest", () => {
    const previous = validGovernedAgentRun();
    const next = appendRunRevision(previous, {
      phase: "PROPOSED",
      status: "ACTIVE",
      stageDigests: {
        ...previous.stageDigests,
        proposalDigest: `sha256:${"a".repeat(64)}`,
      },
      decisionState: "NOT_REQUESTED",
      createdAt: "2026-08-28T12:06:00.000Z",
      expiresAt: previous.expiresAt,
    });
    expect(next.runRevision).toBe(previous.runRevision + 1);
    expect(next.priorRunDigest).toBe(computeGovernedRunDigest(previous));
    expect(previous.phase).not.toBe(next.phase);
  });

  test("rejects a mode change inside one run", () => {
    const previous = validGovernedAgentRun();
    expect(() =>
      appendRunRevision(previous, {
        mode: "REVERSIBLE_SANDBOX" as never,
        phase: "PROPOSED",
        status: "ACTIVE",
        stageDigests: previous.stageDigests,
        decisionState: "NOT_REQUESTED",
        createdAt: "2026-08-28T12:06:00.000Z",
        expiresAt: previous.expiresAt,
      }),
    ).toThrow(/mode/i);
  });
});
```

- [ ] **Step 2: Run the digest tests and verify RED**

```bash
bunx vitest run src/lib/quirk/governed-runs/digests.test.ts
```

Expected: **FAIL** because `digests.ts` does not exist.

- [ ] **Step 3: Implement domain-separated digests and revisions**

```ts
// src/lib/quirk/governed-runs/digests.ts
import { digestCanonical } from "../design-tribunal/protocol";
import { PersonaPlanSchema, PerspectiveProjectionSchema } from "./contracts/context";
import { AgentProposalSchema, EffectCandidateSchema } from "./contracts/action";
import { GovernedAgentRunSchema, type GovernedAgentRun } from "./contracts/run";

export const computePersonaPlanDigest = (value: unknown): string =>
  digestCanonical(
    stripDigest(PersonaPlanSchema.parse(value)),
    "quirk.governed-run.persona-plan.v1",
  );

export const computePerspectiveProjectionDigest = (value: unknown): string =>
  digestCanonical(
    stripDigest(PerspectiveProjectionSchema.parse(value)),
    "quirk.governed-run.perspective-projection.v1",
  );

export const computeAgentProposalDigest = (value: unknown): string =>
  digestCanonical(
    stripDigest(AgentProposalSchema.parse(value)),
    "quirk.governed-run.agent-proposal.v1",
  );

export const computeEffectCandidateDigest = (value: unknown): string =>
  digestCanonical(
    stripDigest(EffectCandidateSchema.parse(value)),
    "quirk.governed-run.effect-candidate.v1",
  );

export const computeGovernedRunDigest = (value: unknown): string =>
  digestCanonical(
    stripDigest(GovernedAgentRunSchema.parse(value)),
    "quirk.governed-run.snapshot.v1",
  );

function stripDigest<T extends { contentDigest: string }>(value: T): Omit<T, "contentDigest"> {
  const { contentDigest: _digest, ...basis } = value;
  return basis;
}

export function appendRunRevision(
  previous: GovernedAgentRun,
  input: Omit<GovernedAgentRun, "kind" | "protocolVersion" | "runId" | "runRevision" | "priorRunDigest" | "contentDigest"> & {
    mode?: GovernedAgentRun["mode"];
  },
): GovernedAgentRun {
  if (input.mode && input.mode !== previous.mode) {
    throw new TypeError("A governed run cannot change effect maturity mode.");
  }
  const basis = {
    ...input,
    kind: "GovernedAgentRun" as const,
    protocolVersion: "0.1.0" as const,
    runId: previous.runId,
    runRevision: previous.runRevision + 1,
    priorRunDigest: computeGovernedRunDigest(previous),
    mode: previous.mode,
    contentDigest: `sha256:${"0".repeat(64)}`,
  };
  const contentDigest = digestCanonical(
    stripDigest(basis),
    "quirk.governed-run.snapshot.v1",
  );
  return GovernedAgentRunSchema.parse({ ...basis, contentDigest });
}
```

- [ ] **Step 4: Run the digest tests and verify GREEN**

```bash
bunx vitest run src/lib/quirk/governed-runs/digests.test.ts
```

Expected: **PASS**.

- [ ] **Step 5: Commit the digest/revision slice**

```bash
git add -- \
  src/lib/quirk/governed-runs/digests.ts \
  src/lib/quirk/governed-runs/digests.test.ts \
  src/lib/quirk/governed-runs/test-support.ts
git commit -m "feat(governance): add governed run digest chain"
```

---

### Task 4: Implement deterministic many-tier authority resolution

**Files:**
- Create: `src/lib/quirk/governed-runs/authority-resolution.ts`
- Create: `src/lib/quirk/governed-runs/authority-resolution.test.ts`
- Modify: `src/lib/quirk/governed-runs/issues.ts`
- Modify: `src/lib/quirk/governed-runs/test-support.ts`

**Interfaces:**
- Consumes: `AgentProposal`, instruction schemas, PR #98 `VerifiedTribunalAuthorityGrant`, and exact Tribunal scope helpers.
- Produces: `resolveManyTierAuthority(input): GovernedRunResult<ManyTierAuthorityResolution>`.
- The function accepts only already verified grants. It never parses raw authority tokens and never accepts role strings as grant substitutes.

**Candidate preservation obligation:** Keep this resolver and its authority semantics unchanged. History cannot create permission, resolve conflicts, combine grants, satisfy human review, or convert successful validation (`ok: true`) into candidate permission. The adapter must preserve the complete original resolution, including review requirements, conflicts, and grant boundaries; Task 5 alone may add a narrowing composition constraint.

- [ ] **Step 1: Write failing deep-conflict, no-union, and retroactive-grant tests**

```ts
// src/lib/quirk/governed-runs/authority-resolution.test.ts
import { describe, expect, test } from "vitest";
import { resolveManyTierAuthority } from "./authority-resolution";
import {
  validAgentProposal,
  validInstructionGraph,
  validVerifiedGrant,
} from "./test-support";

describe("resolveManyTierAuthority", () => {
  test("resolves a 12-tier graph deterministically and preserves suppressed instructions", () => {
    const graph = validInstructionGraph({ depth: 12, terminalDirective: "ALLOW" });
    const result = resolveManyTierAuthority({
      proposal: validAgentProposal(),
      ...graph,
      verifiedAuthorityGrants: [validVerifiedGrant()],
      canonicalPrincipalIds: graph.instructionNodes.map((node) => node.issuerPrincipalId),
      applicablePolicyIds: ["policy.state_only.v1"],
      policyStateDigest: `sha256:${"b".repeat(64)}`,
      now: new Date("2026-08-28T12:10:00.000Z"),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.result).toBe("PERMITTED_CANDIDATE_ONLY");
      expect(result.value.suppressedInstructionIds).toHaveLength(11);
    }
  });

  test("does not union partial scopes across grants", () => {
    const first = validVerifiedGrant({ omitScope: "quirk.tribunal.effect:recommend" });
    const second = validVerifiedGrant({ omitScope: "quirk.tribunal.realm:governance", grantId: "grant.second" });
    const result = resolveManyTierAuthority({
      proposal: validAgentProposal(),
      ...validInstructionGraph({ depth: 2, terminalDirective: "ALLOW" }),
      verifiedAuthorityGrants: [first, second],
      canonicalPrincipalIds: ["principal.policy"],
      applicablePolicyIds: ["policy.state_only.v1"],
      policyStateDigest: `sha256:${"b".repeat(64)}`,
      now: new Date("2026-08-28T12:10:00.000Z"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toContain(
        "AUTHORITY_SCOPE_UNION_FORBIDDEN",
      );
    }
  });

  test("rejects a grant issued after the proposal", () => {
    const late = validVerifiedGrant({ issuedAt: "2026-08-28T12:06:00.000Z" });
    const proposal = validAgentProposal();
    proposal.proposedAt = "2026-08-28T12:05:00.000Z";
    const result = resolveManyTierAuthority({
      proposal,
      ...validInstructionGraph({ depth: 1, terminalDirective: "ALLOW" }),
      verifiedAuthorityGrants: [late],
      canonicalPrincipalIds: ["principal.policy"],
      applicablePolicyIds: ["policy.state_only.v1"],
      policyStateDigest: `sha256:${"b".repeat(64)}`,
      now: new Date("2026-08-28T12:10:00.000Z"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toContain(
        "AUTHORITY_RETROACTIVE",
      );
    }
  });
});
```

- [ ] **Step 2: Run the authority tests and verify RED**

```bash
bunx vitest run src/lib/quirk/governed-runs/authority-resolution.test.ts
```

Expected: **FAIL** because the resolver does not exist.

- [ ] **Step 3: Implement exact required-scope derivation**

```ts
// src/lib/quirk/governed-runs/authority-resolution.ts
import {
  tribunalAudienceScope,
  tribunalDestinationScope,
  tribunalEffectScope,
  tribunalPurposeScope,
  tribunalRealmScope,
  tribunalSubjectIdScope,
  tribunalTargetClassScope,
  tribunalTenantScope,
  type VerifiedTribunalAuthorityGrant,
} from "../design-tribunal/protocol";
import {
  ManyTierAuthorityResolutionSchema,
  type AgentProposal,
  type InstructionEdge,
  type InstructionNode,
  type ManyTierAuthorityResolution,
} from "./contracts/action";
import { digestCanonical } from "../design-tribunal/protocol";
import type { GovernedRunResult, GovernedRunIssue } from "./issues";

function requiredScopes(proposal: AgentProposal): string[] {
  return [
    tribunalRealmScope("governance"),
    tribunalSubjectIdScope(proposal.requestedEffect.targetClass),
    tribunalTargetClassScope(proposal.requestedEffect.targetClass),
    tribunalEffectScope(proposal.requestedEffect.tribunalEffect),
    tribunalPurposeScope("governed-agent-run"),
    tribunalTenantScope("quirk"),
    tribunalAudienceScope("operator"),
    tribunalDestinationScope(proposal.requestedEffect.targetLocator),
  ];
}
```

- [ ] **Step 4: Implement cycle detection, policy-deny precedence, and single-grant completeness**

```ts
export function resolveManyTierAuthority(input: {
  proposal: AgentProposal;
  instructionNodes: InstructionNode[];
  instructionEdges: InstructionEdge[];
  verifiedAuthorityGrants: VerifiedTribunalAuthorityGrant[];
  canonicalPrincipalIds: string[];
  applicablePolicyIds: string[];
  policyStateDigest: string;
  now: Date;
}): GovernedRunResult<ManyTierAuthorityResolution> {
  const issues: GovernedRunIssue[] = [];
  const knownPrincipals = new Set(input.canonicalPrincipalIds);
  for (const node of input.instructionNodes) {
    if (!knownPrincipals.has(node.issuerPrincipalId)) {
      issues.push({ code: "PRINCIPAL_UNRESOLVED", path: `instructionNodes.${node.instructionId}`, refs: [node.issuerPrincipalId] });
    }
  }
  if (hasOverrideCycle(input.instructionNodes, input.instructionEdges)) {
    issues.push({ code: "INSTRUCTION_GRAPH_CYCLE", path: "instructionEdges", refs: [] });
  }

  const required = requiredScopes(input.proposal);
  const completeGrants = input.verifiedAuthorityGrants.filter(({ grant }) =>
    required.every((scope) => grant.scopes.includes(scope)),
  );
  const anyScopeAvailable = required.every((scope) =>
    input.verifiedAuthorityGrants.some(({ grant }) => grant.scopes.includes(scope)),
  );
  if (completeGrants.length === 0) {
    issues.push({
      code: anyScopeAvailable
        ? "AUTHORITY_SCOPE_UNION_FORBIDDEN"
        : "AUTHORITY_SCOPE_INCOMPLETE",
      path: "verifiedAuthorityGrants",
      refs: required,
    });
  }
  for (const verified of completeGrants) {
    if (Date.parse(verified.grant.issuedAt) > Date.parse(input.proposal.proposedAt)) {
      issues.push({ code: "AUTHORITY_RETROACTIVE", path: `verifiedAuthorityGrants.${verified.grant.grantId}`, refs: [verified.grant.grantId] });
    }
  }
  if (issues.length > 0) return { ok: false, value: null, issues };

  const activeNodes = input.instructionNodes.filter((node) => {
    const issued = Date.parse(node.issuedAt) <= input.now.getTime();
    const unexpired = node.expiresAt === null || Date.parse(node.expiresAt) > input.now.getTime();
    return issued && unexpired && node.effectId === input.proposal.requestedEffect.effectId;
  });
  const policyDenials = activeNodes.filter(
    (node) => node.sourceKind === "POLICY" && node.directive === "DENY",
  );
  const minimumTier = Math.min(...activeNodes.map(({ tier }) => tier));
  const topTier = activeNodes.filter(({ tier }) => tier === minimumTier);
  const directives = new Set(topTier.map(({ directive }) => directive));
  const result =
    policyDenials.length > 0
      ? "PROHIBITED"
      : directives.size !== 1
        ? "UNRESOLVED"
        : topTier[0].directive === "DENY"
          ? "PROHIBITED"
          : topTier[0].directive === "REQUIRE_HUMAN_REVIEW"
            ? "HUMAN_REVIEW"
            : "PERMITTED_CANDIDATE_ONLY";

  const winningInstructionIds =
    policyDenials.length > 0
      ? policyDenials.map(({ instructionId }) => instructionId)
      : topTier.map(({ instructionId }) => instructionId);
  const valueWithoutDigest = {
    kind: "ManyTierAuthorityResolution" as const,
    protocolVersion: "0.1.0" as const,
    resolutionId: `${input.proposal.proposalId}.authority`,
    proposalId: input.proposal.proposalId,
    instructionNodes: input.instructionNodes,
    instructionEdges: input.instructionEdges,
    canonicalPrincipalIds: [...knownPrincipals].sort(),
    activeAuthorityGrantIds: completeGrants.map(({ grant }) => grant.grantId).sort(),
    applicablePolicyIds: [...input.applicablePolicyIds].sort(),
    winningInstructionIds: winningInstructionIds.sort(),
    suppressedInstructionIds: activeNodes
      .map(({ instructionId }) => instructionId)
      .filter((id) => !winningInstructionIds.includes(id))
      .sort(),
    unresolvedConflictIds: result === "UNRESOLVED" ? topTier.map(({ instructionId }) => instructionId).sort() : [],
    permittedEffects: result === "PERMITTED_CANDIDATE_ONLY" ? [input.proposal.requestedEffect] : [],
    prohibitedEffects: result === "PROHIBITED" ? [input.proposal.requestedEffect] : [],
    requiredHumanReview: result === "HUMAN_REVIEW" ? [input.proposal.requestedEffect.effectId] : [],
    result,
    policyStateDigest: input.policyStateDigest,
    evaluatedAt: input.now.toISOString(),
  };
  return {
    ok: true,
    value: ManyTierAuthorityResolutionSchema.parse({
      ...valueWithoutDigest,
      contentDigest: digestCanonical(valueWithoutDigest, "quirk.governed-run.authority-resolution.v1"),
    }),
    issues: [],
  };
}
```

Implement `hasOverrideCycle` with an iterative depth-first traversal over only `OVERRIDES` edges; missing edge endpoints are `CONTRACT_INVALID` rather than silently ignored.

- [ ] **Step 5: Run the authority tests and verify GREEN**

```bash
bunx vitest run src/lib/quirk/governed-runs/authority-resolution.test.ts
```

Expected: **PASS**.

- [ ] **Step 6: Commit the authority-resolution slice**

```bash
git add -- \
  src/lib/quirk/governed-runs/authority-resolution.ts \
  src/lib/quirk/governed-runs/authority-resolution.test.ts \
  src/lib/quirk/governed-runs/issues.ts \
  src/lib/quirk/governed-runs/test-support.ts
git commit -m "feat(governance): resolve many-tier run authority"
```

---

### Task 5: Add agency-locus validation and the no-effect policy gate

**Files:**
- Create: `src/lib/quirk/governed-runs/agency.ts`
- Create: `src/lib/quirk/governed-runs/state-only-policy.ts`
- Create: `src/lib/quirk/governed-runs/state-only-policy.test.ts`
- Modify: `src/lib/quirk/governed-runs/test-support.ts`

**Interfaces:**
- Consumes: authority resolution from Task 4, agency and policy contracts from Task 2.
- Produces: `validateAgencyLocus` and `decideStateOnlyExecution`.

**Candidate test obligation, pending independent human review:** Add a pure post-policy adapter proof under `evals/session-composition/adapter/`. Use the exact plan-extracted Task 4/5 Zod result schemas and execute the planned Task 5 function against them; the production Task 4/5 modules do not yet exist. This tests the plan boundary without claiming repository integration or verified grants.

- Only narrow otherwise-valid candidate eligibility; preserve Task 4 and Task 5 outputs, human-review obligations, unresolved conflicts, grants, and `effectExecutionAllowed: false`.
- Bind the proposal, original authority and policy digests, effective policy result, policy revision, validated session scope (including run and decision slot), history head, taxonomy version/digest, composition policy digest, and normalized operations digest. Missing, incomplete, untrusted, or mismatched required history blocks candidate eligibility. The fixture-owned resolver supplies scoped snapshots through opaque handles; caller history payloads or trust flags cannot establish trust. Real history authentication remains unproved.
- Cross all four authority outcomes with clean, prohibited, and untrusted history; also test missing history and changed bindings. Include an explicit Mode A fixture policy: a simulated accepted allocation forbids a conflicting second allocation in one decision slot, while a rationale-only update remains eligible. This is a declared fixture restriction, not a universal policy.
- Retain the second declared fixture from #105: reading one synthetic, non-secret candidate answer key and building its blind rationale is prohibited in either order; either action alone and the public-rubric/rationale control remain eligible. This tests a supplied rule, not semantic contamination detection. Preserve contradiction, returned-snapshot isolation, and same-label policy/taxonomy-content substitution regressions in the consolidated harness; see its [evidence lineage](../../../evals/session-composition/adapter/evidence-lineage.md).
- Keep an honestly classified `EXTERNAL_EFFECT` denied. Removing history checking must cause the prohibited Mode A case to fail while its matched control remains meaningful.
- Require `SIMULATION` provenance. Retain `PROPOSED` and `DENIED` events in the complete bound ledger but exclude them from accepted-composition matching; count `SIMULATED_ACCEPTED`. Block `RESERVED`, `COMMITTED`, `FAILED`, and `UNKNOWN_OUTCOME` as unsupported by this simulation-only adapter. Simulation acceptance is never executed-effect evidence.

Record the actual command, tested source versions, fixture/code digests, failures, and limitations in `evals/session-composition/adapter/verification.json`; reproduction belongs in its `README.md`. A passing adapter earns review of canonical integration; it neither completes this task nor closes independent human review.

- [ ] **Step 1: Write failing hidden-side-effect and human-review tests**

```ts
// src/lib/quirk/governed-runs/state-only-policy.test.ts
import { describe, expect, test } from "vitest";
import { decideStateOnlyExecution } from "./state-only-policy";
import {
  validAgencyLocus,
  validAgentProposal,
  validAuthorityResolution,
} from "./test-support";

describe("decideStateOnlyExecution", () => {
  test("blocks a preparatory operation that can produce an external effect", () => {
    const result = decideStateOnlyExecution({
      runId: "run.state-only.1",
      proposal: validAgentProposal(),
      authorityResolution: validAuthorityResolution(),
      agencyLocus: validAgencyLocus(),
      operations: [
        {
          operationId: "operation.preview.social_post",
          classification: "EXTERNAL_EFFECT",
          toolId: "tool.social.publisher",
          containsSecretMaterial: false,
        },
      ],
      policyStateDigest: `sha256:${"b".repeat(64)}`,
      now: new Date("2026-08-28T12:12:00.000Z"),
      expiresAt: new Date("2026-08-28T12:17:00.000Z"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toContain(
        "PREPARATION_SIDE_EFFECT_FORBIDDEN",
      );
    }
  });

  test("preserves a human-review authority result and never executes", () => {
    const resolution = validAuthorityResolution();
    resolution.result = "HUMAN_REVIEW";
    const result = decideStateOnlyExecution({
      runId: "run.state-only.1",
      proposal: validAgentProposal(),
      authorityResolution: resolution,
      agencyLocus: validAgencyLocus(),
      operations: [],
      policyStateDigest: `sha256:${"b".repeat(64)}`,
      now: new Date("2026-08-28T12:12:00.000Z"),
      expiresAt: new Date("2026-08-28T12:17:00.000Z"),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.decision).toBe("REQUIRE_HUMAN_REVIEW");
      expect(result.value.effectExecutionAllowed).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run the policy tests and verify RED**

```bash
bunx vitest run src/lib/quirk/governed-runs/state-only-policy.test.ts
```

Expected: **FAIL** because the policy module does not exist.

- [ ] **Step 3: Implement agency-locus validation**

```ts
// src/lib/quirk/governed-runs/agency.ts
import { AgencyLocusDeclarationSchema, type AgencyLocusDeclaration } from "./contracts/action";
import type { GovernedRunResult, GovernedRunIssue } from "./issues";

export function validateAgencyLocus(
  value: unknown,
): GovernedRunResult<AgencyLocusDeclaration> {
  const parsed = AgencyLocusDeclarationSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      value: null,
      issues: parsed.error.issues.map((issue) => ({
        code: "CONTRACT_INVALID" as const,
        path: issue.path.join(".") || "$",
        refs: [issue.code],
      })),
    };
  }
  const issues: GovernedRunIssue[] = [];
  if (
    parsed.data.triggerOrigin === "SCHEDULE" &&
    parsed.data.goalOriginatorPrincipalId === parsed.data.intendedExecutorPrincipalId
  ) {
    issues.push({
      code: "CONTRACT_INVALID",
      path: "goalOriginatorPrincipalId",
      refs: ["scheduled_execution_is_not_agent_originated_intent"],
    });
  }
  return issues.length > 0
    ? { ok: false, value: null, issues }
    : { ok: true, value: parsed.data, issues: [] };
}
```

- [ ] **Step 4: Implement Mode A operation classification and policy decision**

```ts
// src/lib/quirk/governed-runs/state-only-policy.ts
import { digestCanonical } from "../design-tribunal/protocol";
import { ExecutionPolicyDecisionSchema, type AgentProposal, type AgencyLocusDeclaration, type ManyTierAuthorityResolution } from "./contracts/action";
import type { GovernedRunIssue, GovernedRunResult } from "./issues";

export type StateOnlyOperation = Readonly<{
  operationId: string;
  classification: "PURE" | "CANDIDATE_STATE" | "EXTERNAL_EFFECT" | "UNKNOWN";
  toolId: string;
  containsSecretMaterial: boolean;
}>;

export function decideStateOnlyExecution(input: {
  runId: string;
  proposal: AgentProposal;
  authorityResolution: ManyTierAuthorityResolution;
  agencyLocus: AgencyLocusDeclaration;
  operations: StateOnlyOperation[];
  policyStateDigest: string;
  now: Date;
  expiresAt: Date;
}): GovernedRunResult<ReturnType<typeof ExecutionPolicyDecisionSchema.parse>> {
  const issues: GovernedRunIssue[] = [];
  for (const operation of input.operations) {
    if (operation.containsSecretMaterial) {
      issues.push({ code: "SECRET_MATERIAL_FORBIDDEN", path: `operations.${operation.operationId}`, refs: [operation.toolId] });
    }
    if (operation.classification === "EXTERNAL_EFFECT") {
      issues.push({ code: "PREPARATION_SIDE_EFFECT_FORBIDDEN", path: `operations.${operation.operationId}`, refs: [operation.toolId] });
    }
    if (operation.classification === "UNKNOWN") {
      issues.push({ code: "EFFECT_OPERATION_FORBIDDEN", path: `operations.${operation.operationId}`, refs: [operation.toolId] });
    }
  }
  if (issues.length > 0) return { ok: false, value: null, issues };

  const decision =
    input.authorityResolution.result === "PERMITTED_CANDIDATE_ONLY"
      ? "ALLOW_CANDIDATE_ONLY"
      : input.authorityResolution.result === "HUMAN_REVIEW"
        ? "REQUIRE_HUMAN_REVIEW"
        : "DENY";
  const basis = {
    kind: "ExecutionPolicyDecision" as const,
    protocolVersion: "0.1.0" as const,
    policyDecisionId: `${input.runId}.policy`,
    runId: input.runId,
    proposalDigest: input.proposal.contentDigest,
    authorityResolutionDigest: input.authorityResolution.contentDigest,
    agencyLocusDigest: input.agencyLocus.contentDigest,
    mode: "STATE_ONLY" as const,
    decision,
    effectExecutionAllowed: false as const,
    permittedPreparatoryOperationIds: input.operations
      .filter(({ classification }) => classification === "PURE" || classification === "CANDIDATE_STATE")
      .map(({ operationId }) => operationId)
      .sort(),
    deniedOperationIds: [],
    grantIds: input.authorityResolution.activeAuthorityGrantIds,
    policyReasonCodes: [
      decision === "ALLOW_CANDIDATE_ONLY"
        ? "policy.state_only.candidate_only"
        : decision === "REQUIRE_HUMAN_REVIEW"
          ? "policy.state_only.human_review"
          : "policy.state_only.denied",
    ],
    policyStateDigest: input.policyStateDigest,
    evaluatedAt: input.now.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
  };
  return {
    ok: true,
    value: ExecutionPolicyDecisionSchema.parse({
      ...basis,
      contentDigest: digestCanonical(basis, "quirk.governed-run.execution-policy.v1"),
    }),
    issues: [],
  };
}
```

- [ ] **Step 5: Run the policy tests and verify GREEN**

```bash
bunx vitest run src/lib/quirk/governed-runs/state-only-policy.test.ts
```

Expected: **PASS**.

- [ ] **Step 6: Commit the agency/policy slice**

```bash
git add -- \
  src/lib/quirk/governed-runs/agency.ts \
  src/lib/quirk/governed-runs/state-only-policy.ts \
  src/lib/quirk/governed-runs/state-only-policy.test.ts \
  src/lib/quirk/governed-runs/test-support.ts
git commit -m "feat(governance): gate state-only run effects"
```

---

### Task 6: Assemble the complete Mode A run and trajectory receipt

**Files:**
- Create: `src/lib/quirk/governed-runs/state-only.ts`
- Create: `src/lib/quirk/governed-runs/state-only.test.ts`
- Modify: `src/lib/quirk/governed-runs/digests.ts`
- Modify: `src/lib/quirk/governed-runs/test-support.ts`

**Interfaces:**
- Consumes: all prior contracts, digest functions, authority resolver output, agency validation, and Mode A policy decision.
- Produces: `assembleStateOnlyRun(input)` returning a final append-only run revision and a `TrajectoryReceipt`. No executor callback exists in the function signature.

**Deferred composition integration gate:** After the Task 2/3 contract change and Task 5 proof are reviewed, show that this actual consumer enforces the bound narrowing decision and rejects missing, stale, substituted, or detached composition results. Preserve review/conflict obligations through assembly and keep simulation history separate from executed-effect evidence. The unchanged example below does not enforce the candidate adapter; no consumer integration is claimed by the test-only proof.

- [ ] **Step 1: Write failing no-executor and state-delta tests**

```ts
// src/lib/quirk/governed-runs/state-only.test.ts
import { describe, expect, test } from "vitest";
import { assembleStateOnlyRun } from "./state-only";
import { validStateOnlyAssemblyInput } from "./test-support";

describe("assembleStateOnlyRun", () => {
  test("completes with no external effect and an explicit state delta", () => {
    const result = assembleStateOnlyRun(validStateOnlyAssemblyInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.trajectoryReceipt.effectExecuted).toBe(false);
      expect(
        result.value.trajectoryReceipt.stateDelta.externalTargetStateChanged,
      ).toBe(false);
      expect(result.value.run.mode).toBe("STATE_ONLY");
      expect(result.value.run.phase).toBe("MODE_COMPLETE");
    }
  });

  test("fails when a tool call reports an external-effect capability", () => {
    const input = validStateOnlyAssemblyInput();
    input.toolCalls.push({
      callId: "call.hidden.effect",
      toolId: "tool.publisher",
      operationId: "operation.preview",
      effectCapability: "EXTERNAL_EFFECT",
      status: "ALLOWED",
    });
    const result = assembleStateOnlyRun(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toContain(
        "TRAJECTORY_INVALID",
      );
    }
  });
});
```

- [ ] **Step 2: Run the assembler tests and verify RED**

```bash
bunx vitest run src/lib/quirk/governed-runs/state-only.test.ts
```

Expected: **FAIL** because `state-only.ts` does not exist.

- [ ] **Step 3: Add digest functions for agency, policy, candidate, and trajectory**

Extend `digests.ts` with functions that parse the exact canonical schema, remove `contentDigest`, and call `digestCanonical` using these domains:

```text
quirk.governed-run.authority-resolution.v1
quirk.governed-run.agency-locus.v1
quirk.governed-run.execution-policy.v1
quirk.governed-run.effect-candidate.v1
quirk.governed-run.trajectory-receipt.v1
```

- [ ] **Step 4: Implement the state-only assembler with no executor port**

```ts
// src/lib/quirk/governed-runs/state-only.ts
import { digestCanonical } from "../design-tribunal/protocol";
import { EffectCandidateSchema, type AgentProposal, type AgencyLocusDeclaration, type ExecutionPolicyDecision, type ManyTierAuthorityResolution } from "./contracts/action";
import { GovernedAgentRunSchema, TrajectoryReceiptSchema, type GovernedAgentRun } from "./contracts/run";
import { PersonaPlanSchema, PerspectiveProjectionSchema } from "./contracts/context";
import type { GovernedRunIssue, GovernedRunResult } from "./issues";

export type StateOnlyAssemblyInput = Readonly<{
  initialRun: GovernedAgentRun;
  personaPlan: unknown;
  perspectiveProjection: unknown;
  proposal: AgentProposal;
  authorityResolution: ManyTierAuthorityResolution;
  agencyLocus: AgencyLocusDeclaration;
  policyDecision: ExecutionPolicyDecision;
  effectCandidate: unknown;
  toolCalls: Array<{
    callId: string;
    toolId: string;
    operationId: string;
    effectCapability: "NONE" | "CANDIDATE_ONLY" | "EXTERNAL_EFFECT" | "UNKNOWN";
    status: "ALLOWED" | "BLOCKED";
  }>;
  policyCheckIds: string[];
  principalIds: string[];
  evaluationDigests: string[];
  startedAt: string;
  completedAt: string;
  costUsd: number;
  latencyMs: number;
}>;

export function assembleStateOnlyRun(
  input: StateOnlyAssemblyInput,
): GovernedRunResult<{
  run: GovernedAgentRun;
  effectCandidate: ReturnType<typeof EffectCandidateSchema.parse>;
  trajectoryReceipt: ReturnType<typeof TrajectoryReceiptSchema.parse>;
}> {
  const issues: GovernedRunIssue[] = [];
  const personaPlan = PersonaPlanSchema.safeParse(input.personaPlan);
  const projection = PerspectiveProjectionSchema.safeParse(
    input.perspectiveProjection,
  );
  const candidate = EffectCandidateSchema.safeParse(input.effectCandidate);
  if (!personaPlan.success || !projection.success || !candidate.success) {
    return {
      ok: false,
      value: null,
      issues: [{ code: "CONTRACT_INVALID", path: "$", refs: [] }],
    };
  }
  if (
    input.initialRun.mode !== "STATE_ONLY" ||
    input.policyDecision.mode !== "STATE_ONLY" ||
    input.policyDecision.effectExecutionAllowed !== false
  ) {
    issues.push({ code: "MODE_ESCALATION_FORBIDDEN", path: "mode", refs: [] });
  }
  if (
    input.policyDecision.decision === "DENY" ||
    input.authorityResolution.result === "PROHIBITED" ||
    input.authorityResolution.result === "UNRESOLVED"
  ) {
    issues.push({ code: "TRAJECTORY_INVALID", path: "policyDecision", refs: [] });
  }
  for (const call of input.toolCalls) {
    if (
      call.status === "ALLOWED" &&
      (call.effectCapability === "EXTERNAL_EFFECT" ||
        call.effectCapability === "UNKNOWN")
    ) {
      issues.push({
        code: "TRAJECTORY_INVALID",
        path: `toolCalls.${call.callId}`,
        refs: [call.toolId],
      });
    }
  }
  if (issues.length > 0) return { ok: false, value: null, issues };

  const objectDigests = [
    personaPlan.data.contentDigest,
    projection.data.contentDigest,
    input.proposal.contentDigest,
    input.authorityResolution.contentDigest,
    input.agencyLocus.contentDigest,
    input.policyDecision.contentDigest,
    candidate.data.contentDigest,
    ...input.evaluationDigests,
  ];
  const receiptBasis = {
    kind: "TrajectoryReceipt" as const,
    protocolVersion: "0.1.0" as const,
    receiptId: `${input.initialRun.runId}.trajectory.1`,
    runId: input.initialRun.runId,
    mode: "STATE_ONLY" as const,
    priorReceiptId: null,
    principalIds: [...new Set(input.principalIds)].sort(),
    objectDigests: [...new Set(objectDigests)].sort(),
    toolCalls: input.toolCalls,
    policyChecks: [...new Set(input.policyCheckIds)].sort(),
    effectExecuted: false as const,
    stateDelta: {
      candidateStateChanged: true,
      evidenceStateChanged: input.evaluationDigests.length > 0,
      receiptStateChanged: true,
      externalTargetStateChanged: false as const,
    },
    answers: {
      whatHappened: "Quirk assembled and evaluated an exact state-only effect candidate.",
      whyAllowedOrBlocked: "Current grants and policy allow candidate construction only; no effect executor exists in Mode A.",
      whatChanged: "Candidate, evaluation, and receipt state changed. External target state did not change.",
    },
    terminationReason:
      input.policyDecision.decision === "REQUIRE_HUMAN_REVIEW"
        ? "termination.human_review_required"
        : "termination.state_only_complete",
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    costUsd: input.costUsd,
    latencyMs: input.latencyMs,
  };
  const trajectoryReceipt = TrajectoryReceiptSchema.parse({
    ...receiptBasis,
    contentDigest: digestCanonical(
      receiptBasis,
      "quirk.governed-run.trajectory-receipt.v1",
    ),
  });
  const finalBasis = {
    ...input.initialRun,
    runRevision: input.initialRun.runRevision + 1,
    priorRunDigest: input.initialRun.contentDigest,
    phase: "MODE_COMPLETE" as const,
    status: "COMPLETE" as const,
    decisionState:
      input.policyDecision.decision === "REQUIRE_HUMAN_REVIEW"
        ? "PENDING" as const
        : "NOT_REQUESTED" as const,
    stageDigests: {
      personaPlanDigest: personaPlan.data.contentDigest,
      perspectiveProjectionDigest: projection.data.contentDigest,
      proposalDigest: input.proposal.contentDigest,
      authorityResolutionDigest: input.authorityResolution.contentDigest,
      agencyLocusDigest: input.agencyLocus.contentDigest,
      executionPolicyDecisionDigest: input.policyDecision.contentDigest,
      effectCandidateDigest: candidate.data.contentDigest,
      trajectoryReceiptDigest: trajectoryReceipt.contentDigest,
      evaluationDigests: input.evaluationDigests,
    },
  };
  const run = GovernedAgentRunSchema.parse({
    ...finalBasis,
    contentDigest: digestCanonical(
      { ...finalBasis, contentDigest: undefined },
      "quirk.governed-run.snapshot.v1",
    ),
  });
  return { ok: true, value: { run, effectCandidate: candidate.data, trajectoryReceipt }, issues: [] };
}
```

During implementation, compute `priorRunDigest` through `computeGovernedRunDigest(input.initialRun)` rather than trusting the initial object’s `contentDigest`; the test must fail if those differ.

- [ ] **Step 5: Run the assembler tests and verify GREEN**

```bash
bunx vitest run src/lib/quirk/governed-runs/state-only.test.ts
```

Expected: **PASS**.

- [ ] **Step 6: Commit the Mode A assembly slice**

```bash
git add -- \
  src/lib/quirk/governed-runs/state-only.ts \
  src/lib/quirk/governed-runs/state-only.test.ts \
  src/lib/quirk/governed-runs/digests.ts \
  src/lib/quirk/governed-runs/test-support.ts
git commit -m "feat(governance): assemble state-only governed runs"
```

---

### Task 7: Add exhaustiveness, drift, and regression evaluation subjects

**Files:**
- Create: `src/lib/quirk/governed-runs/contracts/evaluations.ts`
- Create: `src/lib/quirk/governed-runs/evaluations.ts`
- Create: `src/lib/quirk/governed-runs/evaluations.test.ts`
- Modify: `src/lib/quirk/governed-runs/test-support.ts`

**Interfaces:**
- Consumes: strict primitives and digest helper.
- Produces: evaluation-subject records and deterministic issue results. These are subjects/observations only; they do not replace canonical `EvidenceClaim` or `TribunalVerdict`.

- [ ] **Step 1: Write failing completeness, drift, and holdout tests**

```ts
// src/lib/quirk/governed-runs/evaluations.test.ts
import { describe, expect, test } from "vitest";
import {
  evaluateDrift,
  evaluateExhaustiveness,
  evaluateRegression,
} from "./evaluations";
import {
  validDriftEvaluation,
  validExhaustivenessEvaluation,
  validRegressionEvaluation,
} from "./test-support";

describe("evaluateExhaustiveness", () => {
  test("fails when an important constraint is untested", () => {
    const subject = validExhaustivenessEvaluation();
    subject.testedConstraintIds = subject.testedConstraintIds.slice(0, -1);
    const result = evaluateExhaustiveness(subject);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toContain(
        "EXHAUSTIVENESS_INCOMPLETE",
      );
    }
  });

  test("requires an explicit stopping rule", () => {
    const subject = validExhaustivenessEvaluation();
    subject.stoppingRule = "";
    const result = evaluateExhaustiveness(subject);
    expect(result.ok).toBe(false);
  });
});

describe("evaluateDrift", () => {
  test("fails when persona activity changes authority or policy", () => {
    const subject = validDriftEvaluation();
    subject.authorityUnchanged = false;
    subject.policyUnchanged = false;
    const result = evaluateDrift(subject);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toEqual(
        expect.arrayContaining([
          "DRIFT_AUTHORITY_CHANGED",
          "DRIFT_POLICY_CHANGED",
        ]),
      );
    }
  });
});

describe("evaluateRegression", () => {
  test("rejects a contaminated holdout", () => {
    const subject = validRegressionEvaluation();
    subject.holdoutDigest = subject.baselineDigest;
    const result = evaluateRegression(subject);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toContain(
        "HOLDOUT_CONTAMINATED",
      );
    }
  });
});
```

- [ ] **Step 2: Run the evaluation tests and verify RED**

```bash
bunx vitest run src/lib/quirk/governed-runs/evaluations.test.ts
```

Expected: **FAIL** because evaluation contracts/functions do not exist.

- [ ] **Step 3: Implement strict evaluation-subject contracts**

```ts
// src/lib/quirk/governed-runs/contracts/evaluations.ts
import { z } from "zod";
import {
  GovernedDigestSchema,
  GovernedStableIdSchema,
} from "./primitives";

export const ExhaustivenessEvaluationSchema = z
  .object({
    kind: z.literal("ExhaustivenessEvaluation"),
    evaluationId: GovernedStableIdSchema,
    runId: GovernedStableIdSchema,
    constraintInventory: z.array(GovernedStableIdSchema).min(1).max(512),
    testedConstraintIds: z.array(GovernedStableIdSchema).max(512),
    hypothesisIds: z.array(GovernedStableIdSchema).min(1).max(256),
    exploredBranchIds: z.array(GovernedStableIdSchema).max(1_024),
    omittedSurfaces: z.array(z.string().min(1)).max(128),
    authorityTransitionIds: z.array(GovernedStableIdSchema).max(128),
    toolPathIds: z.array(GovernedStableIdSchema).max(256),
    stateMutationIds: z.array(GovernedStableIdSchema).max(256),
    residualUncertainty: z.array(z.string().min(1)).min(1).max(128),
    stoppingRule: z.string().min(1).max(8_192),
    contentDigest: GovernedDigestSchema,
  })
  .strict();

export const DriftEvaluationSchema = z
  .object({
    kind: z.literal("DriftEvaluation"),
    evaluationId: GovernedStableIdSchema,
    runId: GovernedStableIdSchema,
    baselinePersonaPlanDigest: GovernedDigestSchema,
    observedPersonaPlanDigest: GovernedDigestSchema,
    baselinePerspectiveDigest: GovernedDigestSchema,
    observedPerspectiveDigest: GovernedDigestSchema,
    identityPreserved: z.boolean(),
    roleBoundaryPreserved: z.boolean(),
    preferenceClaimsPreserved: z.boolean(),
    memoryClaimsPreserved: z.boolean(),
    authorityUnchanged: z.boolean(),
    policyUnchanged: z.boolean(),
    observedDriftDimensions: z.array(z.enum([
      "STYLE",
      "ROLE",
      "BOUNDARY",
      "AUTHORITY",
      "PREFERENCE",
      "MEMORY",
      "BEHAVIOR",
    ])),
    contentDigest: GovernedDigestSchema,
  })
  .strict();

export const RegressionEvaluationSchema = z
  .object({
    kind: z.literal("RegressionEvaluation"),
    evaluationId: GovernedStableIdSchema,
    runId: GovernedStableIdSchema,
    baselineDigest: GovernedDigestSchema,
    holdoutDigest: GovernedDigestSchema,
    protectedProperties: z.array(
      z.object({
        propertyId: GovernedStableIdSchema,
        expectedDigest: GovernedDigestSchema,
        observedDigest: GovernedDigestSchema,
      }).strict(),
    ).min(1).max(256),
    contentDigest: GovernedDigestSchema,
  })
  .strict();
```

- [ ] **Step 4: Implement deterministic evaluation checks**

```ts
// src/lib/quirk/governed-runs/evaluations.ts
import {
  DriftEvaluationSchema,
  ExhaustivenessEvaluationSchema,
  RegressionEvaluationSchema,
} from "./contracts/evaluations";
import type { GovernedRunIssue, GovernedRunResult } from "./issues";

export function evaluateExhaustiveness(
  raw: unknown,
): GovernedRunResult<ReturnType<typeof ExhaustivenessEvaluationSchema.parse>> {
  const parsed = ExhaustivenessEvaluationSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      value: null,
      issues: [{
        code: raw && typeof raw === "object" && "stoppingRule" in raw
          ? "EXHAUSTIVENESS_INCOMPLETE"
          : "STOPPING_RULE_REQUIRED",
        path: "$",
        refs: [],
      }],
    };
  }
  const missing = parsed.data.constraintInventory.filter(
    (id) => !parsed.data.testedConstraintIds.includes(id),
  );
  return missing.length > 0
    ? {
        ok: false,
        value: null,
        issues: [{
          code: "EXHAUSTIVENESS_INCOMPLETE",
          path: "testedConstraintIds",
          refs: missing,
        }],
      }
    : { ok: true, value: parsed.data, issues: [] };
}

export function evaluateDrift(
  raw: unknown,
): GovernedRunResult<ReturnType<typeof DriftEvaluationSchema.parse>> {
  const parsed = DriftEvaluationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, value: null, issues: [{ code: "CONTRACT_INVALID", path: "$", refs: [] }] };
  }
  const issues: GovernedRunIssue[] = [];
  if (!parsed.data.authorityUnchanged) {
    issues.push({ code: "DRIFT_AUTHORITY_CHANGED", path: "authorityUnchanged", refs: [] });
  }
  if (!parsed.data.policyUnchanged) {
    issues.push({ code: "DRIFT_POLICY_CHANGED", path: "policyUnchanged", refs: [] });
  }
  return issues.length > 0
    ? { ok: false, value: null, issues }
    : { ok: true, value: parsed.data, issues: [] };
}

export function evaluateRegression(
  raw: unknown,
): GovernedRunResult<ReturnType<typeof RegressionEvaluationSchema.parse>> {
  const parsed = RegressionEvaluationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, value: null, issues: [{ code: "CONTRACT_INVALID", path: "$", refs: [] }] };
  }
  const issues: GovernedRunIssue[] = [];
  if (parsed.data.baselineDigest === parsed.data.holdoutDigest) {
    issues.push({ code: "HOLDOUT_CONTAMINATED", path: "holdoutDigest", refs: [] });
  }
  for (const property of parsed.data.protectedProperties) {
    if (property.expectedDigest !== property.observedDigest) {
      issues.push({
        code: "REGRESSION_PROTECTED_PROPERTY_CHANGED",
        path: `protectedProperties.${property.propertyId}`,
        refs: [property.propertyId],
      });
    }
  }
  return issues.length > 0
    ? { ok: false, value: null, issues }
    : { ok: true, value: parsed.data, issues: [] };
}
```

Ensure schema parse errors are mapped deterministically: an empty/missing `stoppingRule` must always produce `STOPPING_RULE_REQUIRED`, not a generic issue.

- [ ] **Step 5: Run the evaluation tests and verify GREEN**

```bash
bunx vitest run src/lib/quirk/governed-runs/evaluations.test.ts
```

Expected: **PASS**.

- [ ] **Step 6: Commit the evaluation-subject slice**

```bash
git add -- \
  src/lib/quirk/governed-runs/contracts/evaluations.ts \
  src/lib/quirk/governed-runs/evaluations.ts \
  src/lib/quirk/governed-runs/evaluations.test.ts \
  src/lib/quirk/governed-runs/test-support.ts
git commit -m "feat(governance): evaluate state-only run integrity"
```

---

### Task 8: Add deterministic adversarial fixtures and drift checking

**Files:**
- Create: `scripts/generate-governed-run-fixture.ts`
- Create: `fixtures/governed-runs/state-only.v1.fixture.json`
- Create: `src/lib/quirk/governed-runs/fixture.test.ts`
- Modify: `src/lib/quirk/governed-runs/test-support.ts`

**Interfaces:**
- Consumes: all Mode A validators and builders.
- Produces: deterministic positive/negative fixture corpus and a `--check` generator mode that fails when committed fixture output drifts.

**Deferred composition integration gate:** Carry the reviewed adapter matrix, matched control, history-removal ablation, binding-tamper cases, and event-state rules into repository-native fixtures against the implemented Task 4/5/6 modules. Keep original labels frozen; a legitimate control failure requires investigation, not relabeling. Real grant/history authentication and any concurrency guarantees require their own evidence.

- [ ] **Step 1: Write the failing fixture-corpus test**

```ts
// src/lib/quirk/governed-runs/fixture.test.ts
import fixture from "../../../../fixtures/governed-runs/state-only.v1.fixture.json";
import { describe, expect, test } from "vitest";
import { validateFixtureCase } from "../../../scripts/generate-governed-run-fixture";

describe("state-only governed-run fixtures", () => {
  for (const fixtureCase of fixture.cases) {
    test(fixtureCase.id, () => {
      const actual = validateFixtureCase(fixtureCase);
      expect(actual).toEqual(fixtureCase.expected);
    });
  }
});
```

If TypeScript cannot import the script path cleanly, move `validateFixtureCase` into `src/lib/quirk/governed-runs/fixture-validator.ts` and let both the script and test import it. Do not duplicate validation logic.

- [ ] **Step 2: Run the fixture test and verify RED**

```bash
bunx vitest run src/lib/quirk/governed-runs/fixture.test.ts
```

Expected: **FAIL** because the generator and fixture do not exist.

- [ ] **Step 3: Implement the fixture generator/checker**

The committed fixture must contain these cases and exact expected issue codes:

```text
positive-state-only                              → PASS
persona-selection-is-not-authority               → PERSONA_AUTHORITY_FORBIDDEN
persona-mask-is-not-identity                      → CONTRACT_INVALID
visible-context-is-not-permitted-use              → CONTEXT_USE_CONFLICT
proposal-claims-approval                          → CONTRACT_INVALID
many-tier-conflict-depth-12                       → PASS
later-grant-retroactive-authorization             → AUTHORITY_RETROACTIVE
unresolved-principal-alias                        → PRINCIPAL_UNRESOLVED
cross-realm-scope-laundering                      → AUTHORITY_SCOPE_INCOMPLETE
state-only-tool-has-hidden-side-effect            → PREPARATION_SIDE_EFFECT_FORBIDDEN
preparation-is-undeclared-effect                  → EFFECT_OPERATION_FORBIDDEN
candidate-is-not-effect                           → PASS with effectExecuted=false
target-state-digest-mismatch                      → EFFECT_CANDIDATE_MISMATCH
incomplete-constraint-coverage                    → EXHAUSTIVENESS_INCOMPLETE
stopping-rule-omitted                             → STOPPING_RULE_REQUIRED
correct-output-invalid-trajectory                 → TRAJECTORY_INVALID
secret-material-in-receipt                        → SECRET_MATERIAL_FORBIDDEN
```

Use deterministic IDs, timestamps, and digest bytes. The generator must never call `Date.now()`, `Math.random()`, a model, network, filesystem outside the fixture path, or a secret store.

```ts
// scripts/generate-governed-run-fixture.ts
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outputPath = resolve(
  process.cwd(),
  "fixtures/governed-runs/state-only.v1.fixture.json",
);
const rendered = `${JSON.stringify(buildFixture(), null, 2)}\n`;
if (process.argv.includes("--check")) {
  const committed = readFileSync(outputPath, "utf8");
  if (committed !== rendered) {
    console.error("Governed-run fixture drift detected.");
    process.exit(1);
  }
} else {
  writeFileSync(outputPath, rendered);
}
```

- [ ] **Step 4: Generate the fixture, then run its test**

```bash
bun scripts/generate-governed-run-fixture.ts
bunx vitest run src/lib/quirk/governed-runs/fixture.test.ts
bun scripts/generate-governed-run-fixture.ts --check
```

Expected: all fixture cases **PASS**, and `--check` exits `0` without modifying the file.

- [ ] **Step 5: Commit the fixture corpus**

```bash
git add -- \
  scripts/generate-governed-run-fixture.ts \
  fixtures/governed-runs/state-only.v1.fixture.json \
  src/lib/quirk/governed-runs/fixture.test.ts \
  src/lib/quirk/governed-runs/test-support.ts
git commit -m "test(governance): add state-only adversarial fixtures"
```

---

### Task 9: Wire exports, docs, package scripts, and CI

**Files:**
- Create: `src/lib/quirk/governed-runs/contracts/index.ts`
- Create: `src/lib/quirk/governed-runs/index.ts`
- Create: `docs/governance/governed-agent-runs.md`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: one supported Mode A module entrypoint, focused scripts, operator documentation, and merge-gating CI checks.

**Deferred composition integration gate:** Wire reviewed composition tests only after Task 6 consumption and Task 8 fixture coverage exist. Run the repository validation gate and record exact-head evidence; an evaluation file present in Git is not CI enforcement. Retain draft/candidate status and the independent human-review gate. Do not export the test adapter as a production policy or effect capability.

- [ ] **Step 1: Write the failing public-export smoke test**

Add this to `src/lib/quirk/governed-runs/state-only.test.ts`:

```ts
import * as governedRuns from "./index";

test("exports the Mode A public contract without an effect executor", () => {
  expect(governedRuns.assembleStateOnlyRun).toBeTypeOf("function");
  expect(governedRuns.resolveManyTierAuthority).toBeTypeOf("function");
  expect("executeEffect" in governedRuns).toBe(false);
  expect("commitTransition" in governedRuns).toBe(false);
});
```

- [ ] **Step 2: Run the smoke test and verify RED**

```bash
bunx vitest run src/lib/quirk/governed-runs/state-only.test.ts
```

Expected: **FAIL** because `index.ts` does not exist.

- [ ] **Step 3: Add contract and module exports**

```ts
// src/lib/quirk/governed-runs/contracts/index.ts
export * from "./primitives";
export * from "./context";
export * from "./action";
export * from "./run";
export * from "./evaluations";
```

```ts
// src/lib/quirk/governed-runs/index.ts
export * from "./contracts";
export * from "./issues";
export * from "./digests";
export * from "./authority-resolution";
export * from "./agency";
export * from "./state-only-policy";
export * from "./state-only";
export * from "./evaluations";
```

Confirm the module exports no effect executor, database adapter, network adapter, Supabase client, Git writer, social publisher, or production transition function.

- [ ] **Step 4: Add focused package scripts**

Add to `package.json`:

```json
{
  "scripts": {
    "test:governed-run": "vitest run src/lib/quirk/governed-runs",
    "fixture:governed-run": "bun scripts/generate-governed-run-fixture.ts --check"
  }
}
```

Preserve all existing scripts and formatting.

- [ ] **Step 5: Add CI gates with existing pinned tool setup**

In `.github/workflows/ci.yml`, after dependency installation and before the full suite/build, add:

```yaml
- name: Governed-run format check
  run: >-
    bunx prettier --check
    docs/governance/governed-agent-runs.md
    fixtures/governed-runs/state-only.v1.fixture.json
    scripts/generate-governed-run-fixture.ts
    src/lib/quirk/governed-runs

- name: Governed-run fixture drift
  run: bun run fixture:governed-run

- name: Governed-run focused tests
  run: bun run test:governed-run
```

Do not add third-party Actions or new permissions.

- [ ] **Step 6: Write operator-facing documentation**

```md
# Governed Agent Runs

Status: candidate Mode A implementation. Effects disabled.

## Truth bar

CANON       <Git commit or object digest>
PROJECTION  not implemented in this slice
POLICY      <policy-state digest>
OPERATOR    <canonical principal ID>
RUN MODE    STATE_ONLY
EFFECTS     DISABLED

## Guarantees

- Persona selection grants no authority.
- Perspective visibility grants no permission to disclose, retain, infer, or act.
- Agent proposals are inert.
- Authority resolution is deterministic and external to the model.
- Effect candidates are content-addressed proposals, not effects.
- Mode A exposes no effect executor.
- Trajectory receipts state what happened, why it was allowed or blocked, and what changed.

## Non-goals

No Supabase projection, UI command, sandbox execution, production effect, or autonomous authority activation is included.
```

- [ ] **Step 7: Run focused and full verification**

```bash
bunx prettier --check \
  docs/governance/governed-agent-runs.md \
  fixtures/governed-runs/state-only.v1.fixture.json \
  scripts/generate-governed-run-fixture.ts \
  src/lib/quirk/governed-runs
bun run fixture:governed-run
bun run test:governed-run
bun run type-check
bun run lint
bun run test:run
SKIP_ENV_VALIDATION=1 bun run build
```

Expected:

- formatter passes;
- fixture has no drift;
- governed-run focused suite passes;
- existing Tribunal tests remain green;
- full Vitest suite passes;
- TypeScript, ESLint, and Next.js production build pass;
- no network, Supabase, or effect execution occurs.

- [ ] **Step 8: Commit the integration slice**

```bash
git add -- \
  src/lib/quirk/governed-runs/contracts/index.ts \
  src/lib/quirk/governed-runs/index.ts \
  docs/governance/governed-agent-runs.md \
  package.json \
  .github/workflows/ci.yml
git commit -m "chore(governance): gate state-only governed runs in CI"
```

---

## Plan Completion Gate

Before declaring Mode A implementation complete, collect exact-head evidence for all of the following:

```text
format: pass
type-check: pass
lint: pass
fixture drift: pass
focused governed-run tests: pass
existing Tribunal tests: pass
full unit suite: pass
production build: pass
secret scan of changed files: pass
external effect calls observed: zero
Supabase mutations observed: zero
```

The implementation PR must remain draft and `Constrain`. It may claim only that Mode A contract validation and state-only candidate/receipt construction are proven at the exact reviewed head. It may not claim sandbox safety, production readiness, autonomous authority, or live-effect capability.

## Deferred Separate Plans

These are deliberately excluded and require their own approved specs/plans:

1. **Mode A Supabase projection plan** — private `quirk_runtime` projection tables, RLS, reconciliation, and projection drift.
2. **Operator Control Plane plan** — read/candidate UI, truth bar, stale/offline states, and no direct effects.
3. **Mode B reversible-sandbox plan** — sandbox provider, hostile boundary fixture, rollback, and restoration verifier.
4. **Mode C production-runtime plan** — durable principal/key/currentness stores, atomic CAS/outbox, incident/kill controls, and independent production admission.
