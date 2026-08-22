import { createHash } from "node:crypto";
import { z } from "zod";

import {
  AuthorityGrantSchema,
  type AuthorityDecision,
  type AuthorityGrant,
} from "../governance/authority";
import {
  DesignEvidenceKindSchema,
  DesignEvidenceSchema,
  HumanDecisionSchema,
  StableIdSchema,
} from "./contracts";

export const TRIBUNAL_PROTOCOL_VERSION = "1.0.0" as const;
export const TRIBUNAL_EVALUATE_SCOPE = "quirk.tribunal.evaluate" as const;

export const TribunalEffectSchema = z.enum([
  "observe",
  "recommend",
  "block",
  "approve",
  "publish",
  "mutate_canon",
  "promote_verdict",
]);

export const TribunalDispositionSchema = z.enum([
  "SUPPORTED",
  "CONTRADICTED",
  "INSUFFICIENT",
  "OUT_OF_SCOPE",
  "DISPUTED",
]);

const ProtocolVersionSchema = z.literal(TRIBUNAL_PROTOCOL_VERSION);
const NonEmptyStringSchema = z.string().min(1);
const TimestampSchema = z.string().datetime({ offset: true });
const DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const DigestCandidateSchema = z.string().min(1).optional();

const InternalEvidenceKindSchema = z.enum([
  "evidence_claim",
  "tribunal_verdict",
  "decision_receipt",
]);

export const TribunalEvidenceKindSchema = z.union([
  DesignEvidenceKindSchema,
  InternalEvidenceKindSchema,
]);

const StrictDesignEvidenceSourceSchema = DesignEvidenceSchema.extend({
  digest: DigestCandidateSchema,
}).strict();

const InternalEvidenceSourceSchema = z
  .object({
    kind: InternalEvidenceKindSchema,
    locator: StableIdSchema,
    summary: NonEmptyStringSchema,
    digest: DigestCandidateSchema,
  })
  .strict();

export const TribunalEvidenceSourceSchema = z.union([
  StrictDesignEvidenceSourceSchema,
  InternalEvidenceSourceSchema,
]);

export const TribunalOperatingScopeSchema = z
  .object({
    purposeId: StableIdSchema,
    tenantId: StableIdSchema,
    audienceId: StableIdSchema,
    destinationId: StableIdSchema,
    actionDigest: DigestSchema,
  })
  .strict();

export const TribunalSubjectSchema = z
  .object({
    id: StableIdSchema,
    realm: StableIdSchema,
    targetClass: StableIdSchema,
    revision: NonEmptyStringSchema,
    locator: NonEmptyStringSchema,
    digest: DigestSchema,
  })
  .strict();

export const EvaluatorDeclarationSchema = z
  .object({
    kind: z.literal("EvaluatorDeclaration"),
    protocolVersion: ProtocolVersionSchema,
    id: StableIdSchema,
    evaluatorType: z.enum([
      "deterministic_validator",
      "model",
      "human_reviewer",
      "benchmark_harness",
      "ensemble",
      "meta_evaluator",
    ]),
    version: NonEmptyStringSchema,
    independence: z
      .object({
        key: StableIdSchema,
        operatorId: StableIdSchema,
        modelFamily: StableIdSchema,
      })
      .strict(),
    inspection: z
      .object({
        canInspect: z.array(NonEmptyStringSchema).min(1),
        cannotInspect: z.array(NonEmptyStringSchema),
        tools: z.array(NonEmptyStringSchema),
        evidenceKinds: z.array(TribunalEvidenceKindSchema).min(1),
        temporalBoundary: TimestampSchema,
      })
      .strict(),
    fallibility: z
      .object({
        knownFailureModes: z.array(NonEmptyStringSchema).min(1),
        calibrationEvidence: NonEmptyStringSchema,
        calibratedAt: TimestampSchema,
        calibrationValidUntil: TimestampSchema,
        holdoutDigest: DigestSchema,
        maxConfidence: z.number().min(0).max(1),
        errorTendencies: z.array(NonEmptyStringSchema),
        unresolvedBlindSpots: z.array(NonEmptyStringSchema),
      })
      .strict(),
    authority: z
      .object({
        grantId: StableIdSchema,
        grantDigest: DigestSchema,
        declaredEffects: z.array(TribunalEffectSchema).min(1),
        prohibitedEffects: z.array(TribunalEffectSchema),
      })
      .strict(),
    provenance: z
      .object({
        canonicalVersion: NonEmptyStringSchema,
        declarationDigest: DigestSchema,
      })
      .strict(),
  })
  .strict();

export const EvidenceClaimSchema = z
  .object({
    kind: z.literal("EvidenceClaim"),
    protocolVersion: ProtocolVersionSchema,
    id: StableIdSchema,
    claimId: StableIdSchema,
    claim: NonEmptyStringSchema,
    subjectDigest: DigestSchema,
    source: TribunalEvidenceSourceSchema,
    observable: z.boolean(),
    inspectedBy: StableIdSchema,
    inspectionMethod: NonEmptyStringSchema,
    observedAt: TimestampSchema,
    validUntil: TimestampSchema,
    confidence: z.number().min(0).max(1),
    limitations: z.array(NonEmptyStringSchema),
    retentionClass: z.enum(["ephemeral", "session", "project", "permanent"]),
    derivedFromEvidenceClaimIds: z.array(StableIdSchema),
    contentDigest: DigestSchema,
  })
  .strict();

export const TribunalVerdictSchema = z
  .object({
    kind: z.literal("TribunalVerdict"),
    protocolVersion: ProtocolVersionSchema,
    id: StableIdSchema,
    evaluatorDeclarationId: StableIdSchema,
    authorityGrantId: StableIdSchema,
    subjectDigest: DigestSchema,
    claimId: StableIdSchema,
    claim: NonEmptyStringSchema,
    disposition: TribunalDispositionSchema,
    evidenceClaimIds: z.array(StableIdSchema),
    confidence: z.number().min(0).max(1),
    uncertainty: NonEmptyStringSchema,
    dissent: z.array(NonEmptyStringSchema),
    authorityEffectRequested: TribunalEffectSchema,
    authorityBasis: z
      .object({
        kind: z.enum(["grant", "confidence", "consensus", "historical_accuracy"]),
        grantId: StableIdSchema,
        grantDigest: DigestSchema,
      })
      .strict(),
    provenance: z
      .object({
        trajectoryId: StableIdSchema,
        evaluatorVersion: NonEmptyStringSchema,
        declarationDigest: DigestSchema,
        evidenceDigests: z.array(DigestSchema),
        createdAt: TimestampSchema,
        contentDigest: DigestSchema,
      })
      .strict(),
  })
  .strict();

export const AuthorityGrantReferenceSchema = z
  .object({
    grantId: StableIdSchema,
    grantDigest: DigestSchema,
  })
  .strict();

export const DecisionReceiptSchema = z
  .object({
    kind: z.literal("DecisionReceipt"),
    protocolVersion: ProtocolVersionSchema,
    id: StableIdSchema,
    caseId: StableIdSchema,
    caseDigest: DigestSchema,
    decision: HumanDecisionSchema,
    effect: TribunalEffectSchema,
    consideredVerdictIds: z.array(StableIdSchema).min(1),
    acceptedEvidenceClaimIds: z.array(StableIdSchema),
    rejectedOrDisputedEvidence: z.array(
      z
        .object({
          evidenceClaimId: StableIdSchema,
          reason: NonEmptyStringSchema,
        })
        .strict(),
    ),
    authorityGrantRefs: z.array(AuthorityGrantReferenceSchema).min(1),
    reversibility: z
      .object({
        kind: z.enum(["reversible", "irreversible"]),
        rollbackRef: NonEmptyStringSchema.optional(),
        deadline: TimestampSchema.optional(),
      })
      .strict(),
    issuedAt: TimestampSchema,
    nonce: z.string().min(8),
    contentDigest: DigestSchema,
  })
  .strict();

export const TribunalCaseSchema = z
  .object({
    kind: z.literal("TribunalCase"),
    protocolVersion: ProtocolVersionSchema,
    caseId: StableIdSchema,
    purpose: NonEmptyStringSchema,
    requesterId: StableIdSchema,
    humanAuthorityId: NonEmptyStringSchema,
    trajectoryId: StableIdSchema,
    openedAt: TimestampSchema,
    evaluatedAt: TimestampSchema,
    proposedEffect: TribunalEffectSchema,
    operatingScope: TribunalOperatingScopeSchema,
    subject: TribunalSubjectSchema,
    criterionRefs: z.array(StableIdSchema).min(1),
    sourceRefs: z.array(NonEmptyStringSchema),
    authorityGrants: z.array(AuthorityGrantSchema).min(1),
    evaluatorDeclarations: z.array(EvaluatorDeclarationSchema).min(1),
    evidenceClaims: z.array(EvidenceClaimSchema),
    verdicts: z.array(TribunalVerdictSchema).min(1),
    decisionReceipts: z.array(DecisionReceiptSchema),
  })
  .strict();

export type TribunalEffect = z.infer<typeof TribunalEffectSchema>;
export type TribunalEvidenceKind = z.infer<typeof TribunalEvidenceKindSchema>;
export type TribunalOperatingScope = z.infer<typeof TribunalOperatingScopeSchema>;
export type EvaluatorDeclaration = z.infer<typeof EvaluatorDeclarationSchema>;
export type EvidenceClaim = z.infer<typeof EvidenceClaimSchema>;
export type TribunalVerdict = z.infer<typeof TribunalVerdictSchema>;
export type DecisionReceipt = z.infer<typeof DecisionReceiptSchema>;
export type TribunalCase = z.infer<typeof TribunalCaseSchema>;

export const TRIBUNAL_ISSUE_CODES = [
  "AMBIGUOUS_ALIAS",
  "AUTHORITY_BASE_SCOPE_MISSING",
  "AUTHORITY_DERIVED_FROM_CONFIDENCE",
  "AUTHORITY_DERIVED_FROM_CONSENSUS",
  "AUTHORITY_DERIVED_FROM_HISTORICAL_ACCURACY",
  "AUTHORITY_GRANT_EXPIRED",
  "AUTHORITY_GRANT_INACTIVE",
  "AUTHORITY_GRANT_INVALID_SIGNATURE",
  "AUTHORITY_GRANT_ISSUER_UNTRUSTED",
  "AUTHORITY_GRANT_MALFORMED",
  "AUTHORITY_GRANT_NOT_YET_VALID",
  "AUTHORITY_GRANT_PAYLOAD_MISMATCH",
  "AUTHORITY_GRANT_WINDOW_INVALID",
  "AUTHORITY_LIFECYCLE_UNVERIFIED",
  "AUTHORITY_TOKEN_MISSING",
  "AUTHORITY_UNION_FORBIDDEN",
  "AUTHORITY_VERIFIER_UNAVAILABLE",
  "BROWSER_EXPOSED_SECRET_FORBIDDEN",
  "CALIBRATION_HOLDOUT_CONTAMINATED",
  "CALIBRATION_STALE",
  "CONFIDENCE_EXCEEDS_CALIBRATION",
  "DECISION_AUTHORITY_UNTRUSTED",
  "DECISION_OWNER_MISMATCH",
  "DECISION_RECEIPT_REPLAYED",
  "DECISION_RECEIPT_REQUIRED",
  "DECISION_RECEIPT_TAMPERED",
  "DECLARATION_EFFECT_CONFLICT",
  "DECLARATION_EFFECT_EXCEEDS_GRANT",
  "DECLARATION_HASH_MISMATCH",
  "DESTINATION_OUT_OF_SCOPE",
  "DISPOSITION_EFFECT_INVALID",
  "DISPUTED_VERDICTS_UNACKNOWLEDGED",
  "DUPLICATE_OBJECT_ID",
  "EVALUATOR_INDEPENDENCE_COLLISION",
  "EVALUATOR_VERSION_MISMATCH",
  "EVIDENCE_CYCLE",
  "EVIDENCE_DIGEST_INVALID",
  "EVIDENCE_DIGEST_MISMATCH",
  "EVIDENCE_DIGEST_REQUIRED",
  "EVIDENCE_HASH_SET_MISMATCH",
  "EVIDENCE_INSPECTOR_MISMATCH",
  "EVIDENCE_REQUIRED",
  "EVIDENCE_SOURCE_UNRESOLVED",
  "EVIDENCE_STALE",
  "GRANT_CASE_BINDING_MISMATCH",
  "GRANT_EVALUATOR_SCOPE_MISMATCH",
  "GRANT_SELF_ISSUED",
  "LEGACY_DIALECT_UNSUPPORTED",
  "OUT_OF_SCOPE_EVIDENCE",
  "PROTOCOL_SCHEMA_INVALID",
  "PROXY_GRANT_FORBIDDEN",
  "PURPOSE_OUT_OF_SCOPE",
  "RECEIPT_CASE_DIGEST_MISMATCH",
  "RECEIPT_CONTENT_HASH_MISMATCH",
  "RECEIPT_EFFECT_MISMATCH",
  "RECEIPT_EVIDENCE_ACCOUNTING_INCOMPLETE",
  "RECEIPT_GRANT_BINDING_MISMATCH",
  "RECEIPT_ROLLBACK_REQUIRED",
  "RECEIPT_VERDICT_BINDING_MISMATCH",
  "REPLAY_CHECK_REQUIRED",
  "REQUESTED_EFFECT_EXCEEDS_GRANT",
  "REQUESTED_EFFECT_UNDECLARED",
  "SECRET_MATERIAL_FORBIDDEN",
  "SUBJECT_ID_OUT_OF_SCOPE",
  "SUBJECT_REALM_OUT_OF_SCOPE",
  "SUBJECT_REVISION_MISMATCH",
  "SUBJECT_REVISION_OUT_OF_SCOPE",
  "SUBJECT_TARGET_CLASS_OUT_OF_SCOPE",
  "TEMPORAL_ORDER_INVALID",
  "TENANT_OUT_OF_SCOPE",
  "UNKNOWN_AUTHORITY_GRANT_REF",
  "UNKNOWN_EVALUATOR_DECLARATION_REF",
  "UNKNOWN_EVIDENCE_CLAIM_REF",
  "UNKNOWN_TRIBUNAL_VERDICT_REF",
  "VERDICT_CANNOT_BE_PRIMARY_EVIDENCE",
  "VERDICT_CONTENT_HASH_MISMATCH",
  "VERDICT_GRANT_BINDING_MISMATCH",
  "VERIFIED_GRANT_ID_MISMATCH",
  "AUDIENCE_OUT_OF_SCOPE",
  "ACTION_DIGEST_MISMATCH",
] as const;

export type TribunalIssueCode = (typeof TRIBUNAL_ISSUE_CODES)[number];

export type TribunalIssue = {
  code: TribunalIssueCode;
  path: string;
  refs: string[];
};

export type TribunalGrantState = "active" | "revoked" | "superseded";

export type TribunalValidationContext = {
  now: Date;
  authoritySecret: string | null | undefined;
  authorityTokensByGrantId: Record<string, string>;
  verifyGrant: (input: {
    token: string | null | undefined;
    secret: string | null | undefined;
    subject: string;
    requiredScope: string;
    now?: Date;
  }) => AuthorityDecision;
  resolveGrantState?: (grantId: string) => TribunalGrantState | undefined;
  resolveEvidence: (locator: string) => string | Uint8Array | undefined;
  trustedAuthorityIssuers: string[];
  trustedHumanAuthorities: string[];
  consumedReceiptDigests?: Map<string, string>;
};

export type VerifiedTribunalAuthorityGrant = {
  grant: AuthorityGrant;
  grantDigest: string;
  verifiedAt: string;
};

export type TribunalValidationResult = {
  ok: boolean;
  issues: TribunalIssue[];
  verifiedAuthorityGrants: VerifiedTribunalAuthorityGrant[];
  authorityEffectPermittedByVerdict: Record<string, boolean>;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object" && !ArrayBuffer.isView(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function digestCanonical(value: unknown): string {
  const bytes =
    typeof value === "string" || value instanceof Uint8Array
      ? value
      : JSON.stringify(canonicalize(value));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function computeDeclarationDigest(
  declaration: EvaluatorDeclaration,
): string {
  return digestCanonical({
    ...declaration,
    provenance: {
      ...declaration.provenance,
      declarationDigest: undefined,
    },
  });
}

export function computeEvidenceClaimContentDigest(claim: EvidenceClaim): string {
  return digestCanonical({ ...claim, contentDigest: undefined });
}

export function computeVerdictContentDigest(verdict: TribunalVerdict): string {
  return digestCanonical({
    ...verdict,
    provenance: { ...verdict.provenance, contentDigest: undefined },
  });
}

export function computeTribunalCaseDigest(tribunalCase: TribunalCase): string {
  return digestCanonical({ ...tribunalCase, decisionReceipts: undefined });
}

export function computeDecisionReceiptContentDigest(
  receipt: DecisionReceipt,
): string {
  return digestCanonical({ ...receipt, contentDigest: undefined });
}

export const tribunalCaseSubject = (caseId: string): string =>
  `tribunal-case:${caseId}`;
export const tribunalEvaluatorScope = (value: string): string =>
  `quirk.tribunal.evaluator:${value}`;
export const tribunalRealmScope = (value: string): string =>
  `quirk.tribunal.realm:${value}`;
export const tribunalSubjectIdScope = (value: string): string =>
  `quirk.tribunal.subject-id:${value}`;
export const tribunalSubjectDigestScope = (value: string): string =>
  `quirk.tribunal.subject:${value}`;
export const tribunalTargetClassScope = (value: string): string =>
  `quirk.tribunal.target-class:${value}`;
export const tribunalEffectScope = (value: TribunalEffect): string =>
  `quirk.tribunal.effect:${value}`;
export const tribunalPurposeScope = (value: string): string =>
  `quirk.tribunal.purpose:${value}`;
export const tribunalTenantScope = (value: string): string =>
  `quirk.tribunal.tenant:${value}`;
export const tribunalAudienceScope = (value: string): string =>
  `quirk.tribunal.audience:${value}`;
export const tribunalDestinationScope = (value: string): string =>
  `quirk.tribunal.destination:${value}`;
export const tribunalActionScope = (value: string): string =>
  `quirk.tribunal.action:${value}`;

const LEGACY_ALIASES = [
  ["authority_grants", "authorityGrants"],
  ["evaluator_declarations", "evaluatorDeclarations"],
  ["evidence_claims", "evidenceClaims"],
  ["tribunal_verdicts", "verdicts"],
  ["decision_receipts", "decisionReceipts"],
  ["authority_grant_id", "authorityGrantId"],
  ["evaluator_declaration_id", "evaluatorDeclarationId"],
  ["evidence_claim_ids", "evidenceClaimIds"],
] as const;

function findLegacyDialect(value: unknown): "ambiguous" | "legacy" | null {
  let legacy = false;
  let ambiguous = false;
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!current || typeof current !== "object") return;
    const object = current as Record<string, unknown>;
    for (const [oldKey, canonicalKey] of LEGACY_ALIASES) {
      if (oldKey in object) {
        legacy = true;
        if (canonicalKey in object) ambiguous = true;
      }
    }
    Object.values(object).forEach(visit);
  };
  visit(value);
  if (ambiguous) return "ambiguous";
  if (legacy) return "legacy";
  return null;
}

function hasExactMembers(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index])
  );
}

function issueCollector() {
  const issues = new Map<string, TribunalIssue>();
  const add = (code: TribunalIssueCode, path = "$", refs: string[] = []): void => {
    const normalizedRefs = [...refs].sort();
    const key = `${code}|${path}|${normalizedRefs.join(",")}`;
    issues.set(key, { code, path, refs: normalizedRefs });
  };
  const values = (): TribunalIssue[] =>
    [...issues.values()].sort((left, right) =>
      `${left.code}|${left.path}|${left.refs.join(",")}`.localeCompare(
        `${right.code}|${right.path}|${right.refs.join(",")}`,
      ),
    );
  return { add, values };
}

function authorityFailureCode(
  decision: Exclude<AuthorityDecision, { authorized: true }>,
): TribunalIssueCode {
  switch (decision.reason) {
    case "missing_grant":
      return "AUTHORITY_TOKEN_MISSING";
    case "missing_verifier":
      return "AUTHORITY_VERIFIER_UNAVAILABLE";
    case "malformed_grant":
      return "AUTHORITY_GRANT_MALFORMED";
    case "invalid_signature":
      return "AUTHORITY_GRANT_INVALID_SIGNATURE";
    case "expired_grant":
      return "AUTHORITY_GRANT_EXPIRED";
    case "not_yet_valid_grant":
      return "AUTHORITY_GRANT_NOT_YET_VALID";
    case "invalid_grant_window":
      return "AUTHORITY_GRANT_WINDOW_INVALID";
    case "subject_mismatch":
      return "GRANT_CASE_BINDING_MISMATCH";
    case "scope_mismatch":
      return "AUTHORITY_BASE_SCOPE_MISSING";
  }
}

function detectProtocolCycle(tribunalCase: TribunalCase): boolean {
  const graph = new Map<string, string[]>();
  const edge = (from: string, to: string): void => {
    graph.set(from, [...(graph.get(from) ?? []), to]);
  };

  for (const claim of tribunalCase.evidenceClaims) {
    const node = `e:${claim.id}`;
    if (!graph.has(node)) graph.set(node, []);
    claim.derivedFromEvidenceClaimIds.forEach((id) => edge(node, `e:${id}`));
    if (claim.source.kind === "evidence_claim") edge(node, `e:${claim.source.locator}`);
    if (claim.source.kind === "tribunal_verdict") edge(node, `v:${claim.source.locator}`);
    if (claim.source.kind === "decision_receipt") edge(node, `r:${claim.source.locator}`);
  }
  for (const verdict of tribunalCase.verdicts) {
    const node = `v:${verdict.id}`;
    if (!graph.has(node)) graph.set(node, []);
    verdict.evidenceClaimIds.forEach((id) => edge(node, `e:${id}`));
  }
  for (const receipt of tribunalCase.decisionReceipts) {
    const node = `r:${receipt.id}`;
    if (!graph.has(node)) graph.set(node, []);
    receipt.consideredVerdictIds.forEach((id) => edge(node, `v:${id}`));
    receipt.acceptedEvidenceClaimIds.forEach((id) => edge(node, `e:${id}`));
    receipt.rejectedOrDisputedEvidence.forEach(({ evidenceClaimId }) =>
      edge(node, `e:${evidenceClaimId}`),
    );
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return [...graph.keys()].some(visit);
}

function authorityBearing(effect: TribunalEffect): boolean {
  return ["approve", "publish", "mutate_canon", "promote_verdict"].includes(effect);
}

export function validateTribunalCase(
  raw: unknown,
  context: TribunalValidationContext,
): TribunalValidationResult {
  const { add, values } = issueCollector();
  const emptyResult = (): TribunalValidationResult => {
    const issues = values();
    return {
      ok: issues.length === 0,
      issues,
      verifiedAuthorityGrants: [],
      authorityEffectPermittedByVerdict: {},
    };
  };

  const legacy = findLegacyDialect(raw);
  if (legacy === "ambiguous") {
    add("AMBIGUOUS_ALIAS");
    return emptyResult();
  }
  if (legacy === "legacy") {
    add("LEGACY_DIALECT_UNSUPPORTED");
    return emptyResult();
  }

  const parsed = TribunalCaseSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      add("PROTOCOL_SCHEMA_INVALID", issue.path.join(".") || "$", [issue.message]);
    }
    return emptyResult();
  }
  const tribunalCase = parsed.data;

  const serialized = JSON.stringify(tribunalCase);
  if (/NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN)/.test(serialized)) {
    add("BROWSER_EXPOSED_SECRET_FORBIDDEN");
  }
  if (
    /sk-(?:proj-)?[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|secret|password|token)\s*[:=]/i.test(
      serialized,
    )
  ) {
    add("SECRET_MATERIAL_FORBIDDEN");
  }

  const objectIds = [
    ...tribunalCase.authorityGrants.map((grant) => ({ id: grant.grantId, path: "authorityGrants" })),
    ...tribunalCase.evaluatorDeclarations.map((item) => ({ id: item.id, path: "evaluatorDeclarations" })),
    ...tribunalCase.evidenceClaims.map((item) => ({ id: item.id, path: "evidenceClaims" })),
    ...tribunalCase.verdicts.map((item) => ({ id: item.id, path: "verdicts" })),
    ...tribunalCase.decisionReceipts.map((item) => ({ id: item.id, path: "decisionReceipts" })),
  ];
  const seenIds = new Set<string>();
  for (const object of objectIds) {
    if (seenIds.has(object.id)) add("DUPLICATE_OBJECT_ID", object.path, [object.id]);
    seenIds.add(object.id);
  }
  if (values().some((issue) => issue.code === "DUPLICATE_OBJECT_ID")) return emptyResult();

  const grants = new Map(tribunalCase.authorityGrants.map((grant) => [grant.grantId, grant]));
  const declarations = new Map(
    tribunalCase.evaluatorDeclarations.map((declaration) => [declaration.id, declaration]),
  );
  const evidence = new Map(tribunalCase.evidenceClaims.map((claim) => [claim.id, claim]));
  const verdicts = new Map(tribunalCase.verdicts.map((verdict) => [verdict.id, verdict]));
  const evaluatorIds = new Set(tribunalCase.evaluatorDeclarations.map(({ id }) => id));
  const verifiedAuthorityGrants: VerifiedTribunalAuthorityGrant[] = [];
  const authorityEffectPermittedByVerdict: Record<string, boolean> = {};

  for (const grant of tribunalCase.authorityGrants) {
    const token = context.authorityTokensByGrantId[grant.grantId];
    const decision = context.verifyGrant({
      token,
      secret: context.authoritySecret,
      subject: tribunalCaseSubject(tribunalCase.caseId),
      requiredScope: TRIBUNAL_EVALUATE_SCOPE,
      now: context.now,
    });
    if (!decision.authorized) {
      add(authorityFailureCode(decision), `authorityGrants.${grant.grantId}`, [grant.grantId]);
    } else {
      if (decision.grant.grantId !== grant.grantId) {
        add("VERIFIED_GRANT_ID_MISMATCH", `authorityGrants.${grant.grantId}`, [decision.grant.grantId]);
      } else if (digestCanonical(decision.grant) !== digestCanonical(grant)) {
        add("AUTHORITY_GRANT_PAYLOAD_MISMATCH", `authorityGrants.${grant.grantId}`, [grant.grantId]);
      } else {
        verifiedAuthorityGrants.push({
          grant: decision.grant,
          grantDigest: digestCanonical(decision.grant),
          verifiedAt: context.now.toISOString(),
        });
      }
    }

    if (!context.trustedAuthorityIssuers.includes(grant.issuer)) {
      add("AUTHORITY_GRANT_ISSUER_UNTRUSTED", `authorityGrants.${grant.grantId}.issuer`, [grant.issuer]);
    }
    if (evaluatorIds.has(grant.issuer)) {
      add("GRANT_SELF_ISSUED", `authorityGrants.${grant.grantId}.issuer`, [grant.issuer]);
    }
    if (!context.resolveGrantState) {
      add("AUTHORITY_LIFECYCLE_UNVERIFIED", `authorityGrants.${grant.grantId}`, [grant.grantId]);
    } else if (context.resolveGrantState(grant.grantId) !== "active") {
      add("AUTHORITY_GRANT_INACTIVE", `authorityGrants.${grant.grantId}`, [grant.grantId]);
    }
  }

  const independence = new Map<string, string>();
  for (const declaration of tribunalCase.evaluatorDeclarations) {
    const existing = independence.get(declaration.independence.key);
    if (existing && existing !== declaration.id) {
      add("EVALUATOR_INDEPENDENCE_COLLISION", `evaluatorDeclarations.${declaration.id}.independence.key`, [existing, declaration.id]);
    } else {
      independence.set(declaration.independence.key, declaration.id);
    }

    if (computeDeclarationDigest(declaration) !== declaration.provenance.declarationDigest) {
      add("DECLARATION_HASH_MISMATCH", `evaluatorDeclarations.${declaration.id}.provenance.declarationDigest`, [declaration.id]);
    }
    const grant = grants.get(declaration.authority.grantId);
    if (!grant) {
      add("UNKNOWN_AUTHORITY_GRANT_REF", `evaluatorDeclarations.${declaration.id}.authority.grantId`, [declaration.authority.grantId]);
      continue;
    }
    if (declaration.authority.grantDigest !== digestCanonical(grant)) {
      add("AUTHORITY_GRANT_PAYLOAD_MISMATCH", `evaluatorDeclarations.${declaration.id}.authority.grantDigest`, [grant.grantId]);
    }

    const ownEvaluatorScope = tribunalEvaluatorScope(declaration.id);
    if (!grant.scopes.includes(ownEvaluatorScope)) {
      add("GRANT_EVALUATOR_SCOPE_MISMATCH", `evaluatorDeclarations.${declaration.id}.authority.grantId`, [grant.grantId]);
      if (grant.scopes.some((scope) => scope.startsWith("quirk.tribunal.evaluator:"))) {
        add("PROXY_GRANT_FORBIDDEN", `evaluatorDeclarations.${declaration.id}.authority.grantId`, [grant.grantId]);
      }
    }

    const conflicts = declaration.authority.declaredEffects.filter((effect) =>
      declaration.authority.prohibitedEffects.includes(effect),
    );
    if (conflicts.length > 0) {
      add("DECLARATION_EFFECT_CONFLICT", `evaluatorDeclarations.${declaration.id}.authority`, conflicts);
    }
    for (const effect of declaration.authority.declaredEffects) {
      if (!grant.scopes.includes(tribunalEffectScope(effect))) {
        add("DECLARATION_EFFECT_EXCEEDS_GRANT", `evaluatorDeclarations.${declaration.id}.authority.declaredEffects`, [effect]);
      }
    }

    const evaluatedAt = Date.parse(tribunalCase.evaluatedAt);
    if (Date.parse(declaration.fallibility.calibrationValidUntil) < evaluatedAt) {
      add("CALIBRATION_STALE", `evaluatorDeclarations.${declaration.id}.fallibility.calibrationValidUntil`, [declaration.id]);
    }
    if (declaration.fallibility.holdoutDigest === tribunalCase.subject.digest) {
      add("CALIBRATION_HOLDOUT_CONTAMINATED", `evaluatorDeclarations.${declaration.id}.fallibility.holdoutDigest`, [declaration.id]);
    }
    if (
      Date.parse(declaration.fallibility.calibratedAt) > evaluatedAt ||
      Date.parse(declaration.inspection.temporalBoundary) > evaluatedAt
    ) {
      add("TEMPORAL_ORDER_INVALID", `evaluatorDeclarations.${declaration.id}`, [declaration.id]);
    }
  }

  for (const claim of tribunalCase.evidenceClaims) {
    if (claim.subjectDigest !== tribunalCase.subject.digest) {
      add("SUBJECT_REVISION_MISMATCH", `evidenceClaims.${claim.id}.subjectDigest`, [claim.id]);
    }
    if (computeEvidenceClaimContentDigest(claim) !== claim.contentDigest) {
      add("EVIDENCE_DIGEST_MISMATCH", `evidenceClaims.${claim.id}.contentDigest`, [claim.id]);
    }
    if (!claim.source.digest) {
      add("EVIDENCE_DIGEST_REQUIRED", `evidenceClaims.${claim.id}.source.digest`, [claim.id]);
    } else if (!DigestSchema.safeParse(claim.source.digest).success) {
      add("EVIDENCE_DIGEST_INVALID", `evidenceClaims.${claim.id}.source.digest`, [claim.id]);
    } else if (
      !["evidence_claim", "tribunal_verdict", "decision_receipt"].includes(claim.source.kind)
    ) {
      const bytes = context.resolveEvidence(claim.source.locator);
      if (bytes === undefined) {
        add("EVIDENCE_SOURCE_UNRESOLVED", `evidenceClaims.${claim.id}.source.locator`, [claim.source.locator]);
      } else if (digestCanonical(bytes) !== claim.source.digest) {
        add("EVIDENCE_DIGEST_MISMATCH", `evidenceClaims.${claim.id}.source.digest`, [claim.id]);
      }
    }
    if (claim.source.kind === "tribunal_verdict") {
      add("VERDICT_CANNOT_BE_PRIMARY_EVIDENCE", `evidenceClaims.${claim.id}.source.kind`, [claim.id]);
    }
    const declaration = declarations.get(claim.inspectedBy);
    if (declaration && !declaration.inspection.evidenceKinds.includes(claim.source.kind)) {
      add("OUT_OF_SCOPE_EVIDENCE", `evidenceClaims.${claim.id}.source.kind`, [claim.source.kind]);
    }
    for (const dependency of claim.derivedFromEvidenceClaimIds) {
      if (!evidence.has(dependency)) {
        add("UNKNOWN_EVIDENCE_CLAIM_REF", `evidenceClaims.${claim.id}.derivedFromEvidenceClaimIds`, [dependency]);
      }
    }
    if (claim.source.kind === "evidence_claim" && !evidence.has(claim.source.locator)) {
      add("UNKNOWN_EVIDENCE_CLAIM_REF", `evidenceClaims.${claim.id}.source.locator`, [claim.source.locator]);
    }
    if (claim.source.kind === "tribunal_verdict" && !verdicts.has(claim.source.locator)) {
      add("UNKNOWN_TRIBUNAL_VERDICT_REF", `evidenceClaims.${claim.id}.source.locator`, [claim.source.locator]);
    }
    const observedAt = Date.parse(claim.observedAt);
    if (observedAt > Date.parse(tribunalCase.evaluatedAt)) {
      add("TEMPORAL_ORDER_INVALID", `evidenceClaims.${claim.id}.observedAt`, [claim.id]);
    }
    if (Date.parse(claim.validUntil) < Date.parse(tribunalCase.evaluatedAt)) {
      add("EVIDENCE_STALE", `evidenceClaims.${claim.id}.validUntil`, [claim.id]);
    }
  }

  for (const verdict of tribunalCase.verdicts) {
    authorityEffectPermittedByVerdict[verdict.id] = false;
    const declaration = declarations.get(verdict.evaluatorDeclarationId);
    if (!declaration) {
      add("UNKNOWN_EVALUATOR_DECLARATION_REF", `verdicts.${verdict.id}.evaluatorDeclarationId`, [verdict.evaluatorDeclarationId]);
      continue;
    }
    const grant = grants.get(verdict.authorityGrantId);
    if (!grant) {
      add("UNKNOWN_AUTHORITY_GRANT_REF", `verdicts.${verdict.id}.authorityGrantId`, [verdict.authorityGrantId]);
      continue;
    }
    if (verdict.authorityGrantId !== declaration.authority.grantId) {
      add("VERDICT_GRANT_BINDING_MISMATCH", `verdicts.${verdict.id}.authorityGrantId`, [verdict.authorityGrantId, declaration.authority.grantId]);
      continue;
    }
    if (
      verdict.authorityBasis.grantId !== verdict.authorityGrantId ||
      verdict.authorityBasis.grantDigest !== digestCanonical(grant)
    ) {
      add("VERDICT_GRANT_BINDING_MISMATCH", `verdicts.${verdict.id}.authorityBasis`, [verdict.authorityGrantId]);
    }

    if (verdict.subjectDigest !== tribunalCase.subject.digest) {
      add("SUBJECT_REVISION_MISMATCH", `verdicts.${verdict.id}.subjectDigest`, [verdict.id]);
    }
    const requiredScopes: Array<[string, TribunalIssueCode]> = [
      [tribunalRealmScope(tribunalCase.subject.realm), "SUBJECT_REALM_OUT_OF_SCOPE"],
      [tribunalSubjectIdScope(tribunalCase.subject.id), "SUBJECT_ID_OUT_OF_SCOPE"],
      [tribunalSubjectDigestScope(tribunalCase.subject.digest), "SUBJECT_REVISION_OUT_OF_SCOPE"],
      [tribunalTargetClassScope(tribunalCase.subject.targetClass), "SUBJECT_TARGET_CLASS_OUT_OF_SCOPE"],
      [tribunalPurposeScope(tribunalCase.operatingScope.purposeId), "PURPOSE_OUT_OF_SCOPE"],
      [tribunalTenantScope(tribunalCase.operatingScope.tenantId), "TENANT_OUT_OF_SCOPE"],
      [tribunalAudienceScope(tribunalCase.operatingScope.audienceId), "AUDIENCE_OUT_OF_SCOPE"],
      [tribunalDestinationScope(tribunalCase.operatingScope.destinationId), "DESTINATION_OUT_OF_SCOPE"],
      [tribunalActionScope(tribunalCase.operatingScope.actionDigest), "ACTION_DIGEST_MISMATCH"],
    ];
    for (const [scope, code] of requiredScopes) {
      if (!grant.scopes.includes(scope)) add(code, `verdicts.${verdict.id}.authorityGrantId`, [grant.grantId]);
    }

    if (!declaration.authority.declaredEffects.includes(verdict.authorityEffectRequested)) {
      add("REQUESTED_EFFECT_UNDECLARED", `verdicts.${verdict.id}.authorityEffectRequested`, [verdict.authorityEffectRequested]);
    }
    const signedEffect = tribunalEffectScope(verdict.authorityEffectRequested);
    if (!grant.scopes.includes(signedEffect)) {
      add("REQUESTED_EFFECT_EXCEEDS_GRANT", `verdicts.${verdict.id}.authorityEffectRequested`, [verdict.authorityEffectRequested]);
      if ([...grants.values()].some((candidate) => candidate.grantId !== grant.grantId && candidate.scopes.includes(signedEffect))) {
        add("AUTHORITY_UNION_FORBIDDEN", `verdicts.${verdict.id}.authorityEffectRequested`, [verdict.authorityEffectRequested]);
      }
    } else if (
      declaration.authority.declaredEffects.includes(verdict.authorityEffectRequested) &&
      verdict.authorityBasis.kind === "grant"
    ) {
      authorityEffectPermittedByVerdict[verdict.id] = true;
    }

    if (verdict.authorityBasis.kind === "confidence") {
      add("AUTHORITY_DERIVED_FROM_CONFIDENCE", `verdicts.${verdict.id}.authorityBasis.kind`, [verdict.id]);
    } else if (verdict.authorityBasis.kind === "consensus") {
      add("AUTHORITY_DERIVED_FROM_CONSENSUS", `verdicts.${verdict.id}.authorityBasis.kind`, [verdict.id]);
    } else if (verdict.authorityBasis.kind === "historical_accuracy") {
      add("AUTHORITY_DERIVED_FROM_HISTORICAL_ACCURACY", `verdicts.${verdict.id}.authorityBasis.kind`, [verdict.id]);
    }

    const allowedEffects: Record<TribunalVerdict["disposition"], TribunalEffect[]> = {
      SUPPORTED: TribunalEffectSchema.options,
      CONTRADICTED: ["observe", "block"],
      INSUFFICIENT: ["observe"],
      OUT_OF_SCOPE: ["observe"],
      DISPUTED: ["observe"],
    };
    if (!allowedEffects[verdict.disposition].includes(verdict.authorityEffectRequested)) {
      add("DISPOSITION_EFFECT_INVALID", `verdicts.${verdict.id}.authorityEffectRequested`, [verdict.disposition]);
    }
    if (
      ["SUPPORTED", "CONTRADICTED"].includes(verdict.disposition) &&
      verdict.evidenceClaimIds.length === 0
    ) {
      add("EVIDENCE_REQUIRED", `verdicts.${verdict.id}.evidenceClaimIds`, [verdict.id]);
    }

    const linkedEvidence = verdict.evidenceClaimIds.map((id) => evidence.get(id));
    const missingEvidence = verdict.evidenceClaimIds.filter((id) => !evidence.has(id));
    for (const id of missingEvidence) {
      add("UNKNOWN_EVIDENCE_CLAIM_REF", `verdicts.${verdict.id}.evidenceClaimIds`, [id]);
    }
    for (const claim of linkedEvidence) {
      if (!claim) continue;
      if (claim.inspectedBy !== verdict.evaluatorDeclarationId) {
        add("EVIDENCE_INSPECTOR_MISMATCH", `verdicts.${verdict.id}.evidenceClaimIds`, [claim.id, claim.inspectedBy, verdict.evaluatorDeclarationId]);
      }
    }
    if (missingEvidence.length === 0) {
      const expectedDigests = linkedEvidence.flatMap((claim) => (claim ? [claim.contentDigest] : []));
      if (!hasExactMembers(verdict.provenance.evidenceDigests, expectedDigests)) {
        add("EVIDENCE_HASH_SET_MISMATCH", `verdicts.${verdict.id}.provenance.evidenceDigests`, [verdict.id]);
      }
    }
    if (verdict.provenance.evaluatorVersion !== declaration.version) {
      add("EVALUATOR_VERSION_MISMATCH", `verdicts.${verdict.id}.provenance.evaluatorVersion`, [verdict.id]);
    }
    if (verdict.provenance.declarationDigest !== declaration.provenance.declarationDigest) {
      add("DECLARATION_HASH_MISMATCH", `verdicts.${verdict.id}.provenance.declarationDigest`, [verdict.id]);
    }
    if (verdict.confidence > declaration.fallibility.maxConfidence) {
      add("CONFIDENCE_EXCEEDS_CALIBRATION", `verdicts.${verdict.id}.confidence`, [verdict.id]);
    }
    if (computeVerdictContentDigest(verdict) !== verdict.provenance.contentDigest) {
      add("VERDICT_CONTENT_HASH_MISMATCH", `verdicts.${verdict.id}.provenance.contentDigest`, [verdict.id]);
    }
    const latestEvidence = linkedEvidence.reduce(
      (latest, claim) => Math.max(latest, claim ? Date.parse(claim.observedAt) : 0),
      0,
    );
    if (
      Date.parse(verdict.provenance.createdAt) < latestEvidence ||
      Date.parse(verdict.provenance.createdAt) > Date.parse(tribunalCase.evaluatedAt)
    ) {
      add("TEMPORAL_ORDER_INVALID", `verdicts.${verdict.id}.provenance.createdAt`, [verdict.id]);
    }
  }

  if (detectProtocolCycle(tribunalCase)) add("EVIDENCE_CYCLE");

  const conflictGroups = new Map<string, TribunalVerdict[]>();
  for (const verdict of tribunalCase.verdicts) {
    const key = `${verdict.claimId}|${verdict.subjectDigest}`;
    conflictGroups.set(key, [...(conflictGroups.get(key) ?? []), verdict]);
  }
  for (const group of conflictGroups.values()) {
    const dispositions = new Set(group.map(({ disposition }) => disposition));
    if (!(dispositions.has("SUPPORTED") && dispositions.has("CONTRADICTED"))) continue;
    const ids = group.map(({ id }) => id);
    const acknowledged = tribunalCase.decisionReceipts.some(
      (receipt) =>
        receipt.decision.authorityId === tribunalCase.humanAuthorityId &&
        context.trustedHumanAuthorities.includes(receipt.decision.authorityId) &&
        ids.every((id) => receipt.consideredVerdictIds.includes(id)),
    );
    if (!acknowledged) add("DISPUTED_VERDICTS_UNACKNOWLEDGED", "verdicts", ids);
  }

  if (authorityBearing(tribunalCase.proposedEffect) && tribunalCase.decisionReceipts.length === 0) {
    add("DECISION_RECEIPT_REQUIRED", "decisionReceipts", [tribunalCase.proposedEffect]);
  }

  const integrityFailures = new Set<TribunalIssueCode>([
    "DECLARATION_HASH_MISMATCH",
    "EVIDENCE_HASH_SET_MISMATCH",
    "EVALUATOR_VERSION_MISMATCH",
    "SUBJECT_REVISION_MISMATCH",
    "VERDICT_CONTENT_HASH_MISMATCH",
  ]);
  const skipReceiptBindings = values().some((issue) => integrityFailures.has(issue.code));
  if (!skipReceiptBindings) {
    const expectedVerdicts = tribunalCase.verdicts.map(({ id }) => id);
    const expectedEvidence = [
      ...new Set(tribunalCase.verdicts.flatMap(({ evidenceClaimIds }) => evidenceClaimIds)),
    ];
    const expectedGrants = [
      ...new Set(tribunalCase.verdicts.map(({ authorityGrantId }) => authorityGrantId)),
    ];
    for (const receipt of tribunalCase.decisionReceipts) {
      if (!hasExactMembers(receipt.consideredVerdictIds, expectedVerdicts)) {
        add("RECEIPT_VERDICT_BINDING_MISMATCH", `decisionReceipts.${receipt.id}.consideredVerdictIds`, [receipt.id]);
      }
      const accountedEvidence = [
        ...receipt.acceptedEvidenceClaimIds,
        ...receipt.rejectedOrDisputedEvidence.map(({ evidenceClaimId }) => evidenceClaimId),
      ];
      if (!hasExactMembers(accountedEvidence, expectedEvidence)) {
        add("RECEIPT_EVIDENCE_ACCOUNTING_INCOMPLETE", `decisionReceipts.${receipt.id}`, [receipt.id]);
      }
      for (const verdictId of receipt.consideredVerdictIds) {
        if (!verdicts.has(verdictId)) {
          add("UNKNOWN_TRIBUNAL_VERDICT_REF", `decisionReceipts.${receipt.id}.consideredVerdictIds`, [verdictId]);
        }
      }
      const receiptGrantIds = receipt.authorityGrantRefs.map(({ grantId }) => grantId);
      const badGrantDigest = receipt.authorityGrantRefs.some(({ grantId, grantDigest }) => {
        const grant = grants.get(grantId);
        return !grant || digestCanonical(grant) !== grantDigest;
      });
      if (!hasExactMembers(receiptGrantIds, expectedGrants) || badGrantDigest) {
        add("RECEIPT_GRANT_BINDING_MISMATCH", `decisionReceipts.${receipt.id}.authorityGrantRefs`, [receipt.id]);
      }
      if (receipt.caseId !== tribunalCase.caseId) {
        add("RECEIPT_CASE_DIGEST_MISMATCH", `decisionReceipts.${receipt.id}.caseId`, [receipt.id]);
      }
      if (receipt.caseDigest !== computeTribunalCaseDigest(tribunalCase)) {
        add("RECEIPT_CASE_DIGEST_MISMATCH", `decisionReceipts.${receipt.id}.caseDigest`, [receipt.id]);
      }
      if (receipt.decision.authorityId !== tribunalCase.humanAuthorityId) {
        add("DECISION_OWNER_MISMATCH", `decisionReceipts.${receipt.id}.decision.authorityId`, [receipt.decision.authorityId]);
      } else if (!context.trustedHumanAuthorities.includes(receipt.decision.authorityId)) {
        add("DECISION_AUTHORITY_UNTRUSTED", `decisionReceipts.${receipt.id}.decision.authorityId`, [receipt.decision.authorityId]);
      }
      if (receipt.effect !== tribunalCase.proposedEffect) {
        add("RECEIPT_EFFECT_MISMATCH", `decisionReceipts.${receipt.id}.effect`, [receipt.effect, tribunalCase.proposedEffect]);
      }
      if (!context.consumedReceiptDigests) {
        add("REPLAY_CHECK_REQUIRED", `decisionReceipts.${receipt.id}`, [receipt.id]);
      } else {
        const consumed = context.consumedReceiptDigests.get(receipt.id);
        if (consumed === receipt.contentDigest) {
          add("DECISION_RECEIPT_REPLAYED", `decisionReceipts.${receipt.id}`, [receipt.id]);
        } else if (consumed) {
          add("DECISION_RECEIPT_TAMPERED", `decisionReceipts.${receipt.id}`, [receipt.id]);
        }
      }
      if (receipt.reversibility.kind === "reversible" && !receipt.reversibility.rollbackRef) {
        add("RECEIPT_ROLLBACK_REQUIRED", `decisionReceipts.${receipt.id}.reversibility.rollbackRef`, [receipt.id]);
      }
      const issuedAt = Date.parse(receipt.issuedAt);
      if (
        issuedAt < Date.parse(tribunalCase.evaluatedAt) ||
        issuedAt > context.now.getTime() ||
        receipt.decision.decidedAt !== receipt.issuedAt ||
        (receipt.reversibility.deadline && Date.parse(receipt.reversibility.deadline) < issuedAt)
      ) {
        add("TEMPORAL_ORDER_INVALID", `decisionReceipts.${receipt.id}.issuedAt`, [receipt.id]);
      }
      if (computeDecisionReceiptContentDigest(receipt) !== receipt.contentDigest) {
        add("RECEIPT_CONTENT_HASH_MISMATCH", `decisionReceipts.${receipt.id}.contentDigest`, [receipt.id]);
      }
    }
  }

  if (
    Date.parse(tribunalCase.openedAt) > Date.parse(tribunalCase.evaluatedAt) ||
    Date.parse(tribunalCase.evaluatedAt) > context.now.getTime()
  ) {
    add("TEMPORAL_ORDER_INVALID", "evaluatedAt", [tribunalCase.caseId]);
  }

  const issues = values();
  return {
    ok: issues.length === 0,
    issues,
    verifiedAuthorityGrants,
    authorityEffectPermittedByVerdict,
  };
}
