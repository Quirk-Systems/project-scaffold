import { z } from "zod";

export const CONSTITUTIONAL_INVARIANTS = [
  "capability_implies_authority = false",
  "evaluation_implies_authority = false",
  "confidence_implies_authority = false",
  "consensus_implies_authority = false",
  "projection_implies_canon = false",
  "evaluator_self_escalation = false",
] as const;

const EffectSetSchema = z.object({
  may_observe: z.array(z.string().min(1)).default([]),
  may_recommend: z.array(z.string().min(1)).default([]),
  may_block: z.array(z.string().min(1)).default([]),
  may_approve: z.array(z.string().min(1)).default([]),
});

export const AuthorityGrantSchema = z
  .object({
    grant_id: z.string().min(1),
    principal: z.string().min(1),
    grantee: z.string().min(1),
    grant_scope: z.object({
      realms: z.array(z.string().min(1)).min(1),
      subjects: z.array(z.string().min(1)).min(1),
      target_classes: z.array(z.string().min(1)).min(1),
    }),
    permitted_verdict_effects: EffectSetSchema,
    issued_at: z.string().datetime({ offset: true }),
    expires_at: z.string().datetime({ offset: true }),
    revoked_at: z.string().datetime({ offset: true }).optional(),
    superseded_by_grant_id: z.string().min(1).optional(),
    supersedes_grant_id: z.string().min(1).optional(),
    delegation: z.object({
      allow_delegation: z.boolean(),
    }),
    delegated_from_grant_id: z.string().min(1).optional(),
    evidence_requirement: z.object({
      required: z.boolean(),
      classes: z.array(z.string().min(1)),
    }),
    grant_hash: z.string().min(1),
  })
  .superRefine((value, context) => {
    if (
      new Date(value.expires_at).getTime() <=
      new Date(value.issued_at).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expires_at"],
        message: "expires_at must be after issued_at",
      });
    }

    if (value.superseded_by_grant_id === value.grant_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["superseded_by_grant_id"],
        message: "grant cannot supersede itself",
      });
    }

    if (
      value.delegated_from_grant_id &&
      value.delegation.allow_delegation === false
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delegated_from_grant_id"],
        message: "grant cannot delegate unless explicitly allowed",
      });
    }
  });

export const EvaluatorDeclarationSchema = z.object({
  identity: z.object({
    evaluator_id: z.string().min(1),
    evaluator_type: z.string().min(1),
    version: z.string().min(1),
  }),
  inspection: z.object({
    can_inspect: z.array(z.string().min(1)),
    cannot_inspect: z.array(z.string().min(1)),
    tools: z.array(z.string().min(1)),
    evidence_classes: z.array(z.string().min(1)),
    temporal_boundary: z.string().min(1),
  }),
  fallibility: z.object({
    known_failure_modes: z.array(z.string().min(1)),
    calibration_evidence: z.array(z.string().min(1)),
    error_tendencies: z.array(z.string().min(1)),
    unresolved_blind_spots: z.array(z.string().min(1)),
  }),
  authority: z.object({
    grant_id: z.string().min(1),
    may_observe: z.array(z.string().min(1)),
    may_recommend: z.array(z.string().min(1)),
    may_block: z.array(z.string().min(1)),
    may_approve: z.array(z.string().min(1)),
    prohibited_effects: z.array(z.string().min(1)),
  }),
  provenance: z.object({
    declaration_hash: z.string().min(1),
    canonical_version: z.string().min(1),
  }),
});

export const EvidenceClaimSchema = z.object({
  evidence_claim: z.object({
    id: z.string().min(1),
    claim: z.string().min(1),
    source_type: z.string().min(1),
    source_ref: z.string().min(1),
    observable: z.string().min(1),
    inspected_by: z.string().min(1),
    inspection_method: z.string().min(1),
    confidence: z.number().min(0).max(1),
    limitations: z.array(z.string().min(1)),
    retention_class: z.string().min(1),
    content_hash: z.string().min(1),
  }),
});

export const TribunalVerdictSchema = z.object({
  tribunal_verdict: z.object({
    id: z.string().min(1),
    evaluator_declaration_id: z.string().min(1),
    authority_grant_id: z.string().min(1),
    subject: z.string().min(1),
    claim: z.string().min(1),
    disposition: z.enum([
      "SUPPORTED",
      "CONTRADICTED",
      "INSUFFICIENT",
      "OUT_OF_SCOPE",
      "DISPUTED",
    ]),
    evidence_claim_ids: z.array(z.string().min(1)),
    confidence: z.number().min(0).max(1),
    uncertainty: z.array(z.string().min(1)),
    dissent: z.array(z.string().min(1)),
    authority_effect_requested: EffectSetSchema,
    authority_effect_permitted: EffectSetSchema,
    provenance: z.object({
      trajectory_id: z.string().min(1),
      evaluator_version: z.string().min(1),
      declaration_hash: z.string().min(1),
      evidence_hashes: z.array(z.string().min(1)),
    }),
  }),
});

export const DecisionReceiptSchema = z.object({
  decision_receipt: z.object({
    id: z.string().min(1),
    decision: z.string().min(1),
    decision_authority: z.string().min(1),
    decision_owner: z.string().min(1),
    considered_verdicts: z.array(z.string().min(1)),
    accepted_evidence_claims: z.array(z.string().min(1)),
    rejected_or_disputed_evidence: z.array(z.string().min(1)),
    authority_grant_refs: z.array(z.string().min(1)),
    rationale: z.string().min(1),
    reversibility: z.string().min(1),
    issued_at: z.string().datetime({ offset: true }),
    content_hash: z.string().min(1),
  }),
});

export type AuthorityGrant = z.infer<typeof AuthorityGrantSchema>;
export type EvaluatorDeclaration = z.infer<typeof EvaluatorDeclarationSchema>;
export type EvidenceClaim = z.infer<typeof EvidenceClaimSchema>;
export type TribunalVerdict = z.infer<typeof TribunalVerdictSchema>;
export type DecisionReceipt = z.infer<typeof DecisionReceiptSchema>;

type EffectSet = z.infer<typeof EffectSetSchema>;

type ValidationResult = {
  ok: boolean;
  reason?: string;
};

function subset(requested: string[], granted: string[]): boolean {
  return requested.every((value) => granted.includes(value));
}

function effectSubset(requested: EffectSet, granted: EffectSet): boolean {
  return (
    subset(requested.may_observe, granted.may_observe) &&
    subset(requested.may_recommend, granted.may_recommend) &&
    subset(requested.may_block, granted.may_block) &&
    subset(requested.may_approve, granted.may_approve)
  );
}

export function validateGrantIsActive(
  grant: AuthorityGrant,
  now = new Date(),
): ValidationResult {
  const expiresAt = new Date(grant.expires_at).getTime();
  if (expiresAt <= now.getTime()) return { ok: false, reason: "expired_grant" };
  if (grant.revoked_at) return { ok: false, reason: "revoked_grant" };
  if (grant.superseded_by_grant_id)
    return { ok: false, reason: "superseded_grant" };
  return { ok: true };
}

export function validateDeclarationAgainstGrant(input: {
  declaration: EvaluatorDeclaration;
  grant: AuthorityGrant;
}): ValidationResult {
  const { declaration, grant } = input;
  if (declaration.identity.evaluator_id !== grant.grantee) {
    return { ok: false, reason: "declaration_grantee_mismatch" };
  }

  if (declaration.authority.grant_id !== grant.grant_id) {
    return { ok: false, reason: "grant_mismatch" };
  }

  const declarationEffects: EffectSet = {
    may_observe: declaration.authority.may_observe,
    may_recommend: declaration.authority.may_recommend,
    may_block: declaration.authority.may_block,
    may_approve: declaration.authority.may_approve,
  };

  if (!effectSubset(declarationEffects, grant.permitted_verdict_effects)) {
    return { ok: false, reason: "declaration_authority_not_granted" };
  }

  return { ok: true };
}

export function validateVerdictAgainstGrant(input: {
  verdict: TribunalVerdict;
  declaration: EvaluatorDeclaration;
  grant: AuthorityGrant;
  evidenceClaims: EvidenceClaim[];
  now?: Date;
}): ValidationResult {
  const { verdict, declaration, grant, evidenceClaims, now } = input;
  const parsedVerdict = verdict.tribunal_verdict;

  const active = validateGrantIsActive(grant, now);
  if (!active.ok) return active;

  const declarationResult = validateDeclarationAgainstGrant({
    declaration,
    grant,
  });
  if (!declarationResult.ok) return declarationResult;

  if (parsedVerdict.authority_grant_id !== grant.grant_id) {
    return { ok: false, reason: "grant_mismatch" };
  }
  if (
    parsedVerdict.evaluator_declaration_id !== declaration.identity.evaluator_id
  ) {
    return { ok: false, reason: "declaration_reference_mismatch" };
  }

  if (
    grant.evidence_requirement.required &&
    parsedVerdict.evidence_claim_ids.length === 0
  ) {
    return { ok: false, reason: "evidence_required" };
  }

  const evidenceById = new Map(
    evidenceClaims.map((claim) => [claim.evidence_claim.id, claim]),
  );
  const declarationEffects: EffectSet = {
    may_observe: declaration.authority.may_observe,
    may_recommend: declaration.authority.may_recommend,
    may_block: declaration.authority.may_block,
    may_approve: declaration.authority.may_approve,
  };

  for (const evidenceId of parsedVerdict.evidence_claim_ids) {
    const claim = evidenceById.get(evidenceId);
    if (!claim) return { ok: false, reason: "missing_evidence" };

    if (claim.evidence_claim.source_type === "tribunal_verdict") {
      return { ok: false, reason: "secondary_verdict_not_primary_evidence" };
    }

    if (
      declaration.inspection.cannot_inspect.includes(
        claim.evidence_claim.observable,
      )
    ) {
      return { ok: false, reason: "out_of_scope" };
    }

    if (
      !declaration.inspection.can_inspect.includes(
        claim.evidence_claim.observable,
      )
    ) {
      return { ok: false, reason: "out_of_scope" };
    }

    if (
      !grant.evidence_requirement.classes.includes(
        claim.evidence_claim.observable,
      )
    ) {
      return { ok: false, reason: "evidence_class_not_granted" };
    }
  }

  if (
    (parsedVerdict.disposition === "OUT_OF_SCOPE" ||
      parsedVerdict.disposition === "INSUFFICIENT" ||
      parsedVerdict.disposition === "DISPUTED") &&
    (parsedVerdict.authority_effect_requested.may_approve.length > 0 ||
      parsedVerdict.authority_effect_requested.may_block.length > 0)
  ) {
    return { ok: false, reason: "fail_closed_for_non_terminal_disposition" };
  }

  if (
    !effectSubset(
      parsedVerdict.authority_effect_requested,
      grant.permitted_verdict_effects,
    )
  ) {
    return { ok: false, reason: "requested_effect_not_granted" };
  }
  if (
    !effectSubset(parsedVerdict.authority_effect_requested, declarationEffects)
  ) {
    return { ok: false, reason: "requested_effect_not_declared" };
  }

  if (
    !effectSubset(
      parsedVerdict.authority_effect_permitted,
      grant.permitted_verdict_effects,
    )
  ) {
    return { ok: false, reason: "permitted_effect_not_granted" };
  }
  if (
    !effectSubset(parsedVerdict.authority_effect_permitted, declarationEffects)
  ) {
    return { ok: false, reason: "permitted_effect_not_declared" };
  }

  return { ok: true };
}

export function validateDecisionReceipt(input: {
  receipt: DecisionReceipt;
  verdict: TribunalVerdict;
  grant: AuthorityGrant;
  verdictAdmissible: boolean;
}): ValidationResult {
  const { receipt, verdict, grant, verdictAdmissible } = input;
  const decisionReceipt = receipt.decision_receipt;

  if (!decisionReceipt.authority_grant_refs.includes(grant.grant_id)) {
    return { ok: false, reason: "receipt_missing_authority_ref" };
  }

  if (
    !decisionReceipt.considered_verdicts.includes(verdict.tribunal_verdict.id)
  ) {
    return { ok: false, reason: "receipt_missing_verdict_ref" };
  }

  if (!verdictAdmissible && decisionReceipt.decision === "authorized") {
    return { ok: false, reason: "receipt_authorized_inadmissible_verdict" };
  }

  return { ok: true };
}
