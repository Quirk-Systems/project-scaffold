import { createHash } from "node:crypto";
import { types as nodeTypes } from "node:util";
import { z } from "zod";

import {
  AUTHORITY_GRANT_LIMITS,
  AuthorityGrantSchema,
  NEVER_0001,
  type AuthorityDecision,
  type AuthorityGrant,
  type AuthorityKeyResolver,
  type AuthorityKeyReference,
} from "../governance/authority";
import {
  DesignCriterionSchema,
  DesignCriticRoleSchema,
  DesignEvidenceKindSchema,
  DesignEvidenceSchema,
  DesignFindingSchema,
  DesignReviewRequestSchema,
  HumanDecisionSchema,
  StableIdSchema,
  isTerminalDesignFindingResolution,
  type DesignCriterion,
  type DesignFinding,
  type DesignReviewRequest,
} from "./contracts";

export const TRIBUNAL_PROTOCOL_VERSION = "1.0.0" as const;
export const TRIBUNAL_EVALUATE_SCOPE = "quirk.tribunal.evaluate" as const;

export const TRIBUNAL_LIMITS = Object.freeze({
  stableIdChars: 128,
  shortTextChars: 2_048,
  longTextChars: 8_192,
  locatorChars: 2_048,
  roleItems: 256,
  authorityGrants: 64,
  evaluatorDeclarations: 64,
  evidenceClaims: 1_024,
  verdicts: 256,
  decisionReceipts: 64,
  grantScopes: 128,
  rawDepth: 100,
  rawValues: 20_000,
  rawArrayItems: 2_048,
  rawObjectKeys: 128,
  rawStringBytes: 65_536,
  serializedBytes: 2_000_000,
  externalResolutionBytes: 8_000_000,
  externalResolutionValues: 2_048,
  authorityTokenChars: 32_768,
} as const);

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
const StableProtocolIdSchema = StableIdSchema.max(
  TRIBUNAL_LIMITS.stableIdChars,
);
const NonEmptyStringSchema = z
  .string()
  .min(1)
  .max(TRIBUNAL_LIMITS.longTextChars);
const ShortStringSchema = z.string().min(1).max(TRIBUNAL_LIMITS.shortTextChars);
const LocatorStringSchema = z.string().min(1).max(TRIBUNAL_LIMITS.locatorChars);
const TimestampSchema = z.string().max(64).datetime({ offset: true });
const DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const DigestCandidateSchema = z.string().min(1).max(71).optional();
const AuthorityKeyReferencePortSchema = z
  .object({
    issuer: z.string().min(1).max(AUTHORITY_GRANT_LIMITS.fieldChars),
    keyId: z.string().min(1).max(AUTHORITY_GRANT_LIMITS.fieldChars),
  })
  .strict();
const AuthorityDecisionPortSchema = z.discriminatedUnion("authorized", [
  z
    .object({
      authorized: z.literal(true),
      grant: AuthorityGrantSchema,
      keyReference: AuthorityKeyReferencePortSchema,
    })
    .strict(),
  z
    .object({
      authorized: z.literal(false),
      never: z.literal(NEVER_0001),
      reason: z.enum([
        "missing_grant",
        "missing_verifier",
        "unknown_signing_key",
        "invalid_verifier",
        "malformed_grant",
        "issuer_mismatch",
        "invalid_signature",
        "expired_grant",
        "not_yet_valid_grant",
        "invalid_grant_window",
        "invalid_verification_time",
        "subject_mismatch",
        "scope_mismatch",
      ]),
    })
    .strict(),
]);

function boundedUniqueArray<T extends z.ZodTypeAny>(
  item: T,
  options: {
    min?: number;
    max?: number;
    key?: (value: z.infer<T>) => string;
  } = {},
) {
  const minimum = options.min ?? 0;
  const maximum = options.max ?? TRIBUNAL_LIMITS.roleItems;
  return z
    .array(item)
    .min(minimum)
    .max(maximum)
    .superRefine((values, context) => {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        const key = options.key
          ? options.key(value)
          : typeof value === "string"
            ? value
            : (JSON.stringify(value) ?? String(value));
        if (seen.has(key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: "Collection entries must be unique.",
          });
        }
        seen.add(key);
      });
    });
}

const TribunalAuthorityGrantSchema = AuthorityGrantSchema.superRefine(
  (grant, context) => {
    for (const field of ["grantId", "issuer", "subject", "nonce"] as const) {
      if (grant[field].length > TRIBUNAL_LIMITS.shortTextChars) {
        context.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: TRIBUNAL_LIMITS.shortTextChars,
          inclusive: true,
          type: "string",
          path: [field],
          message: "Authority grant field exceeds the Tribunal input budget.",
        });
      }
    }
    if (grant.scopes.length > TRIBUNAL_LIMITS.grantScopes) {
      context.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: TRIBUNAL_LIMITS.grantScopes,
        inclusive: true,
        type: "array",
        path: ["scopes"],
        message: "Authority grant scopes exceed the Tribunal input budget.",
      });
    }
    if (new Set(grant.scopes).size !== grant.scopes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopes"],
        message: "Authority grant scopes must be unique.",
      });
    }
    grant.scopes.forEach((scope, index) => {
      if (scope.length > TRIBUNAL_LIMITS.shortTextChars) {
        context.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: TRIBUNAL_LIMITS.shortTextChars,
          inclusive: true,
          type: "string",
          path: ["scopes", index],
          message: "Authority scope exceeds the Tribunal input budget.",
        });
      }
    });
  },
);

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
  locator: LocatorStringSchema,
  summary: NonEmptyStringSchema,
  digest: DigestCandidateSchema,
}).strict();

const InternalEvidenceSourceSchema = z
  .object({
    kind: InternalEvidenceKindSchema,
    locator: StableProtocolIdSchema,
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
    purposeId: StableProtocolIdSchema,
    tenantId: StableProtocolIdSchema,
    audienceId: StableProtocolIdSchema,
    destinationId: StableProtocolIdSchema,
    actionDigest: DigestSchema,
  })
  .strict();

export const TribunalSubjectSchema = z
  .object({
    id: StableProtocolIdSchema,
    realm: StableProtocolIdSchema,
    targetClass: StableProtocolIdSchema,
    revision: ShortStringSchema,
    locator: LocatorStringSchema,
    digest: DigestSchema,
  })
  .strict();

export const EvidenceClaimReferenceSchema = z
  .object({
    evidenceClaimId: StableProtocolIdSchema,
    contentDigest: DigestSchema,
  })
  .strict();

export const TribunalActionManifestSchema = z
  .object({
    kind: z.literal("TribunalActionManifest"),
    protocolVersion: ProtocolVersionSchema,
    caseId: StableProtocolIdSchema,
    requestDigest: DigestSchema,
    subjectDigest: DigestSchema,
    proposedEffect: TribunalEffectSchema,
    purposeId: StableProtocolIdSchema,
    tenantId: StableProtocolIdSchema,
    audienceId: StableProtocolIdSchema,
    destinationId: StableProtocolIdSchema,
    candidates: boundedUniqueArray(
      z
        .object({
          digest: DigestSchema,
          generatorId: StableProtocolIdSchema,
          independenceKey: StableProtocolIdSchema,
        })
        .strict(),
      { min: 1, max: 4, key: ({ digest }) => digest },
    ),
    selectedCandidateDigest: DigestSchema,
    prohibitedChangeChecks: boundedUniqueArray(
      z
        .object({
          prohibition: NonEmptyStringSchema,
          status: z.enum(["clear", "violated", "unresolved"]),
          evidenceClaims: boundedUniqueArray(EvidenceClaimReferenceSchema, {
            min: 1,
            key: ({ evidenceClaimId }) => evidenceClaimId,
          }),
        })
        .strict(),
      { key: ({ prohibition }) => prohibition },
    ),
    baselineEvidence: EvidenceClaimReferenceSchema.optional(),
    usage: z
      .object({
        rounds: z.number().int().min(0).max(10),
        inputTokens: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        outputTokens: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        wallClockMs: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
      })
      .strict(),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (
      !manifest.candidates.some(
        ({ digest }) => digest === manifest.selectedCandidateDigest,
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedCandidateDigest"],
        message:
          "The selected candidate must be one of the evaluated candidates.",
      });
    }
  });

export const EvaluatorDeclarationSchema = z
  .object({
    kind: z.literal("EvaluatorDeclaration"),
    protocolVersion: ProtocolVersionSchema,
    id: StableProtocolIdSchema,
    criticRole: DesignCriticRoleSchema,
    evaluatorType: z.enum([
      "deterministic_validator",
      "model",
      "human_reviewer",
      "benchmark_harness",
      "ensemble",
      "meta_evaluator",
    ]),
    version: ShortStringSchema,
    independence: z
      .object({
        key: StableProtocolIdSchema,
        operatorId: StableProtocolIdSchema,
        modelFamily: StableProtocolIdSchema,
      })
      .strict(),
    inspection: z
      .object({
        allowedSourceLocators: boundedUniqueArray(LocatorStringSchema, {
          min: 1,
        }),
        deniedSourceLocators: boundedUniqueArray(LocatorStringSchema),
        tools: boundedUniqueArray(StableProtocolIdSchema, { min: 1 }),
        evidenceKinds: boundedUniqueArray(TribunalEvidenceKindSchema, {
          min: 1,
        }),
        temporalBoundary: TimestampSchema,
      })
      .strict(),
    fallibility: z
      .object({
        knownFailureModes: boundedUniqueArray(ShortStringSchema, { min: 1 }),
        calibrationEvidence: z
          .object({
            locator: LocatorStringSchema,
            digest: DigestSchema,
          })
          .strict(),
        calibratedAt: TimestampSchema,
        calibrationValidUntil: TimestampSchema,
        holdoutEvidence: z
          .object({
            locator: LocatorStringSchema,
            digest: DigestSchema,
          })
          .strict(),
        maxConfidence: z.number().min(0).max(1),
        errorTendencies: boundedUniqueArray(ShortStringSchema),
        unresolvedBlindSpots: boundedUniqueArray(ShortStringSchema),
      })
      .strict(),
    authority: z
      .object({
        grantId: StableProtocolIdSchema,
        grantDigest: DigestSchema,
        declaredEffects: boundedUniqueArray(TribunalEffectSchema, { min: 1 }),
        prohibitedEffects: boundedUniqueArray(TribunalEffectSchema),
      })
      .strict(),
    provenance: z
      .object({
        canonicalVersion: ShortStringSchema,
        declarationDigest: DigestSchema,
      })
      .strict(),
  })
  .strict();

export const EvidenceClaimSchema = z
  .object({
    kind: z.literal("EvidenceClaim"),
    protocolVersion: ProtocolVersionSchema,
    id: StableProtocolIdSchema,
    claimId: StableProtocolIdSchema,
    claim: NonEmptyStringSchema,
    subjectDigest: DigestSchema,
    source: TribunalEvidenceSourceSchema,
    observable: z.boolean(),
    inspectedBy: StableProtocolIdSchema,
    inspectionToolId: StableProtocolIdSchema,
    inspectionMethod: ShortStringSchema,
    observedAt: TimestampSchema,
    validUntil: TimestampSchema,
    confidence: z.number().min(0).max(1),
    limitations: boundedUniqueArray(ShortStringSchema),
    retentionClass: z.enum(["ephemeral", "session", "project", "permanent"]),
    derivedFromEvidenceClaims: boundedUniqueArray(
      EvidenceClaimReferenceSchema,
      { key: ({ evidenceClaimId }) => evidenceClaimId },
    ),
    contentDigest: DigestSchema,
  })
  .strict();

export const TribunalVerdictSchema = z
  .object({
    kind: z.literal("TribunalVerdict"),
    protocolVersion: ProtocolVersionSchema,
    id: StableProtocolIdSchema,
    evaluatorDeclarationId: StableProtocolIdSchema,
    authorityGrantId: StableProtocolIdSchema,
    subjectDigest: DigestSchema,
    criterionRef: StableProtocolIdSchema,
    claimId: StableProtocolIdSchema,
    claim: NonEmptyStringSchema,
    disposition: TribunalDispositionSchema,
    evidenceClaimIds: boundedUniqueArray(StableProtocolIdSchema),
    confidence: z.number().min(0).max(1),
    uncertainty: NonEmptyStringSchema,
    dissent: boundedUniqueArray(ShortStringSchema),
    authorityEffectRequested: TribunalEffectSchema,
    authorityBasis: z
      .object({
        kind: z.enum([
          "grant",
          "confidence",
          "consensus",
          "historical_accuracy",
        ]),
        grantId: StableProtocolIdSchema,
        grantDigest: DigestSchema,
      })
      .strict(),
    provenance: z
      .object({
        trajectoryId: StableProtocolIdSchema,
        evaluatorVersion: ShortStringSchema,
        declarationDigest: DigestSchema,
        sourceFindingDigest: DigestSchema,
        evidenceDigests: boundedUniqueArray(DigestSchema),
        createdAt: TimestampSchema,
        contentDigest: DigestSchema,
      })
      .strict(),
  })
  .strict();

export const AuthorityGrantReferenceSchema = z
  .object({
    grantId: StableProtocolIdSchema,
    grantDigest: DigestSchema,
  })
  .strict();

const DecisionReversibilitySchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("reversible"),
      rollbackRef: LocatorStringSchema,
      deadline: TimestampSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("irreversible"),
      rollbackRef: z.never().optional(),
      deadline: z.never().optional(),
    })
    .strict(),
]);

export const DecisionReceiptSchema = z
  .object({
    kind: z.literal("DecisionReceipt"),
    protocolVersion: ProtocolVersionSchema,
    id: StableProtocolIdSchema,
    caseId: StableProtocolIdSchema,
    caseDigest: DigestSchema,
    decision: HumanDecisionSchema.extend({
      authorityId: ShortStringSchema,
      rationale: NonEmptyStringSchema,
      decidedAt: TimestampSchema,
    }).strict(),
    effect: TribunalEffectSchema,
    consideredVerdictIds: boundedUniqueArray(StableProtocolIdSchema, {
      min: 1,
    }),
    acceptedEvidenceClaimIds: boundedUniqueArray(StableProtocolIdSchema),
    rejectedOrDisputedEvidence: boundedUniqueArray(
      z
        .object({
          evidenceClaimId: StableProtocolIdSchema,
          reason: NonEmptyStringSchema,
        })
        .strict(),
      { key: ({ evidenceClaimId }) => evidenceClaimId },
    ),
    authorityGrantRefs: boundedUniqueArray(AuthorityGrantReferenceSchema, {
      min: 1,
      key: ({ grantId }) => grantId,
    }),
    reversibility: DecisionReversibilitySchema,
    issuedAt: TimestampSchema,
    nonce: z.string().min(8).max(TRIBUNAL_LIMITS.shortTextChars),
    previousReceiptDigest: DigestSchema.nullable(),
    contentDigest: DigestSchema,
  })
  .strict();

export const TribunalReceiptHeadSchema = z
  .object({
    receiptId: StableProtocolIdSchema,
    contentDigest: DigestSchema,
  })
  .strict();

export const TribunalCaseSchema = z
  .object({
    kind: z.literal("TribunalCase"),
    protocolVersion: ProtocolVersionSchema,
    caseId: StableProtocolIdSchema,
    purpose: NonEmptyStringSchema,
    requesterId: StableProtocolIdSchema,
    humanAuthorityId: ShortStringSchema,
    trajectoryId: StableProtocolIdSchema,
    openedAt: TimestampSchema,
    evaluatedAt: TimestampSchema,
    requestDigest: DigestSchema,
    humanApprovalRequired: z.boolean(),
    proposedEffect: TribunalEffectSchema,
    operatingScope: TribunalOperatingScopeSchema,
    subject: TribunalSubjectSchema,
    criteria: boundedUniqueArray(DesignCriterionSchema, {
      min: 1,
      key: ({ id }) => id,
    }),
    sourceRefs: boundedUniqueArray(LocatorStringSchema),
    authorityGrants: z
      .array(TribunalAuthorityGrantSchema)
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
    effectiveDecisionReceiptId: StableProtocolIdSchema.optional(),
  })
  .strict();

export type TribunalEffect = z.infer<typeof TribunalEffectSchema>;
export type TribunalActionManifest = z.infer<
  typeof TribunalActionManifestSchema
>;
export type TribunalEvidenceKind = z.infer<typeof TribunalEvidenceKindSchema>;
export type TribunalOperatingScope = z.infer<
  typeof TribunalOperatingScopeSchema
>;
export type TribunalCriterion = DesignCriterion;
export type EvaluatorDeclaration = z.infer<typeof EvaluatorDeclarationSchema>;
export type EvidenceClaim = z.infer<typeof EvidenceClaimSchema>;
export type TribunalVerdict = z.infer<typeof TribunalVerdictSchema>;
export type DecisionReceipt = z.infer<typeof DecisionReceiptSchema>;
export type TribunalReceiptHead = z.infer<typeof TribunalReceiptHeadSchema>;
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
  "AUTHORITY_TOKEN_TOO_LARGE",
  "AUTHORITY_UNION_FORBIDDEN",
  "AUTHORITY_VERIFIER_UNAVAILABLE",
  "BROWSER_EXPOSED_SECRET_FORBIDDEN",
  "CALIBRATION_EVIDENCE_DIGEST_MISMATCH",
  "CALIBRATION_EVIDENCE_OUT_OF_SCOPE",
  "CALIBRATION_EVIDENCE_UNRESOLVED",
  "CALIBRATION_HOLDOUT_CONTAMINATED",
  "CALIBRATION_HOLDOUT_DIGEST_MISMATCH",
  "CALIBRATION_HOLDOUT_OUT_OF_SCOPE",
  "CALIBRATION_HOLDOUT_UNRESOLVED",
  "CALIBRATION_STALE",
  "COMMIT_TRANSITION_INVALID",
  "CANONICAL_FINDING_BINDING_MISMATCH",
  "CANONICAL_FINDING_DIGEST_MISMATCH",
  "CANONICAL_FINDING_INACTIVE",
  "CANONICAL_FINDING_INVALID",
  "CANONICAL_FINDING_UNRESOLVED",
  "CANONICAL_REQUEST_BINDING_MISMATCH",
  "CANONICAL_REQUEST_DIGEST_MISMATCH",
  "CANONICAL_REQUEST_INVALID",
  "CANONICAL_REQUEST_UNRESOLVED",
  "CONFIDENCE_EXCEEDS_CALIBRATION",
  "CRITERION_GATE_EVALUATOR_MISMATCH",
  "DECISION_AUTHORITY_UNTRUSTED",
  "DECISION_AUTHENTICATION_FAILED",
  "DECISION_EVALUATOR_SEPARATION_REQUIRED",
  "DECISION_OWNER_MISMATCH",
  "DECISION_RECEIPT_CANNOT_BE_PRIMARY_EVIDENCE",
  "DECISION_RECEIPT_REPLAYED",
  "DECISION_RECEIPT_REQUIRED",
  "DECISION_RECEIPT_TAMPERED",
  "DECISION_VERIFIER_UNAVAILABLE",
  "DECLARATION_EFFECT_CONFLICT",
  "DECLARATION_EFFECT_EXCEEDS_GRANT",
  "DECLARATION_CORE_OUT_OF_SCOPE",
  "DECLARATION_HASH_MISMATCH",
  "DESTINATION_OUT_OF_SCOPE",
  "DISPOSITION_EFFECT_INVALID",
  "DISPUTED_VERDICTS_UNACKNOWLEDGED",
  "DUPLICATE_OBJECT_ID",
  "DUPLICATE_RECEIPT_NONCE",
  "EFFECTIVE_RECEIPT_MISMATCH",
  "EFFECTIVE_RECEIPT_REQUIRED",
  "EFFECTIVE_ROLLBACK_WINDOW_EXPIRED",
  "EFFECT_IDEMPOTENCY_CHECK_REQUIRED",
  "EFFECT_IDEMPOTENCY_STATE_MISMATCH",
  "EVALUATOR_INDEPENDENCE_COLLISION",
  "EVALUATOR_VERSION_MISMATCH",
  "EVIDENCE_AFTER_INSPECTION_BOUNDARY",
  "EVIDENCE_AUTHENTICATION_FAILED",
  "EVIDENCE_CLAIM_BINDING_MISMATCH",
  "EVIDENCE_CYCLE",
  "EVIDENCE_DIGEST_INVALID",
  "EVIDENCE_DIGEST_MISMATCH",
  "EVIDENCE_DIGEST_REQUIRED",
  "EVIDENCE_HASH_SET_MISMATCH",
  "EVIDENCE_INSPECTOR_MISMATCH",
  "EVIDENCE_REQUIRED",
  "EVIDENCE_SOURCE_UNRESOLVED",
  "EVIDENCE_STALE",
  "EVIDENCE_TOOL_UNDECLARED",
  "EVIDENCE_UNCONSUMED",
  "EVIDENCE_UNOBSERVABLE",
  "EVIDENCE_VERIFIER_UNAVAILABLE",
  "EXTERNAL_RESOLUTION_BUDGET_EXCEEDED",
  "GRANT_CASE_BINDING_MISMATCH",
  "GRANT_EVALUATOR_SCOPE_MISMATCH",
  "GRANT_SHARED_BETWEEN_EVALUATORS",
  "GRANT_SELF_ISSUED",
  "GRANT_UNOWNED",
  "INPUT_GRAPH_UNSAFE",
  "LEGACY_DIALECT_UNSUPPORTED",
  "OUT_OF_SCOPE_EVIDENCE",
  "POLICY_STATE_UNVERIFIED",
  "PROTOCOL_SCHEMA_INVALID",
  "PROXY_GRANT_FORBIDDEN",
  "PRINCIPAL_IDENTITY_UNVERIFIED",
  "PURPOSE_OUT_OF_SCOPE",
  "CRITERION_UNEVALUATED",
  "BLOCKING_CRITERION_REQUIRES_HUMAN",
  "RECEIPT_CASE_DIGEST_MISMATCH",
  "RECEIPT_CHAIN_MISMATCH",
  "RECEIPT_CONTENT_HASH_MISMATCH",
  "RECEIPT_EFFECT_MISMATCH",
  "RECEIPT_EVIDENCE_ACCOUNTING_INCOMPLETE",
  "RECEIPT_GRANT_BINDING_MISMATCH",
  "RECEIPT_HEAD_MISMATCH",
  "RECEIPT_HEAD_UNVERIFIED",
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
  "TRAJECTORY_MISMATCH",
  "UNKNOWN_AUTHORITY_GRANT_REF",
  "UNKNOWN_CRITERION_REF",
  "UNKNOWN_DECISION_RECEIPT_REF",
  "UNKNOWN_EVALUATOR_DECLARATION_REF",
  "UNKNOWN_EVIDENCE_CLAIM_REF",
  "UNKNOWN_TRIBUNAL_VERDICT_REF",
  "VERDICT_CANNOT_BE_PRIMARY_EVIDENCE",
  "VERDICT_AUTHENTICATION_FAILED",
  "VERDICT_CONTENT_HASH_MISMATCH",
  "VERDICT_GRANT_BINDING_MISMATCH",
  "VERDICT_VERIFIER_UNAVAILABLE",
  "VERIFIED_GRANT_ID_MISMATCH",
  "VALIDATION_CLOCK_INVALID",
  "AUDIENCE_OUT_OF_SCOPE",
  "ACTION_DIGEST_MISMATCH",
  "ACTION_BASELINE_EVIDENCE_REQUIRED",
  "ACTION_BUDGET_EXCEEDED",
  "ACTION_CANDIDATE_INDEPENDENCE_UNVERIFIED",
  "ACTION_CANDIDATE_REQUIREMENT_UNMET",
  "ACTION_MANIFEST_BINDING_MISMATCH",
  "ACTION_MANIFEST_AUTHENTICATION_FAILED",
  "ACTION_MANIFEST_DIGEST_MISMATCH",
  "ACTION_MANIFEST_INVALID",
  "ACTION_MANIFEST_UNRESOLVED",
  "ACTION_MANIFEST_VERIFIER_UNAVAILABLE",
  "ACTION_PROHIBITION_CHECK_MISMATCH",
  "CANDIDATE_DIGEST_MISMATCH",
  "CANDIDATE_SOURCE_UNRESOLVED",
  "PROHIBITED_CHANGE_UNCLEARED",
] as const;

export type TribunalIssueCode = (typeof TRIBUNAL_ISSUE_CODES)[number];

export type TribunalIssue = {
  code: TribunalIssueCode;
  path: string;
  refs: string[];
};

export type TribunalGrantState = "active" | "revoked" | "superseded";

export type TribunalGrantLifecycleRef = {
  issuer: string;
  grantId: string;
  grantDigest: string;
  nonce: string;
};

const TribunalGrantLifecycleSnapshotSchema = z
  .object({
    state: z.enum(["active", "revoked", "superseded"]),
    version: StableProtocolIdSchema,
  })
  .strict();

export type TribunalGrantLifecycleSnapshot = z.infer<
  typeof TribunalGrantLifecycleSnapshotSchema
>;

const TribunalPolicyStateSnapshotSchema = z
  .object({ version: StableProtocolIdSchema })
  .strict();

const TribunalGrantLifecycleRefSchema = z
  .object({
    issuer: NonEmptyStringSchema,
    grantId: StableProtocolIdSchema,
    grantDigest: DigestSchema,
    nonce: NonEmptyStringSchema,
  })
  .strict();

const MAX_COMMIT_BASE64_CHARS =
  Math.ceil(TRIBUNAL_LIMITS.serializedBytes / 3) * 4;
const Base64BytesSchema = z
  .string()
  .max(MAX_COMMIT_BASE64_CHARS)
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);

const TribunalCommitDecisionReceiptSchema = z.discriminatedUnion(
  "reversibilityKind",
  [
    z
      .object({
        contentDigest: DigestSchema,
        reversibilityKind: z.literal("reversible"),
        rollbackRef: LocatorStringSchema,
        rollbackDeadline: TimestampSchema,
      })
      .strict(),
    z
      .object({
        contentDigest: DigestSchema,
        reversibilityKind: z.literal("irreversible"),
        rollbackRef: z.null(),
        rollbackDeadline: z.null(),
      })
      .strict(),
  ],
);

const TribunalCommitTransitionSchema = z
  .object({
    caseId: StableProtocolIdSchema,
    transitionDigest: DigestSchema,
    preconditions: z
      .object({
        policyState: z
          .object({ expectedVersion: StableProtocolIdSchema })
          .strict(),
      })
      .strict(),
    stateWrites: z
      .object({
        receiptHead: z
          .object({
            expectedHead: TribunalReceiptHeadSchema.nullable(),
            nextHead: TribunalReceiptHeadSchema.nullable(),
          })
          .strict(),
        replayWrites: z
          .array(
            z
              .object({
                key: DigestSchema,
                expectedDigest: z.null(),
                nextDigest: DigestSchema,
              })
              .strict(),
          )
          .max(TRIBUNAL_LIMITS.decisionReceipts),
        receiptAppends: z
          .array(
            z
              .object({
                key: StableProtocolIdSchema,
                expectedDigest: z.null(),
                nextDigest: DigestSchema,
                receipt: DecisionReceiptSchema,
              })
              .strict(),
          )
          .max(TRIBUNAL_LIMITS.decisionReceipts),
      })
      .strict(),
    effect: z
      .object({
        actionDigest: DigestSchema,
        selectedCandidate: z
          .object({
            digest: DigestSchema,
            encoding: z.literal("base64"),
            bytes: Base64BytesSchema,
            byteLength: z
              .number()
              .int()
              .min(0)
              .max(TRIBUNAL_LIMITS.serializedBytes),
          })
          .strict(),
        proposedEffect: TribunalEffectSchema,
        purposeId: StableProtocolIdSchema,
        tenantId: StableProtocolIdSchema,
        audienceId: StableProtocolIdSchema,
        destinationId: StableProtocolIdSchema,
        validatedAt: TimestampSchema,
        validUntil: TimestampSchema,
        decisionReceipt: TribunalCommitDecisionReceiptSchema.nullable(),
        preconditions: z
          .object({
            executeBefore: TimestampSchema,
            grantLifecycles: z
              .array(
                z
                  .object({
                    grant: TribunalGrantLifecycleRefSchema,
                    signingKey: AuthorityKeyReferencePortSchema,
                    expectedState: z.literal("active"),
                    expectedVersion: StableProtocolIdSchema,
                  })
                  .strict(),
              )
              .max(TRIBUNAL_LIMITS.authorityGrants),
          })
          .strict(),
        idempotencyWrite: z
          .object({
            key: DigestSchema,
            expectedDigest: z.null(),
            nextDigest: DigestSchema,
          })
          .strict(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export type TribunalCommitTransition = z.infer<
  typeof TribunalCommitTransitionSchema
>;

export type TribunalValidationContext = {
  now: Date;
  resolveAuthorityKey: AuthorityKeyResolver | null | undefined;
  authorityTokensByGrantId: Record<string, string>;
  verifyGrant: (input: {
    token: string | null | undefined;
    resolveKey: AuthorityKeyResolver | null | undefined;
    subject: string;
    requiredScope: string;
    now?: Date;
  }) => AuthorityDecision;
  resolveGrantState?: (grant: TribunalGrantLifecycleRef) => unknown;
  /**
   * Global authorization version. It must advance for trust/key changes and
   * every canonical request or finding currentness transition.
   */
  resolvePolicyState?: () => unknown;
  resolveEvidence: (locator: string) => string | Uint8Array | undefined;
  resolveDesignReviewRequest: (requestDigest: string) => unknown;
  resolveDesignFinding: (findingDigest: string) => unknown;
  resolveTribunalActionManifest: (actionDigest: string) => unknown;
  resolveCandidate: (
    candidateDigest: string,
  ) => string | Uint8Array | undefined;
  verifyActionManifest?: (input: {
    manifest: TribunalActionManifest;
    request: DesignReviewRequest;
    evidenceClaims: EvidenceClaim[];
    candidates: Array<{ digest: string; bytes: Uint8Array }>;
    now: Date;
  }) => boolean;
  verifyEvidenceClaim?: (input: {
    claim: EvidenceClaim;
    declaration: EvaluatorDeclaration;
    now: Date;
  }) => boolean;
  verifyTribunalVerdict?: (input: {
    verdict: TribunalVerdict;
    declaration: EvaluatorDeclaration;
    finding: DesignFinding;
    evidenceClaims: EvidenceClaim[];
    now: Date;
  }) => boolean;
  resolvePrincipalId: (principal: string) => unknown;
  trustedAuthorityIssuers: string[];
  trustedHumanAuthorities: string[];
  consumedReceiptDigests?: Map<string, string>;
  appliedEffectDigests?: Map<string, string>;
  resolveReceiptHead?: (
    caseId: string,
  ) => TribunalReceiptHead | null | undefined;
  verifyDecisionReceipt?: (input: {
    receipt: DecisionReceipt;
    caseDigest: string;
    now: Date;
  }) => boolean;
};

export type VerifiedTribunalAuthorityGrant = {
  grant: AuthorityGrant;
  grantDigest: string;
  keyReference: AuthorityKeyReference;
  lifecycleVersion: string;
  verifiedAt: string;
};

export type TribunalValidationResult = {
  ok: boolean;
  issues: TribunalIssue[];
  verifiedAuthorityGrants: VerifiedTribunalAuthorityGrant[];
  evaluatorEffectWithinGrant: Record<string, boolean>;
  commitTransition: TribunalCommitTransition | null;
};

function compareUtf16(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

const TypedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const typedArrayLength = Object.getOwnPropertyDescriptor(
  TypedArrayPrototype,
  "length",
)?.get;
const typedArrayByteLength = Object.getOwnPropertyDescriptor(
  TypedArrayPrototype,
  "byteLength",
)?.get;
const typedArrayByteOffset = Object.getOwnPropertyDescriptor(
  TypedArrayPrototype,
  "byteOffset",
)?.get;
const typedArrayBuffer = Object.getOwnPropertyDescriptor(
  TypedArrayPrototype,
  "buffer",
)?.get;
const arrayBufferByteLength = Object.getOwnPropertyDescriptor(
  ArrayBuffer.prototype,
  "byteLength",
)?.get;

function copyByteView(value: unknown): Uint8Array | undefined {
  if (
    !ArrayBuffer.isView(value) ||
    !typedArrayLength ||
    !typedArrayByteLength ||
    !typedArrayByteOffset ||
    !typedArrayBuffer ||
    !arrayBufferByteLength
  ) {
    return undefined;
  }
  try {
    const length = Reflect.apply(typedArrayLength, value, []) as number;
    const byteLength = Reflect.apply(typedArrayByteLength, value, []) as number;
    const byteOffset = Reflect.apply(typedArrayByteOffset, value, []) as number;
    const buffer = Reflect.apply(typedArrayBuffer, value, []) as ArrayBuffer;
    Reflect.apply(arrayBufferByteLength, buffer, []);
    if (length !== byteLength) return undefined;
    return new Uint8Array(buffer, byteOffset, byteLength).slice();
  } catch {
    return undefined;
  }
}

function canonicalSerialize(
  value: unknown,
  seen = new WeakSet<object>(),
): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical hashing requires finite numbers.");
    }
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    throw new TypeError("Canonical hashing requires JSON values.");
  }
  if (ArrayBuffer.isView(value)) {
    throw new TypeError("Byte views are supported only as the root value.");
  }
  if (seen.has(value)) {
    throw new TypeError("Canonical hashing rejects shared or cyclic objects.");
  }
  seen.add(value);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError("Canonical hashing rejects symbol properties.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some(({ get, set }) => get || set)) {
    throw new TypeError("Canonical hashing rejects accessor properties.");
  }
  if (Array.isArray(value)) {
    const keys = Object.keys(descriptors).filter((key) => key !== "length");
    if (
      keys.length !== value.length ||
      keys.some((key, index) => key !== String(index))
    ) {
      throw new TypeError("Canonical hashing requires dense arrays.");
    }
    return `[${keys
      .map((key) => canonicalSerialize(descriptors[key].value, seen))
      .join(",")}]`;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Canonical hashing requires plain objects.");
  }
  return `{${Object.keys(descriptors)
    .sort(compareUtf16)
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalSerialize(descriptors[key].value, seen)}`,
    )
    .join(",")}}`;
}

export function digestCanonical(
  value: unknown,
  domain = "quirk.generic.v1",
): string {
  const byteView = copyByteView(value);
  const encoding = byteView
    ? "bytes"
    : typeof value === "string"
      ? "utf8"
      : "json";
  const encoded = byteView
    ? byteView
    : typeof value === "string"
      ? value
      : canonicalSerialize(value);
  if (encoded === undefined) {
    throw new TypeError(
      "Canonical hashing requires a JSON-serializable value.",
    );
  }
  const hash = createHash("sha256");
  hash.update(`quirk-canonical-v1\0${domain}\0${encoding}\0`);
  hash.update(encoded);
  return `sha256:${hash.digest("hex")}`;
}

export function digestEvidenceBytes(value: string | Uint8Array): string {
  const byteView = typeof value === "string" ? undefined : copyByteView(value);
  if (typeof value !== "string" && !byteView) {
    throw new TypeError("Evidence content must be a string or byte view.");
  }
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : byteView!;
  return digestCanonical(bytes, "quirk.tribunal.evidence-bytes.v1");
}

export function digestCandidateBytes(value: string | Uint8Array): string {
  const byteView = typeof value === "string" ? undefined : copyByteView(value);
  if (typeof value !== "string" && !byteView) {
    throw new TypeError("Candidate content must be a string or byte view.");
  }
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : byteView!;
  return digestCanonical(bytes, "quirk.tribunal.candidate-bytes.v1");
}

function inspectResolvedEvidence(
  value: unknown,
): { digest: string; byteLength: number; bytes: Uint8Array } | undefined {
  try {
    if (
      typeof value === "string" &&
      value.length > TRIBUNAL_LIMITS.rawStringBytes
    ) {
      return undefined;
    }
    const bytes =
      typeof value === "string"
        ? new TextEncoder().encode(value)
        : copyByteView(value);
    if (!bytes || bytes.byteLength > TRIBUNAL_LIMITS.rawStringBytes) {
      return undefined;
    }
    return {
      digest: digestCanonical(bytes, "quirk.tribunal.evidence-bytes.v1"),
      byteLength: bytes.byteLength,
      bytes,
    };
  } catch {
    return undefined;
  }
}

function inspectResolvedCandidate(
  value: unknown,
): { digest: string; byteLength: number; bytes: Uint8Array } | undefined {
  try {
    if (
      typeof value === "string" &&
      value.length > TRIBUNAL_LIMITS.serializedBytes
    ) {
      return undefined;
    }
    const bytes =
      typeof value === "string"
        ? new TextEncoder().encode(value)
        : copyByteView(value);
    if (!bytes || bytes.byteLength > TRIBUNAL_LIMITS.serializedBytes) {
      return undefined;
    }
    return {
      digest: digestCanonical(bytes, "quirk.tribunal.candidate-bytes.v1"),
      byteLength: bytes.byteLength,
      bytes,
    };
  } catch {
    return undefined;
  }
}

export function computeAuthorityGrantDigest(grant: AuthorityGrant): string {
  return digestCanonical(grant, "quirk.tribunal.authority-grant.v1");
}

export function computeDeclarationDigest(
  declaration: EvaluatorDeclaration,
): string {
  const { declarationDigest, ...provenance } = declaration.provenance;
  void declarationDigest;
  return digestCanonical(
    {
      ...declaration,
      provenance,
    },
    "quirk.tribunal.evaluator-declaration.v1",
  );
}

export function computeDeclarationCoreDigest(
  declaration: EvaluatorDeclaration,
): string {
  const { grantDigest, ...authority } = declaration.authority;
  const { declarationDigest, ...provenance } = declaration.provenance;
  void grantDigest;
  void declarationDigest;
  return digestCanonical(
    { ...declaration, authority, provenance },
    "quirk.tribunal.evaluator-declaration-core.v1",
  );
}

export function computeEvidenceClaimContentDigest(
  claim: EvidenceClaim,
): string {
  const { contentDigest, ...content } = claim;
  void contentDigest;
  return digestCanonical(content, "quirk.tribunal.evidence-claim.v1");
}

export function computeVerdictContentDigest(verdict: TribunalVerdict): string {
  const { contentDigest, ...provenance } = verdict.provenance;
  void contentDigest;
  return digestCanonical(
    { ...verdict, provenance },
    "quirk.tribunal.verdict.v1",
  );
}

export function computeTribunalCaseDigest(tribunalCase: TribunalCase): string {
  const { decisionReceipts, effectiveDecisionReceiptId, ...caseBasis } =
    tribunalCase;
  void decisionReceipts;
  void effectiveDecisionReceiptId;
  return digestCanonical(caseBasis, "quirk.tribunal.case-basis.v1");
}

export function computeDecisionReceiptContentDigest(
  receipt: DecisionReceipt,
): string {
  const { contentDigest, ...content } = receipt;
  void contentDigest;
  return digestCanonical(content, "quirk.tribunal.decision-receipt.v1");
}

export function computeTribunalActionDigest(
  manifest: TribunalActionManifest,
): string {
  if (!isTribunalInputGraphSafe(manifest)) {
    throw new TypeError("Unsafe TribunalActionManifest input graph.");
  }
  return digestCanonical(
    TribunalActionManifestSchema.parse(manifest),
    "quirk.tribunal.action-manifest.v1",
  );
}

export function computeTribunalCommitTransitionDigest(
  transition: Omit<TribunalCommitTransition, "transitionDigest">,
): string {
  return digestCanonical(transition, "quirk.tribunal.commit-transition.v1");
}

export function verifyTribunalCommitPreconditions(
  transition: unknown,
  expectedTransitionDigest: string,
  context: {
    now: Date;
    resolvePolicyState: () => unknown;
    resolveGrantState: (grant: TribunalGrantLifecycleRef) => unknown;
  },
): boolean {
  try {
    if (
      !DigestSchema.safeParse(expectedTransitionDigest).success ||
      findLegacyDialect(transition, {
        stringBytes: MAX_COMMIT_BASE64_CHARS,
        cumulativeStringBytes:
          MAX_COMMIT_BASE64_CHARS + TRIBUNAL_LIMITS.serializedBytes,
      }) !== null
    ) {
      return false;
    }
    const parsedTransition =
      TribunalCommitTransitionSchema.safeParse(transition);
    if (!parsedTransition.success) return false;
    const { transitionDigest, ...transitionBasis } = parsedTransition.data;
    if (
      transitionDigest !== expectedTransitionDigest ||
      computeTribunalCommitTransitionDigest(transitionBasis) !==
        expectedTransitionDigest
    ) {
      return false;
    }
    const nowMs = Date.prototype.getTime.call(context.now);
    if (!Number.isFinite(nowMs)) return false;
    const policyState = TribunalPolicyStateSnapshotSchema.safeParse(
      context.resolvePolicyState(),
    );
    if (
      !policyState.success ||
      policyState.data.version !==
        transitionBasis.preconditions.policyState.expectedVersion
    ) {
      return false;
    }
    const replayKeys = new Set<string>();
    for (const write of transitionBasis.stateWrites.replayWrites) {
      if (replayKeys.has(write.key)) return false;
      replayKeys.add(write.key);
    }
    const appendKeys = new Set<string>();
    let expectedPreviousDigest =
      transitionBasis.stateWrites.receiptHead.expectedHead?.contentDigest ??
      null;
    for (const append of transitionBasis.stateWrites.receiptAppends) {
      const receipt = append.receipt;
      if (
        appendKeys.has(append.key) ||
        append.key !== receipt.id ||
        append.nextDigest !== receipt.contentDigest ||
        receipt.caseId !== transitionBasis.caseId ||
        receipt.previousReceiptDigest !== expectedPreviousDigest ||
        computeDecisionReceiptContentDigest(receipt) !== receipt.contentDigest
      ) {
        return false;
      }
      appendKeys.add(append.key);
      expectedPreviousDigest = receipt.contentDigest;
    }
    const { expectedHead, nextHead } = transitionBasis.stateWrites.receiptHead;
    const headsEqual =
      expectedHead?.receiptId === nextHead?.receiptId &&
      expectedHead?.contentDigest === nextHead?.contentDigest;
    const lastAppend = transitionBasis.stateWrites.receiptAppends.at(-1);
    if (
      (lastAppend &&
        (nextHead?.receiptId !== lastAppend.receipt.id ||
          nextHead.contentDigest !== lastAppend.receipt.contentDigest)) ||
      (!lastAppend && !headsEqual)
    ) {
      return false;
    }
    if (!transitionBasis.effect) return true;
    const effect = transitionBasis.effect;
    const executeBefore = Date.parse(effect.preconditions.executeBefore);
    if (
      !Number.isFinite(executeBefore) ||
      nowMs < Date.parse(effect.validatedAt) ||
      nowMs >= executeBefore ||
      effect.validUntil !== effect.preconditions.executeBefore
    ) {
      return false;
    }
    const decodedCandidate = Buffer.from(
      effect.selectedCandidate.bytes,
      "base64",
    );
    if (
      decodedCandidate.toString("base64") !== effect.selectedCandidate.bytes ||
      decodedCandidate.byteLength !== effect.selectedCandidate.byteLength
    ) {
      return false;
    }
    const candidate = inspectResolvedCandidate(decodedCandidate);
    if (!candidate || candidate.digest !== effect.selectedCandidate.digest) {
      return false;
    }
    const expectedIdempotencyKey = digestCanonical(
      {
        caseId: transitionBasis.caseId,
        actionDigest: effect.actionDigest,
        selectedCandidateDigest: effect.selectedCandidate.digest,
      },
      "quirk.tribunal.activation-idempotency-key.v1",
    );
    const expectedIdempotencyDigest = digestCanonical(
      {
        caseId: transitionBasis.caseId,
        actionDigest: effect.actionDigest,
        selectedCandidateDigest: effect.selectedCandidate.digest,
      },
      "quirk.tribunal.activation-state.v1",
    );
    if (
      effect.idempotencyWrite.key !== expectedIdempotencyKey ||
      effect.idempotencyWrite.nextDigest !== expectedIdempotencyDigest ||
      (effect.decisionReceipt !== null &&
        !transitionBasis.stateWrites.replayWrites.some(
          ({ nextDigest }) =>
            nextDigest === effect.decisionReceipt?.contentDigest,
        )) ||
      (effect.decisionReceipt?.reversibilityKind === "reversible" &&
        (!effect.decisionReceipt.rollbackRef ||
          !effect.decisionReceipt.rollbackDeadline))
    ) {
      return false;
    }
    const lifecycleDigests = new Set<string>();
    for (const precondition of effect.preconditions.grantLifecycles) {
      if (
        lifecycleDigests.has(precondition.grant.grantDigest) ||
        precondition.signingKey.issuer !== precondition.grant.issuer
      ) {
        return false;
      }
      lifecycleDigests.add(precondition.grant.grantDigest);
      const lifecycle = TribunalGrantLifecycleSnapshotSchema.safeParse(
        context.resolveGrantState(precondition.grant),
      );
      if (
        !lifecycle.success ||
        lifecycle.data.state !== precondition.expectedState ||
        lifecycle.data.version !== precondition.expectedVersion
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function computeCanonicalDesignReviewRequestDigest(
  request: DesignReviewRequest,
): string {
  return digestCanonical(
    request,
    "quirk.design-tribunal.design-review-request.v1",
  );
}

function computeCanonicalDesignFindingDigest(finding: DesignFinding): string {
  return digestCanonical(finding, "quirk.design-tribunal.design-finding.v1");
}

export function computeDecisionReceiptReplayKey(
  receipt: DecisionReceipt,
): string {
  return digestCanonical(
    {
      authorityId: receipt.decision.authorityId,
      caseId: receipt.caseId,
      nonce: receipt.nonce,
    },
    "quirk.tribunal.receipt-replay-key.v1",
  );
}

export const tribunalCaseSubject = (caseId: string): string =>
  `tribunal-case:${caseId}`;
export const tribunalEvaluatorScope = (value: string): string =>
  `quirk.tribunal.evaluator:${value}`;
export const tribunalDeclarationScope = (value: string): string =>
  `quirk.tribunal.declaration:${value}`;
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

function findLegacyDialect(
  value: unknown,
  limits: {
    stringBytes: number;
    cumulativeStringBytes: number;
  } = {
    stringBytes: TRIBUNAL_LIMITS.rawStringBytes,
    cumulativeStringBytes: TRIBUNAL_LIMITS.serializedBytes,
  },
): "ambiguous" | "legacy" | "unsafe" | null {
  let legacy = false;
  let ambiguous = false;
  let visitedValues = 0;
  let cumulativeStringBytes = 0;
  const seen = new WeakSet<object>();
  const stack: Array<{ current: unknown; depth: number }> = [
    { current: value, depth: 0 },
  ];
  while (stack.length > 0) {
    const { current, depth } = stack.pop()!;
    visitedValues += 1;
    if (
      depth > TRIBUNAL_LIMITS.rawDepth ||
      visitedValues > TRIBUNAL_LIMITS.rawValues
    ) {
      return "unsafe";
    }
    if (
      current === undefined ||
      typeof current === "bigint" ||
      typeof current === "function" ||
      typeof current === "symbol" ||
      (typeof current === "number" && !Number.isFinite(current))
    ) {
      return "unsafe";
    }
    if (typeof current === "string") {
      if (current.length > limits.stringBytes) return "unsafe";
      const byteLength = new TextEncoder().encode(current).byteLength;
      cumulativeStringBytes += byteLength;
      if (
        byteLength > limits.stringBytes ||
        cumulativeStringBytes > limits.cumulativeStringBytes
      ) {
        return "unsafe";
      }
      continue;
    }
    if (!current || typeof current !== "object") continue;
    if (nodeTypes.isProxy(current)) return "unsafe";
    if (seen.has(current)) return "unsafe";
    seen.add(current);
    let isArray: boolean;
    try {
      isArray = Array.isArray(current);
    } catch {
      return "unsafe";
    }
    if (isArray) {
      let length: number;
      let descriptors: Record<string, PropertyDescriptor>;
      let symbols: symbol[];
      try {
        length = (current as unknown[]).length;
        descriptors = Object.getOwnPropertyDescriptors(current);
        symbols = Object.getOwnPropertySymbols(current);
      } catch {
        return "unsafe";
      }
      if (
        length > TRIBUNAL_LIMITS.rawArrayItems ||
        symbols.length > 0 ||
        Object.entries(descriptors).some(
          ([key, descriptor]) =>
            descriptor.get ||
            descriptor.set ||
            (key !== "length" && !descriptor.enumerable),
        )
      ) {
        return "unsafe";
      }
      const indexKeys = Object.keys(descriptors).filter(
        (key) => key !== "length",
      );
      if (
        indexKeys.length !== length ||
        indexKeys.some((key, index) => key !== String(index))
      ) {
        return "unsafe";
      }
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (key === "length") continue;
        if (!/^(?:0|[1-9][0-9]*)$/.test(key)) return "unsafe";
        stack.push({ current: descriptor.value, depth: depth + 1 });
      }
      continue;
    }
    let prototype: object | null;
    let descriptors: Record<string, PropertyDescriptor>;
    let symbols: symbol[];
    try {
      prototype = Object.getPrototypeOf(current);
      descriptors = Object.getOwnPropertyDescriptors(current);
      symbols = Object.getOwnPropertySymbols(current);
    } catch {
      return "unsafe";
    }
    if (
      (prototype !== Object.prototype && prototype !== null) ||
      symbols.length > 0 ||
      Object.keys(descriptors).length > TRIBUNAL_LIMITS.rawObjectKeys ||
      Object.values(descriptors).some(
        (descriptor) =>
          descriptor.get || descriptor.set || !descriptor.enumerable,
      )
    ) {
      return "unsafe";
    }
    for (const key of Object.keys(descriptors)) {
      if (key.length > limits.stringBytes) return "unsafe";
      const keyBytes = new TextEncoder().encode(key).byteLength;
      cumulativeStringBytes += keyBytes;
      if (
        keyBytes > limits.stringBytes ||
        cumulativeStringBytes > limits.cumulativeStringBytes
      ) {
        return "unsafe";
      }
    }
    for (const [oldKey, canonicalKey] of LEGACY_ALIASES) {
      if (Object.prototype.hasOwnProperty.call(descriptors, oldKey)) {
        legacy = true;
        if (Object.prototype.hasOwnProperty.call(descriptors, canonicalKey)) {
          ambiguous = true;
        }
      }
    }
    for (const descriptor of Object.values(descriptors)) {
      stack.push({ current: descriptor.value, depth: depth + 1 });
    }
  }
  if (ambiguous) return "ambiguous";
  if (legacy) return "legacy";
  return null;
}

export function isTribunalInputGraphSafe(value: unknown): boolean {
  return findLegacyDialect(value) !== "unsafe";
}

function hasExactMembers(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  if (actual.length !== expected.length) return false;
  const counts = new Map<string, number>();
  for (const value of actual) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const value of expected) {
    const count = counts.get(value);
    if (!count) return false;
    if (count === 1) counts.delete(value);
    else counts.set(value, count - 1);
  }
  return counts.size === 0;
}

function issueCollector() {
  const issues = new Map<string, TribunalIssue>();
  const safeRef = (ref: string): string => {
    if (
      /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(ref) &&
      !containsBrowserExposedSecret(ref) &&
      !containsSecretMaterial(ref)
    ) {
      return ref;
    }
    return digestCanonical(ref, "quirk.tribunal.issue-ref.v1");
  };
  const safePath = (path: string): string =>
    path.length <= 256 && /^[A-Za-z0-9_$.[\]-]+$/.test(path)
      ? path
      : "$[redacted]";
  const add = (
    code: TribunalIssueCode,
    path = "$",
    refs: string[] = [],
  ): void => {
    const normalizedRefs = refs.map(safeRef).sort(compareUtf16);
    const normalizedPath = safePath(path);
    const key = `${code}|${normalizedPath}|${normalizedRefs.join(",")}`;
    issues.set(key, { code, path: normalizedPath, refs: normalizedRefs });
  };
  const values = (): TribunalIssue[] =>
    [...issues.values()].sort((left, right) => {
      const code = compareUtf16(left.code, right.code);
      if (code !== 0) return code;
      const path = compareUtf16(left.path, right.path);
      if (path !== 0) return path;
      for (
        let index = 0;
        index < Math.min(left.refs.length, right.refs.length);
        index += 1
      ) {
        const ref = compareUtf16(left.refs[index], right.refs[index]);
        if (ref !== 0) return ref;
      }
      return left.refs.length - right.refs.length;
    });
  return { add, values };
}

function authorityFailureCode(
  decision: Exclude<AuthorityDecision, { authorized: true }>,
): TribunalIssueCode {
  switch (decision.reason) {
    case "missing_grant":
      return "AUTHORITY_TOKEN_MISSING";
    case "missing_verifier":
    case "invalid_verifier":
      return "AUTHORITY_VERIFIER_UNAVAILABLE";
    case "malformed_grant":
      return "AUTHORITY_GRANT_MALFORMED";
    case "invalid_signature":
    case "unknown_signing_key":
    case "issuer_mismatch":
      return "AUTHORITY_GRANT_INVALID_SIGNATURE";
    case "expired_grant":
      return "AUTHORITY_GRANT_EXPIRED";
    case "not_yet_valid_grant":
      return "AUTHORITY_GRANT_NOT_YET_VALID";
    case "invalid_grant_window":
      return "AUTHORITY_GRANT_WINDOW_INVALID";
    case "invalid_verification_time":
      return "VALIDATION_CLOCK_INVALID";
    case "subject_mismatch":
      return "GRANT_CASE_BINDING_MISMATCH";
    case "scope_mismatch":
      return "AUTHORITY_BASE_SCOPE_MISSING";
  }
}

function detectProtocolCycle(tribunalCase: TribunalCase): boolean {
  const graph = new Map<string, string[]>();
  const edge = (from: string, to: string): void => {
    const edges = graph.get(from);
    if (edges) edges.push(to);
    else graph.set(from, [to]);
    if (!graph.has(to)) graph.set(to, []);
  };

  for (const claim of tribunalCase.evidenceClaims) {
    const node = `e:${claim.id}`;
    if (!graph.has(node)) graph.set(node, []);
    claim.derivedFromEvidenceClaims.forEach(({ evidenceClaimId }) =>
      edge(node, `e:${evidenceClaimId}`),
    );
    if (claim.source.kind === "evidence_claim")
      edge(node, `e:${claim.source.locator}`);
    if (claim.source.kind === "tribunal_verdict")
      edge(node, `v:${claim.source.locator}`);
    if (claim.source.kind === "decision_receipt")
      edge(node, `r:${claim.source.locator}`);
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

  const state = new Map<string, "visiting" | "visited">();
  for (const start of graph.keys()) {
    if (state.has(start)) continue;
    const stack: Array<{ node: string; edgeIndex: number }> = [
      { node: start, edgeIndex: 0 },
    ];
    state.set(start, "visiting");
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const edges = graph.get(frame.node) ?? [];
      if (frame.edgeIndex >= edges.length) {
        state.set(frame.node, "visited");
        stack.pop();
        continue;
      }
      const next = edges[frame.edgeIndex];
      frame.edgeIndex += 1;
      const nextState = state.get(next);
      if (nextState === "visiting") return true;
      if (nextState === "visited") continue;
      state.set(next, "visiting");
      stack.push({ node: next, edgeIndex: 0 });
    }
  }
  return false;
}

function collectEvidenceClosure(
  rootIds: readonly string[],
  evidence: ReadonlyMap<string, EvidenceClaim>,
): Set<string> {
  const closure = new Set<string>();
  const stack = [...rootIds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (closure.has(id)) continue;
    closure.add(id);
    const claim = evidence.get(id);
    if (!claim) continue;
    stack.push(
      ...claim.derivedFromEvidenceClaims.map(
        ({ evidenceClaimId }) => evidenceClaimId,
      ),
    );
    if (claim.source.kind === "evidence_claim") {
      stack.push(claim.source.locator);
    }
  }
  return closure;
}

function authorityBearing(effect: TribunalEffect): boolean {
  return ["approve", "publish", "mutate_canon", "promote_verdict"].includes(
    effect,
  );
}

function sourceLocatorPermitted(
  declaration: EvaluatorDeclaration,
  locator: string,
): boolean {
  const allowed =
    declaration.inspection.allowedSourceLocators.includes(locator);
  const denied = declaration.inspection.deniedSourceLocators.includes(locator);
  return allowed && !denied;
}

function containsBrowserExposedSecret(value: string): boolean {
  return /NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN)/.test(value);
}

function containsSecretMaterial(value: string): boolean {
  return /sk-(?:proj-)?[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|secret|password|token)\s*[:=]|(?:eyJ[A-Za-z0-9_-]{16,})\.[A-Za-z0-9_-]{40,}/i.test(
    value,
  );
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
      evaluatorEffectWithinGrant: {},
      commitTransition: null,
    };
  };

  const legacy = findLegacyDialect(raw);
  if (legacy === "unsafe") {
    add("INPUT_GRAPH_UNSAFE");
    return emptyResult();
  }
  if (legacy === "ambiguous") {
    add("AMBIGUOUS_ALIAS");
    return emptyResult();
  }

  let nowMs = Number.NaN;
  try {
    nowMs = Date.prototype.getTime.call(context?.now);
  } catch {
    nowMs = Number.NaN;
  }
  if (!Number.isFinite(nowMs)) {
    add("VALIDATION_CLOCK_INVALID");
    return emptyResult();
  }
  if (legacy === "legacy") {
    add("LEGACY_DIALECT_UNSUPPORTED");
    return emptyResult();
  }

  let parsed: ReturnType<typeof TribunalCaseSchema.safeParse>;
  try {
    parsed = TribunalCaseSchema.safeParse(raw);
  } catch {
    add("INPUT_GRAPH_UNSAFE");
    return emptyResult();
  }
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      add("PROTOCOL_SCHEMA_INVALID", issue.path.join(".") || "$", [issue.code]);
    }
    return emptyResult();
  }
  const tribunalCase = parsed.data;

  let serialized: string;
  try {
    serialized = JSON.stringify(tribunalCase);
  } catch {
    add("INPUT_GRAPH_UNSAFE");
    return emptyResult();
  }
  if (
    new TextEncoder().encode(serialized).byteLength >
    TRIBUNAL_LIMITS.serializedBytes
  ) {
    add("INPUT_GRAPH_UNSAFE");
    return emptyResult();
  }
  if (containsBrowserExposedSecret(serialized)) {
    add("BROWSER_EXPOSED_SECRET_FORBIDDEN");
  }
  if (containsSecretMaterial(serialized)) {
    add("SECRET_MATERIAL_FORBIDDEN");
  }
  if (values().length > 0) return emptyResult();

  const objectIds = [
    ...tribunalCase.authorityGrants.map((grant) => ({
      id: grant.grantId,
      path: "authorityGrants",
    })),
    ...tribunalCase.evaluatorDeclarations.map((item) => ({
      id: item.id,
      path: "evaluatorDeclarations",
    })),
    ...tribunalCase.evidenceClaims.map((item) => ({
      id: item.id,
      path: "evidenceClaims",
    })),
    ...tribunalCase.verdicts.map((item) => ({ id: item.id, path: "verdicts" })),
    ...tribunalCase.decisionReceipts.map((item) => ({
      id: item.id,
      path: "decisionReceipts",
    })),
  ];
  const seenIds = new Set<string>();
  for (const object of objectIds) {
    if (seenIds.has(object.id))
      add("DUPLICATE_OBJECT_ID", object.path, [object.id]);
    seenIds.add(object.id);
  }
  if (values().some((issue) => issue.code === "DUPLICATE_OBJECT_ID"))
    return emptyResult();

  const receiptNonces = new Set<string>();
  for (const receipt of tribunalCase.decisionReceipts) {
    if (receiptNonces.has(receipt.nonce)) {
      add("DUPLICATE_RECEIPT_NONCE", "decisionReceipts", [receipt.nonce]);
    }
    receiptNonces.add(receipt.nonce);
  }

  const grants = new Map(
    tribunalCase.authorityGrants.map((grant) => [grant.grantId, grant]),
  );
  const declarations = new Map(
    tribunalCase.evaluatorDeclarations.map((declaration) => [
      declaration.id,
      declaration,
    ]),
  );
  const evidence = new Map(
    tribunalCase.evidenceClaims.map((claim) => [claim.id, claim]),
  );
  const verdicts = new Map(
    tribunalCase.verdicts.map((verdict) => [verdict.id, verdict]),
  );
  const receipts = new Map(
    tribunalCase.decisionReceipts.map((receipt) => [receipt.id, receipt]),
  );
  const criteria = new Map(
    tribunalCase.criteria.map((criterion) => [criterion.id, criterion]),
  );
  let policyStateVersion: string | undefined;
  try {
    const rawPolicyState = context.resolvePolicyState?.();
    if (isTribunalInputGraphSafe(rawPolicyState)) {
      const parsedPolicyState =
        TribunalPolicyStateSnapshotSchema.safeParse(rawPolicyState);
      if (parsedPolicyState.success) {
        policyStateVersion = parsedPolicyState.data.version;
      }
    }
  } catch {
    policyStateVersion = undefined;
  }
  if (!policyStateVersion) {
    add("POLICY_STATE_UNVERIFIED", "$", [tribunalCase.caseId]);
  }
  let verifyEvidenceClaim:
    TribunalValidationContext["verifyEvidenceClaim"] | undefined;
  let verifyTribunalVerdict:
    TribunalValidationContext["verifyTribunalVerdict"] | undefined;
  try {
    verifyEvidenceClaim =
      typeof context.verifyEvidenceClaim === "function"
        ? context.verifyEvidenceClaim
        : undefined;
  } catch {
    verifyEvidenceClaim = undefined;
  }
  try {
    verifyTribunalVerdict =
      typeof context.verifyTribunalVerdict === "function"
        ? context.verifyTribunalVerdict
        : undefined;
  } catch {
    verifyTribunalVerdict = undefined;
  }

  let externalResolutionBytes = 0;
  let externalResolutionValues = 0;
  let externalResolutionBudgetExhausted = false;
  const chargeExternalResolution = (byteLength: number): boolean => {
    if (externalResolutionBudgetExhausted) return false;
    if (
      externalResolutionValues + 1 > TRIBUNAL_LIMITS.externalResolutionValues ||
      externalResolutionBytes + byteLength >
        TRIBUNAL_LIMITS.externalResolutionBytes
    ) {
      externalResolutionBudgetExhausted = true;
      add("EXTERNAL_RESOLUTION_BUDGET_EXCEEDED", "$", [tribunalCase.caseId]);
      return false;
    }
    externalResolutionValues += 1;
    externalResolutionBytes += byteLength;
    return true;
  };
  const chargeCanonicalResolution = (value: unknown): boolean => {
    try {
      const serializedValue = JSON.stringify(value);
      if (containsBrowserExposedSecret(serializedValue)) {
        add("BROWSER_EXPOSED_SECRET_FORBIDDEN");
      }
      if (containsSecretMaterial(serializedValue)) {
        add("SECRET_MATERIAL_FORBIDDEN");
      }
      if (serializedValue.length > TRIBUNAL_LIMITS.externalResolutionBytes) {
        return chargeExternalResolution(
          TRIBUNAL_LIMITS.externalResolutionBytes + 1,
        );
      }
      return chargeExternalResolution(
        new TextEncoder().encode(serializedValue).byteLength,
      );
    } catch {
      return false;
    }
  };
  const evidenceResolutionByLocator = new Map<
    string,
    { evidenceDigest: string; candidateDigest: string } | undefined
  >();
  const resolveEvidence = (
    locator: string,
  ): { evidenceDigest: string; candidateDigest: string } | undefined => {
    if (evidenceResolutionByLocator.has(locator)) {
      return evidenceResolutionByLocator.get(locator);
    }
    if (externalResolutionBudgetExhausted) {
      evidenceResolutionByLocator.set(locator, undefined);
      return undefined;
    }
    let resolved: unknown;
    try {
      resolved = context.resolveEvidence(locator);
    } catch {
      resolved = undefined;
    }
    const inspected = inspectResolvedEvidence(resolved);
    if (inspected) {
      try {
        const resolvedText = new TextDecoder().decode(inspected.bytes);
        if (containsBrowserExposedSecret(resolvedText)) {
          add("BROWSER_EXPOSED_SECRET_FORBIDDEN");
        }
        if (containsSecretMaterial(resolvedText)) {
          add("SECRET_MATERIAL_FORBIDDEN");
        }
      } catch {
        // Binary evidence remains hashable even when it is not valid text.
      }
    }
    const resolution =
      inspected && chargeExternalResolution(inspected.byteLength)
        ? {
            evidenceDigest: inspected.digest,
            candidateDigest: digestCanonical(
              inspected.bytes,
              "quirk.tribunal.candidate-bytes.v1",
            ),
          }
        : undefined;
    evidenceResolutionByLocator.set(locator, resolution);
    return resolution;
  };
  const resolveEvidenceDigest = (locator: string): string | undefined =>
    resolveEvidence(locator)?.evidenceDigest;
  const resolveEvidenceCandidateDigest = (
    locator: string,
  ): string | undefined => resolveEvidence(locator)?.candidateDigest;

  let canonicalRequest: DesignReviewRequest | undefined;
  let rawRequest: unknown;
  try {
    rawRequest = context.resolveDesignReviewRequest(tribunalCase.requestDigest);
  } catch {
    rawRequest = undefined;
  }
  if (rawRequest === undefined) {
    add("CANONICAL_REQUEST_UNRESOLVED", "requestDigest", [
      tribunalCase.requestDigest,
    ]);
  } else if (!isTribunalInputGraphSafe(rawRequest)) {
    add("CANONICAL_REQUEST_INVALID", "requestDigest", [
      tribunalCase.requestDigest,
    ]);
  } else if (!chargeCanonicalResolution(rawRequest)) {
    // The shared resolution budget emits the fail-closed issue.
  } else {
    const parsedRequest = DesignReviewRequestSchema.safeParse(rawRequest);
    if (!parsedRequest.success) {
      add("CANONICAL_REQUEST_INVALID", "requestDigest", [
        tribunalCase.requestDigest,
      ]);
    } else {
      canonicalRequest = parsedRequest.data;
      if (
        computeCanonicalDesignReviewRequestDigest(canonicalRequest) !==
        tribunalCase.requestDigest
      ) {
        add("CANONICAL_REQUEST_DIGEST_MISMATCH", "requestDigest", [
          tribunalCase.requestDigest,
        ]);
      }
      const expectedPurpose = `${canonicalRequest.brief} Desired outcome: ${canonicalRequest.desiredOutcome}`;
      const requestBindingsMatch =
        tribunalCase.caseId === canonicalRequest.id &&
        tribunalCase.purpose === expectedPurpose &&
        tribunalCase.humanApprovalRequired ===
          canonicalRequest.humanApprovalRequired &&
        (!canonicalRequest.humanAuthorityId ||
          tribunalCase.humanAuthorityId ===
            canonicalRequest.humanAuthorityId) &&
        tribunalCase.subject.id ===
          (canonicalRequest.artifactId ?? canonicalRequest.id) &&
        tribunalCase.subject.targetClass === canonicalRequest.artifactKind &&
        tribunalCase.subject.locator === canonicalRequest.artifactLocator &&
        digestCanonical(
          tribunalCase.criteria,
          "quirk.tribunal.request-criteria-binding.v1",
        ) ===
          digestCanonical(
            canonicalRequest.criteria,
            "quirk.tribunal.request-criteria-binding.v1",
          ) &&
        hasExactMembers(tribunalCase.sourceRefs, canonicalRequest.sourceRefs);
      if (!requestBindingsMatch) {
        add("CANONICAL_REQUEST_BINDING_MISMATCH", "requestDigest", [
          tribunalCase.requestDigest,
        ]);
      }
    }
  }

  const evidenceConsumedByAction = new Set<string>();
  const evidenceClosureByVerdictId = new Map<string, Set<string>>();
  let selectedCandidateBytes: Uint8Array | undefined;
  const candidateResolutionByDigest = new Map<
    string,
    { digest: string; byteLength: number; bytes: Uint8Array } | undefined
  >();
  const resolveCandidate = (
    candidateDigest: string,
  ): { digest: string; byteLength: number; bytes: Uint8Array } | undefined => {
    if (candidateResolutionByDigest.has(candidateDigest)) {
      return candidateResolutionByDigest.get(candidateDigest);
    }
    if (externalResolutionBudgetExhausted) {
      candidateResolutionByDigest.set(candidateDigest, undefined);
      return undefined;
    }
    let resolved: unknown;
    try {
      resolved = context.resolveCandidate(candidateDigest);
    } catch {
      resolved = undefined;
    }
    const inspected = inspectResolvedCandidate(resolved);
    if (inspected) {
      try {
        const resolvedText = new TextDecoder().decode(inspected.bytes);
        if (containsBrowserExposedSecret(resolvedText)) {
          add("BROWSER_EXPOSED_SECRET_FORBIDDEN");
        }
        if (containsSecretMaterial(resolvedText)) {
          add("SECRET_MATERIAL_FORBIDDEN");
        }
      } catch {
        // Binary candidates remain hashable even when they are not valid text.
      }
    }
    const charged =
      inspected && chargeExternalResolution(inspected.byteLength)
        ? inspected
        : undefined;
    candidateResolutionByDigest.set(candidateDigest, charged);
    return charged;
  };

  let actionManifest: TribunalActionManifest | undefined;
  let rawActionManifest: unknown;
  try {
    rawActionManifest = context.resolveTribunalActionManifest(
      tribunalCase.operatingScope.actionDigest,
    );
  } catch {
    rawActionManifest = undefined;
  }
  if (rawActionManifest === undefined) {
    add("ACTION_MANIFEST_UNRESOLVED", "operatingScope.actionDigest", [
      tribunalCase.operatingScope.actionDigest,
    ]);
  } else if (!isTribunalInputGraphSafe(rawActionManifest)) {
    add("ACTION_MANIFEST_INVALID", "operatingScope.actionDigest", [
      tribunalCase.caseId,
    ]);
  } else if (!chargeCanonicalResolution(rawActionManifest)) {
    // The shared resolution budget emits the fail-closed issue.
  } else {
    const parsedManifest =
      TribunalActionManifestSchema.safeParse(rawActionManifest);
    if (!parsedManifest.success) {
      add("ACTION_MANIFEST_INVALID", "operatingScope.actionDigest", [
        tribunalCase.caseId,
      ]);
    } else {
      actionManifest = parsedManifest.data;
      if (
        computeTribunalActionDigest(actionManifest) !==
        tribunalCase.operatingScope.actionDigest
      ) {
        add("ACTION_MANIFEST_DIGEST_MISMATCH", "operatingScope.actionDigest", [
          tribunalCase.caseId,
        ]);
      }
      const actionBindingsMatch =
        actionManifest.caseId === tribunalCase.caseId &&
        actionManifest.requestDigest === tribunalCase.requestDigest &&
        actionManifest.subjectDigest === tribunalCase.subject.digest &&
        actionManifest.selectedCandidateDigest ===
          tribunalCase.subject.digest &&
        actionManifest.proposedEffect === tribunalCase.proposedEffect &&
        actionManifest.purposeId === tribunalCase.operatingScope.purposeId &&
        actionManifest.tenantId === tribunalCase.operatingScope.tenantId &&
        actionManifest.audienceId === tribunalCase.operatingScope.audienceId &&
        actionManifest.destinationId ===
          tribunalCase.operatingScope.destinationId;
      if (!actionBindingsMatch) {
        add("ACTION_MANIFEST_BINDING_MISMATCH", "operatingScope.actionDigest", [
          tribunalCase.caseId,
        ]);
      }
      const resolvedActionCandidates: Array<{
        digest: string;
        bytes: Uint8Array;
      }> = [];
      for (const candidateDeclaration of actionManifest.candidates) {
        const candidate = resolveCandidate(candidateDeclaration.digest);
        if (!candidate) {
          add("CANDIDATE_SOURCE_UNRESOLVED", "operatingScope.actionDigest", [
            candidateDeclaration.digest,
          ]);
        } else if (candidate.digest !== candidateDeclaration.digest) {
          add("CANDIDATE_DIGEST_MISMATCH", "operatingScope.actionDigest", [
            candidateDeclaration.digest,
          ]);
        } else {
          const candidateSnapshot = candidate.bytes.slice();
          resolvedActionCandidates.push({
            digest: candidateDeclaration.digest,
            bytes: candidateSnapshot,
          });
          if (
            candidateDeclaration.digest ===
            actionManifest.selectedCandidateDigest
          ) {
            selectedCandidateBytes = candidateSnapshot.slice();
          }
        }
      }
      if (canonicalRequest) {
        const actionEvidenceClaims = new Map<string, EvidenceClaim>();
        const bindActionEvidence = (
          reference: z.infer<typeof EvidenceClaimReferenceSchema>,
          code:
            | "ACTION_PROHIBITION_CHECK_MISMATCH"
            | "ACTION_BASELINE_EVIDENCE_REQUIRED",
        ): EvidenceClaim | undefined => {
          const claim = evidence.get(reference.evidenceClaimId);
          if (!claim || claim.contentDigest !== reference.contentDigest) {
            add(code, "operatingScope.actionDigest", [
              reference.evidenceClaimId,
            ]);
            return undefined;
          }
          for (const id of collectEvidenceClosure([claim.id], evidence)) {
            const closureClaim = evidence.get(id);
            if (!closureClaim) continue;
            evidenceConsumedByAction.add(id);
            actionEvidenceClaims.set(id, closureClaim);
            if (!closureClaim.observable) {
              add("EVIDENCE_UNOBSERVABLE", "operatingScope.actionDigest", [id]);
            }
          }
          return claim;
        };
        if (
          actionManifest.candidates.length >
            canonicalRequest.budget.maxCandidates ||
          actionManifest.usage.rounds > canonicalRequest.budget.maxRounds ||
          (canonicalRequest.budget.maxInputTokens !== undefined &&
            actionManifest.usage.inputTokens >
              canonicalRequest.budget.maxInputTokens) ||
          (canonicalRequest.budget.maxOutputTokens !== undefined &&
            actionManifest.usage.outputTokens >
              canonicalRequest.budget.maxOutputTokens) ||
          (canonicalRequest.budget.maxWallClockMs !== undefined &&
            actionManifest.usage.wallClockMs >
              canonicalRequest.budget.maxWallClockMs)
        ) {
          add("ACTION_BUDGET_EXCEEDED", "operatingScope.actionDigest", [
            tribunalCase.caseId,
          ]);
        }
        if (
          canonicalRequest.mode === "one_of_one" &&
          actionManifest.candidates.length < 2
        ) {
          add(
            "ACTION_CANDIDATE_REQUIREMENT_UNMET",
            "operatingScope.actionDigest",
            [tribunalCase.caseId],
          );
        }
        if (
          canonicalRequest.mode === "one_of_one" &&
          new Set(
            actionManifest.candidates.map(
              ({ independenceKey }) => independenceKey,
            ),
          ).size !== actionManifest.candidates.length
        ) {
          add(
            "ACTION_CANDIDATE_INDEPENDENCE_UNVERIFIED",
            "operatingScope.actionDigest",
            [tribunalCase.caseId],
          );
        }
        if (
          !hasExactMembers(
            actionManifest.prohibitedChangeChecks.map(
              ({ prohibition }) => prohibition,
            ),
            canonicalRequest.prohibitedChanges,
          )
        ) {
          add(
            "ACTION_PROHIBITION_CHECK_MISMATCH",
            "operatingScope.actionDigest",
            [tribunalCase.caseId],
          );
        }
        for (const check of actionManifest.prohibitedChangeChecks) {
          for (const evidenceReference of check.evidenceClaims) {
            bindActionEvidence(
              evidenceReference,
              "ACTION_PROHIBITION_CHECK_MISMATCH",
            );
          }
          if (
            !["observe", "block"].includes(tribunalCase.proposedEffect) &&
            check.status !== "clear"
          ) {
            add("PROHIBITED_CHANGE_UNCLEARED", "operatingScope.actionDigest", [
              tribunalCase.caseId,
            ]);
          }
        }
        if (canonicalRequest.baselineLocator) {
          const baselineEvidence = actionManifest.baselineEvidence
            ? bindActionEvidence(
                actionManifest.baselineEvidence,
                "ACTION_BASELINE_EVIDENCE_REQUIRED",
              )
            : undefined;
          if (
            !baselineEvidence ||
            baselineEvidence.source.locator !== canonicalRequest.baselineLocator
          ) {
            add(
              "ACTION_BASELINE_EVIDENCE_REQUIRED",
              "operatingScope.actionDigest",
              [tribunalCase.caseId],
            );
          }
        } else if (actionManifest.baselineEvidence) {
          add(
            "ACTION_BASELINE_EVIDENCE_REQUIRED",
            "operatingScope.actionDigest",
            [tribunalCase.caseId],
          );
        }
        if (!context.verifyActionManifest) {
          add(
            "ACTION_MANIFEST_VERIFIER_UNAVAILABLE",
            "operatingScope.actionDigest",
            [tribunalCase.caseId],
          );
        } else {
          let authenticated = false;
          try {
            authenticated =
              context.verifyActionManifest({
                manifest: TribunalActionManifestSchema.parse(actionManifest),
                request: DesignReviewRequestSchema.parse(canonicalRequest),
                evidenceClaims: [...actionEvidenceClaims.values()]
                  .sort((left, right) => compareUtf16(left.id, right.id))
                  .map((claim) => EvidenceClaimSchema.parse(claim)),
                candidates: resolvedActionCandidates
                  .sort((left, right) =>
                    compareUtf16(left.digest, right.digest),
                  )
                  .map((candidate) => ({
                    digest: candidate.digest,
                    bytes: candidate.bytes.slice(),
                  })),
                now: new Date(nowMs),
              }) === true;
          } catch {
            authenticated = false;
          }
          if (!authenticated) {
            add(
              "ACTION_MANIFEST_AUTHENTICATION_FAILED",
              "operatingScope.actionDigest",
              [tribunalCase.caseId],
            );
          }
        }
      }
    }
  }

  const canonicalFindings = new Map<string, DesignFinding>();
  const dispositionsByFindingVerdict = {
    pass: ["SUPPORTED"],
    fail: ["CONTRADICTED"],
    unresolved: ["INSUFFICIENT", "DISPUTED"],
  } as const;
  type CanonicalFindingResolution =
    | { status: "unresolved" }
    | { status: "invalid" }
    | { status: "budget" }
    | { status: "resolved"; finding: DesignFinding; digestMatches: boolean };
  const canonicalFindingResolutionByDigest = new Map<
    string,
    CanonicalFindingResolution
  >();
  const resolveCanonicalFinding = (
    digest: string,
  ): CanonicalFindingResolution => {
    const cached = canonicalFindingResolutionByDigest.get(digest);
    if (cached) return cached;
    if (externalResolutionBudgetExhausted) {
      const resolution = { status: "budget" } as const;
      canonicalFindingResolutionByDigest.set(digest, resolution);
      return resolution;
    }
    let rawFinding: unknown;
    try {
      rawFinding = context.resolveDesignFinding(digest);
    } catch {
      rawFinding = undefined;
    }
    let resolution: CanonicalFindingResolution;
    if (rawFinding === undefined) {
      resolution = { status: "unresolved" };
    } else if (!isTribunalInputGraphSafe(rawFinding)) {
      resolution = { status: "invalid" };
    } else if (!chargeCanonicalResolution(rawFinding)) {
      resolution = { status: "budget" };
    } else {
      const parsedFinding = DesignFindingSchema.safeParse(rawFinding);
      if (!parsedFinding.success) {
        resolution = { status: "invalid" };
      } else {
        resolution = {
          status: "resolved",
          finding: parsedFinding.data,
          digestMatches:
            computeCanonicalDesignFindingDigest(parsedFinding.data) === digest,
        };
      }
    }
    canonicalFindingResolutionByDigest.set(digest, resolution);
    return resolution;
  };
  for (const verdict of tribunalCase.verdicts) {
    const resolution = resolveCanonicalFinding(
      verdict.provenance.sourceFindingDigest,
    );
    if (resolution.status === "unresolved") {
      add(
        "CANONICAL_FINDING_UNRESOLVED",
        `verdicts.${verdict.id}.provenance.sourceFindingDigest`,
        [verdict.id],
      );
      continue;
    }
    if (resolution.status === "invalid") {
      add(
        "CANONICAL_FINDING_INVALID",
        `verdicts.${verdict.id}.provenance.sourceFindingDigest`,
        [verdict.id],
      );
      continue;
    }
    if (resolution.status === "budget") {
      continue;
    }
    const finding = resolution.finding;
    canonicalFindings.set(verdict.id, finding);
    if (!resolution.digestMatches) {
      add(
        "CANONICAL_FINDING_DIGEST_MISMATCH",
        `verdicts.${verdict.id}.provenance.sourceFindingDigest`,
        [verdict.id],
      );
    }
    if (isTerminalDesignFindingResolution(finding.resolutionStatus)) {
      add("CANONICAL_FINDING_INACTIVE", `verdicts.${verdict.id}`, [verdict.id]);
    }
    const evidenceClosure = collectEvidenceClosure(
      verdict.evidenceClaimIds,
      evidence,
    );
    evidenceClosureByVerdictId.set(verdict.id, evidenceClosure);
    const externalSources = [...evidenceClosure].flatMap((id) => {
      const source = evidence.get(id)?.source;
      return source &&
        !["evidence_claim", "tribunal_verdict", "decision_receipt"].includes(
          source.kind,
        )
        ? [source]
        : [];
    });
    const sourceKey = (source: {
      kind: string;
      locator: string;
      summary: string;
      digest?: string;
    }): string =>
      digestCanonical(source, "quirk.tribunal.design-evidence-binding.v1");
    const findingDeclaration = declarations.get(verdict.evaluatorDeclarationId);
    const findingBindingsMatch =
      verdict.id === finding.id &&
      verdict.provenance.trajectoryId === finding.runId &&
      verdict.criterionRef === finding.criterionId &&
      verdict.claimId === finding.criterionId &&
      verdict.claim === finding.claim &&
      (!findingDeclaration ||
        findingDeclaration.criticRole === finding.criticRole) &&
      (
        dispositionsByFindingVerdict[finding.verdict] as readonly string[]
      ).includes(verdict.disposition) &&
      verdict.confidence === finding.confidence &&
      verdict.provenance.createdAt === finding.createdAt &&
      hasExactMembers(
        externalSources.map(sourceKey),
        finding.evidence.map(sourceKey),
      );
    if (!findingBindingsMatch) {
      add("CANONICAL_FINDING_BINDING_MISMATCH", `verdicts.${verdict.id}`, [
        verdict.id,
      ]);
    }
    if (!verifyTribunalVerdict) {
      add("VERDICT_VERIFIER_UNAVAILABLE", `verdicts.${verdict.id}`, [
        verdict.id,
      ]);
    } else if (findingDeclaration) {
      let authenticated = false;
      try {
        authenticated =
          verifyTribunalVerdict({
            verdict: TribunalVerdictSchema.parse(verdict),
            declaration: EvaluatorDeclarationSchema.parse(findingDeclaration),
            finding: DesignFindingSchema.parse(finding),
            evidenceClaims: [...evidenceClosure]
              .flatMap((id) => {
                const claim = evidence.get(id);
                return claim ? [EvidenceClaimSchema.parse(claim)] : [];
              })
              .sort((left, right) => compareUtf16(left.id, right.id)),
            now: new Date(nowMs),
          }) === true;
      } catch {
        authenticated = false;
      }
      if (!authenticated) {
        add("VERDICT_AUTHENTICATION_FAILED", `verdicts.${verdict.id}`, [
          verdict.id,
        ]);
      }
    }
  }

  const principalIdCache = new Map<string, string | undefined>();
  const canonicalPrincipalId = (principal: string): string | undefined => {
    if (principalIdCache.has(principal)) return principalIdCache.get(principal);
    let candidate: unknown;
    try {
      candidate = context.resolvePrincipalId(principal);
    } catch {
      candidate = undefined;
    }
    const parsedPrincipal = StableProtocolIdSchema.safeParse(candidate);
    const canonical = parsedPrincipal.success
      ? parsedPrincipal.data
      : undefined;
    if (!canonical) {
      add("PRINCIPAL_IDENTITY_UNVERIFIED", "$", [principal]);
    }
    principalIdCache.set(principal, canonical);
    return canonical;
  };
  const boundedTrustedPrincipals = (value: unknown): string[] => {
    if (
      !Array.isArray(value) ||
      value.length > TRIBUNAL_LIMITS.authorityGrants ||
      value.some(
        (principal) =>
          typeof principal !== "string" ||
          principal.length === 0 ||
          principal.length > TRIBUNAL_LIMITS.shortTextChars,
      )
    ) {
      add("PRINCIPAL_IDENTITY_UNVERIFIED", "$", [tribunalCase.caseId]);
      return [];
    }
    return value;
  };
  const trustedAuthorityIssuerPrincipals = new Set(
    boundedTrustedPrincipals(context.trustedAuthorityIssuers).flatMap(
      (principal) => {
        const canonical = canonicalPrincipalId(principal);
        return canonical ? [canonical] : [];
      },
    ),
  );
  const trustedHumanAuthorityPrincipals = new Set(
    boundedTrustedPrincipals(context.trustedHumanAuthorities).flatMap(
      (principal) => {
        const canonical = canonicalPrincipalId(principal);
        return canonical ? [canonical] : [];
      },
    ),
  );
  const evaluatorPrincipals = new Set(
    tribunalCase.evaluatorDeclarations.flatMap((declaration) =>
      [declaration.id, declaration.independence.operatorId].flatMap(
        (principal) => {
          const canonical = canonicalPrincipalId(principal);
          return canonical ? [canonical] : [];
        },
      ),
    ),
  );
  const humanAuthorityPrincipal = canonicalPrincipalId(
    tribunalCase.humanAuthorityId,
  );
  const declarationsByGrantId = new Map<string, EvaluatorDeclaration[]>();
  for (const declaration of tribunalCase.evaluatorDeclarations) {
    declarationsByGrantId.set(declaration.authority.grantId, [
      ...(declarationsByGrantId.get(declaration.authority.grantId) ?? []),
      declaration,
    ]);
  }
  const eligibleGrantIds = new Set<string>();
  const verifiedAuthorityGrants: VerifiedTribunalAuthorityGrant[] = [];
  const evaluatorEffectWithinGrant: Record<string, boolean> = {};

  for (const grant of tribunalCase.authorityGrants) {
    let grantEligible = true;
    let lifecycleSnapshot: TribunalGrantLifecycleSnapshot | undefined;
    const tokenStore = context.authorityTokensByGrantId;
    let token: unknown;
    try {
      const descriptor =
        tokenStore && typeof tokenStore === "object"
          ? Object.getOwnPropertyDescriptor(tokenStore, grant.grantId)
          : undefined;
      token =
        descriptor && "value" in descriptor ? descriptor.value : undefined;
    } catch {
      token = undefined;
    }
    let decision: AuthorityDecision | undefined;
    if (
      typeof token === "string" &&
      token.length > TRIBUNAL_LIMITS.authorityTokenChars
    ) {
      grantEligible = false;
      add("AUTHORITY_TOKEN_TOO_LARGE", `authorityGrants.${grant.grantId}`, [
        grant.grantId,
      ]);
    } else {
      try {
        const candidate: unknown = context.verifyGrant({
          token: typeof token === "string" ? token : undefined,
          resolveKey: context.resolveAuthorityKey,
          subject: tribunalCaseSubject(tribunalCase.caseId),
          requiredScope: TRIBUNAL_EVALUATE_SCOPE,
          now: new Date(nowMs),
        });
        const parsedDecision = AuthorityDecisionPortSchema.safeParse(candidate);
        decision = parsedDecision.success ? parsedDecision.data : undefined;
      } catch {
        grantEligible = false;
        add(
          "AUTHORITY_VERIFIER_UNAVAILABLE",
          `authorityGrants.${grant.grantId}`,
          [grant.grantId],
        );
      }
    }
    if (!decision) {
      if (grantEligible) {
        add(
          "AUTHORITY_VERIFIER_UNAVAILABLE",
          `authorityGrants.${grant.grantId}`,
          [grant.grantId],
        );
      }
      grantEligible = false;
    } else if (!decision.authorized) {
      grantEligible = false;
      add(authorityFailureCode(decision), `authorityGrants.${grant.grantId}`, [
        grant.grantId,
      ]);
    } else if (decision?.authorized) {
      if (decision.grant.grantId !== grant.grantId) {
        grantEligible = false;
        add("VERIFIED_GRANT_ID_MISMATCH", `authorityGrants.${grant.grantId}`, [
          decision.grant.grantId,
        ]);
      } else if (decision.keyReference.issuer !== decision.grant.issuer) {
        grantEligible = false;
        add(
          "AUTHORITY_GRANT_PAYLOAD_MISMATCH",
          `authorityGrants.${grant.grantId}`,
          [grant.grantId],
        );
      } else if (
        computeAuthorityGrantDigest(decision.grant) !==
        computeAuthorityGrantDigest(grant)
      ) {
        grantEligible = false;
        add(
          "AUTHORITY_GRANT_PAYLOAD_MISMATCH",
          `authorityGrants.${grant.grantId}`,
          [grant.grantId],
        );
      }
    }

    const grantIssuerPrincipal = canonicalPrincipalId(grant.issuer);
    if (!grantIssuerPrincipal) {
      grantEligible = false;
    } else if (!trustedAuthorityIssuerPrincipals.has(grantIssuerPrincipal)) {
      grantEligible = false;
      add(
        "AUTHORITY_GRANT_ISSUER_UNTRUSTED",
        `authorityGrants.${grant.grantId}.issuer`,
        [grant.issuer],
      );
    }
    if (grantIssuerPrincipal && evaluatorPrincipals.has(grantIssuerPrincipal)) {
      grantEligible = false;
      add("GRANT_SELF_ISSUED", `authorityGrants.${grant.grantId}.issuer`, [
        grant.issuer,
      ]);
    }
    if (!context.resolveGrantState) {
      grantEligible = false;
      add(
        "AUTHORITY_LIFECYCLE_UNVERIFIED",
        `authorityGrants.${grant.grantId}`,
        [grant.grantId],
      );
    } else {
      try {
        const resolvedLifecycle = context.resolveGrantState({
          issuer: grant.issuer,
          grantId: grant.grantId,
          grantDigest: computeAuthorityGrantDigest(grant),
          nonce: grant.nonce,
        });
        const parsedLifecycle =
          TribunalGrantLifecycleSnapshotSchema.safeParse(resolvedLifecycle);
        if (!parsedLifecycle.success) {
          grantEligible = false;
          add(
            "AUTHORITY_LIFECYCLE_UNVERIFIED",
            `authorityGrants.${grant.grantId}`,
            [grant.grantId],
          );
        } else if (parsedLifecycle.data.state !== "active") {
          grantEligible = false;
          add("AUTHORITY_GRANT_INACTIVE", `authorityGrants.${grant.grantId}`, [
            grant.grantId,
          ]);
        } else {
          lifecycleSnapshot = parsedLifecycle.data;
        }
      } catch {
        grantEligible = false;
        add(
          "AUTHORITY_LIFECYCLE_UNVERIFIED",
          `authorityGrants.${grant.grantId}`,
          [grant.grantId],
        );
      }
    }

    if (Date.parse(grant.issuedAt) > Date.parse(tribunalCase.evaluatedAt)) {
      grantEligible = false;
      add(
        "AUTHORITY_GRANT_NOT_YET_VALID",
        `authorityGrants.${grant.grantId}.issuedAt`,
        [grant.grantId],
      );
    }

    const grantOwners = declarationsByGrantId.get(grant.grantId) ?? [];
    const ownedVerdicts = tribunalCase.verdicts.filter(
      (verdict) =>
        verdict.authorityGrantId === grant.grantId &&
        grantOwners.some(
          (declaration) => declaration.id === verdict.evaluatorDeclarationId,
        ),
    );
    if (grantOwners.length === 0 || ownedVerdicts.length === 0) {
      grantEligible = false;
      add("GRANT_UNOWNED", `authorityGrants.${grant.grantId}`, [grant.grantId]);
    }
    if (grantOwners.length > 1) {
      grantEligible = false;
      add(
        "GRANT_SHARED_BETWEEN_EVALUATORS",
        `authorityGrants.${grant.grantId}`,
        grantOwners.map(({ id }) => id),
      );
    }
    if (grantOwners.length > 0) {
      const evaluatorScopes = grant.scopes.filter((scope) =>
        scope.startsWith("quirk.tribunal.evaluator:"),
      );
      const expectedEvaluatorScopes = grantOwners.map(({ id }) =>
        tribunalEvaluatorScope(id),
      );
      if (
        grantOwners.length !== 1 ||
        !hasExactMembers(evaluatorScopes, expectedEvaluatorScopes)
      ) {
        grantEligible = false;
        add("PROXY_GRANT_FORBIDDEN", `authorityGrants.${grant.grantId}`, [
          grant.grantId,
        ]);
      }
      if (
        grantOwners.length === 1 &&
        !grant.scopes.includes(
          tribunalDeclarationScope(
            computeDeclarationCoreDigest(grantOwners[0]),
          ),
        )
      ) {
        grantEligible = false;
        add(
          "DECLARATION_CORE_OUT_OF_SCOPE",
          `authorityGrants.${grant.grantId}`,
          [grantOwners[0].id],
        );
      }
    }

    if (grantEligible && decision?.authorized && lifecycleSnapshot) {
      eligibleGrantIds.add(grant.grantId);
      verifiedAuthorityGrants.push({
        grant: decision.grant,
        grantDigest: computeAuthorityGrantDigest(decision.grant),
        keyReference: decision.keyReference,
        lifecycleVersion: lifecycleSnapshot.version,
        verifiedAt: new Date(nowMs).toISOString(),
      });
    }
  }

  const independenceAxes = {
    canonicalPrincipal: new Map<string, string>(),
    key: new Map<string, string>(),
    modelFamily: new Map<string, string>(),
  };
  for (const declaration of tribunalCase.evaluatorDeclarations) {
    for (const [value, path] of [
      [canonicalPrincipalId(declaration.id), "id"],
      [
        canonicalPrincipalId(declaration.independence.operatorId),
        "independence.operatorId",
      ],
    ] as const) {
      if (!value) continue;
      const existing = independenceAxes.canonicalPrincipal.get(value);
      if (existing && existing !== declaration.id) {
        add(
          "EVALUATOR_INDEPENDENCE_COLLISION",
          `evaluatorDeclarations.${declaration.id}.${path}`,
          [existing, declaration.id],
        );
      } else {
        independenceAxes.canonicalPrincipal.set(value, declaration.id);
      }
    }
    for (const axis of ["key", "modelFamily"] as const) {
      const value = declaration.independence[axis];
      const existing = independenceAxes[axis].get(value);
      if (existing && existing !== declaration.id) {
        add(
          "EVALUATOR_INDEPENDENCE_COLLISION",
          `evaluatorDeclarations.${declaration.id}.independence.${axis}`,
          [existing, declaration.id],
        );
      } else {
        independenceAxes[axis].set(value, declaration.id);
      }
    }

    if (
      computeDeclarationDigest(declaration) !==
      declaration.provenance.declarationDigest
    ) {
      add(
        "DECLARATION_HASH_MISMATCH",
        `evaluatorDeclarations.${declaration.id}.provenance.declarationDigest`,
        [declaration.id],
      );
    }
    const grant = grants.get(declaration.authority.grantId);
    if (!grant) {
      add(
        "UNKNOWN_AUTHORITY_GRANT_REF",
        `evaluatorDeclarations.${declaration.id}.authority.grantId`,
        [declaration.authority.grantId],
      );
      continue;
    }
    if (
      declaration.authority.grantDigest !== computeAuthorityGrantDigest(grant)
    ) {
      add(
        "AUTHORITY_GRANT_PAYLOAD_MISMATCH",
        `evaluatorDeclarations.${declaration.id}.authority.grantDigest`,
        [grant.grantId],
      );
    }

    const ownEvaluatorScope = tribunalEvaluatorScope(declaration.id);
    if (!grant.scopes.includes(ownEvaluatorScope)) {
      add(
        "GRANT_EVALUATOR_SCOPE_MISMATCH",
        `evaluatorDeclarations.${declaration.id}.authority.grantId`,
        [grant.grantId],
      );
      if (
        grant.scopes.some((scope) =>
          scope.startsWith("quirk.tribunal.evaluator:"),
        )
      ) {
        add(
          "PROXY_GRANT_FORBIDDEN",
          `evaluatorDeclarations.${declaration.id}.authority.grantId`,
          [grant.grantId],
        );
      }
    }

    const conflicts = declaration.authority.declaredEffects.filter((effect) =>
      declaration.authority.prohibitedEffects.includes(effect),
    );
    if (conflicts.length > 0) {
      add(
        "DECLARATION_EFFECT_CONFLICT",
        `evaluatorDeclarations.${declaration.id}.authority`,
        conflicts,
      );
    }
    for (const effect of declaration.authority.declaredEffects) {
      if (!grant.scopes.includes(tribunalEffectScope(effect))) {
        add(
          "DECLARATION_EFFECT_EXCEEDS_GRANT",
          `evaluatorDeclarations.${declaration.id}.authority.declaredEffects`,
          [effect],
        );
      }
    }

    const evaluatedAt = Date.parse(tribunalCase.evaluatedAt);
    const calibrationEvidence = declaration.fallibility.calibrationEvidence;
    if (!sourceLocatorPermitted(declaration, calibrationEvidence.locator)) {
      add(
        "CALIBRATION_EVIDENCE_OUT_OF_SCOPE",
        `evaluatorDeclarations.${declaration.id}.fallibility.calibrationEvidence.locator`,
        [declaration.id],
      );
    }
    const calibrationDigest = resolveEvidenceDigest(
      calibrationEvidence.locator,
    );
    if (calibrationDigest === undefined) {
      add(
        "CALIBRATION_EVIDENCE_UNRESOLVED",
        `evaluatorDeclarations.${declaration.id}.fallibility.calibrationEvidence.locator`,
        [declaration.id],
      );
    } else if (calibrationDigest !== calibrationEvidence.digest) {
      add(
        "CALIBRATION_EVIDENCE_DIGEST_MISMATCH",
        `evaluatorDeclarations.${declaration.id}.fallibility.calibrationEvidence.digest`,
        [declaration.id],
      );
    }
    if (Date.parse(declaration.fallibility.calibrationValidUntil) <= nowMs) {
      add(
        "CALIBRATION_STALE",
        `evaluatorDeclarations.${declaration.id}.fallibility.calibrationValidUntil`,
        [declaration.id],
      );
    }
    const holdoutEvidence = declaration.fallibility.holdoutEvidence;
    if (!sourceLocatorPermitted(declaration, holdoutEvidence.locator)) {
      add(
        "CALIBRATION_HOLDOUT_OUT_OF_SCOPE",
        `evaluatorDeclarations.${declaration.id}.fallibility.holdoutEvidence.locator`,
        [declaration.id],
      );
    }
    const holdoutDigest = resolveEvidenceDigest(holdoutEvidence.locator);
    const holdoutCandidateDigest = resolveEvidenceCandidateDigest(
      holdoutEvidence.locator,
    );
    if (holdoutDigest === undefined) {
      add(
        "CALIBRATION_HOLDOUT_UNRESOLVED",
        `evaluatorDeclarations.${declaration.id}.fallibility.holdoutEvidence.locator`,
        [declaration.id],
      );
    } else if (holdoutDigest !== holdoutEvidence.digest) {
      add(
        "CALIBRATION_HOLDOUT_DIGEST_MISMATCH",
        `evaluatorDeclarations.${declaration.id}.fallibility.holdoutEvidence.digest`,
        [declaration.id],
      );
    }
    if (
      holdoutEvidence.locator === calibrationEvidence.locator ||
      holdoutEvidence.digest === calibrationEvidence.digest ||
      holdoutEvidence.digest === tribunalCase.subject.digest ||
      actionManifest?.candidates.some(
        ({ digest }) => digest === holdoutCandidateDigest,
      ) ||
      tribunalCase.evidenceClaims.some(
        ({ source }) => source.digest === holdoutEvidence.digest,
      )
    ) {
      add(
        "CALIBRATION_HOLDOUT_CONTAMINATED",
        `evaluatorDeclarations.${declaration.id}.fallibility.holdoutEvidence`,
        [declaration.id],
      );
    }
    if (
      Date.parse(declaration.fallibility.calibratedAt) > evaluatedAt ||
      Date.parse(declaration.inspection.temporalBoundary) > evaluatedAt
    ) {
      add("TEMPORAL_ORDER_INVALID", `evaluatorDeclarations.${declaration.id}`, [
        declaration.id,
      ]);
    }
  }

  for (const claim of tribunalCase.evidenceClaims) {
    if (claim.subjectDigest !== tribunalCase.subject.digest) {
      add(
        "SUBJECT_REVISION_MISMATCH",
        `evidenceClaims.${claim.id}.subjectDigest`,
        [claim.id],
      );
    }
    if (computeEvidenceClaimContentDigest(claim) !== claim.contentDigest) {
      add(
        "EVIDENCE_DIGEST_MISMATCH",
        `evidenceClaims.${claim.id}.contentDigest`,
        [claim.id],
      );
    }
    const sourceDigestValid =
      claim.source.digest !== undefined &&
      DigestSchema.safeParse(claim.source.digest).success;
    if (!claim.source.digest) {
      add(
        "EVIDENCE_DIGEST_REQUIRED",
        `evidenceClaims.${claim.id}.source.digest`,
        [claim.id],
      );
    } else if (!sourceDigestValid) {
      add(
        "EVIDENCE_DIGEST_INVALID",
        `evidenceClaims.${claim.id}.source.digest`,
        [claim.id],
      );
    }

    if (claim.source.kind === "evidence_claim") {
      const sourceClaim = evidence.get(claim.source.locator);
      if (!sourceClaim) {
        add(
          "UNKNOWN_EVIDENCE_CLAIM_REF",
          `evidenceClaims.${claim.id}.source.locator`,
          [claim.source.locator],
        );
      } else {
        if (
          sourceDigestValid &&
          claim.source.digest !== sourceClaim.contentDigest
        ) {
          add(
            "EVIDENCE_DIGEST_MISMATCH",
            `evidenceClaims.${claim.id}.source.digest`,
            [claim.id],
          );
        }
        if (
          Date.parse(claim.observedAt) < Date.parse(sourceClaim.observedAt) ||
          Date.parse(claim.validUntil) > Date.parse(sourceClaim.validUntil)
        ) {
          add(
            "TEMPORAL_ORDER_INVALID",
            `evidenceClaims.${claim.id}.source.locator`,
            [claim.id, sourceClaim.id],
          );
        }
      }
    } else if (claim.source.kind === "tribunal_verdict") {
      add(
        "VERDICT_CANNOT_BE_PRIMARY_EVIDENCE",
        `evidenceClaims.${claim.id}.source.kind`,
        [claim.id],
      );
      const sourceVerdict = verdicts.get(claim.source.locator);
      if (!sourceVerdict) {
        add(
          "UNKNOWN_TRIBUNAL_VERDICT_REF",
          `evidenceClaims.${claim.id}.source.locator`,
          [claim.source.locator],
        );
      } else if (
        sourceDigestValid &&
        claim.source.digest !== sourceVerdict.provenance.contentDigest
      ) {
        add(
          "EVIDENCE_DIGEST_MISMATCH",
          `evidenceClaims.${claim.id}.source.digest`,
          [claim.id],
        );
      }
    } else if (claim.source.kind === "decision_receipt") {
      add(
        "DECISION_RECEIPT_CANNOT_BE_PRIMARY_EVIDENCE",
        `evidenceClaims.${claim.id}.source.kind`,
        [claim.id],
      );
      const sourceReceipt = receipts.get(claim.source.locator);
      if (!sourceReceipt) {
        add(
          "UNKNOWN_DECISION_RECEIPT_REF",
          `evidenceClaims.${claim.id}.source.locator`,
          [claim.source.locator],
        );
      } else if (
        sourceDigestValid &&
        claim.source.digest !== sourceReceipt.contentDigest
      ) {
        add(
          "EVIDENCE_DIGEST_MISMATCH",
          `evidenceClaims.${claim.id}.source.digest`,
          [claim.id],
        );
      }
    } else if (sourceDigestValid) {
      const resolvedDigest = resolveEvidenceDigest(claim.source.locator);
      if (resolvedDigest === undefined) {
        add(
          "EVIDENCE_SOURCE_UNRESOLVED",
          `evidenceClaims.${claim.id}.source.locator`,
          [claim.source.locator],
        );
      } else if (resolvedDigest !== claim.source.digest) {
        add(
          "EVIDENCE_DIGEST_MISMATCH",
          `evidenceClaims.${claim.id}.source.digest`,
          [claim.id],
        );
      }
    }

    const declaration = declarations.get(claim.inspectedBy);
    if (!declaration) {
      add(
        "UNKNOWN_EVALUATOR_DECLARATION_REF",
        `evidenceClaims.${claim.id}.inspectedBy`,
        [claim.inspectedBy],
      );
    } else {
      if (!declaration.inspection.evidenceKinds.includes(claim.source.kind)) {
        add("OUT_OF_SCOPE_EVIDENCE", `evidenceClaims.${claim.id}.source.kind`, [
          claim.source.kind,
        ]);
      }
      if (
        !["evidence_claim", "tribunal_verdict", "decision_receipt"].includes(
          claim.source.kind,
        ) &&
        !sourceLocatorPermitted(declaration, claim.source.locator)
      ) {
        add(
          "OUT_OF_SCOPE_EVIDENCE",
          `evidenceClaims.${claim.id}.source.locator`,
          [claim.id],
        );
      }
      if (!declaration.inspection.tools.includes(claim.inspectionToolId)) {
        add(
          "EVIDENCE_TOOL_UNDECLARED",
          `evidenceClaims.${claim.id}.inspectionToolId`,
          [claim.inspectionToolId],
        );
      }
      if (
        Date.parse(claim.observedAt) >
        Date.parse(declaration.inspection.temporalBoundary)
      ) {
        add(
          "EVIDENCE_AFTER_INSPECTION_BOUNDARY",
          `evidenceClaims.${claim.id}.observedAt`,
          [claim.id],
        );
      }
      if (claim.confidence > declaration.fallibility.maxConfidence) {
        add(
          "CONFIDENCE_EXCEEDS_CALIBRATION",
          `evidenceClaims.${claim.id}.confidence`,
          [claim.id],
        );
      }
    }
    if (!verifyEvidenceClaim) {
      add("EVIDENCE_VERIFIER_UNAVAILABLE", `evidenceClaims.${claim.id}`, [
        claim.id,
      ]);
    } else if (declaration) {
      let authenticated = false;
      try {
        authenticated =
          verifyEvidenceClaim({
            claim: EvidenceClaimSchema.parse(claim),
            declaration: EvaluatorDeclarationSchema.parse(declaration),
            now: new Date(nowMs),
          }) === true;
      } catch {
        authenticated = false;
      }
      if (!authenticated) {
        add("EVIDENCE_AUTHENTICATION_FAILED", `evidenceClaims.${claim.id}`, [
          claim.id,
        ]);
      }
    }
    for (const dependency of claim.derivedFromEvidenceClaims) {
      const dependencyClaim = evidence.get(dependency.evidenceClaimId);
      if (!dependencyClaim) {
        add(
          "UNKNOWN_EVIDENCE_CLAIM_REF",
          `evidenceClaims.${claim.id}.derivedFromEvidenceClaims`,
          [dependency.evidenceClaimId],
        );
      } else if (dependency.contentDigest !== dependencyClaim.contentDigest) {
        add(
          "EVIDENCE_DIGEST_MISMATCH",
          `evidenceClaims.${claim.id}.derivedFromEvidenceClaims`,
          [claim.id, dependencyClaim.id],
        );
      } else if (
        Date.parse(claim.observedAt) < Date.parse(dependencyClaim.observedAt) ||
        Date.parse(claim.validUntil) > Date.parse(dependencyClaim.validUntil)
      ) {
        add(
          "TEMPORAL_ORDER_INVALID",
          `evidenceClaims.${claim.id}.derivedFromEvidenceClaims`,
          [claim.id, dependencyClaim.id],
        );
      }
    }
    const observedAt = Date.parse(claim.observedAt);
    if (observedAt > Date.parse(tribunalCase.evaluatedAt)) {
      add("TEMPORAL_ORDER_INVALID", `evidenceClaims.${claim.id}.observedAt`, [
        claim.id,
      ]);
    }
    if (Date.parse(claim.validUntil) <= nowMs) {
      add("EVIDENCE_STALE", `evidenceClaims.${claim.id}.validUntil`, [
        claim.id,
      ]);
    }
  }

  const evidenceConsumedByVerdicts = new Set<string>();
  for (const verdict of tribunalCase.verdicts) {
    evaluatorEffectWithinGrant[verdict.id] = false;
    const declaration = declarations.get(verdict.evaluatorDeclarationId);
    if (!declaration) {
      add(
        "UNKNOWN_EVALUATOR_DECLARATION_REF",
        `verdicts.${verdict.id}.evaluatorDeclarationId`,
        [verdict.evaluatorDeclarationId],
      );
      continue;
    }
    const grant = grants.get(verdict.authorityGrantId);
    if (!grant) {
      add(
        "UNKNOWN_AUTHORITY_GRANT_REF",
        `verdicts.${verdict.id}.authorityGrantId`,
        [verdict.authorityGrantId],
      );
      continue;
    }
    if (verdict.authorityGrantId !== declaration.authority.grantId) {
      add(
        "VERDICT_GRANT_BINDING_MISMATCH",
        `verdicts.${verdict.id}.authorityGrantId`,
        [verdict.authorityGrantId, declaration.authority.grantId],
      );
      continue;
    }
    if (
      verdict.authorityBasis.grantId !== verdict.authorityGrantId ||
      verdict.authorityBasis.grantDigest !== computeAuthorityGrantDigest(grant)
    ) {
      add(
        "VERDICT_GRANT_BINDING_MISMATCH",
        `verdicts.${verdict.id}.authorityBasis`,
        [verdict.authorityGrantId],
      );
    }

    if (verdict.subjectDigest !== tribunalCase.subject.digest) {
      add("SUBJECT_REVISION_MISMATCH", `verdicts.${verdict.id}.subjectDigest`, [
        verdict.id,
      ]);
    }
    const criterion = criteria.get(verdict.criterionRef);
    if (!criterion) {
      add("UNKNOWN_CRITERION_REF", `verdicts.${verdict.id}.criterionRef`, [
        verdict.criterionRef,
      ]);
    } else {
      const evaluatorTypesByGate = {
        deterministic: ["deterministic_validator", "benchmark_harness"],
        critic: ["model", "ensemble", "meta_evaluator", "human_reviewer"],
        human: ["human_reviewer"],
      } as const;
      if (
        !(evaluatorTypesByGate[criterion.gate] as readonly string[]).includes(
          declaration.evaluatorType,
        )
      ) {
        add(
          "CRITERION_GATE_EVALUATOR_MISMATCH",
          `verdicts.${verdict.id}.evaluatorDeclarationId`,
          [criterion.id, declaration.id],
        );
      }
    }
    const requiredScopes: Array<[string, TribunalIssueCode]> = [
      [
        tribunalRealmScope(tribunalCase.subject.realm),
        "SUBJECT_REALM_OUT_OF_SCOPE",
      ],
      [
        tribunalSubjectIdScope(tribunalCase.subject.id),
        "SUBJECT_ID_OUT_OF_SCOPE",
      ],
      [
        tribunalSubjectDigestScope(tribunalCase.subject.digest),
        "SUBJECT_REVISION_OUT_OF_SCOPE",
      ],
      [
        tribunalTargetClassScope(tribunalCase.subject.targetClass),
        "SUBJECT_TARGET_CLASS_OUT_OF_SCOPE",
      ],
      [
        tribunalPurposeScope(tribunalCase.operatingScope.purposeId),
        "PURPOSE_OUT_OF_SCOPE",
      ],
      [
        tribunalTenantScope(tribunalCase.operatingScope.tenantId),
        "TENANT_OUT_OF_SCOPE",
      ],
      [
        tribunalAudienceScope(tribunalCase.operatingScope.audienceId),
        "AUDIENCE_OUT_OF_SCOPE",
      ],
      [
        tribunalDestinationScope(tribunalCase.operatingScope.destinationId),
        "DESTINATION_OUT_OF_SCOPE",
      ],
      [
        tribunalActionScope(tribunalCase.operatingScope.actionDigest),
        "ACTION_DIGEST_MISMATCH",
      ],
    ];
    for (const [scope, code] of requiredScopes) {
      if (!grant.scopes.includes(scope))
        add(code, `verdicts.${verdict.id}.authorityGrantId`, [grant.grantId]);
    }

    if (
      !declaration.authority.declaredEffects.includes(
        verdict.authorityEffectRequested,
      )
    ) {
      add(
        "REQUESTED_EFFECT_UNDECLARED",
        `verdicts.${verdict.id}.authorityEffectRequested`,
        [verdict.authorityEffectRequested],
      );
    }
    const signedEffect = tribunalEffectScope(verdict.authorityEffectRequested);
    if (!grant.scopes.includes(signedEffect)) {
      add(
        "REQUESTED_EFFECT_EXCEEDS_GRANT",
        `verdicts.${verdict.id}.authorityEffectRequested`,
        [verdict.authorityEffectRequested],
      );
      if (
        [...grants.values()].some(
          (candidate) =>
            candidate.grantId !== grant.grantId &&
            candidate.scopes.includes(signedEffect),
        )
      ) {
        add(
          "AUTHORITY_UNION_FORBIDDEN",
          `verdicts.${verdict.id}.authorityEffectRequested`,
          [verdict.authorityEffectRequested],
        );
      }
    } else if (
      eligibleGrantIds.has(grant.grantId) &&
      declaration.authority.declaredEffects.includes(
        verdict.authorityEffectRequested,
      ) &&
      verdict.authorityBasis.kind === "grant"
    ) {
      evaluatorEffectWithinGrant[verdict.id] = true;
    }

    if (verdict.authorityBasis.kind === "confidence") {
      add(
        "AUTHORITY_DERIVED_FROM_CONFIDENCE",
        `verdicts.${verdict.id}.authorityBasis.kind`,
        [verdict.id],
      );
    } else if (verdict.authorityBasis.kind === "consensus") {
      add(
        "AUTHORITY_DERIVED_FROM_CONSENSUS",
        `verdicts.${verdict.id}.authorityBasis.kind`,
        [verdict.id],
      );
    } else if (verdict.authorityBasis.kind === "historical_accuracy") {
      add(
        "AUTHORITY_DERIVED_FROM_HISTORICAL_ACCURACY",
        `verdicts.${verdict.id}.authorityBasis.kind`,
        [verdict.id],
      );
    }

    const allowedEffects: Record<
      TribunalVerdict["disposition"],
      TribunalEffect[]
    > = {
      SUPPORTED: TribunalEffectSchema.options,
      CONTRADICTED: ["observe", "block"],
      INSUFFICIENT: ["observe"],
      OUT_OF_SCOPE: ["observe"],
      DISPUTED: ["observe"],
    };
    if (
      !allowedEffects[verdict.disposition].includes(
        verdict.authorityEffectRequested,
      )
    ) {
      add(
        "DISPOSITION_EFFECT_INVALID",
        `verdicts.${verdict.id}.authorityEffectRequested`,
        [verdict.disposition],
      );
    }
    if (
      ["SUPPORTED", "CONTRADICTED"].includes(verdict.disposition) &&
      verdict.evidenceClaimIds.length === 0
    ) {
      add("EVIDENCE_REQUIRED", `verdicts.${verdict.id}.evidenceClaimIds`, [
        verdict.id,
      ]);
    }

    const linkedEvidence = verdict.evidenceClaimIds.map((id) =>
      evidence.get(id),
    );
    const evidenceClosure = collectEvidenceClosure(
      verdict.evidenceClaimIds,
      evidence,
    );
    evidenceClosure.forEach((id) => evidenceConsumedByVerdicts.add(id));
    const missingEvidence = verdict.evidenceClaimIds.filter(
      (id) => !evidence.has(id),
    );
    for (const id of missingEvidence) {
      add(
        "UNKNOWN_EVIDENCE_CLAIM_REF",
        `verdicts.${verdict.id}.evidenceClaimIds`,
        [id],
      );
    }
    for (const id of evidenceClosure) {
      const claim = evidence.get(id);
      if (!claim) continue;
      if (claim.inspectedBy !== verdict.evaluatorDeclarationId) {
        add(
          "EVIDENCE_INSPECTOR_MISMATCH",
          `verdicts.${verdict.id}.evidenceClaimIds`,
          [claim.id, claim.inspectedBy, verdict.evaluatorDeclarationId],
        );
      }
      if (claim.claimId !== verdict.claimId) {
        add(
          "EVIDENCE_CLAIM_BINDING_MISMATCH",
          `verdicts.${verdict.id}.evidenceClaimIds`,
          [claim.id, claim.claimId, verdict.claimId],
        );
      }
    }
    if (["SUPPORTED", "CONTRADICTED"].includes(verdict.disposition)) {
      for (const id of evidenceClosure) {
        if (evidence.get(id)?.observable === false) {
          add(
            "EVIDENCE_UNOBSERVABLE",
            `verdicts.${verdict.id}.evidenceClaimIds`,
            [id],
          );
        }
      }
    }
    if (criterion) {
      for (const requiredKind of criterion.evidenceRequired) {
        const present = [...evidenceClosure].some(
          (id) => evidence.get(id)?.source.kind === requiredKind,
        );
        if (!present) {
          add("EVIDENCE_REQUIRED", `verdicts.${verdict.id}.evidenceClaimIds`, [
            criterion.id,
            requiredKind,
          ]);
        }
      }
    }
    if (missingEvidence.length === 0) {
      const expectedDigests = linkedEvidence.flatMap((claim) =>
        claim ? [claim.contentDigest] : [],
      );
      if (
        !hasExactMembers(verdict.provenance.evidenceDigests, expectedDigests)
      ) {
        add(
          "EVIDENCE_HASH_SET_MISMATCH",
          `verdicts.${verdict.id}.provenance.evidenceDigests`,
          [verdict.id],
        );
      }
    }
    if (verdict.provenance.evaluatorVersion !== declaration.version) {
      add(
        "EVALUATOR_VERSION_MISMATCH",
        `verdicts.${verdict.id}.provenance.evaluatorVersion`,
        [verdict.id],
      );
    }
    if (
      verdict.provenance.declarationDigest !==
      declaration.provenance.declarationDigest
    ) {
      add(
        "DECLARATION_HASH_MISMATCH",
        `verdicts.${verdict.id}.provenance.declarationDigest`,
        [verdict.id],
      );
    }
    if (verdict.provenance.trajectoryId !== tribunalCase.trajectoryId) {
      add(
        "TRAJECTORY_MISMATCH",
        `verdicts.${verdict.id}.provenance.trajectoryId`,
        [verdict.id],
      );
    }
    if (verdict.confidence > declaration.fallibility.maxConfidence) {
      add(
        "CONFIDENCE_EXCEEDS_CALIBRATION",
        `verdicts.${verdict.id}.confidence`,
        [verdict.id],
      );
    }
    if (
      computeVerdictContentDigest(verdict) !== verdict.provenance.contentDigest
    ) {
      add(
        "VERDICT_CONTENT_HASH_MISMATCH",
        `verdicts.${verdict.id}.provenance.contentDigest`,
        [verdict.id],
      );
    }
    const latestEvidence = [...evidenceClosure].reduce((latest, id) => {
      const claim = evidence.get(id);
      return Math.max(latest, claim ? Date.parse(claim.observedAt) : 0);
    }, 0);
    if (
      Date.parse(verdict.provenance.createdAt) < latestEvidence ||
      Date.parse(verdict.provenance.createdAt) <
        Date.parse(tribunalCase.openedAt) ||
      Date.parse(verdict.provenance.createdAt) >
        Date.parse(tribunalCase.evaluatedAt)
    ) {
      add(
        "TEMPORAL_ORDER_INVALID",
        `verdicts.${verdict.id}.provenance.createdAt`,
        [verdict.id],
      );
    }
    if (Date.parse(grant.issuedAt) > Date.parse(verdict.provenance.createdAt)) {
      add(
        "AUTHORITY_GRANT_NOT_YET_VALID",
        `verdicts.${verdict.id}.authorityGrantId`,
        [grant.grantId],
      );
      evaluatorEffectWithinGrant[verdict.id] = false;
    }
  }

  for (const criterion of tribunalCase.criteria) {
    if (
      !tribunalCase.verdicts.some(
        (verdict) => verdict.criterionRef === criterion.id,
      )
    ) {
      add("CRITERION_UNEVALUATED", "criteria", [criterion.id]);
    }
  }
  for (const claim of tribunalCase.evidenceClaims) {
    if (
      !evidenceConsumedByVerdicts.has(claim.id) &&
      !evidenceConsumedByAction.has(claim.id)
    ) {
      add("EVIDENCE_UNCONSUMED", "evidenceClaims", [claim.id]);
    }
  }

  if (detectProtocolCycle(tribunalCase)) add("EVIDENCE_CYCLE");

  const orderedReceipts = [...tribunalCase.decisionReceipts].sort(
    (left, right) => {
      const time = Date.parse(left.issuedAt) - Date.parse(right.issuedAt);
      return time === 0 ? compareUtf16(left.id, right.id) : time;
    },
  );
  for (let index = 0; index < orderedReceipts.length; index += 1) {
    const receipt = orderedReceipts[index];
    const predecessor = orderedReceipts[index - 1];
    const expectedPreviousDigest = predecessor?.contentDigest ?? null;
    if (
      receipt.previousReceiptDigest !== expectedPreviousDigest ||
      (predecessor &&
        Date.parse(predecessor.issuedAt) >= Date.parse(receipt.issuedAt))
    ) {
      add("RECEIPT_CHAIN_MISMATCH", `decisionReceipts.${receipt.id}`, [
        receipt.id,
      ]);
    }
  }

  let receiptHeadVerified = false;
  let trustedReceiptHead: TribunalReceiptHead | null | undefined;
  if (context.resolveReceiptHead) {
    try {
      const candidate: unknown = context.resolveReceiptHead(
        tribunalCase.caseId,
      );
      if (candidate === null) {
        trustedReceiptHead = null;
        receiptHeadVerified = true;
      } else {
        const parsedHead = TribunalReceiptHeadSchema.safeParse(candidate);
        if (parsedHead.success) {
          trustedReceiptHead = parsedHead.data;
          receiptHeadVerified = true;
        }
      }
    } catch {
      receiptHeadVerified = false;
    }
  }
  let receiptHeadTransition:
    | NonNullable<
        TribunalValidationResult["commitTransition"]
      >["stateWrites"]["receiptHead"]
    | null = null;
  let receiptAppends: NonNullable<
    TribunalValidationResult["commitTransition"]
  >["stateWrites"]["receiptAppends"] = [];
  if (!receiptHeadVerified || trustedReceiptHead === undefined) {
    add("RECEIPT_HEAD_UNVERIFIED", "decisionReceipts", [tribunalCase.caseId]);
  } else {
    const localHead = orderedReceipts.at(-1);
    const trustedReceipt = trustedReceiptHead
      ? orderedReceipts.find(({ id }) => id === trustedReceiptHead.receiptId)
      : undefined;
    const trustedHeadMatchesChain = trustedReceiptHead
      ? trustedReceipt?.contentDigest === trustedReceiptHead.contentDigest
      : true;
    if (
      (!localHead && trustedReceiptHead !== null) ||
      !trustedHeadMatchesChain
    ) {
      add("RECEIPT_HEAD_MISMATCH", "decisionReceipts", [tribunalCase.caseId]);
    } else {
      const firstUnpersistedReceiptIndex = trustedReceiptHead
        ? orderedReceipts.findIndex(
            ({ id }) => id === trustedReceiptHead.receiptId,
          ) + 1
        : 0;
      receiptAppends = orderedReceipts
        .slice(firstUnpersistedReceiptIndex)
        .map((receipt) => ({
          key: receipt.id,
          expectedDigest: null,
          nextDigest: receipt.contentDigest,
          receipt: DecisionReceiptSchema.parse(receipt),
        }));
      receiptHeadTransition = {
        expectedHead: trustedReceiptHead ?? null,
        nextHead: localHead
          ? {
              receiptId: localHead.id,
              contentDigest: localHead.contentDigest,
            }
          : null,
      };
    }
  }

  let effectiveReceipt: DecisionReceipt | undefined;
  if (tribunalCase.decisionReceipts.length > 0) {
    if (!tribunalCase.effectiveDecisionReceiptId) {
      add("EFFECTIVE_RECEIPT_REQUIRED", "effectiveDecisionReceiptId");
    } else {
      effectiveReceipt = receipts.get(tribunalCase.effectiveDecisionReceiptId);
      if (!effectiveReceipt) {
        add("UNKNOWN_DECISION_RECEIPT_REF", "effectiveDecisionReceiptId", [
          tribunalCase.effectiveDecisionReceiptId,
        ]);
      } else {
        const latestIssuedAt = Math.max(
          ...tribunalCase.decisionReceipts.map(({ issuedAt }) =>
            Date.parse(issuedAt),
          ),
        );
        const latestReceipts = tribunalCase.decisionReceipts.filter(
          ({ issuedAt }) => Date.parse(issuedAt) === latestIssuedAt,
        );
        if (
          latestReceipts.length !== 1 ||
          latestReceipts[0].id !== effectiveReceipt.id
        ) {
          add("EFFECTIVE_RECEIPT_MISMATCH", "effectiveDecisionReceiptId", [
            effectiveReceipt.id,
          ]);
        }
      }
    }
  } else if (tribunalCase.effectiveDecisionReceiptId) {
    add("UNKNOWN_DECISION_RECEIPT_REF", "effectiveDecisionReceiptId", [
      tribunalCase.effectiveDecisionReceiptId,
    ]);
  }

  const conflictGroups = new Map<string, TribunalVerdict[]>();
  for (const verdict of tribunalCase.verdicts) {
    const key = `${verdict.criterionRef}|${verdict.subjectDigest}`;
    conflictGroups.set(key, [...(conflictGroups.get(key) ?? []), verdict]);
  }
  for (const group of conflictGroups.values()) {
    const dispositions = new Set(group.map(({ disposition }) => disposition));
    if (dispositions.size < 2) continue;
    const ids = group.map(({ id }) => id);
    const acknowledged =
      effectiveReceipt?.decision.authorityId ===
        tribunalCase.humanAuthorityId &&
      humanAuthorityPrincipal !== undefined &&
      trustedHumanAuthorityPrincipals.has(humanAuthorityPrincipal) &&
      ids.every((id) => effectiveReceipt.consideredVerdictIds.includes(id));
    if (!acknowledged) add("DISPUTED_VERDICTS_UNACKNOWLEDGED", "verdicts", ids);
  }

  const positiveEffect = !["observe", "block"].includes(
    tribunalCase.proposedEffect,
  );
  const blockingCounterSignal = tribunalCase.verdicts.some((verdict) => {
    const criterion = criteria.get(verdict.criterionRef);
    const finding = canonicalFindings.get(verdict.id);
    const canonicalFindingBlocks =
      finding !== undefined &&
      finding.verdict !== "pass" &&
      (finding.blocksRelease || finding.severity === "blocker");
    return (
      verdict.disposition === "DISPUTED" ||
      (criterion?.blocksRelease === true &&
        verdict.disposition !== "SUPPORTED") ||
      canonicalFindingBlocks
    );
  });
  const humanGateRequired =
    authorityBearing(tribunalCase.proposedEffect) ||
    tribunalCase.humanApprovalRequired ||
    tribunalCase.criteria.some(({ gate }) => gate === "human") ||
    (positiveEffect && blockingCounterSignal);
  if (humanGateRequired && !effectiveReceipt) {
    add("DECISION_RECEIPT_REQUIRED", "decisionReceipts", [
      tribunalCase.proposedEffect,
    ]);
  }
  if (positiveEffect && blockingCounterSignal && !effectiveReceipt) {
    add("BLOCKING_CRITERION_REQUIRES_HUMAN", "verdicts", [tribunalCase.caseId]);
  }
  const humanDecisionCanActivate = effectiveReceipt
    ? effectiveReceipt.decision.decision === "approved"
    : !humanGateRequired;
  if (
    positiveEffect &&
    humanDecisionCanActivate &&
    humanAuthorityPrincipal !== undefined &&
    evaluatorPrincipals.has(humanAuthorityPrincipal)
  ) {
    add("DECISION_EVALUATOR_SEPARATION_REQUIRED", "humanAuthorityId", [
      tribunalCase.humanAuthorityId,
    ]);
  }

  const integrityFailures = new Set<TribunalIssueCode>([
    "DECLARATION_HASH_MISMATCH",
    "EVIDENCE_HASH_SET_MISMATCH",
    "EVALUATOR_VERSION_MISMATCH",
    "SUBJECT_REVISION_MISMATCH",
    "VERDICT_CONTENT_HASH_MISMATCH",
  ]);
  const skipReceiptBindings = values().some((issue) =>
    integrityFailures.has(issue.code),
  );
  const replayWrites: NonNullable<
    TribunalValidationResult["commitTransition"]
  >["stateWrites"]["replayWrites"] = [];
  if (!skipReceiptBindings) {
    const expectedVerdicts = tribunalCase.verdicts.map(({ id }) => id);
    const expectedEvidence = tribunalCase.evidenceClaims.map(({ id }) => id);
    const expectedGrants = [
      ...new Set(
        tribunalCase.verdicts.map(({ authorityGrantId }) => authorityGrantId),
      ),
    ];
    const caseBasisDigest = computeTribunalCaseDigest(tribunalCase);
    for (const receipt of tribunalCase.decisionReceipts) {
      if (!hasExactMembers(receipt.consideredVerdictIds, expectedVerdicts)) {
        add(
          "RECEIPT_VERDICT_BINDING_MISMATCH",
          `decisionReceipts.${receipt.id}.consideredVerdictIds`,
          [receipt.id],
        );
      }
      const accountedEvidence = [
        ...receipt.acceptedEvidenceClaimIds,
        ...receipt.rejectedOrDisputedEvidence.map(
          ({ evidenceClaimId }) => evidenceClaimId,
        ),
      ];
      if (!hasExactMembers(accountedEvidence, expectedEvidence)) {
        add(
          "RECEIPT_EVIDENCE_ACCOUNTING_INCOMPLETE",
          `decisionReceipts.${receipt.id}`,
          [receipt.id],
        );
      }
      for (const verdictId of receipt.consideredVerdictIds) {
        if (!verdicts.has(verdictId)) {
          add(
            "UNKNOWN_TRIBUNAL_VERDICT_REF",
            `decisionReceipts.${receipt.id}.consideredVerdictIds`,
            [verdictId],
          );
        }
      }
      const receiptGrantIds = receipt.authorityGrantRefs.map(
        ({ grantId }) => grantId,
      );
      const badGrantDigest = receipt.authorityGrantRefs.some(
        ({ grantId, grantDigest }) => {
          const grant = grants.get(grantId);
          return !grant || computeAuthorityGrantDigest(grant) !== grantDigest;
        },
      );
      if (!hasExactMembers(receiptGrantIds, expectedGrants) || badGrantDigest) {
        add(
          "RECEIPT_GRANT_BINDING_MISMATCH",
          `decisionReceipts.${receipt.id}.authorityGrantRefs`,
          [receipt.id],
        );
      }
      if (receipt.caseId !== tribunalCase.caseId) {
        add(
          "RECEIPT_CASE_DIGEST_MISMATCH",
          `decisionReceipts.${receipt.id}.caseId`,
          [receipt.id],
        );
      }
      if (receipt.caseDigest !== caseBasisDigest) {
        add(
          "RECEIPT_CASE_DIGEST_MISMATCH",
          `decisionReceipts.${receipt.id}.caseDigest`,
          [receipt.id],
        );
      }
      if (receipt.decision.authorityId !== tribunalCase.humanAuthorityId) {
        add(
          "DECISION_OWNER_MISMATCH",
          `decisionReceipts.${receipt.id}.decision.authorityId`,
          [receipt.decision.authorityId],
        );
      } else if (
        humanAuthorityPrincipal &&
        !trustedHumanAuthorityPrincipals.has(humanAuthorityPrincipal)
      ) {
        add(
          "DECISION_AUTHORITY_UNTRUSTED",
          `decisionReceipts.${receipt.id}.decision.authorityId`,
          [receipt.decision.authorityId],
        );
      }
      if (receipt.effect !== tribunalCase.proposedEffect) {
        add(
          "RECEIPT_EFFECT_MISMATCH",
          `decisionReceipts.${receipt.id}.effect`,
          [receipt.effect, tribunalCase.proposedEffect],
        );
      }
      const receiptDigestValid =
        computeDecisionReceiptContentDigest(receipt) === receipt.contentDigest;
      if (!receiptDigestValid) {
        add(
          "RECEIPT_CONTENT_HASH_MISMATCH",
          `decisionReceipts.${receipt.id}.contentDigest`,
          [receipt.id],
        );
      } else if (!context.verifyDecisionReceipt) {
        add("DECISION_VERIFIER_UNAVAILABLE", `decisionReceipts.${receipt.id}`, [
          receipt.id,
        ]);
      } else {
        let authenticated = false;
        try {
          authenticated =
            context.verifyDecisionReceipt({
              receipt: DecisionReceiptSchema.parse(receipt),
              caseDigest: receipt.caseDigest,
              now: new Date(nowMs),
            }) === true;
        } catch {
          authenticated = false;
        }
        if (!authenticated) {
          add(
            "DECISION_AUTHENTICATION_FAILED",
            `decisionReceipts.${receipt.id}`,
            [receipt.id],
          );
        }
      }
      const isEffectiveReceipt = receipt.id === effectiveReceipt?.id;
      if (!context.consumedReceiptDigests) {
        if (isEffectiveReceipt) {
          add("REPLAY_CHECK_REQUIRED", `decisionReceipts.${receipt.id}`, [
            receipt.id,
          ]);
        }
      } else {
        const replayKey = computeDecisionReceiptReplayKey(receipt);
        let replayStateAvailable = true;
        let consumed: string | undefined;
        let hasConsumed = false;
        try {
          hasConsumed = context.consumedReceiptDigests.has(replayKey);
          consumed = context.consumedReceiptDigests.get(replayKey);
        } catch {
          replayStateAvailable = false;
        }
        if (!replayStateAvailable) {
          if (isEffectiveReceipt) {
            add("REPLAY_CHECK_REQUIRED", `decisionReceipts.${receipt.id}`, [
              receipt.id,
            ]);
          }
        } else if (hasConsumed && consumed !== receipt.contentDigest) {
          add("DECISION_RECEIPT_TAMPERED", `decisionReceipts.${receipt.id}`, [
            receipt.id,
          ]);
        } else if (isEffectiveReceipt && hasConsumed) {
          add("DECISION_RECEIPT_REPLAYED", `decisionReceipts.${receipt.id}`, [
            receipt.id,
          ]);
        } else if (isEffectiveReceipt) {
          replayWrites.push({
            key: replayKey,
            expectedDigest: null,
            nextDigest: receipt.contentDigest,
          });
        }
      }
      const issuedAt = Date.parse(receipt.issuedAt);
      const rollbackDeadline = receipt.reversibility.deadline
        ? Date.parse(receipt.reversibility.deadline)
        : undefined;
      if (
        issuedAt < Date.parse(tribunalCase.evaluatedAt) ||
        issuedAt > nowMs ||
        receipt.decision.decidedAt !== receipt.issuedAt
      ) {
        add(
          "TEMPORAL_ORDER_INVALID",
          `decisionReceipts.${receipt.id}.issuedAt`,
          [receipt.id],
        );
      }
      if (rollbackDeadline !== undefined && rollbackDeadline <= issuedAt) {
        add(
          "TEMPORAL_ORDER_INVALID",
          `decisionReceipts.${receipt.id}.reversibility.deadline`,
          [receipt.id],
        );
      }
      if (
        isEffectiveReceipt &&
        receipt.decision.decision === "approved" &&
        receipt.reversibility.kind === "reversible" &&
        rollbackDeadline !== undefined &&
        rollbackDeadline <= nowMs
      ) {
        add(
          "EFFECTIVE_ROLLBACK_WINDOW_EXPIRED",
          `decisionReceipts.${receipt.id}.reversibility.deadline`,
          [receipt.id],
        );
      }
    }
  }

  if (
    Date.parse(tribunalCase.openedAt) > Date.parse(tribunalCase.evaluatedAt) ||
    Date.parse(tribunalCase.evaluatedAt) > nowMs
  ) {
    add("TEMPORAL_ORDER_INVALID", "evaluatedAt", [tribunalCase.caseId]);
  }

  const acceptedEvidence = effectiveReceipt
    ? new Set(effectiveReceipt.acceptedEvidenceClaimIds)
    : undefined;
  const evidenceAcceptedForActivation = (ids: ReadonlySet<string>): boolean =>
    acceptedEvidence === undefined ||
    [...ids].every((id) => acceptedEvidence.has(id));
  const actionEvidenceAccepted = evidenceAcceptedForActivation(
    evidenceConsumedByAction,
  );
  const matchingVerdictPermitsEffect =
    actionEvidenceAccepted &&
    tribunalCase.verdicts.some((verdict) => {
      const closure = evidenceClosureByVerdictId.get(verdict.id);
      return (
        verdict.authorityEffectRequested === tribunalCase.proposedEffect &&
        evaluatorEffectWithinGrant[verdict.id] === true &&
        closure !== undefined &&
        evidenceAcceptedForActivation(closure)
      );
    });
  const humanDecisionPermitsEffect = humanDecisionCanActivate;
  let effectAlreadyApplied = false;
  let effectIdempotencyWrite:
    | NonNullable<
        NonNullable<TribunalValidationResult["commitTransition"]>["effect"]
      >["idempotencyWrite"]
    | undefined;
  if (
    values().length === 0 &&
    matchingVerdictPermitsEffect &&
    humanDecisionPermitsEffect &&
    actionManifest
  ) {
    const key = digestCanonical(
      {
        caseId: tribunalCase.caseId,
        actionDigest: tribunalCase.operatingScope.actionDigest,
        selectedCandidateDigest: actionManifest.selectedCandidateDigest,
      },
      "quirk.tribunal.activation-idempotency-key.v1",
    );
    const nextDigest = digestCanonical(
      {
        caseId: tribunalCase.caseId,
        actionDigest: tribunalCase.operatingScope.actionDigest,
        selectedCandidateDigest: actionManifest.selectedCandidateDigest,
      },
      "quirk.tribunal.activation-state.v1",
    );
    if (!context.appliedEffectDigests) {
      add("EFFECT_IDEMPOTENCY_CHECK_REQUIRED", "operatingScope.actionDigest", [
        tribunalCase.caseId,
      ]);
    } else {
      try {
        const hasApplied = context.appliedEffectDigests.has(key);
        const appliedDigest = context.appliedEffectDigests.get(key);
        if (hasApplied && appliedDigest !== nextDigest) {
          add(
            "EFFECT_IDEMPOTENCY_STATE_MISMATCH",
            "operatingScope.actionDigest",
            [tribunalCase.caseId],
          );
        } else if (hasApplied) {
          effectAlreadyApplied = true;
        } else {
          effectIdempotencyWrite = {
            key,
            expectedDigest: null,
            nextDigest,
          };
        }
      } catch {
        add(
          "EFFECT_IDEMPOTENCY_CHECK_REQUIRED",
          "operatingScope.actionDigest",
          [tribunalCase.caseId],
        );
      }
    }
  }
  const preCommitIssues = values();
  const effectEligible =
    preCommitIssues.length === 0 &&
    matchingVerdictPermitsEffect &&
    humanDecisionPermitsEffect;
  const effectExpiryCandidates = [
    ...verifiedAuthorityGrants.map(({ grant }) => Date.parse(grant.expiresAt)),
    ...tribunalCase.evaluatorDeclarations.map((declaration) =>
      Date.parse(declaration.fallibility.calibrationValidUntil),
    ),
    ...tribunalCase.evidenceClaims.map((claim) => Date.parse(claim.validUntil)),
    ...(effectiveReceipt?.reversibility.kind === "reversible" &&
    effectiveReceipt.reversibility.deadline
      ? [Date.parse(effectiveReceipt.reversibility.deadline)]
      : []),
  ];
  const effectValidUntil = new Date(
    effectExpiryCandidates.length > 0
      ? Math.min(...effectExpiryCandidates)
      : nowMs,
  ).toISOString();
  const commitTransitionBasis: Omit<
    TribunalCommitTransition,
    "transitionDigest"
  > | null =
    preCommitIssues.length === 0 && receiptHeadTransition && policyStateVersion
      ? {
          caseId: tribunalCase.caseId,
          preconditions: {
            policyState: { expectedVersion: policyStateVersion },
          },
          stateWrites: {
            receiptHead: receiptHeadTransition,
            replayWrites: replayWrites.sort((left, right) =>
              compareUtf16(left.key, right.key),
            ),
            receiptAppends,
          },
          effect:
            effectEligible &&
            actionManifest &&
            selectedCandidateBytes &&
            effectIdempotencyWrite &&
            !effectAlreadyApplied
              ? {
                  actionDigest: tribunalCase.operatingScope.actionDigest,
                  selectedCandidate: {
                    digest: actionManifest.selectedCandidateDigest,
                    encoding: "base64",
                    bytes: Buffer.from(selectedCandidateBytes).toString(
                      "base64",
                    ),
                    byteLength: selectedCandidateBytes.byteLength,
                  },
                  proposedEffect: tribunalCase.proposedEffect,
                  purposeId: tribunalCase.operatingScope.purposeId,
                  tenantId: tribunalCase.operatingScope.tenantId,
                  audienceId: tribunalCase.operatingScope.audienceId,
                  destinationId: tribunalCase.operatingScope.destinationId,
                  validatedAt: new Date(nowMs).toISOString(),
                  validUntil: effectValidUntil,
                  decisionReceipt: effectiveReceipt
                    ? effectiveReceipt.reversibility.kind === "reversible"
                      ? {
                          contentDigest: effectiveReceipt.contentDigest,
                          reversibilityKind: "reversible" as const,
                          rollbackRef:
                            effectiveReceipt.reversibility.rollbackRef,
                          rollbackDeadline:
                            effectiveReceipt.reversibility.deadline,
                        }
                      : {
                          contentDigest: effectiveReceipt.contentDigest,
                          reversibilityKind: "irreversible" as const,
                          rollbackRef: null,
                          rollbackDeadline: null,
                        }
                    : null,
                  preconditions: {
                    executeBefore: effectValidUntil,
                    grantLifecycles: verifiedAuthorityGrants
                      .map(
                        ({
                          grant,
                          grantDigest,
                          keyReference,
                          lifecycleVersion,
                        }) => ({
                          grant: {
                            issuer: grant.issuer,
                            grantId: grant.grantId,
                            grantDigest,
                            nonce: grant.nonce,
                          },
                          signingKey: keyReference,
                          expectedState: "active" as const,
                          expectedVersion: lifecycleVersion,
                        }),
                      )
                      .sort((left, right) =>
                        compareUtf16(
                          left.grant.grantDigest,
                          right.grant.grantDigest,
                        ),
                      ),
                  },
                  idempotencyWrite: effectIdempotencyWrite,
                }
              : null,
        }
      : null;
  let commitTransition: TribunalCommitTransition | null = null;
  if (commitTransitionBasis) {
    const parsedTransition = TribunalCommitTransitionSchema.safeParse({
      ...commitTransitionBasis,
      transitionDigest: computeTribunalCommitTransitionDigest(
        commitTransitionBasis,
      ),
    });
    if (parsedTransition.success) {
      commitTransition = parsedTransition.data;
    } else {
      add("COMMIT_TRANSITION_INVALID", "commitTransition", [
        tribunalCase.caseId,
      ]);
    }
  }
  const issues = values();
  if (issues.length > 0) {
    commitTransition = null;
    for (const verdictId of Object.keys(evaluatorEffectWithinGrant)) {
      evaluatorEffectWithinGrant[verdictId] = false;
    }
  }
  return {
    ok: issues.length === 0,
    issues,
    verifiedAuthorityGrants: issues.length === 0 ? verifiedAuthorityGrants : [],
    evaluatorEffectWithinGrant,
    commitTransition,
  };
}
