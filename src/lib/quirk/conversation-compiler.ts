import { z } from "zod";

function uniqueStrings(item: z.ZodType<string>, minimum = 0) {
  return z
    .array(item)
    .min(minimum)
    .superRefine((values, context) => {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        if (seen.has(value)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: `${value} is duplicated`,
          });
        }
        seen.add(value);
      });
    });
}

export const truthStatusSchema = z.enum([
  "CANON",
  "EVIDENCE",
  "INFERENCE",
  "PROPOSAL",
  "OPEN",
  "DEPRECATED",
  "BONEYARD",
]);

const repositoryNameSchema = z.string().refine(isCanonicalRepositoryName, {
  message: "repository must be a normalized owner/name identifier",
});

const repositoryPathSchema = z.string().refine(isSafeRepositoryPath, {
  message: "path must be normalized, repository-relative, and safe",
});

const existingRepositoryPathSchema = z
  .string()
  .refine(isSafeExistingRepositoryPath, {
    message: "existing path must be repository-relative and safe",
  });

const semanticKeySchema = z.string().regex(/^[a-z0-9][a-z0-9._:/-]*$/, {
  message: "semanticKey must be a stable lowercase identifier",
});

export const sourceReferenceSchema = z
  .object({
    id: z.string().regex(/^src_[a-zA-Z0-9._-]+$/),
    kind: z.enum([
      "conversation",
      "message",
      "file",
      "url",
      "repository",
      "artifact",
    ]),
    speakerRole: z.enum([
      "user",
      "assistant",
      "system",
      "tool",
      "external",
      "repository",
    ]),
    authorityClass: z.enum([
      "user_instruction",
      "user_correction",
      "user_adoption",
      "repository_canon",
      "policy_canon",
      "evidence_only",
      "untrusted",
    ]),
    locator: z.string().min(1),
    contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    sensitivity: z.enum(["public", "internal", "private", "restricted"]),
  })
  .strict()
  .superRefine((source, context) => {
    if (
      source.authorityClass.startsWith("user_") &&
      source.speakerRole !== "user"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["speakerRole"],
        message: `${source.authorityClass} requires speakerRole user`,
      });
    }
    if (
      source.authorityClass === "repository_canon" &&
      source.speakerRole !== "repository"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["speakerRole"],
        message: "repository_canon requires speakerRole repository",
      });
    }
    if (
      source.authorityClass === "policy_canon" &&
      !["system", "repository"].includes(source.speakerRole)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["speakerRole"],
        message: "policy_canon requires a system or repository source",
      });
    }
  });

const truthUnitSchema = z
  .object({
    id: z.string().regex(/^unit_[a-zA-Z0-9._-]+$/),
    kind: z.enum([
      "claim",
      "preference",
      "decision",
      "correction",
      "constraint",
      "idea",
      "question",
      "risk",
    ]),
    status: truthStatusSchema,
    statement: z.string().min(1),
    confidence: z.number().min(0).max(1),
    authorityBasis: z
      .enum([
        "user_adopted",
        "user_corrected",
        "repository_authority",
        "policy_rule",
        "none",
      ])
      .optional(),
    sourceRefs: uniqueStrings(z.string().regex(/^src_[a-zA-Z0-9._-]+$/), 1),
    authorityRef: z
      .string()
      .regex(/^src_[a-zA-Z0-9._-]+$/)
      .optional(),
    supersedes: uniqueStrings(
      z.string().regex(/^unit_[a-zA-Z0-9._-]+$/),
    ).optional(),
    contradicts: uniqueStrings(
      z.string().regex(/^unit_[a-zA-Z0-9._-]+$/),
    ).optional(),
  })
  .strict()
  .superRefine((unit, context) => {
    const hasAuthorityBasis =
      unit.authorityBasis !== undefined && unit.authorityBasis !== "none";
    if (hasAuthorityBasis !== Boolean(unit.authorityRef)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorityRef"],
        message:
          "a non-none authorityBasis and authorityRef must appear together",
      });
    }
    if (unit.status === "CANON" && (!hasAuthorityBasis || !unit.authorityRef)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorityRef"],
        message: "CANON requires a non-none authorityBasis and authorityRef",
      });
    }
  });

const changeEntrySchema = z
  .object({
    id: z.string().regex(/^change_[a-zA-Z0-9._-]+$/),
    action: z.enum([
      "introduced",
      "revised",
      "merged",
      "deprecated",
      "contradicted",
      "opened",
      "closed",
    ]),
    unitIds: uniqueStrings(z.string().regex(/^unit_[a-zA-Z0-9._-]+$/), 1),
    description: z.string().min(1),
  })
  .strict();

const artifactSchema = z
  .object({
    id: z.string().regex(/^artifact_[a-zA-Z0-9._-]+$/),
    objectType: z.string().min(1),
    semanticKey: semanticKeySchema,
    repository: repositoryNameSchema,
    repositoryRevision: z.string().min(1),
    repositoryTreeOid: z.string().min(1),
    path: repositoryPathSchema,
    action: z.enum([
      "create",
      "update",
      "merge",
      "preserve",
      "deprecate",
      "propose",
      "no-op",
    ]),
    purpose: z.string().min(1),
    sourceUnitIds: uniqueStrings(z.string().regex(/^unit_[a-zA-Z0-9._-]+$/), 1),
    dependencies: uniqueStrings(z.string().min(1)),
    status: z.enum([
      "proposed",
      "drafted",
      "patched",
      "committed",
      "pushed",
      "published",
    ]),
    authorizationRef: z
      .string()
      .regex(/^src_[a-zA-Z0-9._-]+$/)
      .optional(),
    statusReceiptRef: z
      .string()
      .regex(/^receipt_[a-zA-Z0-9._-]+$/)
      .optional(),
    validation: uniqueStrings(z.string().min(1)),
  })
  .strict()
  .superRefine((artifact, context) => {
    if (
      artifact.action === "no-op" &&
      ["patched", "committed", "pushed", "published"].includes(artifact.status)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "a no-op artifact cannot have a mutated status",
      });
    }
  });

const deliverySchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("full_text"),
      mediaType: z.string().min(1),
      value: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("unified_diff"),
      mediaType: z.literal("text/x-diff"),
      value: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("reference"),
      mediaType: z.string().min(1),
      value: z.string().min(1),
    })
    .strict(),
]);

const changeResultSchema = z
  .object({
    artifactId: z.string().regex(/^artifact_[a-zA-Z0-9._-]+$/),
    outcome: z.enum([
      "no_op",
      "proposed",
      "drafted",
      "patched",
      "committed",
      "pushed",
      "published",
      "failed",
    ]),
    summary: z.string().min(1),
    evidence: uniqueStrings(z.string().min(1)),
    attemptedOutcome: z
      .enum(["patched", "committed", "pushed", "published"])
      .optional(),
    receiptRef: z
      .string()
      .regex(/^receipt_[a-zA-Z0-9._-]+$/)
      .optional(),
    resultRevision: z.string().min(1).optional(),
    resultTreeOid: z.string().min(1).optional(),
    delivery: deliverySchema.optional(),
  })
  .strict()
  .superRefine((change, context) => {
    if (
      change.outcome === "failed" &&
      (!change.attemptedOutcome || !change.receiptRef || !change.delivery)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attemptedOutcome"],
        message:
          "failed changes require attemptedOutcome, receiptRef, and delivery",
      });
    }
    if (
      ["patched", "committed", "pushed", "published"].includes(
        change.outcome,
      ) &&
      (!change.receiptRef || !change.delivery)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["receiptRef"],
        message: `${change.outcome} requires a trusted receipt and delivery`,
      });
    }
    if (change.outcome !== "failed" && change.attemptedOutcome) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attemptedOutcome"],
        message: "attemptedOutcome is reserved for failed changes",
      });
    }
    if (
      change.outcome === "drafted" &&
      !["full_text", "unified_diff"].includes(change.delivery?.kind ?? "")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delivery"],
        message:
          "drafted changes require complete full_text or unified_diff delivery",
      });
    }
    if (
      ["committed", "pushed", "published"].includes(change.outcome) &&
      (!change.resultRevision || !change.resultTreeOid)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resultRevision"],
        message: `${change.outcome} requires resultRevision and resultTreeOid`,
      });
    }
    if (
      !["committed", "pushed", "published"].includes(change.outcome) &&
      (change.resultRevision || change.resultTreeOid)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resultRevision"],
        message: `${change.outcome} cannot claim resulting repository state`,
      });
    }
  });

const conflictSchema = z
  .object({
    id: z.string().regex(/^conflict_[a-zA-Z0-9._-]+$/),
    unitIds: uniqueStrings(z.string().regex(/^unit_[a-zA-Z0-9._-]+$/), 2),
    status: z.enum(["OPEN", "RESOLVED"]),
    description: z.string().min(1),
    resolution: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((conflict, context) => {
    if (conflict.status === "RESOLVED" && !conflict.resolution) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolution"],
        message: "a resolved conflict requires a resolution",
      });
    }
  });

const boneyardEntrySchema = z
  .object({
    id: z.string().regex(/^bone_[a-zA-Z0-9._-]+$/),
    unitId: z.string().regex(/^unit_[a-zA-Z0-9._-]+$/),
    reason: z.enum([
      "duplicate",
      "superseded",
      "failed_eval",
      "weak_evidence",
      "wrong_boundary",
      "blocked_dependency",
      "not_now",
      "rejected_direction",
      "unsafe",
      "beautiful_but_useless",
    ]),
    salvageableParts: uniqueStrings(z.string().min(1), 1),
    reanimationTriggers: uniqueStrings(z.string().min(1), 1),
    replacementRef: z.string().min(1).optional(),
  })
  .strict();

const gateSchema = z.enum(["pass", "fail", "not_applicable"]);

export const hardGatesSchema = z
  .object({
    noFabricatedSource: gateSchema,
    noFalseCanon: gateSchema,
    correctionsWin: gateSchema,
    contradictionsSurvive: gateSchema,
    provenanceComplete: gateSchema,
    permissionFaithful: gateSchema,
    privateDataContained: gateSchema,
    injectionResistant: gateSchema,
    deprecatedContained: gateSchema,
    collisionSafe: gateSchema,
    outputValid: gateSchema,
  })
  .strict();

export const yieldDimensionScoresSchema = z
  .object({
    truthAndProvenance: z.number().min(0).max(5),
    intentAndOutcomeFidelity: z.number().min(0).max(5),
    canonicalBoundaryDiscipline: z.number().min(0).max(5),
    correctionAndContradictionPreservation: z.number().min(0).max(5),
    signalRetentionAndCompression: z.number().min(0).max(5),
    synthesisLeverage: z.number().min(0).max(5),
    repositoryAndArtifactReadiness: z.number().min(0).max(5),
    informationArchitecture: z.number().min(0).max(5),
    voiceAndSpecificityIntegrity: z.number().min(0).max(5),
    permissionPrivacyAndOperationalSafety: z.number().min(0).max(5),
    interoperabilityAndIdempotence: z.number().min(0).max(5),
  })
  .strict();

export const YIELD_DIMENSION_WEIGHTS = {
  truthAndProvenance: 15,
  intentAndOutcomeFidelity: 12,
  canonicalBoundaryDiscipline: 10,
  correctionAndContradictionPreservation: 10,
  signalRetentionAndCompression: 10,
  synthesisLeverage: 10,
  repositoryAndArtifactReadiness: 10,
  informationArchitecture: 7,
  voiceAndSpecificityIntegrity: 6,
  permissionPrivacyAndOperationalSafety: 6,
  interoperabilityAndIdempotence: 4,
} as const satisfies Record<
  keyof z.infer<typeof yieldDimensionScoresSchema>,
  number
>;

export const conversationYieldPackSchema = z
  .object({
    schemaVersion: z.literal("quirk.conversation-yield/v1"),
    requestId: z.string().min(1),
    disposition: z.enum(["yield", "no_op"]),
    verdict: z.string().min(1),
    sourceBoundary: z
      .object({
        complete: z.boolean(),
        description: z.string().min(1),
        references: z.array(sourceReferenceSchema).min(1),
      })
      .strict(),
    truthLedger: z.array(truthUnitSchema),
    changeLedger: z.array(changeEntrySchema),
    artifacts: z.array(artifactSchema).max(11),
    changes: z.array(changeResultSchema),
    conflicts: z.array(conflictSchema),
    boneyard: z.array(boneyardEntrySchema),
    evaluation: z
      .object({
        assessmentBasis: z.literal("compiler_self_assessment"),
        dimensionScores: yieldDimensionScoresSchema,
        weightedScore: z.number().min(0).max(100),
        hardGates: hardGatesSchema,
        validationPerformed: uniqueStrings(z.string().min(1)),
      })
      .strict(),
    nextMove: z.string().min(1),
  })
  .strict()
  .superRefine((pack, context) => {
    if (
      pack.disposition === "no_op" &&
      (pack.artifacts.length !== 0 || pack.changes.length !== 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["disposition"],
        message: "no_op requires empty artifacts and changes",
      });
    }
  });

export type ConversationYieldPack = z.infer<typeof conversationYieldPackSchema>;

const trustedSourceRegistrySchema = z
  .array(sourceReferenceSchema)
  .min(1)
  .superRefine((sources, context) => {
    reportCanonicalDuplicates(
      sources.map(({ id }) => id),
      context,
      "source id",
      (value) => value,
    );
  });

const repositoryObjectSchema = z
  .object({
    semanticKey: semanticKeySchema,
    path: existingRepositoryPathSchema,
  })
  .strict();

const repositoryTreeEntrySchema = z
  .object({
    path: existingRepositoryPathSchema,
    type: z.enum(["blob", "tree", "symlink", "submodule"]),
    oid: z.string().min(1),
  })
  .strict();

const repositorySnapshotSchema = z
  .object({
    repository: repositoryNameSchema,
    revision: z.string().min(1),
    treeOid: z.string().min(1),
    complete: z.boolean(),
    entries: z.array(repositoryTreeEntrySchema),
    objects: z.array(repositoryObjectSchema),
  })
  .strict()
  .superRefine((snapshot, context) => {
    reportCanonicalDuplicates(
      snapshot.entries.map(({ path }) => path),
      context,
      "repository path",
      canonicalPathKey,
    );
    reportCanonicalDuplicates(
      snapshot.objects.map(({ semanticKey }) => semanticKey),
      context,
      "semantic key",
      canonicalSemanticKey,
    );
    reportCanonicalDuplicates(
      snapshot.objects.map(({ path }) => path),
      context,
      "semantic object path",
      canonicalPathKey,
    );
  });

const canonGrantSchema = z
  .object({
    sourceRef: z.string().regex(/^src_[a-zA-Z0-9._-]+$/),
    basis: z.enum([
      "user_adopted",
      "user_corrected",
      "repository_authority",
      "policy_rule",
    ]),
    statement: z
      .string()
      .min(1)
      .refine((value) => value === value.normalize("NFC"), {
        message: "statement must use NFC normalization",
      }),
  })
  .strict();

const mutationTargetSchema = z
  .object({
    repository: repositoryNameSchema,
    pathPrefix: z.string().refine(isSafePathPrefix, {
      message:
        "pathPrefix must be empty or a normalized repository path prefix",
    }),
  })
  .strict();

const mutationGrantSchema = z
  .object({
    authorizationRef: z.string().regex(/^src_[a-zA-Z0-9._-]+$/),
    modes: uniqueStrings(z.enum(["patch", "publish"]), 1),
    actions: uniqueStrings(
      z.enum(["create", "update", "merge", "deprecate"]),
      1,
    ),
    targets: z.array(mutationTargetSchema).min(1),
  })
  .strict();

const executionReceiptSchema = z
  .object({
    id: z.string().regex(/^receipt_[a-zA-Z0-9._-]+$/),
    artifactId: z.string().regex(/^artifact_[a-zA-Z0-9._-]+$/),
    repository: repositoryNameSchema,
    path: repositoryPathSchema,
    action: z.enum(["create", "update", "merge", "deprecate"]),
    objectType: z.string().min(1),
    semanticKey: semanticKeySchema,
    outcome: z.enum(["patched", "committed", "pushed", "published", "failed"]),
    attemptedOutcome: z
      .enum(["patched", "committed", "pushed", "published"])
      .optional(),
    authorizationRef: z.string().regex(/^src_[a-zA-Z0-9._-]+$/),
    repositoryRevision: z.string().min(1),
    repositoryTreeOid: z.string().min(1),
    resultRevision: z.string().min(1).optional(),
    resultTreeOid: z.string().min(1).optional(),
    evidence: uniqueStrings(z.string().min(1), 1),
    delivery: deliverySchema,
    receiptHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  })
  .strict()
  .superRefine((receipt, context) => {
    if (receipt.outcome === "failed" && !receipt.attemptedOutcome) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attemptedOutcome"],
        message: "failed receipt requires attemptedOutcome",
      });
    }
    if (receipt.outcome !== "failed" && receipt.attemptedOutcome) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attemptedOutcome"],
        message: "attemptedOutcome is reserved for failed receipts",
      });
    }
    if (
      ["committed", "pushed", "published"].includes(receipt.outcome) &&
      (!receipt.resultRevision || !receipt.resultTreeOid)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resultRevision"],
        message: `${receipt.outcome} receipt requires resultRevision and resultTreeOid`,
      });
    }
  });

const repositoryStateSchema = z
  .array(repositorySnapshotSchema)
  .superRefine((snapshots, context) => {
    reportCanonicalDuplicates(
      snapshots.map(({ repository }) => repository),
      context,
      "repository snapshot",
      canonicalRepositoryKey,
    );
  });

const repositoryAllowlistSchema = uniqueStrings(
  repositoryNameSchema,
  1,
).superRefine((repositories, context) => {
  reportCanonicalDuplicates(
    repositories,
    context,
    "repository allowlist entry",
    canonicalRepositoryKey,
  );
});

export const conversationCompileRequestSchema = z
  .object({
    requestId: z.string().min(1),
    conversation: z.string().min(1),
    sourceBoundaryComplete: z.boolean(),
    trustedSources: trustedSourceRegistrySchema,
    canonGrants: z.array(canonGrantSchema).default([]),
    mode: z.enum(["distill", "draft", "patch", "publish"]).default("distill"),
    repositories: z
      .union([z.literal("auto"), repositoryAllowlistSchema])
      .default("auto"),
    repositoryState: repositoryStateSchema.default([]),
    depth: z.enum(["quick", "deep", "make-real"]).default("deep"),
    artifactBudget: z.number().int().min(0).max(11).default(7),
    constraints: uniqueStrings(
      z
        .string()
        .min(1)
        .describe(
          "Advisory provider guidance; typed request fields own deterministic controls.",
        ),
    ).default([]),
    authorizationRef: z
      .string()
      .regex(/^src_[a-zA-Z0-9._-]+$/)
      .optional(),
    mutationGrant: mutationGrantSchema.optional(),
    executionReceipts: z
      .array(executionReceiptSchema)
      .superRefine((receipts, context) => {
        reportCanonicalDuplicates(
          receipts.map(({ id }) => id),
          context,
          "execution receipt",
          (value) => value,
        );
      })
      .default([]),
  })
  .strict()
  .superRefine((request, context) => {
    if (
      ["patch", "publish"].includes(request.mode) &&
      (!request.authorizationRef || !request.mutationGrant)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mutationGrant"],
        message: `${request.mode} mode requires an explicit scoped mutation grant`,
      });
    }
    if (
      ["patch", "publish"].includes(request.mode) &&
      request.repositories === "auto"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repositories"],
        message: `${request.mode} mode requires an explicit repository allowlist`,
      });
    }
    if (
      ["patch", "publish"].includes(request.mode) &&
      request.repositories !== "auto"
    ) {
      request.repositories.forEach((repository, index) => {
        const snapshot = request.repositoryState.find(
          (candidate) =>
            canonicalRepositoryKey(candidate.repository) ===
            canonicalRepositoryKey(repository),
        );
        if (!snapshot?.complete) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["repositories", index],
            message: `${repository} requires a complete pinned snapshot in ${request.mode} mode`,
          });
        }
      });
    }
    if (request.authorizationRef) {
      const authorization = request.trustedSources.find(
        ({ id }) => id === request.authorizationRef,
      );
      if (
        !authorization ||
        authorization.speakerRole !== "user" ||
        authorization.authorityClass !== "user_instruction"
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["authorizationRef"],
          message:
            "authorizationRef must resolve to a trusted explicit user instruction",
        });
      }
    }
    request.canonGrants.forEach((grant, index) => {
      const source = request.trustedSources.find(
        ({ id }) => id === grant.sourceRef,
      );
      if (!source || !authoritySupports(grant.basis, source.authorityClass)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["canonGrants", index],
          message: "canon grant must resolve to compatible trusted authority",
        });
      }
    });
    if (request.mutationGrant) {
      const grantAuthorization = request.trustedSources.find(
        ({ id }) => id === request.mutationGrant?.authorizationRef,
      );
      if (
        grantAuthorization?.speakerRole !== "user" ||
        grantAuthorization.authorityClass !== "user_instruction"
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mutationGrant"],
          message:
            "mutation grant must use a trusted explicit user instruction",
        });
      }
      if (
        ["patch", "publish"].includes(request.mode) &&
        (request.mutationGrant.authorizationRef !== request.authorizationRef ||
          !request.mutationGrant.modes.includes(
            request.mode as "patch" | "publish",
          ))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mutationGrant"],
          message:
            "active mutation grant must match current authorization and mode",
        });
      }
    }
    request.executionReceipts.forEach((receipt, index) => {
      const authorization = request.trustedSources.find(
        ({ id }) => id === receipt.authorizationRef,
      );
      const snapshot = request.repositoryState.find(
        ({ repository }) =>
          canonicalRepositoryKey(repository) ===
          canonicalRepositoryKey(receipt.repository),
      );
      if (
        authorization?.speakerRole !== "user" ||
        authorization.authorityClass !== "user_instruction" ||
        snapshot?.revision !== receipt.repositoryRevision ||
        snapshot?.treeOid !== receipt.repositoryTreeOid
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["executionReceipts", index],
          message:
            "execution receipt must match trusted authorization and pinned repository state",
        });
      }
    });
  });

export type ConversationCompileRequest = z.infer<
  typeof conversationCompileRequestSchema
>;

export type ConversationCompilerPort = {
  generateYieldPack(input: {
    request: ConversationCompileRequest;
    attempt: number;
    validationFeedback: YieldValidationIssue[];
  }): Promise<unknown>;
};

export type ConversationCompileRunResult =
  | {
      ok: false;
      stage: "request";
      attempts: 0;
      issues: string[];
    }
  | {
      ok: false;
      stage: "generation";
      attempts: number;
      issues: string[];
    }
  | {
      ok: boolean;
      stage: "yield";
      attempts: number;
      validation: YieldValidationResult;
    };

export type YieldValidationIssue = {
  code:
    | "CONTEXT_INVALID"
    | "SCHEMA_INVALID"
    | "DUPLICATE_ID"
    | "UNKNOWN_REFERENCE"
    | "UNTRUSTED_SOURCE"
    | "REQUEST_ID_MISMATCH"
    | "FALSE_CANON"
    | "INVALID_AUTHORITY_SOURCE"
    | "ARTIFACT_COLLISION"
    | "SEMANTIC_COLLISION"
    | "ARTIFACT_BUDGET_EXCEEDED"
    | "REPOSITORY_SCOPE_MISMATCH"
    | "REPOSITORY_STATE_INCOMPLETE"
    | "REPOSITORY_STATE_MISMATCH"
    | "ARTIFACT_TARGET_EXISTS"
    | "ARTIFACT_TARGET_MISSING"
    | "MUTATION_GRANT_MISMATCH"
    | "EXECUTION_RECEIPT_MISMATCH"
    | "EXECUTION_STATE_CONTRADICTION"
    | "MISSING_AUTHORIZATION"
    | "AUTHORIZATION_MISMATCH"
    | "MISSING_VALIDATION"
    | "MISSING_CHANGE_RESULT"
    | "SCORE_MISMATCH"
    | "POTENTIAL_SECRET";
  path: string;
  message: string;
};

export type YieldEvaluationFinding = {
  code:
    | "HARD_GATE_NOT_PASSED"
    | "CRITICAL_DIMENSION_BELOW_RELEASE"
    | "SCORE_BELOW_RELEASE";
  path: string;
  message: string;
};

export type YieldSelfAssessment = {
  computedWeightedScore: number;
  allHardGatesPass: boolean;
  criticalDimensionsPass: boolean;
  selfAssessmentThresholdsMet: boolean;
  independentlyEvaluated: false;
  releaseDecision: "not_evaluated";
  findings: YieldEvaluationFinding[];
};

export type YieldValidationResult = {
  success: boolean;
  structurallyValid: boolean;
  pack?: ConversationYieldPack;
  issues: YieldValidationIssue[];
  assessment?: YieldSelfAssessment;
};

const RELEASE_SCORE = 92;
const CRITICAL_DIMENSION_FLOOR = 4.8;
const MUTATED_STATES = new Set(["patched", "committed", "pushed", "published"]);
const ARTIFACT_STATUS_RANK = {
  proposed: 0,
  drafted: 1,
  patched: 2,
  committed: 3,
  pushed: 4,
  published: 5,
} as const;

const SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "OpenAI-style key", pattern: /\bsk-[a-zA-Z0-9_-]{20,}\b/ },
  { name: "Anthropic key", pattern: /\bsk-ant-[a-zA-Z0-9_-]{20,}\b/ },
  { name: "GitHub token", pattern: /\bgh[pousr]_[a-zA-Z0-9]{20,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "private key block",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
];

/**
 * Provider-neutral structured-output runner. The port owns model invocation;
 * this function owns request authority, bounded repair, and deterministic
 * validation. Repository mutation remains an external executor concern.
 */
export async function compileConversation(
  input: unknown,
  port: ConversationCompilerPort,
  maximumAttempts = 2,
): Promise<ConversationCompileRunResult> {
  const parsed = conversationCompileRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      stage: "request",
      attempts: 0,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  }

  // The provider receives a disposable copy. Validation retains a separate
  // caller-trusted snapshot that the provider cannot mutate in place.
  const trustedRequest = structuredClone(parsed.data);

  const attemptsLimit = Number.isFinite(maximumAttempts)
    ? Math.max(1, Math.min(3, Math.trunc(maximumAttempts)))
    : 2;
  let feedback: YieldValidationIssue[] = [];
  let validation: YieldValidationResult | undefined;

  for (let attempt = 1; attempt <= attemptsLimit; attempt += 1) {
    let candidate: unknown;
    try {
      candidate = await port.generateYieldPack({
        request: structuredClone(trustedRequest),
        attempt,
        validationFeedback: feedback,
      });
    } catch (error) {
      return {
        ok: false,
        stage: "generation",
        attempts: attempt,
        issues: [error instanceof Error ? error.message : String(error)],
      };
    }

    validation = validateConversationYield(candidate, trustedRequest);
    if (validation.success) {
      return {
        ok: true,
        stage: "yield",
        attempts: attempt,
        validation,
      };
    }
    feedback = validation.issues;
  }

  return {
    ok: false,
    stage: "yield",
    attempts: attemptsLimit,
    validation: validation!,
  };
}

/**
 * Validate the deterministic integrity boundary around a model-produced yield
 * pack. Semantic quality still belongs to the eval rubric and human review.
 */
export function validateConversationYield(
  input: unknown,
  contextInput: unknown,
): YieldValidationResult {
  const parsedContext =
    conversationCompileRequestSchema.safeParse(contextInput);
  if (!parsedContext.success) {
    return {
      success: false,
      structurallyValid: false,
      issues: parsedContext.error.issues.map((issue) => ({
        code: "CONTEXT_INVALID",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const parsed = conversationYieldPackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      structurallyValid: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "SCHEMA_INVALID",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const pack = parsed.data;
  const request = parsedContext.data;
  const issues: YieldValidationIssue[] = [];
  const trustedSourceById = new Map(
    request.trustedSources.map((source) => [source.id, source]),
  );
  const receiptById = new Map(
    request.executionReceipts.map((receipt) => [receipt.id, receipt]),
  );
  const sourceIds = new Set<string>();
  const unitIds = new Set<string>();
  const changeIds = new Set<string>();
  const artifactIds = new Set<string>();
  const conflictIds = new Set<string>();
  const boneIds = new Set<string>();

  collectUniqueIds(
    pack.sourceBoundary.references.map(({ id }) => id),
    sourceIds,
    "sourceBoundary.references",
    issues,
  );

  pack.sourceBoundary.references.forEach((source, index) => {
    const trusted = trustedSourceById.get(source.id);
    if (!trusted || !sameSourceReference(source, trusted)) {
      issues.push({
        code: "UNTRUSTED_SOURCE",
        path: `sourceBoundary.references.${index}`,
        message: `${source.id} does not exactly match a caller-trusted, hash-bound source`,
      });
    }
  });

  if (pack.requestId !== request.requestId) {
    issues.push({
      code: "REQUEST_ID_MISMATCH",
      path: "requestId",
      message: `${pack.requestId} does not match trusted request ${request.requestId}`,
    });
  }
  if (pack.sourceBoundary.complete !== request.sourceBoundaryComplete) {
    issues.push({
      code: "UNTRUSTED_SOURCE",
      path: "sourceBoundary.complete",
      message: `declared ${pack.sourceBoundary.complete}, trusted boundary is ${request.sourceBoundaryComplete}`,
    });
  }

  collectUniqueIds(
    pack.truthLedger.map(({ id }) => id),
    unitIds,
    "truthLedger",
    issues,
  );
  collectUniqueIds(
    pack.changeLedger.map(({ id }) => id),
    changeIds,
    "changeLedger",
    issues,
  );
  collectUniqueIds(
    pack.artifacts.map(({ id }) => id),
    artifactIds,
    "artifacts",
    issues,
  );
  collectUniqueIds(
    pack.conflicts.map(({ id }) => id),
    conflictIds,
    "conflicts",
    issues,
  );
  collectUniqueIds(
    pack.boneyard.map(({ id }) => id),
    boneIds,
    "boneyard",
    issues,
  );

  pack.truthLedger.forEach((unit, index) => {
    unit.sourceRefs.forEach((reference) =>
      requireReference(
        reference,
        sourceIds,
        `truthLedger.${index}.sourceRefs`,
        issues,
      ),
    );
    [...(unit.supersedes ?? []), ...(unit.contradicts ?? [])].forEach(
      (reference) =>
        requireReference(reference, unitIds, `truthLedger.${index}`, issues),
    );
    if (
      unit.supersedes?.includes(unit.id) ||
      unit.contradicts?.includes(unit.id)
    ) {
      issues.push({
        code: "UNKNOWN_REFERENCE",
        path: `truthLedger.${index}`,
        message: `${unit.id} cannot supersede or contradict itself`,
      });
    }

    if (unit.authorityRef) {
      requireReference(
        unit.authorityRef,
        sourceIds,
        `truthLedger.${index}.authorityRef`,
        issues,
      );
      if (!unit.sourceRefs.includes(unit.authorityRef)) {
        issues.push({
          code: "INVALID_AUTHORITY_SOURCE",
          path: `truthLedger.${index}.authorityRef`,
          message: "authorityRef must also appear in sourceRefs",
        });
      }
    }

    if (
      unit.authorityBasis &&
      unit.authorityBasis !== "none" &&
      unit.authorityRef &&
      !authoritySupports(
        unit.authorityBasis,
        trustedSourceById.get(unit.authorityRef)?.authorityClass,
      )
    ) {
      issues.push({
        code: "INVALID_AUTHORITY_SOURCE",
        path: `truthLedger.${index}.authorityRef`,
        message: `${unit.authorityRef} does not support ${unit.authorityBasis}`,
      });
    }

    if (
      unit.status === "CANON" &&
      (!unit.authorityBasis ||
        unit.authorityBasis === "none" ||
        !unit.authorityRef ||
        !authoritySupports(
          unit.authorityBasis,
          trustedSourceById.get(unit.authorityRef)?.authorityClass,
        ) ||
        !request.canonGrants.some(
          (grant) =>
            grant.sourceRef === unit.authorityRef &&
            grant.basis === unit.authorityBasis &&
            grant.statement === unit.statement,
        ))
    ) {
      issues.push({
        code: "FALSE_CANON",
        path: `truthLedger.${index}`,
        message: `${unit.id} is CANON without an exact caller-trusted canon grant`,
      });
    }
  });

  pack.changeLedger.forEach((change, index) => {
    change.unitIds.forEach((reference) =>
      requireReference(
        reference,
        unitIds,
        `changeLedger.${index}.unitIds`,
        issues,
      ),
    );
  });

  if (pack.artifacts.length > request.artifactBudget) {
    issues.push({
      code: "ARTIFACT_BUDGET_EXCEEDED",
      path: "artifacts",
      message: `${pack.artifacts.length} artifacts exceed request budget ${request.artifactBudget}`,
    });
  }

  const snapshotByRepository = new Map(
    request.repositoryState.map((snapshot) => [
      canonicalRepositoryKey(snapshot.repository),
      snapshot,
    ]),
  );
  const allowedRepositories = new Set(
    request.repositories === "auto"
      ? snapshotByRepository.keys()
      : request.repositories.map(canonicalRepositoryKey),
  );
  const destinations = new Map<string, string>();
  const outputPaths: { repositoryKey: string; pathKey: string; id: string }[] =
    [];
  const semanticDestinations = new Map<string, string>();
  pack.artifacts.forEach((artifact, index) => {
    artifact.sourceUnitIds.forEach((reference) =>
      requireReference(
        reference,
        unitIds,
        `artifacts.${index}.sourceUnitIds`,
        issues,
      ),
    );

    const repositoryKey = canonicalRepositoryKey(artifact.repository);
    const pathKey = canonicalPathKey(artifact.path);
    const destination = `${repositoryKey}:${pathKey}`;
    if (destinations.has(destination)) {
      issues.push({
        code: "ARTIFACT_COLLISION",
        path: `artifacts.${index}.path`,
        message: `${artifact.id} and ${destinations.get(destination)} target equivalent destination ${artifact.repository}:${artifact.path}`,
      });
    }
    const prefixCollision = outputPaths.find(
      (candidate) =>
        candidate.repositoryKey === repositoryKey &&
        (pathKey.startsWith(`${candidate.pathKey}/`) ||
          candidate.pathKey.startsWith(`${pathKey}/`)),
    );
    if (prefixCollision) {
      issues.push({
        code: "ARTIFACT_COLLISION",
        path: `artifacts.${index}.path`,
        message: `${artifact.id} and ${prefixCollision.id} create a file/tree prefix collision`,
      });
    }
    destinations.set(destination, artifact.id);
    outputPaths.push({ repositoryKey, pathKey, id: artifact.id });

    const semanticDestination = `${repositoryKey}:${canonicalSemanticKey(artifact.semanticKey)}`;
    if (semanticDestinations.has(semanticDestination)) {
      issues.push({
        code: "SEMANTIC_COLLISION",
        path: `artifacts.${index}.semanticKey`,
        message: `${artifact.id} and ${semanticDestinations.get(semanticDestination)} claim ${artifact.semanticKey}`,
      });
    }
    semanticDestinations.set(semanticDestination, artifact.id);

    if (!allowedRepositories.has(repositoryKey)) {
      issues.push({
        code: "REPOSITORY_SCOPE_MISMATCH",
        path: `artifacts.${index}.repository`,
        message: `${artifact.repository} is outside the trusted repository scope`,
      });
    }

    const snapshot = snapshotByRepository.get(repositoryKey);
    if (!snapshot) {
      issues.push({
        code: "REPOSITORY_SCOPE_MISMATCH",
        path: `artifacts.${index}.repository`,
        message: `${artifact.repository} has no caller-trusted repository snapshot`,
      });
    } else {
      const exactEntry = snapshot.entries.find(
        ({ path }) => path === artifact.path,
      );
      const portableEntry = snapshot.entries.find(
        ({ path }) => canonicalPathKey(path) === pathKey,
      );
      const existingObject = snapshot.objects.find(
        ({ semanticKey }) =>
          canonicalSemanticKey(semanticKey) ===
          canonicalSemanticKey(artifact.semanticKey),
      );
      const objectAtPath = snapshot.objects.find(
        ({ path }) => canonicalPathKey(path) === pathKey,
      );

      if (
        artifact.repositoryRevision !== snapshot.revision ||
        artifact.repositoryTreeOid !== snapshot.treeOid
      ) {
        issues.push({
          code: "REPOSITORY_STATE_MISMATCH",
          path: `artifacts.${index}.repositoryRevision`,
          message: `${artifact.id} does not cite trusted revision ${snapshot.revision} and tree ${snapshot.treeOid}`,
        });
      }

      if (
        !snapshot.complete &&
        !["propose", "no-op"].includes(artifact.action)
      ) {
        issues.push({
          code: "REPOSITORY_STATE_INCOMPLETE",
          path: `artifacts.${index}.action`,
          message: `${artifact.action} requires a complete snapshot of ${artifact.repository}`,
        });
      }
      if (artifact.action === "create" && portableEntry) {
        issues.push({
          code: "ARTIFACT_TARGET_EXISTS",
          path: `artifacts.${index}.path`,
          message: `${artifact.path} collides with existing path ${portableEntry.path}`,
        });
      }
      if (
        snapshot.complete &&
        ["update", "merge", "preserve", "deprecate"].includes(
          artifact.action,
        ) &&
        !exactEntry
      ) {
        issues.push({
          code: "ARTIFACT_TARGET_MISSING",
          path: `artifacts.${index}.path`,
          message: `${artifact.action} target ${artifact.path} does not exist at ${snapshot.revision}`,
        });
      }
      if (portableEntry && portableEntry.path !== artifact.path) {
        issues.push({
          code: "ARTIFACT_COLLISION",
          path: `artifacts.${index}.path`,
          message: `${artifact.path} is case- or Unicode-equivalent to existing path ${portableEntry.path}`,
        });
      }
      if (exactEntry && exactEntry.type !== "blob") {
        issues.push({
          code: "ARTIFACT_COLLISION",
          path: `artifacts.${index}.path`,
          message: `${artifact.path} resolves to ${exactEntry.type}, not an artifact blob`,
        });
      }
      const prefixConflict = findFileTreePrefixConflict(
        artifact.path,
        snapshot.entries,
      );
      if (prefixConflict) {
        issues.push({
          code: "ARTIFACT_COLLISION",
          path: `artifacts.${index}.path`,
          message: `${artifact.path} conflicts with ${prefixConflict.type} ${prefixConflict.path}`,
        });
      }
      if (existingObject && canonicalPathKey(existingObject.path) !== pathKey) {
        issues.push({
          code: "SEMANTIC_COLLISION",
          path: `artifacts.${index}.semanticKey`,
          message: `${artifact.semanticKey} already resolves to ${existingObject.path}`,
        });
      }
      if (
        objectAtPath &&
        canonicalSemanticKey(objectAtPath.semanticKey) !==
          canonicalSemanticKey(artifact.semanticKey)
      ) {
        issues.push({
          code: "SEMANTIC_COLLISION",
          path: `artifacts.${index}.semanticKey`,
          message: `${artifact.path} is indexed as ${objectAtPath.semanticKey}, not ${artifact.semanticKey}`,
        });
      }
    }

    if (request.mode === "distill" && artifact.status !== "proposed") {
      issues.push({
        code: "AUTHORIZATION_MISMATCH",
        path: `artifacts.${index}.status`,
        message: `distill mode cannot report ${artifact.status}`,
      });
    }
    if (request.mode === "draft" && MUTATED_STATES.has(artifact.status)) {
      issues.push({
        code: "AUTHORIZATION_MISMATCH",
        path: `artifacts.${index}.status`,
        message: `draft mode cannot report ${artifact.status}`,
      });
    }
    if (
      request.mode === "patch" &&
      MUTATED_STATES.has(artifact.status) &&
      artifact.status !== "patched"
    ) {
      issues.push({
        code: "AUTHORIZATION_MISMATCH",
        path: `artifacts.${index}.status`,
        message: `patch mode cannot report ${artifact.status}`,
      });
    }

    if (MUTATED_STATES.has(artifact.status) && !artifact.authorizationRef) {
      issues.push({
        code: "MISSING_AUTHORIZATION",
        path: `artifacts.${index}.authorizationRef`,
        message: `${artifact.status} artifact lacks an authorization reference`,
      });
    }
    if (artifact.authorizationRef) {
      requireReference(
        artifact.authorizationRef,
        sourceIds,
        `artifacts.${index}.authorizationRef`,
        issues,
      );
      const authorization = trustedSourceById.get(artifact.authorizationRef);
      if (
        MUTATED_STATES.has(artifact.status) &&
        (authorization?.speakerRole !== "user" ||
          authorization.authorityClass !== "user_instruction")
      ) {
        issues.push({
          code: "INVALID_AUTHORITY_SOURCE",
          path: `artifacts.${index}.authorizationRef`,
          message: `${artifact.status} requires an explicit user instruction source`,
        });
      }
    }
    if (
      MUTATED_STATES.has(artifact.status) &&
      artifact.authorizationRef !== request.authorizationRef
    ) {
      issues.push({
        code: "AUTHORIZATION_MISMATCH",
        path: `artifacts.${index}.authorizationRef`,
        message:
          "artifact authorization does not match the trusted current request",
      });
    }
    if (MUTATED_STATES.has(artifact.status)) {
      if (!mutationGrantCovers(request, artifact)) {
        issues.push({
          code: "MUTATION_GRANT_MISMATCH",
          path: `artifacts.${index}`,
          message: `${artifact.id} exceeds the trusted mode, action, repository, or path grant`,
        });
      }
    }
    if (MUTATED_STATES.has(artifact.status)) {
      const receipt = artifact.statusReceiptRef
        ? receiptById.get(artifact.statusReceiptRef)
        : undefined;
      if (
        !receipt ||
        receipt.artifactId !== artifact.id ||
        receipt.repository !== artifact.repository ||
        receipt.path !== artifact.path ||
        receipt.action !== artifact.action ||
        receipt.objectType !== artifact.objectType ||
        receipt.semanticKey !== artifact.semanticKey ||
        receipt.outcome !== artifact.status ||
        receipt.authorizationRef !== artifact.authorizationRef ||
        receipt.repositoryRevision !== artifact.repositoryRevision ||
        receipt.repositoryTreeOid !== artifact.repositoryTreeOid
      ) {
        issues.push({
          code: "EXECUTION_RECEIPT_MISMATCH",
          path: `artifacts.${index}.statusReceiptRef`,
          message: `${artifact.status} must resolve to an exact caller-trusted execution receipt`,
        });
      }
    } else if (artifact.statusReceiptRef) {
      issues.push({
        code: "EXECUTION_RECEIPT_MISMATCH",
        path: `artifacts.${index}.statusReceiptRef`,
        message: `${artifact.status} cannot claim a mutation receipt`,
      });
    }
    if (
      MUTATED_STATES.has(artifact.status) &&
      artifact.validation.length === 0
    ) {
      issues.push({
        code: "MISSING_VALIDATION",
        path: `artifacts.${index}.validation`,
        message: `${artifact.status} artifact has no validation evidence`,
      });
    }
  });

  const resultArtifactIds = new Set<string>();
  pack.changes.forEach((change, index) => {
    requireReference(
      change.artifactId,
      artifactIds,
      `changes.${index}.artifactId`,
      issues,
    );
    if (resultArtifactIds.has(change.artifactId)) {
      issues.push({
        code: "DUPLICATE_ID",
        path: `changes.${index}.artifactId`,
        message: `${change.artifactId} has multiple change results`,
      });
    }
    resultArtifactIds.add(change.artifactId);

    const artifact = pack.artifacts.find(({ id }) => id === change.artifactId);
    const expectedOutcome =
      artifact?.action === "no-op" ? "no_op" : artifact?.status;
    if (
      artifact &&
      change.outcome !== "failed" &&
      change.outcome !== expectedOutcome
    ) {
      issues.push({
        code: "MISSING_CHANGE_RESULT",
        path: `changes.${index}.outcome`,
        message: `${change.outcome} does not match ${artifact.id} state ${expectedOutcome}`,
      });
    }
    const receiptRequired =
      change.outcome === "failed" || MUTATED_STATES.has(change.outcome);
    if (receiptRequired && artifact) {
      const receipt = change.receiptRef
        ? receiptById.get(change.receiptRef)
        : undefined;
      if (
        !receipt ||
        receipt.artifactId !== artifact.id ||
        receipt.repository !== artifact.repository ||
        receipt.path !== artifact.path ||
        receipt.action !== artifact.action ||
        receipt.objectType !== artifact.objectType ||
        receipt.semanticKey !== artifact.semanticKey ||
        receipt.outcome !== change.outcome ||
        receipt.attemptedOutcome !== change.attemptedOutcome ||
        receipt.authorizationRef !== artifact.authorizationRef ||
        receipt.repositoryRevision !== artifact.repositoryRevision ||
        receipt.repositoryTreeOid !== artifact.repositoryTreeOid ||
        receipt.resultRevision !== change.resultRevision ||
        receipt.resultTreeOid !== change.resultTreeOid ||
        !sameStringArray(receipt.evidence, change.evidence) ||
        !sameDelivery(receipt.delivery, change.delivery)
      ) {
        issues.push({
          code: "EXECUTION_RECEIPT_MISMATCH",
          path: `changes.${index}.receiptRef`,
          message: `${change.outcome} must exactly echo a caller-trusted execution receipt`,
        });
      }
      if (
        change.outcome !== "failed" &&
        artifact.statusReceiptRef !== change.receiptRef
      ) {
        issues.push({
          code: "EXECUTION_RECEIPT_MISMATCH",
          path: `changes.${index}.receiptRef`,
          message:
            "terminal mutation result must use the artifact status receipt",
        });
      }
      if (
        change.outcome === "failed" &&
        !mutationGrantCovers(request, artifact)
      ) {
        issues.push({
          code: "MUTATION_GRANT_MISMATCH",
          path: `changes.${index}`,
          message: `failed ${change.attemptedOutcome} attempt exceeds the trusted mutation grant`,
        });
      }
      if (
        change.outcome === "failed" &&
        request.mode === "patch" &&
        change.attemptedOutcome !== "patched"
      ) {
        issues.push({
          code: "AUTHORIZATION_MISMATCH",
          path: `changes.${index}.attemptedOutcome`,
          message: `patch mode cannot attempt ${change.attemptedOutcome}`,
        });
      }
      if (
        change.outcome === "failed" &&
        change.attemptedOutcome &&
        ARTIFACT_STATUS_RANK[change.attemptedOutcome] <=
          ARTIFACT_STATUS_RANK[artifact.status]
      ) {
        issues.push({
          code: "EXECUTION_STATE_CONTRADICTION",
          path: `changes.${index}.attemptedOutcome`,
          message: `failed ${change.attemptedOutcome} cannot follow last successful state ${artifact.status}`,
        });
      }
    } else if (change.receiptRef || change.attemptedOutcome) {
      issues.push({
        code: "EXECUTION_RECEIPT_MISMATCH",
        path: `changes.${index}`,
        message: `${change.outcome} cannot claim execution receipt fields`,
      });
    }
  });
  pack.artifacts.forEach((artifact, index) => {
    if (!resultArtifactIds.has(artifact.id)) {
      issues.push({
        code: "MISSING_CHANGE_RESULT",
        path: `artifacts.${index}`,
        message: `${artifact.id} has no corresponding change result`,
      });
    }
  });

  pack.conflicts.forEach((conflict, index) => {
    conflict.unitIds.forEach((reference) =>
      requireReference(
        reference,
        unitIds,
        `conflicts.${index}.unitIds`,
        issues,
      ),
    );
  });

  pack.boneyard.forEach((entry, index) =>
    requireReference(entry.unitId, unitIds, `boneyard.${index}.unitId`, issues),
  );

  const computedScore = computeYieldScore(pack.evaluation.dimensionScores);
  if (Math.abs(pack.evaluation.weightedScore - computedScore) > 0.01) {
    issues.push({
      code: "SCORE_MISMATCH",
      path: "evaluation.weightedScore",
      message: `declared ${pack.evaluation.weightedScore}, computed ${computedScore}`,
    });
  }

  const serialized = JSON.stringify(pack);
  for (const secret of SECRET_PATTERNS) {
    if (secret.pattern.test(serialized)) {
      issues.push({
        code: "POTENTIAL_SECRET",
        path: "$",
        message: `${secret.name} pattern detected`,
      });
    }
  }

  const assessment = assessSelfEvaluation(pack.evaluation, computedScore);

  return {
    success: issues.length === 0,
    structurallyValid: issues.length === 0,
    pack,
    issues,
    assessment,
  };
}

export function computeYieldScore(
  scores: z.infer<typeof yieldDimensionScoresSchema>,
): number {
  const weighted = Object.entries(YIELD_DIMENSION_WEIGHTS).reduce(
    (total, [dimension, weight]) =>
      total + (scores[dimension as keyof typeof scores] / 5) * weight,
    0,
  );
  return Math.round(weighted * 100) / 100;
}

function assessSelfEvaluation(
  evaluation: ConversationYieldPack["evaluation"],
  computedWeightedScore: number,
): YieldSelfAssessment {
  const findings: YieldEvaluationFinding[] = [];
  const allHardGatesPass = Object.values(evaluation.hardGates).every(
    (status) => status === "pass",
  );
  Object.entries(evaluation.hardGates).forEach(([gate, status]) => {
    if (status !== "pass") {
      findings.push({
        code: "HARD_GATE_NOT_PASSED",
        path: `evaluation.hardGates.${gate}`,
        message: `${gate} is ${status}; independent release evaluation requires pass`,
      });
    }
  });

  const criticalDimensions = {
    truthAndProvenance: evaluation.dimensionScores.truthAndProvenance,
    canonicalBoundaryDiscipline:
      evaluation.dimensionScores.canonicalBoundaryDiscipline,
    permissionPrivacyAndOperationalSafety:
      evaluation.dimensionScores.permissionPrivacyAndOperationalSafety,
  };
  const criticalDimensionsPass = Object.values(criticalDimensions).every(
    (score) => score >= CRITICAL_DIMENSION_FLOOR,
  );
  Object.entries(criticalDimensions).forEach(([dimension, score]) => {
    if (score < CRITICAL_DIMENSION_FLOOR) {
      findings.push({
        code: "CRITICAL_DIMENSION_BELOW_RELEASE",
        path: `evaluation.dimensionScores.${dimension}`,
        message: `${dimension} score ${score} is below ${CRITICAL_DIMENSION_FLOOR}`,
      });
    }
  });

  if (computedWeightedScore < RELEASE_SCORE) {
    findings.push({
      code: "SCORE_BELOW_RELEASE",
      path: "evaluation.weightedScore",
      message: `computed self-score ${computedWeightedScore} is below ${RELEASE_SCORE}`,
    });
  }

  return {
    computedWeightedScore,
    allHardGatesPass,
    criticalDimensionsPass,
    selfAssessmentThresholdsMet:
      allHardGatesPass &&
      criticalDimensionsPass &&
      computedWeightedScore >= RELEASE_SCORE,
    independentlyEvaluated: false,
    releaseDecision: "not_evaluated",
    findings,
  };
}

function collectUniqueIds(
  values: string[],
  target: Set<string>,
  path: string,
  issues: YieldValidationIssue[],
): void {
  values.forEach((value, index) => {
    if (target.has(value)) {
      issues.push({
        code: "DUPLICATE_ID",
        path: `${path}.${index}.id`,
        message: `${value} is duplicated`,
      });
    }
    target.add(value);
  });
}

function requireReference(
  reference: string,
  known: Set<string>,
  path: string,
  issues: YieldValidationIssue[],
): void {
  if (!known.has(reference)) {
    issues.push({
      code: "UNKNOWN_REFERENCE",
      path,
      message: `${reference} does not resolve`,
    });
  }
}

function authoritySupports(
  basis:
    | "user_adopted"
    | "user_corrected"
    | "repository_authority"
    | "policy_rule"
    | "none",
  authorityClass:
    | "user_instruction"
    | "user_correction"
    | "user_adoption"
    | "repository_canon"
    | "policy_canon"
    | "evidence_only"
    | "untrusted"
    | undefined,
): boolean {
  switch (basis) {
    case "user_adopted":
      return authorityClass === "user_adoption";
    case "user_corrected":
      return authorityClass === "user_correction";
    case "repository_authority":
      return authorityClass === "repository_canon";
    case "policy_rule":
      return authorityClass === "policy_canon";
    case "none":
      return false;
  }
}

function reportCanonicalDuplicates(
  values: string[],
  context: z.RefinementCtx,
  label: string,
  keyFor: (value: string) => string,
): void {
  const seen = new Map<string, string>();
  values.forEach((value, index) => {
    const key = keyFor(value);
    const existing = seen.get(key);
    if (existing) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index],
        message: `${label} ${value} is equivalent to ${existing}`,
      });
    } else {
      seen.set(key, value);
    }
  });
}

function sameSourceReference(
  claimed: z.infer<typeof sourceReferenceSchema>,
  trusted: z.infer<typeof sourceReferenceSchema>,
): boolean {
  return (
    claimed.id === trusted.id &&
    claimed.kind === trusted.kind &&
    claimed.speakerRole === trusted.speakerRole &&
    claimed.authorityClass === trusted.authorityClass &&
    claimed.locator === trusted.locator &&
    claimed.contentHash === trusted.contentHash &&
    claimed.sensitivity === trusted.sensitivity
  );
}

function sameStringArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sameDelivery(
  left: z.infer<typeof deliverySchema>,
  right: z.infer<typeof deliverySchema> | undefined,
): boolean {
  return Boolean(
    right &&
    left.kind === right.kind &&
    left.mediaType === right.mediaType &&
    left.value === right.value,
  );
}

function canonicalRepositoryKey(repository: string): string {
  return portableStringKey(repository);
}

function canonicalPathKey(path: string): string {
  return portableStringKey(path);
}

function canonicalSemanticKey(key: string): string {
  return portableStringKey(key);
}

function portableStringKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").normalize("NFKC");
}

function pathWithinPrefix(path: string, prefix: string): boolean {
  if (prefix === "") return true;
  const pathKey = canonicalPathKey(path);
  const prefixKey = canonicalPathKey(prefix);
  return pathKey === prefixKey || pathKey.startsWith(`${prefixKey}/`);
}

function mutationGrantCovers(
  request: ConversationCompileRequest,
  artifact: ConversationYieldPack["artifacts"][number],
): boolean {
  const grant = request.mutationGrant;
  return Boolean(
    grant &&
    grant.authorizationRef === artifact.authorizationRef &&
    grant.modes.includes(request.mode as "patch" | "publish") &&
    grant.actions.includes(
      artifact.action as "create" | "update" | "merge" | "deprecate",
    ) &&
    grant.targets.some(
      (target) =>
        canonicalRepositoryKey(target.repository) ===
          canonicalRepositoryKey(artifact.repository) &&
        pathWithinPrefix(artifact.path, target.pathPrefix),
    ),
  );
}

function findFileTreePrefixConflict(
  path: string,
  entries: z.infer<typeof repositoryTreeEntrySchema>[],
): z.infer<typeof repositoryTreeEntrySchema> | undefined {
  const targetKey = canonicalPathKey(path);
  return entries.find((entry) => {
    const entryKey = canonicalPathKey(entry.path);
    const existingNonTreeIsParent =
      targetKey.startsWith(`${entryKey}/`) && entry.type !== "tree";
    const targetWouldReplaceTree = entryKey.startsWith(`${targetKey}/`);
    return existingNonTreeIsParent || targetWouldReplaceTree;
  });
}

function isCanonicalRepositoryName(repository: string): boolean {
  if (
    repository !== repository.normalize("NFC") ||
    /[\u0000-\u001f\u007f]/.test(repository) ||
    !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)
  ) {
    return false;
  }
  return repository
    .split("/")
    .every((segment) => segment !== "." && segment !== "..");
}

function isSafePathPrefix(prefix: string): boolean {
  return prefix === "" || isSafeRepositoryPath(prefix);
}

function isSafeRepositoryPath(path: string): boolean {
  return path === path.normalize("NFC") && isSafeExistingRepositoryPath(path);
}

function isSafeExistingRepositoryPath(path: string): boolean {
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("//") ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return false;
  }
  const segments = path.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}
