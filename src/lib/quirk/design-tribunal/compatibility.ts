import { z } from "zod";

import {
  DesignEvidenceSchema,
  DesignFindingSchema,
  DesignHumanDecisionSchema,
  DesignReviewRequestSchema,
  isTerminalDesignFindingResolution,
  type DesignEvidence,
  type DesignFinding,
  type DesignHumanDecision,
  type DesignReviewRequest,
} from "./contracts";
import {
  DecisionReceiptSchema,
  EvidenceClaimSchema,
  EvaluatorDeclarationSchema,
  TRIBUNAL_LIMITS,
  TribunalActionManifestSchema,
  TribunalCaseSchema,
  TribunalEffectSchema,
  TribunalOperatingScopeSchema,
  TribunalVerdictSchema,
  computeDecisionReceiptContentDigest,
  computeEvidenceClaimContentDigest,
  computeTribunalActionDigest,
  computeVerdictContentDigest,
  digestCanonical,
  isTribunalInputGraphSafe,
  type DecisionReceipt,
  type EvidenceClaim,
  type EvaluatorDeclaration,
  type TribunalCase,
  type TribunalActionManifest,
  type TribunalEffect,
  type TribunalOperatingScope,
  type TribunalVerdict,
} from "./protocol";
import {
  AuthorityGrantSchema,
  type AuthorityGrant,
} from "../governance/authority";

const PLACEHOLDER_DIGEST = `sha256:${"0".repeat(64)}`;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const AdapterTextSchema = z.string().min(1).max(TRIBUNAL_LIMITS.shortTextChars);
const AdapterIdSchema = z.string().min(1).max(TRIBUNAL_LIMITS.stableIdChars);
const AdapterDigestSchema = z.string().regex(DIGEST_PATTERN);
const AdapterTimestampSchema = z.string().max(64).datetime({ offset: true });

const AdaptDesignReviewRequestInputSchema = z
  .object({
    request: z.unknown(),
    bindings: z
      .object({
        requesterId: AdapterIdSchema,
        trajectoryId: AdapterIdSchema,
        realm: AdapterTextSchema,
        revision: AdapterTextSchema,
        subjectDigest: AdapterDigestSchema,
        openedAt: AdapterTimestampSchema,
        evaluatedAt: AdapterTimestampSchema,
        proposedEffect: TribunalEffectSchema,
        operatingScope: TribunalOperatingScopeSchema.omit({
          actionDigest: true,
        }),
        actionManifest: TribunalActionManifestSchema,
        humanAuthorityId: AdapterTextSchema.optional(),
        effectiveDecisionReceiptId: AdapterIdSchema.optional(),
      })
      .strict(),
    roles: z
      .object({
        authorityGrants: z
          .array(AuthorityGrantSchema)
          .min(1)
          .max(TRIBUNAL_LIMITS.authorityGrants),
        evaluatorDeclarations: z
          .array(EvaluatorDeclarationSchema)
          .min(1)
          .max(TRIBUNAL_LIMITS.evaluatorDeclarations),
        evidenceClaims: z
          .array(EvidenceClaimSchema)
          .max(TRIBUNAL_LIMITS.evidenceClaims),
        verdicts: z
          .array(TribunalVerdictSchema)
          .min(1)
          .max(TRIBUNAL_LIMITS.verdicts),
        decisionReceipts: z
          .array(DecisionReceiptSchema)
          .max(TRIBUNAL_LIMITS.decisionReceipts),
      })
      .strict(),
  })
  .strict();

const AdaptDesignEvidenceInputSchema = z
  .object({
    evidence: z.unknown(),
    bindings: EvidenceClaimSchema.omit({
      kind: true,
      protocolVersion: true,
      source: true,
      contentDigest: true,
    }),
  })
  .strict();

const AdaptDesignFindingInputSchema = z
  .object({
    finding: z.unknown(),
    evidenceClaims: z
      .array(EvidenceClaimSchema)
      .max(TRIBUNAL_LIMITS.evidenceClaims),
    bindings: z
      .object({
        evaluatorDeclarationId: AdapterIdSchema,
        authorityGrantId: AdapterIdSchema,
        grantDigest: AdapterDigestSchema,
        subjectDigest: AdapterDigestSchema,
        authorityEffectRequested: TribunalEffectSchema,
        declarationDigest: AdapterDigestSchema,
        trajectoryId: AdapterIdSchema,
        evaluatorVersion: AdapterTextSchema,
      })
      .strict(),
  })
  .strict();

const AdaptDesignHumanDecisionInputSchema = z
  .object({
    decision: z.unknown(),
    bindings: DecisionReceiptSchema.omit({
      kind: true,
      protocolVersion: true,
      decision: true,
      contentDigest: true,
    }),
  })
  .strict();

export type TribunalCompatibilityIssueCode =
  | "ADAPTER_INPUT_UNSAFE"
  | "ADAPTER_INPUT_INVALID"
  | "DESIGN_REQUEST_INVALID"
  | "DESIGN_EVIDENCE_INVALID"
  | "DESIGN_EVIDENCE_DIGEST_REQUIRED"
  | "DESIGN_EVIDENCE_DIGEST_INVALID"
  | "DESIGN_FINDING_EVIDENCE_DIGEST_REQUIRED"
  | "DESIGN_FINDING_EVIDENCE_DIGEST_INVALID"
  | "DESIGN_FINDING_EVIDENCE_MISMATCH"
  | "DESIGN_FINDING_INVALID"
  | "DESIGN_FINDING_RESOLUTION_INACTIVE"
  | "DESIGN_FINDING_TRAJECTORY_MISMATCH"
  | "DESIGN_HUMAN_DECISION_INVALID"
  | "TRIBUNAL_ADAPTER_OUTPUT_INVALID"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "HUMAN_AUTHORITY_CONFLICT"
  | "EFFECTIVE_DECISION_REQUIRED";

export type TribunalCompatibilityIssue = {
  code: TribunalCompatibilityIssueCode;
  path: string;
  message: string;
};

export type TribunalCompatibilityResult<T> =
  | { ok: true; value: T; issues: [] }
  | { ok: false; issues: TribunalCompatibilityIssue[] };

function failure(
  code: TribunalCompatibilityIssueCode,
  path: string,
  message: string,
): TribunalCompatibilityResult<never> {
  return { ok: false, issues: [{ code, path, message }] };
}

function adapterOutputFailure(
  path: string,
  message: string,
): TribunalCompatibilityResult<never> {
  return failure("TRIBUNAL_ADAPTER_OUTPUT_INVALID", path, message);
}

function adapterInputFailure(
  error: z.ZodError,
): TribunalCompatibilityResult<never> {
  const first = error.issues[0];
  return failure(
    "ADAPTER_INPUT_INVALID",
    first?.path.join(".") ?? "$",
    first?.message ?? "Adapter input envelope is invalid.",
  );
}

function rejectUnsafeAdapterInput(
  input: unknown,
): TribunalCompatibilityResult<never> | undefined {
  if (!input || typeof input !== "object" || !isTribunalInputGraphSafe(input)) {
    return failure(
      "ADAPTER_INPUT_UNSAFE",
      "$",
      "Adapter input exceeds the shared Tribunal graph-safety budget.",
    );
  }
  return undefined;
}

export function computeDesignReviewRequestDigest(
  request: DesignReviewRequest,
): string {
  if (!isTribunalInputGraphSafe(request)) {
    throw new TypeError("Unsafe DesignReviewRequest input graph.");
  }
  return digestCanonical(
    DesignReviewRequestSchema.parse(request),
    "quirk.design-tribunal.design-review-request.v1",
  );
}

export function computeDesignFindingDigest(finding: DesignFinding): string {
  if (!isTribunalInputGraphSafe(finding)) {
    throw new TypeError("Unsafe DesignFinding input graph.");
  }
  return digestCanonical(
    DesignFindingSchema.parse(finding),
    "quirk.design-tribunal.design-finding.v1",
  );
}

export function adaptDesignReviewRequest(input: {
  request: DesignReviewRequest;
  bindings: {
    requesterId: string;
    trajectoryId: string;
    realm: string;
    revision: string;
    subjectDigest: string;
    openedAt: string;
    evaluatedAt: string;
    proposedEffect: TribunalEffect;
    operatingScope: Omit<TribunalOperatingScope, "actionDigest">;
    actionManifest: TribunalActionManifest;
    humanAuthorityId?: string;
    effectiveDecisionReceiptId?: string;
  };
  roles: {
    authorityGrants: AuthorityGrant[];
    evaluatorDeclarations: EvaluatorDeclaration[];
    evidenceClaims: EvidenceClaim[];
    verdicts: TribunalVerdict[];
    decisionReceipts: DecisionReceipt[];
  };
}): TribunalCompatibilityResult<TribunalCase> {
  const unsafe = rejectUnsafeAdapterInput(input);
  if (unsafe) return unsafe;
  const envelope = AdaptDesignReviewRequestInputSchema.safeParse(input);
  if (!envelope.success) return adapterInputFailure(envelope.error);
  const request = DesignReviewRequestSchema.safeParse(input.request);
  if (!request.success) {
    const first = request.error.issues[0];
    return failure(
      "DESIGN_REQUEST_INVALID",
      first?.path.join(".") ?? "request",
      first?.message ?? "Invalid DesignReviewRequest.",
    );
  }
  const humanAuthorityId =
    request.data.humanAuthorityId ?? input.bindings.humanAuthorityId;
  if (
    request.data.humanAuthorityId &&
    input.bindings.humanAuthorityId &&
    request.data.humanAuthorityId !== input.bindings.humanAuthorityId
  ) {
    return failure(
      "HUMAN_AUTHORITY_CONFLICT",
      "bindings.humanAuthorityId",
      "Adapter bindings cannot replace the request's named human authority.",
    );
  }
  if (!humanAuthorityId) {
    return failure(
      "HUMAN_AUTHORITY_REQUIRED",
      "bindings.humanAuthorityId",
      "TribunalCase requires an explicit human authority.",
    );
  }
  const roleObjectIds = [
    ...input.roles.authorityGrants.map(({ grantId }) => ({
      id: grantId,
      path: "roles.authorityGrants",
    })),
    ...input.roles.evaluatorDeclarations.map(({ id }) => ({
      id,
      path: "roles.evaluatorDeclarations",
    })),
    ...input.roles.evidenceClaims.map(({ id }) => ({
      id,
      path: "roles.evidenceClaims",
    })),
    ...input.roles.verdicts.map(({ id }) => ({
      id,
      path: "roles.verdicts",
    })),
    ...input.roles.decisionReceipts.map(({ id }) => ({
      id,
      path: "roles.decisionReceipts",
    })),
  ];
  const seenRoleObjectIds = new Set<string>();
  for (const object of roleObjectIds) {
    if (seenRoleObjectIds.has(object.id)) {
      return adapterOutputFailure(
        object.path,
        `Duplicate Tribunal role object ID: ${object.id}.`,
      );
    }
    seenRoleObjectIds.add(object.id);
  }
  const effectiveDecisionReceiptId =
    input.bindings.effectiveDecisionReceiptId ??
    (input.roles.decisionReceipts.length === 1
      ? input.roles.decisionReceipts[0].id
      : undefined);
  if (input.roles.decisionReceipts.length > 1 && !effectiveDecisionReceiptId) {
    return failure(
      "EFFECTIVE_DECISION_REQUIRED",
      "bindings.effectiveDecisionReceiptId",
      "Select the effective receipt when adapting decision history.",
    );
  }

  const requestDigest = computeDesignReviewRequestDigest(request.data);
  const actionManifest = TribunalActionManifestSchema.safeParse(
    input.bindings.actionManifest,
  );
  if (!actionManifest.success) {
    return adapterOutputFailure(
      "bindings.actionManifest",
      "Adapter requires a valid content-addressed Tribunal action manifest.",
    );
  }
  const manifestBindingsMatch =
    actionManifest.data.caseId === request.data.id &&
    actionManifest.data.requestDigest === requestDigest &&
    actionManifest.data.subjectDigest === input.bindings.subjectDigest &&
    actionManifest.data.selectedCandidateDigest ===
      input.bindings.subjectDigest &&
    actionManifest.data.proposedEffect === input.bindings.proposedEffect &&
    actionManifest.data.purposeId === input.bindings.operatingScope.purposeId &&
    actionManifest.data.tenantId === input.bindings.operatingScope.tenantId &&
    actionManifest.data.audienceId ===
      input.bindings.operatingScope.audienceId &&
    actionManifest.data.destinationId ===
      input.bindings.operatingScope.destinationId;
  if (!manifestBindingsMatch) {
    return adapterOutputFailure(
      "bindings.actionManifest",
      "The action manifest must bind the canonical request, subject, effect, and operating scope exactly.",
    );
  }
  const manifestProhibitions = actionManifest.data.prohibitedChangeChecks.map(
    ({ prohibition }) => prohibition,
  );
  const requestProhibitions = request.data.prohibitedChanges;
  const prohibitionBindingsMatch =
    manifestProhibitions.length === requestProhibitions.length &&
    requestProhibitions.every((prohibition) =>
      manifestProhibitions.includes(prohibition),
    );
  const usageWithinBudget =
    actionManifest.data.candidates.length <=
      request.data.budget.maxCandidates &&
    actionManifest.data.usage.rounds <= request.data.budget.maxRounds &&
    (request.data.budget.maxInputTokens === undefined ||
      actionManifest.data.usage.inputTokens <=
        request.data.budget.maxInputTokens) &&
    (request.data.budget.maxOutputTokens === undefined ||
      actionManifest.data.usage.outputTokens <=
        request.data.budget.maxOutputTokens) &&
    (request.data.budget.maxWallClockMs === undefined ||
      actionManifest.data.usage.wallClockMs <=
        request.data.budget.maxWallClockMs);
  const evidenceById = new Map(
    input.roles.evidenceClaims.map((claim) => [claim.id, claim]),
  );
  const actionEvidenceRefs = [
    ...actionManifest.data.prohibitedChangeChecks.flatMap(
      ({ evidenceClaims }) => evidenceClaims,
    ),
    ...(actionManifest.data.baselineEvidence
      ? [actionManifest.data.baselineEvidence]
      : []),
  ];
  const actionEvidenceBindingsMatch = actionEvidenceRefs.every((reference) => {
    const claim = evidenceById.get(reference.evidenceClaimId);
    return claim?.contentDigest === reference.contentDigest;
  });
  const baselineEvidence = actionManifest.data.baselineEvidence
    ? evidenceById.get(actionManifest.data.baselineEvidence.evidenceClaimId)
    : undefined;
  if (
    !prohibitionBindingsMatch ||
    !usageWithinBudget ||
    (request.data.mode === "one_of_one" &&
      (actionManifest.data.candidates.length < 2 ||
        new Set(
          actionManifest.data.candidates.map(
            ({ independenceKey }) => independenceKey,
          ),
        ).size !== actionManifest.data.candidates.length)) ||
    (!["observe", "block"].includes(input.bindings.proposedEffect) &&
      actionManifest.data.prohibitedChangeChecks.some(
        ({ status }) => status !== "clear",
      )) ||
    Boolean(request.data.baselineLocator) !==
      Boolean(actionManifest.data.baselineEvidence) ||
    !actionEvidenceBindingsMatch ||
    (request.data.baselineLocator !== undefined &&
      baselineEvidence?.source.locator !== request.data.baselineLocator)
  ) {
    return adapterOutputFailure(
      "bindings.actionManifest",
      "The action manifest must satisfy the canonical request's candidate, budget, prohibition, and baseline constraints.",
    );
  }
  const operatingScope: TribunalOperatingScope = {
    ...input.bindings.operatingScope,
    actionDigest: computeTribunalActionDigest(actionManifest.data),
  };
  const candidate: TribunalCase = {
    kind: "TribunalCase",
    protocolVersion: "1.0.0",
    caseId: request.data.id,
    purpose: `${request.data.brief} Desired outcome: ${request.data.desiredOutcome}`,
    requesterId: input.bindings.requesterId,
    humanAuthorityId,
    trajectoryId: input.bindings.trajectoryId,
    openedAt: input.bindings.openedAt,
    evaluatedAt: input.bindings.evaluatedAt,
    requestDigest,
    humanApprovalRequired: request.data.humanApprovalRequired,
    proposedEffect: input.bindings.proposedEffect,
    operatingScope,
    subject: {
      id: request.data.artifactId ?? request.data.id,
      realm: input.bindings.realm,
      targetClass: request.data.artifactKind,
      revision: input.bindings.revision,
      locator: request.data.artifactLocator,
      digest: input.bindings.subjectDigest,
    },
    criteria: request.data.criteria,
    sourceRefs: [...request.data.sourceRefs],
    authorityGrants: input.roles.authorityGrants,
    evaluatorDeclarations: input.roles.evaluatorDeclarations,
    evidenceClaims: input.roles.evidenceClaims,
    verdicts: input.roles.verdicts,
    decisionReceipts: input.roles.decisionReceipts,
    effectiveDecisionReceiptId,
  };
  const parsed = TribunalCaseSchema.safeParse(candidate);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return adapterOutputFailure(
      first?.path.join(".") ?? "TribunalCase",
      first?.message ?? "Adapter produced an invalid TribunalCase.",
    );
  }
  return { ok: true, value: parsed.data, issues: [] };
}

export function adaptDesignEvidence(input: {
  evidence: DesignEvidence;
  bindings: Omit<
    EvidenceClaim,
    "kind" | "protocolVersion" | "source" | "contentDigest"
  >;
}): TribunalCompatibilityResult<EvidenceClaim> {
  const unsafe = rejectUnsafeAdapterInput(input);
  if (unsafe) return unsafe;
  const envelope = AdaptDesignEvidenceInputSchema.safeParse(input);
  if (!envelope.success) return adapterInputFailure(envelope.error);
  const evidence = DesignEvidenceSchema.safeParse(input.evidence);
  if (!evidence.success) {
    const first = evidence.error.issues[0];
    return failure(
      "DESIGN_EVIDENCE_INVALID",
      first?.path.join(".") ?? "evidence",
      first?.message ?? "Invalid DesignEvidence.",
    );
  }
  if (!evidence.data.digest) {
    return failure(
      "DESIGN_EVIDENCE_DIGEST_REQUIRED",
      "evidence.digest",
      "DesignEvidence must be content-addressed before adaptation.",
    );
  }
  if (!DIGEST_PATTERN.test(evidence.data.digest)) {
    return failure(
      "DESIGN_EVIDENCE_DIGEST_INVALID",
      "evidence.digest",
      "DesignEvidence digest must use the canonical sha256:<lowercase-hex> form.",
    );
  }

  const candidate: EvidenceClaim = {
    kind: "EvidenceClaim",
    protocolVersion: "1.0.0",
    ...input.bindings,
    source: {
      kind: evidence.data.kind,
      locator: evidence.data.locator,
      summary: evidence.data.summary,
      digest: evidence.data.digest,
    },
    contentDigest: PLACEHOLDER_DIGEST,
  };
  candidate.contentDigest = computeEvidenceClaimContentDigest(candidate);
  const parsed = EvidenceClaimSchema.safeParse(candidate);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return adapterOutputFailure(
      first?.path.join(".") ?? "EvidenceClaim",
      first?.message ?? "Adapter produced an invalid EvidenceClaim.",
    );
  }
  return { ok: true, value: parsed.data, issues: [] };
}

const DISPOSITION_BY_DESIGN_VERDICT = {
  pass: "SUPPORTED",
  fail: "CONTRADICTED",
  unresolved: "INSUFFICIENT",
} as const;

export function adaptDesignFinding(input: {
  finding: DesignFinding;
  evidenceClaims: EvidenceClaim[];
  bindings: {
    evaluatorDeclarationId: string;
    authorityGrantId: string;
    grantDigest: string;
    subjectDigest: string;
    authorityEffectRequested: TribunalEffect;
    declarationDigest: string;
    trajectoryId: string;
    evaluatorVersion: string;
  };
}): TribunalCompatibilityResult<TribunalVerdict> {
  const unsafe = rejectUnsafeAdapterInput(input);
  if (unsafe) return unsafe;
  const envelope = AdaptDesignFindingInputSchema.safeParse(input);
  if (!envelope.success) return adapterInputFailure(envelope.error);
  const finding = DesignFindingSchema.safeParse(input.finding);
  if (!finding.success) {
    const first = finding.error.issues[0];
    return failure(
      "DESIGN_FINDING_INVALID",
      first?.path.join(".") ?? "finding",
      first?.message ?? "Invalid DesignFinding.",
    );
  }
  if (input.bindings.trajectoryId !== finding.data.runId) {
    return failure(
      "DESIGN_FINDING_TRAJECTORY_MISMATCH",
      "bindings.trajectoryId",
      "A DesignFinding keeps its canonical runId as the Tribunal trajectory.",
    );
  }
  if (isTerminalDesignFindingResolution(finding.data.resolutionStatus)) {
    return failure(
      "DESIGN_FINDING_RESOLUTION_INACTIVE",
      "finding.resolutionStatus",
      "A resolved or invalidated DesignFinding cannot be reactivated as an executable verdict.",
    );
  }
  if (finding.data.evidence.some(({ digest }) => !digest)) {
    return failure(
      "DESIGN_FINDING_EVIDENCE_DIGEST_REQUIRED",
      "finding.evidence",
      "Every canonical DesignFinding evidence source must be content-addressed.",
    );
  }
  if (
    finding.data.evidence.some(
      ({ digest }) => digest !== undefined && !DIGEST_PATTERN.test(digest),
    )
  ) {
    return failure(
      "DESIGN_FINDING_EVIDENCE_DIGEST_INVALID",
      "finding.evidence",
      "Every canonical DesignFinding evidence digest must use the canonical sha256:<lowercase-hex> form.",
    );
  }

  const parsedClaims: EvidenceClaim[] = [];
  for (const claim of input.evidenceClaims) {
    const parsed = EvidenceClaimSchema.safeParse(claim);
    if (
      !parsed.success ||
      computeEvidenceClaimContentDigest(parsed.data) !==
        parsed.data.contentDigest ||
      parsed.data.claimId !== finding.data.criterionId ||
      parsed.data.inspectedBy !== input.bindings.evaluatorDeclarationId ||
      parsed.data.subjectDigest !== input.bindings.subjectDigest
    ) {
      return failure(
        "DESIGN_FINDING_EVIDENCE_MISMATCH",
        "evidenceClaims",
        "Bound evidence claims must be valid and match the verdict claim, evaluator, and subject.",
      );
    }
    parsedClaims.push(parsed.data);
  }

  const sourceKey = (source: {
    kind: string;
    locator: string;
    summary: string;
    digest?: string;
  }): string =>
    JSON.stringify([
      source.kind,
      source.locator,
      source.summary,
      source.digest,
    ]);
  const findingSourceKeys = finding.data.evidence.map(sourceKey);
  const claimSourceKeys = parsedClaims.map(({ source }) => sourceKey(source));
  if (
    findingSourceKeys.length !== claimSourceKeys.length ||
    new Set(findingSourceKeys).size !== findingSourceKeys.length ||
    new Set(claimSourceKeys).size !== claimSourceKeys.length
  ) {
    return failure(
      "DESIGN_FINDING_EVIDENCE_MISMATCH",
      "evidenceClaims",
      "Canonical finding evidence must map one-to-one to distinct EvidenceClaims.",
    );
  }
  const claimsBySource = new Map(
    parsedClaims.map((claim) => [sourceKey(claim.source), claim]),
  );
  const orderedClaims = findingSourceKeys.flatMap((key) => {
    const claim = claimsBySource.get(key);
    return claim ? [claim] : [];
  });
  if (orderedClaims.length !== finding.data.evidence.length) {
    return failure(
      "DESIGN_FINDING_EVIDENCE_MISMATCH",
      "evidenceClaims",
      "Canonical finding evidence cannot be substituted by adapter bindings.",
    );
  }

  const candidate: TribunalVerdict = {
    kind: "TribunalVerdict",
    protocolVersion: "1.0.0",
    id: finding.data.id,
    evaluatorDeclarationId: input.bindings.evaluatorDeclarationId,
    authorityGrantId: input.bindings.authorityGrantId,
    subjectDigest: input.bindings.subjectDigest,
    criterionRef: finding.data.criterionId,
    claimId: finding.data.criterionId,
    claim: finding.data.claim,
    disposition: DISPOSITION_BY_DESIGN_VERDICT[finding.data.verdict],
    evidenceClaimIds: orderedClaims.map(({ id }) => id),
    confidence: finding.data.confidence,
    uncertainty:
      finding.data.verdict === "unresolved"
        ? "The DesignFinding is unresolved."
        : "Bounded by the source DesignFinding evidence and critic role.",
    dissent: [],
    authorityEffectRequested: input.bindings.authorityEffectRequested,
    authorityBasis: {
      kind: "grant",
      grantId: input.bindings.authorityGrantId,
      grantDigest: input.bindings.grantDigest,
    },
    provenance: {
      trajectoryId: finding.data.runId,
      evaluatorVersion: input.bindings.evaluatorVersion,
      declarationDigest: input.bindings.declarationDigest,
      sourceFindingDigest: computeDesignFindingDigest(finding.data),
      evidenceDigests: orderedClaims.map(({ contentDigest }) => contentDigest),
      createdAt: finding.data.createdAt,
      contentDigest: PLACEHOLDER_DIGEST,
    },
  };
  candidate.provenance.contentDigest = computeVerdictContentDigest(candidate);
  const parsed = TribunalVerdictSchema.safeParse(candidate);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return adapterOutputFailure(
      first?.path.join(".") ?? "TribunalVerdict",
      first?.message ?? "Adapter produced an invalid TribunalVerdict.",
    );
  }
  return { ok: true, value: parsed.data, issues: [] };
}

export function adaptDesignHumanDecision(input: {
  decision: DesignHumanDecision;
  bindings: Omit<
    DecisionReceipt,
    "kind" | "protocolVersion" | "decision" | "contentDigest"
  >;
}): TribunalCompatibilityResult<DecisionReceipt> {
  const unsafe = rejectUnsafeAdapterInput(input);
  if (unsafe) return unsafe;
  const envelope = AdaptDesignHumanDecisionInputSchema.safeParse(input);
  if (!envelope.success) return adapterInputFailure(envelope.error);
  const decision = DesignHumanDecisionSchema.safeParse(input.decision);
  if (!decision.success) {
    const first = decision.error.issues[0];
    return failure(
      "DESIGN_HUMAN_DECISION_INVALID",
      first?.path.join(".") ?? "decision",
      first?.message ?? "Invalid DesignHumanDecision.",
    );
  }
  const candidate: DecisionReceipt = {
    kind: "DecisionReceipt",
    protocolVersion: "1.0.0",
    ...input.bindings,
    decision: decision.data,
    contentDigest: PLACEHOLDER_DIGEST,
  };
  candidate.contentDigest = computeDecisionReceiptContentDigest(candidate);
  const parsed = DecisionReceiptSchema.safeParse(candidate);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return adapterOutputFailure(
      first?.path.join(".") ?? "DecisionReceipt",
      first?.message ?? "Adapter produced an invalid DecisionReceipt.",
    );
  }
  return { ok: true, value: parsed.data, issues: [] };
}
