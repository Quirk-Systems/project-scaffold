import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type {
  DesignEvidence,
  DesignFinding,
  DesignHumanDecision,
  DesignReviewRequest,
} from "./contracts";
import {
  adaptDesignEvidence,
  adaptDesignFinding,
  adaptDesignHumanDecision,
  adaptDesignReviewRequest,
} from "./compatibility";
import {
  computeDecisionReceiptContentDigest,
  computeEvidenceClaimContentDigest,
  computeTribunalCaseDigest,
  computeVerdictContentDigest,
  type TribunalCase,
} from "./protocol";

const fixture = JSON.parse(
  readFileSync("fixtures/tribunal/protocol.v1.fixture.json", "utf8"),
) as { tribunalCase: TribunalCase };

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
  resolutionStatus: "verified",
  createdAt: "2026-08-21T13:00:00.000Z",
};

const humanDecision: DesignHumanDecision = {
  decision: "approved",
  authorityType: "human",
  authorityId: "human:bryan",
  rationale: "The human authority accepts the bounded recommendation.",
  decidedAt: "2026-08-21T13:02:00.000Z",
};

describe("Design Tribunal compatibility adapters", () => {
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
        operatingScope: source.operatingScope,
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
    expect(result.value.criterionRefs).toEqual(["criterion.authority"]);
    expect(result.value.sourceRefs).toEqual(request.sourceRefs);
  });

  it("preserves DesignEvidence verbatim and requires its digest", () => {
    const result = adaptDesignEvidence({
      evidence: designEvidence,
      bindings: {
        id: "evidence.fixture.v1",
        claimId: "claim.contract-valid",
        claim: "The canonical fixture validates.",
        subjectDigest: fixture.tribunalCase.subject.digest,
        inspectedBy: "evaluator.contract.v1",
        inspectionMethod: "vitest fixture execution",
        observedAt: "2026-08-21T12:45:00.000Z",
        validUntil: "2026-08-22T12:45:00.000Z",
        confidence: 0.9,
        limitations: ["Fixture scope only."],
        retentionClass: "project",
        derivedFromEvidenceClaimIds: [],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toEqual(designEvidence);
    expect(result.value.contentDigest).toBe(
      computeEvidenceClaimContentDigest(result.value),
    );

    const missing = adaptDesignEvidence({
      evidence: { ...designEvidence, digest: undefined },
      bindings: {
        id: "evidence.fixture.v1",
        claimId: "claim.contract-valid",
        claim: "The canonical fixture validates.",
        subjectDigest: fixture.tribunalCase.subject.digest,
        inspectedBy: "evaluator.contract.v1",
        inspectionMethod: "vitest fixture execution",
        observedAt: "2026-08-21T12:45:00.000Z",
        validUntil: "2026-08-22T12:45:00.000Z",
        confidence: 0.9,
        limitations: [],
        retentionClass: "project",
        derivedFromEvidenceClaimIds: [],
      },
    });
    expect(missing).toMatchObject({
      ok: false,
      issues: [{ code: "DESIGN_EVIDENCE_DIGEST_REQUIRED" }],
    });
  });

  it.each([
    ["pass", "SUPPORTED"],
    ["fail", "CONTRADICTED"],
    ["unresolved", "INSUFFICIENT"],
  ] as const)("maps DesignFinding %s without turning blocksRelease into authority", (sourceVerdict, disposition) => {
    const source = fixture.tribunalCase;
    const result = adaptDesignFinding({
      finding: { ...finding, verdict: sourceVerdict },
      bindings: {
        evidenceClaimIds: ["evidence.fixture.v1"],
        evaluatorDeclarationId: "evaluator.contract.v1",
        authorityGrantId: "grant.evaluator.v1",
        grantDigest: source.evaluatorDeclarations[0].authority.grantDigest,
        subjectDigest: source.subject.digest,
        claimId: "claim.contract-valid",
        authorityEffectRequested:
          sourceVerdict === "fail" ? "block" : sourceVerdict === "pass" ? "recommend" : "observe",
        declarationDigest:
          source.evaluatorDeclarations[0].provenance.declarationDigest,
        evidenceDigests: [source.evidenceClaims[0].contentDigest],
        trajectoryId: source.trajectoryId,
        evaluatorVersion: source.evaluatorDeclarations[0].version,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.disposition).toBe(disposition);
    expect(result.value.authorityEffectRequested).toBe(
      sourceVerdict === "fail" ? "block" : sourceVerdict === "pass" ? "recommend" : "observe",
    );
    expect(result.value.provenance.contentDigest).toBe(
      computeVerdictContentDigest(result.value),
    );
  });

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
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.decision).toEqual(humanDecision);
    expect(result.value.contentDigest).toBe(
      computeDecisionReceiptContentDigest(result.value),
    );
  });
});
