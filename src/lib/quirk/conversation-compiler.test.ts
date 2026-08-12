// @vitest-environment node
import { describe, expect, it } from "vitest";
import yieldSchema from "../../../schemas/conversation-yield.schema.json";
import {
  compileConversation,
  computeYieldScore,
  conversationCompileRequestSchema,
  validateConversationYield,
  type ConversationCompileRequest,
  type ConversationYieldPack,
} from "./conversation-compiler";

const REPOSITORY = "Quirk-Systems/project-scaffold";
const REVISION = "68407cf6e117e75e8981bae049539b0c9b12276c";
const TREE_OID = "fc21853fdbe47116be943cd3c9ab78b3c7a60514";
const SOURCE_HASH = `sha256:${"a".repeat(64)}`;
const AUTH_HASH = `sha256:${"b".repeat(64)}`;
const RECEIPT_HASH = `sha256:${"c".repeat(64)}`;
const STATEMENT = "Adopt the Quirk Conversation Compiler proposal.";

function adoptionSource(): ConversationCompileRequest["trustedSources"][number] {
  return {
    id: "src_adoption",
    kind: "message",
    speakerRole: "user",
    authorityClass: "user_adoption",
    locator: "current:user-adoption",
    contentHash: SOURCE_HASH,
    sensitivity: "internal",
  };
}

function authorizationSource(): ConversationCompileRequest["trustedSources"][number] {
  return {
    id: "src_authorization",
    kind: "message",
    speakerRole: "user",
    authorityClass: "user_instruction",
    locator: "current:user-request",
    contentHash: AUTH_HASH,
    sensitivity: "internal",
  };
}

function validRequest(): ConversationCompileRequest {
  return {
    requestId: "wrap-001",
    conversation: "Adopt and draft the Quirk Conversation Compiler proposal.",
    sourceBoundaryComplete: true,
    trustedSources: [adoptionSource()],
    canonGrants: [
      {
        sourceRef: "src_adoption",
        basis: "user_adopted",
        statement: STATEMENT,
      },
    ],
    mode: "draft",
    repositories: [REPOSITORY],
    repositoryState: [
      {
        repository: REPOSITORY,
        revision: REVISION,
        treeOid: TREE_OID,
        complete: true,
        entries: [{ path: "README.md", type: "blob", oid: "readme-oid" }],
        objects: [],
      },
    ],
    depth: "deep",
    artifactBudget: 7,
    constraints: [],
    executionReceipts: [],
  };
}

function validPack(): ConversationYieldPack {
  return {
    schemaVersion: "quirk.conversation-yield/v1",
    requestId: "wrap-001",
    disposition: "yield",
    verdict: "The conversation produced one governed capability proposal.",
    sourceBoundary: {
      complete: true,
      description: "The caller supplied a complete, hash-bound source set.",
      references: [adoptionSource()],
    },
    truthLedger: [
      {
        id: "unit_adoption",
        kind: "decision",
        status: "CANON",
        statement: STATEMENT,
        confidence: 1,
        authorityBasis: "user_adopted",
        authorityRef: "src_adoption",
        sourceRefs: ["src_adoption"],
      },
    ],
    changeLedger: [
      {
        id: "change_capability",
        action: "introduced",
        unitIds: ["unit_adoption"],
        description: "Introduced a proposed capability pack.",
      },
    ],
    artifacts: [
      {
        id: "artifact_prompt",
        objectType: "prompt",
        semanticKey: "prompt.quirk-wrap",
        repository: REPOSITORY,
        repositoryRevision: REVISION,
        repositoryTreeOid: TREE_OID,
        path: "prompts/library/conversational-wrap-up/PROMPT.md",
        action: "create",
        purpose: "Provide the provider-neutral canonical prompt.",
        sourceUnitIds: ["unit_adoption"],
        dependencies: [],
        status: "drafted",
        validation: ["schema", "links", "tests"],
      },
    ],
    changes: [
      {
        artifactId: "artifact_prompt",
        outcome: "drafted",
        summary: "Drafted the canonical prompt.",
        evidence: ["schema", "links", "tests"],
        delivery: {
          kind: "full_text",
          mediaType: "text/markdown",
          value: "# Quirk Wrap\n",
        },
      },
    ],
    conflicts: [],
    boneyard: [],
    evaluation: {
      assessmentBasis: "compiler_self_assessment",
      dimensionScores: {
        truthAndProvenance: 5,
        intentAndOutcomeFidelity: 5,
        canonicalBoundaryDiscipline: 5,
        correctionAndContradictionPreservation: 5,
        signalRetentionAndCompression: 5,
        synthesisLeverage: 5,
        repositoryAndArtifactReadiness: 5,
        informationArchitecture: 5,
        voiceAndSpecificityIntegrity: 5,
        permissionPrivacyAndOperationalSafety: 5,
        interoperabilityAndIdempotence: 5,
      },
      weightedScore: 100,
      hardGates: {
        noFabricatedSource: "pass",
        noFalseCanon: "pass",
        correctionsWin: "pass",
        contradictionsSurvive: "pass",
        provenanceComplete: "pass",
        permissionFaithful: "pass",
        privateDataContained: "pass",
        injectionResistant: "pass",
        deprecatedContained: "pass",
        collisionSafe: "pass",
        outputValid: "pass",
      },
      validationPerformed: ["schema", "links", "tests"],
    },
    nextMove: "Review the proposed capability for canonical promotion.",
  };
}

function publishContext(outcome: "published" | "failed" = "published"): {
  request: ConversationCompileRequest;
  pack: ConversationYieldPack;
} {
  const request = validRequest();
  const pack = validPack();
  request.mode = "publish";
  request.trustedSources.push(authorizationSource());
  request.authorizationRef = "src_authorization";
  request.mutationGrant = {
    authorizationRef: "src_authorization",
    modes: ["publish"],
    actions: ["create"],
    targets: [{ repository: REPOSITORY, pathPrefix: "prompts" }],
  };
  pack.sourceBoundary.references.push(authorizationSource());
  pack.artifacts[0].authorizationRef = "src_authorization";

  const receipt = {
    id: "receipt_publish",
    artifactId: "artifact_prompt",
    repository: REPOSITORY,
    path: pack.artifacts[0].path,
    action: "create" as const,
    objectType: pack.artifacts[0].objectType,
    semanticKey: pack.artifacts[0].semanticKey,
    outcome,
    ...(outcome === "failed" ? { attemptedOutcome: "published" as const } : {}),
    authorizationRef: "src_authorization",
    repositoryRevision: REVISION,
    repositoryTreeOid: TREE_OID,
    ...(outcome === "published"
      ? {
          resultRevision: "published-revision",
          resultTreeOid: "published-tree",
        }
      : {}),
    evidence: ["trusted executor receipt"],
    delivery: {
      kind: "reference" as const,
      mediaType: "text/uri-list",
      value: "https://github.example/pull/1",
    },
    receiptHash: RECEIPT_HASH,
  };
  request.executionReceipts = [receipt];

  if (outcome === "published") {
    pack.artifacts[0].status = "published";
    pack.artifacts[0].statusReceiptRef = receipt.id;
    pack.changes[0] = {
      artifactId: "artifact_prompt",
      outcome: "published",
      summary: "Published through the trusted executor.",
      evidence: [...receipt.evidence],
      receiptRef: receipt.id,
      resultRevision: receipt.resultRevision,
      resultTreeOid: receipt.resultTreeOid,
      delivery: { ...receipt.delivery },
    };
  } else {
    pack.changes[0] = {
      artifactId: "artifact_prompt",
      outcome: "failed",
      attemptedOutcome: "published",
      summary: "The trusted executor reported publication failure.",
      evidence: [...receipt.evidence],
      receiptRef: receipt.id,
      delivery: { ...receipt.delivery },
    };
  }

  return { request, pack };
}

describe("validateConversationYield", () => {
  it("accepts a trusted and structurally valid pack without making a release decision", () => {
    const result = validateConversationYield(validPack(), validRequest());

    expect(result).toMatchObject({
      success: true,
      structurallyValid: true,
      issues: [],
      assessment: {
        selfAssessmentThresholdsMet: true,
        independentlyEvaluated: false,
        releaseDecision: "not_evaluated",
      },
    });
  });

  it("accepts an explicit run-level no-op without a synthetic artifact", () => {
    const request = validRequest();
    request.repositories = "auto";
    request.repositoryState = [];
    const pack = validPack();
    pack.disposition = "no_op";
    pack.artifacts = [];
    pack.changes = [];

    const result = validateConversationYield(pack, request);
    expect(result).toMatchObject({ success: true, structurallyValid: true });
  });

  it("rejects no-op disposition that still claims artifact changes", () => {
    const pack = validPack();
    pack.disposition = "no_op";

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "SCHEMA_INVALID" }),
    );
  });

  it("cannot establish trust without caller-owned context", () => {
    const result = validateConversationYield(validPack(), undefined);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "CONTEXT_INVALID" }),
    );
  });

  it("blocks a model-minted authority source", () => {
    const pack = validPack();
    pack.sourceBoundary.references[0] = {
      ...pack.sourceBoundary.references[0],
      id: "src_minted",
    };
    pack.truthLedger[0].sourceRefs = ["src_minted"];
    pack.truthLedger[0].authorityRef = "src_minted";

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "UNTRUSTED_SOURCE" }),
    );
  });

  it("blocks relabeling trusted evidence as user authority", () => {
    const request = validRequest();
    request.trustedSources[0].authorityClass = "evidence_only";
    request.canonGrants = [];
    const pack = validPack();
    pack.sourceBoundary.references[0].authorityClass = "user_adoption";

    const result = validateConversationYield(pack, request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "UNTRUSTED_SOURCE" }),
    );
  });

  it("blocks canon whose statement is outside the exact caller grant", () => {
    const pack = validPack();
    pack.truthLedger[0].statement = "Adopt an unrelated assistant proposal.";

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "FALSE_CANON" }),
    );
  });

  it("does not treat a generic user instruction as canon adoption", () => {
    const request = validRequest();
    request.trustedSources = [authorizationSource()];
    request.canonGrants = [];
    const pack = validPack();
    pack.sourceBoundary.references = [authorizationSource()];
    pack.truthLedger[0].sourceRefs = ["src_authorization"];
    pack.truthLedger[0].authorityRef = "src_authorization";

    const result = validateConversationYield(pack, request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "FALSE_CANON" }),
    );
  });

  it("rejects incompatible authority metadata on a non-CANON unit", () => {
    const pack = validPack();
    pack.truthLedger[0].status = "EVIDENCE";
    pack.truthLedger[0].authorityBasis = "policy_rule";

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "INVALID_AUTHORITY_SOURCE" }),
    );
  });

  it("rejects authorityRef paired with an explicit none basis", () => {
    const pack = validPack();
    pack.truthLedger[0].status = "EVIDENCE";
    pack.truthLedger[0].authorityBasis = "none";

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "SCHEMA_INVALID" }),
    );
  });

  it("blocks references to invented source units", () => {
    const pack = validPack();
    pack.artifacts[0].sourceUnitIds = ["unit_missing"];

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_REFERENCE" }),
    );
  });

  it("blocks output destinations that differ only by case", () => {
    const pack = validPack();
    pack.artifacts.push({
      ...pack.artifacts[0],
      id: "artifact_duplicate",
      semanticKey: "prompt.duplicate",
      path: "PROMPTS/library/conversational-wrap-up/prompt.md",
    });
    pack.changes.push({
      ...pack.changes[0],
      artifactId: "artifact_duplicate",
    });

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "ARTIFACT_COLLISION" }),
    );
  });

  it("blocks intra-pack file/tree prefix collisions", () => {
    const pack = validPack();
    pack.artifacts.push({
      ...pack.artifacts[0],
      id: "artifact_nested",
      semanticKey: "prompt.nested",
      path: `${pack.artifacts[0].path}/child.md`,
    });
    pack.changes.push({
      ...pack.changes[0],
      artifactId: "artifact_nested",
    });

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "ARTIFACT_COLLISION" }),
    );
  });

  it("rejects non-normalized output paths", () => {
    const pack = validPack();
    pack.artifacts[0].path = "docs/./prompt.md";

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "SCHEMA_INVALID" }),
    );
  });

  it("rejects drafted outcomes without complete delivery", () => {
    const pack = validPack();
    delete pack.changes[0].delivery;

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "SCHEMA_INVALID" }),
    );
  });

  it("blocks create over a portable-equivalent existing path", () => {
    const request = validRequest();
    request.repositoryState[0].entries.push({
      path: "PROMPTS/library/conversational-wrap-up/prompt.md",
      type: "blob",
      oid: "existing-oid",
    });

    const result = validateConversationYield(validPack(), request);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ARTIFACT_TARGET_EXISTS" }),
        expect.objectContaining({ code: "ARTIFACT_COLLISION" }),
      ]),
    );
  });

  it("blocks NFC output over an NFD-equivalent existing path", () => {
    const request = validRequest();
    request.repositoryState[0].entries.push({
      path: "docs/cafe\u0301.md",
      type: "blob",
      oid: "unicode-oid",
    });
    const pack = validPack();
    pack.artifacts[0].path = "docs/café.md";

    const result = validateConversationYield(pack, request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "ARTIFACT_TARGET_EXISTS" }),
    );
  });

  it("blocks file/tree prefix collisions", () => {
    const request = validRequest();
    request.repositoryState[0].entries.push({
      path: "prompts",
      type: "blob",
      oid: "blocking-blob",
    });

    const result = validateConversationYield(validPack(), request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "ARTIFACT_COLLISION" }),
    );
  });

  it.each(["symlink", "submodule"] as const)(
    "blocks update through an exact %s boundary",
    (type) => {
      const request = validRequest();
      const pack = validPack();
      request.repositoryState[0].entries.push({
        path: pack.artifacts[0].path,
        type,
        oid: `${type}-oid`,
      });
      pack.artifacts[0].action = "update";

      const result = validateConversationYield(pack, request);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: "ARTIFACT_COLLISION" }),
      );
    },
  );

  it("blocks an existing declared semantic identity at another path", () => {
    const request = validRequest();
    request.repositoryState[0].objects.push({
      semanticKey: "prompt.quirk-wrap",
      path: "prompts/legacy/PROMPT.md",
    });

    const result = validateConversationYield(validPack(), request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "SEMANTIC_COLLISION" }),
    );
  });

  it("blocks relabeling an indexed object during update", () => {
    const request = validRequest();
    const pack = validPack();
    request.repositoryState[0].entries.push({
      path: pack.artifacts[0].path,
      type: "blob",
      oid: "existing-prompt",
    });
    request.repositoryState[0].objects.push({
      semanticKey: "prompt.old-name",
      path: pack.artifacts[0].path,
    });
    pack.artifacts[0].action = "update";

    const result = validateConversationYield(pack, request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "SEMANTIC_COLLISION" }),
    );
  });

  it("enforces the caller's artifact budget", () => {
    const request = validRequest();
    request.artifactBudget = 0;

    const result = validateConversationYield(validPack(), request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "ARTIFACT_BUDGET_EXCEEDED" }),
    );
  });

  it("enforces the trusted repository allowlist", () => {
    const request = validRequest();
    request.repositories = ["Quirk-Systems/another-repo"];

    const result = validateConversationYield(validPack(), request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "REPOSITORY_SCOPE_MISMATCH" }),
    );
  });

  it("allows only proposals when repository state is incomplete", () => {
    const request = validRequest();
    request.repositoryState[0].complete = false;

    const result = validateConversationYield(validPack(), request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "REPOSITORY_STATE_INCOMPLETE" }),
    );
  });

  it("accepts a failed external operation only with an exact trusted receipt", () => {
    const { pack, request } = publishContext("failed");
    const result = validateConversationYield(pack, request);

    expect(result).toMatchObject({ success: true, structurallyValid: true });
  });

  it("blocks a failed publication attempt in patch-only mode", () => {
    const { pack, request } = publishContext("failed");
    request.mode = "patch";
    request.mutationGrant!.modes = ["patch"];

    const result = validateConversationYield(pack, request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "AUTHORIZATION_MISMATCH" }),
    );
  });

  it("accepts a published state only with a scoped grant and exact trusted receipt", () => {
    const { pack, request } = publishContext("published");
    const result = validateConversationYield(pack, request);

    expect(result).toMatchObject({ success: true, structurallyValid: true });
  });

  it("blocks a model-authored publication receipt", () => {
    const { pack, request } = publishContext("published");
    request.executionReceipts = [];

    const result = validateConversationYield(pack, request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "EXECUTION_RECEIPT_MISMATCH" }),
    );
  });

  it("blocks receipt replay against changed semantics or delivery", () => {
    const { pack, request } = publishContext("published");
    pack.artifacts[0].semanticKey = "prompt.replayed";
    pack.changes[0].delivery!.value = "https://github.example/pull/other";

    const result = validateConversationYield(pack, request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "EXECUTION_RECEIPT_MISMATCH" }),
    );
  });

  it("blocks a failed terminal result after the artifact is already published", () => {
    const { pack, request } = publishContext("published");
    const successReceipt = request.executionReceipts[0];
    const failureReceipt = {
      ...successReceipt,
      id: "receipt_publish_failure",
      outcome: "failed" as const,
      attemptedOutcome: "published" as const,
    };
    delete failureReceipt.resultRevision;
    delete failureReceipt.resultTreeOid;
    request.executionReceipts.push(failureReceipt);
    pack.changes[0] = {
      artifactId: "artifact_prompt",
      outcome: "failed",
      attemptedOutcome: "published",
      summary: "A contradictory second publication attempt failed.",
      evidence: [...failureReceipt.evidence],
      receiptRef: failureReceipt.id,
      delivery: { ...failureReceipt.delivery },
    };

    const result = validateConversationYield(pack, request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "EXECUTION_STATE_CONTRADICTION" }),
    );
  });

  it("keeps failed hard-gate self-assessment separate from structural validity", () => {
    const pack = validPack();
    pack.evaluation.hardGates.collisionSafe = "not_applicable";

    const result = validateConversationYield(pack, validRequest());
    expect(result).toMatchObject({
      success: true,
      structurallyValid: true,
      assessment: {
        allHardGatesPass: false,
        selfAssessmentThresholdsMet: false,
        releaseDecision: "not_evaluated",
      },
    });
    expect(result.assessment?.findings).toContainEqual(
      expect.objectContaining({ code: "HARD_GATE_NOT_PASSED" }),
    );
  });

  it("keeps low self-scores separate from structural validity", () => {
    const pack = validPack();
    pack.evaluation.dimensionScores.synthesisLeverage = 0;
    pack.evaluation.weightedScore = computeYieldScore(
      pack.evaluation.dimensionScores,
    );

    const result = validateConversationYield(pack, validRequest());
    expect(result).toMatchObject({
      success: true,
      structurallyValid: true,
      assessment: { selfAssessmentThresholdsMet: false },
    });
    expect(result.assessment?.findings).toContainEqual(
      expect.objectContaining({ code: "SCORE_BELOW_RELEASE" }),
    );
  });

  it("rejects arithmetically inconsistent self-scores", () => {
    const pack = validPack();
    pack.evaluation.dimensionScores.synthesisLeverage = 0;

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "SCORE_MISMATCH" }),
    );
  });

  it("detects common secret shapes", () => {
    const pack = validPack();
    pack.verdict = `Accidentally retained ${"ghp_" + "a".repeat(36)}`;

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "POTENTIAL_SECRET" }),
    );
  });

  it("rejects duplicate references to match the interchange schema", () => {
    const pack = validPack();
    pack.truthLedger[0].sourceRefs.push("src_adoption");

    const result = validateConversationYield(pack, validRequest());
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "SCHEMA_INVALID" }),
    );
  });

  it("rejects ambiguous semantic objects at portable-equivalent paths", () => {
    const request = validRequest();
    request.repositoryState[0].objects.push(
      { semanticKey: "doc.alpha", path: "docs/alpha.md" },
      { semanticKey: "doc.beta", path: "DOCS/ALPHA.md" },
    );

    const result = validateConversationYield(validPack(), request);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "CONTEXT_INVALID" }),
    );
  });

  it.each(["../repo", "owner/.."])(
    "keeps repository-name safety aligned for %s",
    (repository) => {
      const request = validRequest();
      request.repositories = [repository];
      request.repositoryState[0].repository = repository;
      const interchangePattern = new RegExp(
        yieldSchema.$defs.repositoryName.pattern,
      );

      expect(interchangePattern.test(repository)).toBe(false);
      expect(conversationCompileRequestSchema.safeParse(request).success).toBe(
        false,
      );
    },
  );
});

describe("compileConversation", () => {
  it("allows a dormant trusted mutation grant in draft mode", async () => {
    const request = validRequest();
    request.trustedSources.push(authorizationSource());
    request.mutationGrant = {
      authorizationRef: "src_authorization",
      modes: ["patch"],
      actions: ["create"],
      targets: [{ repository: REPOSITORY, pathPrefix: "prompts" }],
    };

    const result = await compileConversation(request, {
      generateYieldPack: async () => validPack(),
    });
    expect(result).toMatchObject({ ok: true, stage: "yield" });
  });

  it("rejects patch requests without a scoped mutation grant", async () => {
    const request = validRequest();
    request.mode = "patch";
    request.authorizationRef = "src_authorization";
    request.trustedSources.push(authorizationSource());

    const result = await compileConversation(request, {
      generateYieldPack: async () => validPack(),
    });

    expect(result).toMatchObject({ ok: false, stage: "request", attempts: 0 });
  });

  it("prevents a provider from mutating the retained trust context", async () => {
    const result = await compileConversation(
      validRequest(),
      {
        generateYieldPack: async ({ request }) => {
          request.trustedSources[0].contentHash = `sha256:${"d".repeat(64)}`;
          const pack = validPack();
          pack.sourceBoundary.references[0].contentHash =
            request.trustedSources[0].contentHash;
          return pack;
        },
      },
      1,
    );

    expect(result).toMatchObject({ ok: false, stage: "yield", attempts: 1 });
    if (result.stage === "yield") {
      expect(result.validation.issues).toContainEqual(
        expect.objectContaining({ code: "UNTRUSTED_SOURCE" }),
      );
    }
  });

  it("feeds structural failures back through a bounded repair pass", async () => {
    let calls = 0;
    const result = await compileConversation(validRequest(), {
      generateYieldPack: async ({ validationFeedback }) => {
        calls += 1;
        if (calls === 1) {
          expect(validationFeedback).toEqual([]);
          const invalid = validPack();
          invalid.truthLedger[0].statement = "An ungranted canon statement.";
          return invalid;
        }
        expect(validationFeedback).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: "FALSE_CANON" }),
          ]),
        );
        return validPack();
      },
    });

    expect(calls).toBe(2);
    expect(result).toMatchObject({ ok: true, stage: "yield", attempts: 2 });
  });

  it.each([
    [Number.NaN, 2],
    [1.5, 1],
  ])(
    "normalizes a %s attempt limit to a schema-valid bounded integer",
    async (maximumAttempts, expectedAttempts) => {
      let calls = 0;
      const result = await compileConversation(
        validRequest(),
        {
          generateYieldPack: async () => {
            calls += 1;
            const invalid = validPack();
            invalid.truthLedger[0].statement = "An ungranted canon statement.";
            return invalid;
          },
        },
        maximumAttempts,
      );

      expect(calls).toBe(expectedAttempts);
      expect(result).toMatchObject({
        ok: false,
        stage: "yield",
        attempts: expectedAttempts,
        validation: expect.any(Object),
      });
    },
  );
});
