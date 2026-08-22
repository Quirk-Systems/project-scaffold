import {
  DesignEvidenceSchema,
  DesignFindingSchema,
  DesignHumanDecisionSchema,
  DesignReviewRequestSchema,
  type DesignEvidence,
  type DesignFinding,
  type DesignHumanDecision,
  type DesignReviewRequest,
} from "./contracts";
import {
  DecisionReceiptSchema,
  EvidenceClaimSchema,
  TribunalCaseSchema,
  TribunalVerdictSchema,
  computeDecisionReceiptContentDigest,
  computeEvidenceClaimContentDigest,
  computeVerdictContentDigest,
  type DecisionReceipt,
  type EvidenceClaim,
  type EvaluatorDeclaration,
  type TribunalCase,
  type TribunalEffect,
  type TribunalOperatingScope,
  type TribunalVerdict,
} from "./protocol";
import type { AuthorityGrant } from "../governance/authority";

const PLACEHOLDER_DIGEST = `sha256:${"0".repeat(64)}`;

export type TribunalCompatibilityIssueCode =
  | "DESIGN_REQUEST_INVALID"
  | "DESIGN_EVIDENCE_INVALID"
  | "DESIGN_EVIDENCE_DIGEST_REQUIRED"
  | "DESIGN_FINDING_INVALID"
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

function adapterOutputFailure(path: string, message: string): TribunalCompatibilityResult<never> {
  return failure("TRIBUNAL_ADAPTER_OUTPUT_INVALID", path, message);
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
    operatingScope: TribunalOperatingScope;
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
  const effectiveDecisionReceiptId =
    input.bindings.effectiveDecisionReceiptId ??
    (input.roles.decisionReceipts.length === 1
      ? input.roles.decisionReceipts[0].id
      : undefined);
  if (
    input.roles.decisionReceipts.length > 1 &&
    !effectiveDecisionReceiptId
  ) {
    return failure(
      "EFFECTIVE_DECISION_REQUIRED",
      "bindings.effectiveDecisionReceiptId",
      "Select the effective receipt when adapting decision history.",
    );
  }

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
    proposedEffect: input.bindings.proposedEffect,
    operatingScope: input.bindings.operatingScope,
    subject: {
      id: request.data.artifactId ?? request.data.id,
      realm: input.bindings.realm,
      targetClass: request.data.artifactKind,
      revision: input.bindings.revision,
      locator: request.data.artifactLocator,
      digest: input.bindings.subjectDigest,
    },
    criterionRefs: request.data.criteria.map(({ id }) => id),
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
  bindings: {
    evidenceClaimIds: string[];
    evaluatorDeclarationId: string;
    authorityGrantId: string;
    grantDigest: string;
    subjectDigest: string;
    claimId: string;
    authorityEffectRequested: TribunalEffect;
    declarationDigest: string;
    evidenceDigests: string[];
    trajectoryId: string;
    evaluatorVersion: string;
  };
}): TribunalCompatibilityResult<TribunalVerdict> {
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

  const candidate: TribunalVerdict = {
    kind: "TribunalVerdict",
    protocolVersion: "1.0.0",
    id: finding.data.id,
    evaluatorDeclarationId: input.bindings.evaluatorDeclarationId,
    authorityGrantId: input.bindings.authorityGrantId,
    subjectDigest: input.bindings.subjectDigest,
    claimId: input.bindings.claimId,
    claim: finding.data.claim,
    disposition: DISPOSITION_BY_DESIGN_VERDICT[finding.data.verdict],
    evidenceClaimIds: input.bindings.evidenceClaimIds,
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
      evidenceDigests: input.bindings.evidenceDigests,
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
