import { z } from "zod";

export const StableIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const DesignArtifactKindSchema = z.enum([
  "app",
  "surface",
  "component",
  "design_system",
  "document",
  "template",
  "campaign",
  "email",
  "deck",
  "service",
  "skill",
  "experience",
  "other",
]);

export const DesignReviewModeSchema = z.enum([
  "lite",
  "standard",
  "one_of_one",
]);

export const DesignCriticRoleSchema = z.enum([
  "design_systems",
  "experience",
  "quirk_distinctiveness",
  "referee",
]);

export const DesignFindingVerdictSchema = z.enum([
  "pass",
  "fail",
  "unresolved",
]);

export const DesignFindingSeveritySchema = z.enum([
  "blocker",
  "major",
  "minor",
  "note",
]);

export const DesignFindingResolutionSchema = z.enum([
  "open",
  "fixed",
  "waived",
  "false_alarm",
  "verified",
]);

export const DesignEvidenceKindSchema = z.enum([
  "test_result",
  "screenshot",
  "accessibility_tree",
  "code_reference",
  "token_diff",
  "rendered_output",
  "user_observation",
  "source_reference",
]);

export const DesignEvidenceSchema = z.object({
  kind: DesignEvidenceKindSchema,
  locator: z.string().min(1),
  summary: z.string().min(1),
  digest: z.string().min(1).optional(),
});

export const DesignCriterionSchema = z.object({
  id: StableIdSchema,
  title: z.string().min(1),
  dimension: z.enum([
    "integrity",
    "accessibility",
    "usability",
    "design_system",
    "responsiveness",
    "content",
    "performance",
    "distinctiveness",
    "provenance",
    "security",
    "authority",
  ]),
  requirement: z.string().min(1),
  gate: z.enum(["deterministic", "critic", "human"]),
  evidenceRequired: z.array(DesignEvidenceKindSchema).min(1),
  blocksRelease: z.boolean(),
});

export const DesignBudgetSchema = z.object({
  maxRounds: z.number().int().min(0).max(10),
  maxCandidates: z.number().int().min(1).max(4),
  maxInputTokens: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  maxWallClockMs: z.number().int().positive().optional(),
});

export const DesignReviewRequestSchema = z
  .object({
    id: StableIdSchema,
    artifactId: z.string().uuid().optional(),
    artifactKind: DesignArtifactKindSchema,
    artifactLocator: z.string().min(1),
    brief: z.string().min(1),
    audience: z.string().min(1),
    desiredOutcome: z.string().min(1),
    baselineLocator: z.string().min(1).optional(),
    noBaselineReason: z.string().min(1).optional(),
    designSystemVersion: z.string().min(1).optional(),
    prohibitedChanges: z.array(z.string().min(1)),
    criteria: z.array(DesignCriterionSchema).min(1),
    mode: DesignReviewModeSchema,
    budget: DesignBudgetSchema,
    humanApprovalRequired: z.boolean(),
    humanAuthorityId: z.string().min(1).optional(),
    sourceRefs: z.array(z.string().min(1)),
  })
  .superRefine((request, context) => {
    if (!request.baselineLocator && !request.noBaselineReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baselineLocator"],
        message:
          "Provide a baseline locator or explain why no baseline exists.",
      });
    }

    if (request.baselineLocator && request.noBaselineReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["noBaselineReason"],
        message:
          "Use either a baseline locator or a no-baseline reason, not both.",
      });
    }

    if (request.mode === "one_of_one" && request.budget.maxCandidates < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["budget", "maxCandidates"],
        message:
          "One-of-one mode requires at least two independent candidates.",
      });
    }

    if (request.humanApprovalRequired && !request.humanAuthorityId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["humanAuthorityId"],
        message: "Name the human authority required for approval.",
      });
    }
  });

export const DesignFindingSchema = z.object({
  id: StableIdSchema,
  runId: StableIdSchema,
  criterionId: StableIdSchema,
  criticRole: DesignCriticRoleSchema,
  verdict: DesignFindingVerdictSchema,
  severity: DesignFindingSeveritySchema,
  claim: z.string().min(1),
  evidence: z.array(DesignEvidenceSchema).min(1),
  remediation: z.string().min(1).nullable(),
  confidence: z.number().min(0).max(1),
  blocksRelease: z.boolean(),
  resolutionStatus: DesignFindingResolutionSchema,
  createdAt: z.string().datetime({ offset: true }),
});

export const DesignReleaseStatusSchema = z.enum([
  "pass",
  "pass_with_debt",
  "fail",
  "unresolved",
  "budget_exhausted",
  "human_required",
]);

export const HumanDecisionSchema = z
  .object({
    decision: z.enum(["approved", "rejected", "waived", "superseded"]),
    authorityType: z.literal("human"),
    authorityId: z.string().min(1),
    rationale: z.string().min(1),
    decidedAt: z.string().datetime({ offset: true }),
  })
  .strict();

/** Backward-compatible name for the canonical human decision schema. */
export const DesignHumanDecisionSchema = HumanDecisionSchema;

export const DesignReviewReportSchema = z.object({
  runId: StableIdSchema,
  request: DesignReviewRequestSchema,
  findings: z.array(DesignFindingSchema),
  status: DesignReleaseStatusSchema,
  budgetExhausted: z.boolean(),
  repairQueue: z.array(StableIdSchema),
  humanDecision: DesignHumanDecisionSchema.optional(),
  rationale: z.string().min(1),
  completedAt: z.string().datetime({ offset: true }),
});

export type DesignArtifactKind = z.infer<typeof DesignArtifactKindSchema>;
export type DesignReviewMode = z.infer<typeof DesignReviewModeSchema>;
export type DesignCriticRole = z.infer<typeof DesignCriticRoleSchema>;
export type DesignEvidence = z.infer<typeof DesignEvidenceSchema>;
export type DesignCriterion = z.infer<typeof DesignCriterionSchema>;
export type DesignReviewRequest = z.infer<typeof DesignReviewRequestSchema>;
export type DesignFinding = z.infer<typeof DesignFindingSchema>;
export type DesignReleaseStatus = z.infer<typeof DesignReleaseStatusSchema>;
export type HumanDecision = z.infer<typeof HumanDecisionSchema>;
export type DesignHumanDecision = HumanDecision;
export type DesignReviewReport = z.infer<typeof DesignReviewReportSchema>;

const TERMINAL_RESOLUTIONS = new Set<DesignFinding["resolutionStatus"]>([
  "fixed",
  "waived",
  "false_alarm",
  "verified",
]);

export function deriveReleaseStatus(input: {
  findings: readonly DesignFinding[];
  budgetExhausted?: boolean;
  humanApprovalRequired?: boolean;
  humanApproved?: boolean;
}): DesignReleaseStatus {
  const actionable = input.findings.filter(
    (finding) => !TERMINAL_RESOLUTIONS.has(finding.resolutionStatus),
  );
  const blocking = actionable.filter(
    (finding) => finding.blocksRelease || finding.severity === "blocker",
  );

  if (
    input.budgetExhausted &&
    actionable.some((finding) => finding.verdict !== "pass")
  ) {
    return "budget_exhausted";
  }

  if (blocking.some((finding) => finding.verdict === "unresolved")) {
    return "unresolved";
  }

  if (blocking.some((finding) => finding.verdict === "fail")) {
    return "fail";
  }

  if (input.humanApprovalRequired && !input.humanApproved) {
    return "human_required";
  }

  if (actionable.some((finding) => finding.verdict !== "pass")) {
    return "pass_with_debt";
  }

  return "pass";
}
