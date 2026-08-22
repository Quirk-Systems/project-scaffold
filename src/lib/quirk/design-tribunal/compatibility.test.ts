import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DesignBudgetSchema,
  DesignCriterionSchema,
  DesignEvidenceSchema,
  DesignFindingSchema,
  DesignHumanDecisionSchema,
  DesignReviewReportSchema,
  DesignReviewRequestSchema,
  type DesignCriterion,
  type DesignEvidence,
  type DesignFinding,
  type DesignHumanDecision,
  type DesignReviewRequest,
} from "./contracts";
import {
  adaptDesignEvidence,
  adaptDesignFinding,
  adaptDesignHumanDecision,
  adaptDesignReviewRequest,
  computeDesignFindingDigest,
  computeDesignReviewRequestDigest,
} from "./compatibility";
import {
  computeDecisionReceiptContentDigest,
  computeEvidenceClaimContentDigest,
  computeTribunalActionDigest,
  computeTribunalCaseDigest,
  computeVerdictContentDigest,
  type TribunalActionManifest,
  type TribunalCase,
} from "./protocol";

const fixture = JSON.parse(
  readFileSync("fixtures/tribunal/protocol.v1.fixture.json", "utf8"),
) as {
  canonicalActionManifest: TribunalActionManifest;
  tribunalCase: TribunalCase;
};

function compatibilityOperatingScope() {
  const { purposeId, tenantId, audienceId, destinationId } =
    fixture.tribunalCase.operatingScope;
  return { purposeId, tenantId, audienceId, destinationId };
}

const request: DesignReviewRequest = {
  id: "case.design.review.v1",
  artifactKind: "app",
  artifactLocator: "src/app/page.tsx",
  brief: "Review the application surface.",
  audience: "Internal product team",
  desiredOutcome: "A bounded recommendation with human authority preserved.",
  noBaselineReason: "This is the first contract fixture.",
  designSystemVersion: "1.0.0",
  prohibitedChanges: ["Do not approve release autonomously."],
  criteria: [
    {
      id: "criterion.authority",
      title: "Authority remains external",
      dimension: "authority",
      requirement: "Evaluation cannot create authority.",
      gate: "deterministic",
      evidenceRequired: ["test_result"],
      blocksRelease: true,
    },
  ],
  mode: "standard",
  budget: { maxRounds: 2, maxCandidates: 2 },
  humanApprovalRequired: true,
  humanAuthorityId: "human:bryan",
  sourceRefs: ["docs/quirk/design-tribunal/README.md"],
};

const designEvidence: DesignEvidence = {
  kind: "test_result",
  locator: "fixture://tribunal/positive-basic",
  summary: "The positive fixture validates.",
  digest: fixture.tribunalCase.evidenceClaims[0].source.digest,
};

const finding: DesignFinding = {
  id: "finding.contract.v1",
  runId: "trajectory.release.v1",
  criterionId: "criterion.authority",
  criticRole: "referee",
  verdict: "pass",
  severity: "note",
  claim: "Authority remains external.",
  evidence: [designEvidence],
  remediation: null,
  confidence: 0.86,
  blocksRelease: false,
  resolutionStatus: "open",
  createdAt: "2026-08-21T13:00:00.000Z",
};

const humanDecision: DesignHumanDecision = {
  decision: "approved",
  authorityType: "human",
  authorityId: "human:bryan",
  rationale: "The human authority accepts the bounded recommendation.",
  decidedAt: "2026-08-21T13:02:00.000Z",
};

const report = {
  runId: finding.runId,
  request,
  findings: [finding],
  status: "pass" as const,
  budgetExhausted: false,
  repairQueue: [],
  humanDecision,
  rationale: "The bounded review passed.",
  completedAt: "2026-08-21T13:03:00.000Z",
};

describe("Design Tribunal compatibility adapters", () => {
  it.each([
    ["request", DesignReviewRequestSchema, { ...request, unknown: true }],
    [
      "criterion",
      DesignCriterionSchema,
      { ...request.criteria[0], unknown: true } satisfies DesignCriterion & {
        unknown: boolean;
      },
    ],
    ["budget", DesignBudgetSchema, { ...request.budget, unknown: true }],
    ["evidence", DesignEvidenceSchema, { ...designEvidence, unknown: true }],
    ["finding", DesignFindingSchema, { ...finding, unknown: true }],
    [
      "human decision",
      DesignHumanDecisionSchema,
      { ...humanDecision, unknown: true },
    ],
    ["report", DesignReviewReportSchema, { ...report, unknown: true }],
  ])(
    "rejects unknown keys at the canonical %s boundary",
    (_boundary, schema, value) => {
      expect(schema.safeParse(value).success).toBe(false);
    },
  );

  it("rejects unsafe digest inputs before schema traversal", () => {
    let requestIdReads = 0;
    const requestWithAccessor = Object.defineProperty({ ...request }, "id", {
      enumerable: true,
      get() {
        requestIdReads += 1;
        return request.id;
      },
    });
    let findingIdReads = 0;
    const findingWithAccessor = Object.defineProperty({ ...finding }, "id", {
      enumerable: true,
      get() {
        findingIdReads += 1;
        return finding.id;
      },
    });

    expect(() => computeDesignReviewRequestDigest(requestWithAccessor)).toThrow(
      TypeError,
    );
    expect(() => computeDesignFindingDigest(findingWithAccessor)).toThrow(
      TypeError,
    );
    expect(requestIdReads).toBe(0);
    expect(findingIdReads).toBe(0);
  });

  it("builds a TribunalCase from a canonical DesignReviewRequest without inventing bindings", () => {
    const source = fixture.tribunalCase;
    const result = adaptDesignReviewRequest({
      request,
      bindings: {
        requesterId: source.requesterId,
        trajectoryId: source.trajectoryId,
        realm: source.subject.realm,
        revision: source.subject.revision,
        subjectDigest: source.subject.digest,
        openedAt: source.openedAt,
        evaluatedAt: source.evaluatedAt,
        proposedEffect: source.proposedEffect,
        operatingScope: compatibilityOperatingScope(),
        actionManifest: fixture.canonicalActionManifest,
      },
      roles: {
        authorityGrants: source.authorityGrants,
        evaluatorDeclarations: source.evaluatorDeclarations,
        evidenceClaims: source.evidenceClaims,
        verdicts: source.verdicts,
        decisionReceipts: source.decisionReceipts,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.caseId).toBe(request.id);
    expect(result.value.subject).toMatchObject({
      id: request.id,
      targetClass: request.artifactKind,
      locator: request.artifactLocator,
    });
    expect(result.value.criteria).toEqual(request.criteria);
    expect(result.value.requestDigest).toBe(
      computeDesignReviewRequestDigest(request),
    );
    expect(result.value.humanApprovalRequired).toBe(true);
    expect(result.value.operatingScope.actionDigest).toBe(
      computeTribunalActionDigest(fixture.canonicalActionManifest),
    );
    expect(result.value.sourceRefs).toEqual(request.sourceRefs);

    expect(
      computeDesignReviewRequestDigest({
        ...request,
        audience: "A different audience",
      }),
    ).not.toBe(result.value.requestDigest);
    expect(
      computeDesignReviewRequestDigest({
        ...request,
        prohibitedChanges: [...request.prohibitedChanges, "No hidden drift."],
      }),
    ).not.toBe(result.value.requestDigest);
  });

  it("rejects substituted candidates and digest-unbound action evidence", () => {
    const source = fixture.tribunalCase;
    const adapt = (actionManifest: TribunalActionManifest) =>
      adaptDesignReviewRequest({
        request,
        bindings: {
          requesterId: source.requesterId,
          trajectoryId: source.trajectoryId,
          realm: source.subject.realm,
          revision: source.subject.revision,
          subjectDigest: source.subject.digest,
          openedAt: source.openedAt,
          evaluatedAt: source.evaluatedAt,
          proposedEffect: source.proposedEffect,
          operatingScope: compatibilityOperatingScope(),
          actionManifest,
        },
        roles: {
          authorityGrants: source.authorityGrants,
          evaluatorDeclarations: source.evaluatorDeclarations,
          evidenceClaims: source.evidenceClaims,
          verdicts: source.verdicts,
          decisionReceipts: source.decisionReceipts,
        },
      });

    const alternateDigest = `sha256:${"1".repeat(64)}`;
    const substituted = structuredClone(fixture.canonicalActionManifest);
    substituted.candidates = [
      {
        digest: alternateDigest,
        generatorId: "generator.substituted.v1",
        independenceKey: "independence.substituted.v1",
      },
    ];
    substituted.selectedCandidateDigest = alternateDigest;
    expect(adapt(substituted)).toMatchObject({
      ok: false,
      issues: [{ code: "TRIBUNAL_ADAPTER_OUTPUT_INVALID" }],
    });

    const mismatchedEvidence = structuredClone(fixture.canonicalActionManifest);
    mismatchedEvidence.prohibitedChangeChecks[0].evidenceClaims[0].contentDigest =
      alternateDigest;
    expect(adapt(mismatchedEvidence)).toMatchObject({
      ok: false,
      issues: [{ code: "TRIBUNAL_ADAPTER_OUTPUT_INVALID" }],
    });
  });

  it("rejects duplicate role IDs before adapter maps can shadow them", () => {
    const source = fixture.tribunalCase;
    const shadow = structuredClone(source.evidenceClaims[0]);
    shadow.claim = "A shadow claim with the same object ID.";
    shadow.contentDigest = computeEvidenceClaimContentDigest(shadow);

    const result = adaptDesignReviewRequest({
      request,
      bindings: {
        requesterId: source.requesterId,
        trajectoryId: source.trajectoryId,
        realm: source.subject.realm,
        revision: source.subject.revision,
        subjectDigest: source.subject.digest,
        openedAt: source.openedAt,
        evaluatedAt: source.evaluatedAt,
        proposedEffect: source.proposedEffect,
        operatingScope: compatibilityOperatingScope(),
        actionManifest: fixture.canonicalActionManifest,
      },
      roles: {
        authorityGrants: source.authorityGrants,
        evaluatorDeclarations: source.evaluatorDeclarations,
        evidenceClaims: [shadow, ...source.evidenceClaims],
        verdicts: source.verdicts,
        decisionReceipts: source.decisionReceipts,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      issues: [{ code: "TRIBUNAL_ADAPTER_OUTPUT_INVALID" }],
    });
  });

  it("preserves DesignEvidence verbatim and requires its digest", () => {
    const result = adaptDesignEvidence({
      evidence: designEvidence,
      bindings: {
        id: "evidence.fixture.v1",
        claimId: "claim.contract-valid",
        claim: "The canonical fixture validates.",
        subjectDigest: fixture.tribunalCase.subject.digest,
        observable: true,
        inspectedBy: "evaluator.contract.v1",
        inspectionToolId: "vitest",
        inspectionMethod: "vitest fixture execution",
        observedAt: "2026-08-21T12:45:00.000Z",
        validUntil: "2026-08-22T12:45:00.000Z",
        confidence: 0.9,
        limitations: ["Fixture scope only."],
        retentionClass: "project",
        derivedFromEvidenceClaims: [],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toEqual(designEvidence);
    expect(result.value.contentDigest).toBe(
      computeEvidenceClaimContentDigest(result.value),
    );

    const missing = adaptDesignEvidence({
      evidence: {
        kind: designEvidence.kind,
        locator: designEvidence.locator,
        summary: designEvidence.summary,
      },
      bindings: {
        id: "evidence.fixture.v1",
        claimId: "claim.contract-valid",
        claim: "The canonical fixture validates.",
        subjectDigest: fixture.tribunalCase.subject.digest,
        observable: true,
        inspectedBy: "evaluator.contract.v1",
        inspectionToolId: "vitest",
        inspectionMethod: "vitest fixture execution",
        observedAt: "2026-08-21T12:45:00.000Z",
        validUntil: "2026-08-22T12:45:00.000Z",
        confidence: 0.9,
        limitations: [],
        retentionClass: "project",
        derivedFromEvidenceClaims: [],
      },
    });
    expect(missing).toMatchObject({
      ok: false,
      issues: [{ code: "DESIGN_EVIDENCE_DIGEST_REQUIRED" }],
    });

    const malformed = adaptDesignEvidence({
      evidence: { ...designEvidence, digest: "abc" },
      bindings: {
        id: "evidence.fixture.v1",
        claimId: "criterion.authority",
        claim: "The canonical fixture validates.",
        subjectDigest: fixture.tribunalCase.subject.digest,
        observable: true,
        inspectedBy: "evaluator.contract.v1",
        inspectionToolId: "vitest",
        inspectionMethod: "vitest fixture execution",
        observedAt: "2026-08-21T12:45:00.000Z",
        validUntil: "2026-08-22T12:45:00.000Z",
        confidence: 0.9,
        limitations: [],
        retentionClass: "project",
        derivedFromEvidenceClaims: [],
      },
    });
    expect(malformed).toMatchObject({
      ok: false,
      issues: [{ code: "DESIGN_EVIDENCE_DIGEST_INVALID" }],
    });
  });

  it.each([
    ["pass", "SUPPORTED"],
    ["fail", "CONTRADICTED"],
    ["unresolved", "INSUFFICIENT"],
  ] as const)(
    "maps DesignFinding %s without turning blocksRelease into authority",
    (sourceVerdict, disposition) => {
      const source = fixture.tribunalCase;
      const result = adaptDesignFinding({
        finding: { ...finding, verdict: sourceVerdict },
        evidenceClaims: [source.evidenceClaims[0]],
        bindings: {
          evaluatorDeclarationId: "evaluator.contract.v1",
          authorityGrantId: "grant.evaluator.v1",
          grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
          subjectDigest: source.subject.digest,
          authorityEffectRequested:
            sourceVerdict === "fail"
              ? "block"
              : sourceVerdict === "pass"
                ? "recommend"
                : "observe",
          declarationDigest:
            source.evaluatorDeclarations[0].provenance.declarationDigest,
          trajectoryId: source.trajectoryId,
          evaluatorVersion: source.evaluatorDeclarations[0].version,
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.disposition).toBe(disposition);
      expect(result.value.criterionRef).toBe(finding.criterionId);
      expect(result.value.claimId).toBe(finding.criterionId);
      expect(result.value.evidenceClaimIds).toEqual([
        source.evidenceClaims[0].id,
      ]);
      expect(result.value.provenance.evidenceDigests).toEqual([
        source.evidenceClaims[0].contentDigest,
      ]);
      expect(result.value.provenance.sourceFindingDigest).toBe(
        computeDesignFindingDigest({ ...finding, verdict: sourceVerdict }),
      );
      expect(result.value.authorityEffectRequested).toBe(
        sourceVerdict === "fail"
          ? "block"
          : sourceVerdict === "pass"
            ? "recommend"
            : "observe",
      );
      expect(result.value.provenance.contentDigest).toBe(
        computeVerdictContentDigest(result.value),
      );
    },
  );

  it("does not let adapter bindings replace the canonical finding trajectory", () => {
    const source = fixture.tribunalCase;
    const result = adaptDesignFinding({
      finding,
      evidenceClaims: [source.evidenceClaims[0]],
      bindings: {
        evaluatorDeclarationId: "evaluator.contract.v1",
        authorityGrantId: "grant.evaluator.v1",
        grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
        subjectDigest: source.subject.digest,
        authorityEffectRequested: "recommend",
        declarationDigest:
          source.evaluatorDeclarations[0].provenance.declarationDigest,
        trajectoryId: "trajectory.unrelated.v1",
        evaluatorVersion: source.evaluatorDeclarations[0].version,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      issues: [{ code: "DESIGN_FINDING_TRAJECTORY_MISMATCH" }],
    });
  });

  it("derives verdict evidence one-to-one from the canonical finding", () => {
    const source = fixture.tribunalCase;
    const unrelated = structuredClone(source.evidenceClaims[0]);
    unrelated.source.locator = "fixture://tribunal/unrelated";
    unrelated.contentDigest = computeEvidenceClaimContentDigest(unrelated);

    const substituted = adaptDesignFinding({
      finding,
      evidenceClaims: [unrelated],
      bindings: {
        evaluatorDeclarationId: "evaluator.contract.v1",
        authorityGrantId: "grant.evaluator.v1",
        grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
        subjectDigest: source.subject.digest,
        authorityEffectRequested: "recommend",
        declarationDigest:
          source.evaluatorDeclarations[0].provenance.declarationDigest,
        trajectoryId: source.trajectoryId,
        evaluatorVersion: source.evaluatorDeclarations[0].version,
      },
    });
    expect(substituted).toMatchObject({
      ok: false,
      issues: [{ code: "DESIGN_FINDING_EVIDENCE_MISMATCH" }],
    });

    const missingDigest = adaptDesignFinding({
      finding: {
        ...finding,
        evidence: [
          {
            kind: designEvidence.kind,
            locator: designEvidence.locator,
            summary: designEvidence.summary,
          },
        ],
      },
      evidenceClaims: [source.evidenceClaims[0]],
      bindings: {
        evaluatorDeclarationId: "evaluator.contract.v1",
        authorityGrantId: "grant.evaluator.v1",
        grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
        subjectDigest: source.subject.digest,
        authorityEffectRequested: "recommend",
        declarationDigest:
          source.evaluatorDeclarations[0].provenance.declarationDigest,
        trajectoryId: source.trajectoryId,
        evaluatorVersion: source.evaluatorDeclarations[0].version,
      },
    });
    expect(missingDigest).toMatchObject({
      ok: false,
      issues: [{ code: "DESIGN_FINDING_EVIDENCE_DIGEST_REQUIRED" }],
    });

    const malformedDigest = adaptDesignFinding({
      finding: {
        ...finding,
        evidence: [{ ...designEvidence, digest: "abc" }],
      },
      evidenceClaims: [source.evidenceClaims[0]],
      bindings: {
        evaluatorDeclarationId: "evaluator.contract.v1",
        authorityGrantId: "grant.evaluator.v1",
        grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
        subjectDigest: source.subject.digest,
        authorityEffectRequested: "recommend",
        declarationDigest:
          source.evaluatorDeclarations[0].provenance.declarationDigest,
        trajectoryId: source.trajectoryId,
        evaluatorVersion: source.evaluatorDeclarations[0].version,
      },
    });
    expect(malformedDigest).toMatchObject({
      ok: false,
      issues: [{ code: "DESIGN_FINDING_EVIDENCE_DIGEST_INVALID" }],
    });
  });

  it.each(["fixed", "waived", "false_alarm", "verified"] as const)(
    "does not reactivate a %s DesignFinding",
    (resolutionStatus) => {
      const source = fixture.tribunalCase;
      const result = adaptDesignFinding({
        finding: { ...finding, resolutionStatus },
        evidenceClaims: [source.evidenceClaims[0]],
        bindings: {
          evaluatorDeclarationId: "evaluator.contract.v1",
          authorityGrantId: "grant.evaluator.v1",
          grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
          subjectDigest: source.subject.digest,
          authorityEffectRequested: "recommend",
          declarationDigest:
            source.evaluatorDeclarations[0].provenance.declarationDigest,
          trajectoryId: source.trajectoryId,
          evaluatorVersion: source.evaluatorDeclarations[0].version,
        },
      });
      expect(result).toMatchObject({
        ok: false,
        issues: [{ code: "DESIGN_FINDING_RESOLUTION_INACTIVE" }],
      });
    },
  );

  it("embeds the exact canonical human decision in a hash-bound receipt", () => {
    const source = fixture.tribunalCase;
    const result = adaptDesignHumanDecision({
      decision: humanDecision,
      bindings: {
        id: "receipt.review.v1",
        caseId: source.caseId,
        caseDigest: computeTribunalCaseDigest(source),
        effect: "recommend",
        consideredVerdictIds: ["verdict.recommend.v1"],
        acceptedEvidenceClaimIds: ["evidence.fixture.v1"],
        rejectedOrDisputedEvidence: [],
        authorityGrantRefs: [
          {
            grantId: "grant.evaluator.v1",
            grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
          },
        ],
        reversibility: {
          kind: "reversible",
          rollbackRef: "git://revert/receipt.review.v1",
          deadline: "2026-09-21T13:02:00.000Z",
        },
        issuedAt: humanDecision.decidedAt,
        nonce: "receipt-nonce-0001",
        previousReceiptDigest: null,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.decision).toEqual(humanDecision);
    expect(result.value.contentDigest).toBe(
      computeDecisionReceiptContentDigest(result.value),
    );
  });

  it("rejects unsafe adapter graphs before parsing or hashing them", () => {
    const cyclic: Record<string, unknown> = { request };
    cyclic.self = cyclic;

    expect(adaptDesignReviewRequest(cyclic as never)).toMatchObject({
      ok: false,
      issues: [{ code: "ADAPTER_INPUT_UNSAFE", path: "$" }],
    });

    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(() =>
      adaptDesignReviewRequest(revoked.proxy as never),
    ).not.toThrow();
    expect(adaptDesignReviewRequest(revoked.proxy as never)).toMatchObject({
      ok: false,
      issues: [{ code: "ADAPTER_INPUT_UNSAFE", path: "$" }],
    });

    const hugeKey = "x".repeat(65_537);
    expect(
      adaptDesignHumanDecision({
        decision: humanDecision,
        bindings: {
          [hugeKey]: true,
        },
      } as never),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "ADAPTER_INPUT_UNSAFE", path: "$" }],
    });
  });

  it("fails closed for missing adapter containers and sparse arrays", () => {
    const source = fixture.tribunalCase;
    const reviewInput = {
      request,
      bindings: {
        requesterId: source.requesterId,
        trajectoryId: source.trajectoryId,
        realm: source.subject.realm,
        revision: source.subject.revision,
        subjectDigest: source.subject.digest,
        openedAt: source.openedAt,
        evaluatedAt: source.evaluatedAt,
        proposedEffect: source.proposedEffect,
        operatingScope: compatibilityOperatingScope(),
        actionManifest: fixture.canonicalActionManifest,
      },
      roles: {
        authorityGrants: source.authorityGrants,
        evaluatorDeclarations: source.evaluatorDeclarations,
        evidenceClaims: source.evidenceClaims,
        verdicts: source.verdicts,
        decisionReceipts: source.decisionReceipts,
      },
    };
    const evidenceInput = {
      evidence: designEvidence,
      bindings: {
        id: "evidence.fixture.v1",
        claimId: "claim.contract-valid",
        claim: "The canonical fixture validates.",
        subjectDigest: source.subject.digest,
        observable: true,
        inspectedBy: "evaluator.contract.v1",
        inspectionToolId: "vitest",
        inspectionMethod: "vitest fixture execution",
        observedAt: "2026-08-21T12:45:00.000Z",
        validUntil: "2026-08-22T12:45:00.000Z",
        confidence: 0.9,
        limitations: ["Fixture scope only."],
        retentionClass: "project",
        derivedFromEvidenceClaims: [],
      },
    };
    const findingInput = {
      finding,
      evidenceClaims: [source.evidenceClaims[0]],
      bindings: {
        evaluatorDeclarationId: "evaluator.contract.v1",
        authorityGrantId: "grant.evaluator.v1",
        grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
        subjectDigest: source.subject.digest,
        authorityEffectRequested: "recommend" as const,
        declarationDigest:
          source.evaluatorDeclarations[0].provenance.declarationDigest,
        trajectoryId: source.trajectoryId,
        evaluatorVersion: source.evaluatorDeclarations[0].version,
      },
    };
    const decisionInput = {
      decision: humanDecision,
      bindings: {
        id: "receipt.review.v1",
        caseId: source.caseId,
        caseDigest: computeTribunalCaseDigest(source),
        effect: "recommend" as const,
        consideredVerdictIds: ["verdict.recommend.v1"],
        acceptedEvidenceClaimIds: ["evidence.fixture.v1"],
        rejectedOrDisputedEvidence: [],
        authorityGrantRefs: [
          {
            grantId: "grant.evaluator.v1",
            grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
          },
        ],
        reversibility: { kind: "irreversible" as const },
        issuedAt: humanDecision.decidedAt,
        nonce: "receipt-nonce-0001",
        previousReceiptDigest: null,
      },
    };

    const attempts: Array<() => unknown> = [
      () => adaptDesignReviewRequest({ request } as never),
      () => adaptDesignEvidence({ evidence: designEvidence } as never),
      () =>
        adaptDesignFinding({
          finding,
          evidenceClaims: source.evidenceClaims,
        } as never),
      () => adaptDesignHumanDecision({ decision: humanDecision } as never),
      () =>
        adaptDesignReviewRequest({
          ...reviewInput,
          roles: {
            ...reviewInput.roles,
            decisionReceipts: new Array(1),
          },
        } as never),
      () =>
        adaptDesignEvidence({
          ...evidenceInput,
          bindings: {
            ...evidenceInput.bindings,
            limitations: new Array(1),
          },
        } as never),
      () =>
        adaptDesignFinding({
          ...findingInput,
          evidenceClaims: new Array(1),
        } as never),
      () =>
        adaptDesignHumanDecision({
          ...decisionInput,
          bindings: {
            ...decisionInput.bindings,
            consideredVerdictIds: new Array(1),
          },
        } as never),
    ];

    for (const attempt of attempts) {
      expect(attempt).not.toThrow();
      expect(attempt()).toMatchObject({ ok: false });
    }
  });
});
