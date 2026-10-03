import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";

import type { AuthorityGrant } from "../src/lib/quirk/governance/authority";
import type {
  DesignFinding,
  DesignReviewRequest,
} from "../src/lib/quirk/design-tribunal/contracts";
import {
  computeDesignFindingDigest,
  computeDesignReviewRequestDigest,
} from "../src/lib/quirk/design-tribunal/compatibility";
import {
  TRIBUNAL_EVALUATE_SCOPE,
  computeAuthorityGrantDigest,
  computeDecisionReceiptContentDigest,
  computeDeclarationCoreDigest,
  computeDeclarationDigest,
  computeEvidenceClaimContentDigest,
  computeTribunalActionDigest,
  computeTribunalCaseDigest,
  computeVerdictContentDigest,
  digestCandidateBytes,
  digestEvidenceBytes,
  tribunalActionScope,
  tribunalAudienceScope,
  tribunalCaseSubject,
  tribunalDeclarationScope,
  tribunalDestinationScope,
  tribunalEffectScope,
  tribunalEvaluatorScope,
  tribunalPurposeScope,
  tribunalRealmScope,
  tribunalSubjectDigestScope,
  tribunalSubjectIdScope,
  tribunalTargetClassScope,
  tribunalTenantScope,
  type DecisionReceipt,
  type EvaluatorDeclaration,
  type EvidenceClaim,
  type TribunalCase,
  type TribunalActionManifest,
  type TribunalVerdict,
} from "../src/lib/quirk/design-tribunal/protocol";

const OUTPUT_PATH = "fixtures/tribunal/protocol.v1.fixture.json";
const PLACEHOLDER_DIGEST = `sha256:${"0".repeat(64)}`;
const EVIDENCE_BYTES = "observable fixture bytes";
const CALIBRATION_BYTES = "calibration fixture bytes";
const HOLDOUT_BYTES = "holdout fixture bytes";
const CANDIDATE_BYTES = "candidate artifact bytes";

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

const subjectDigest = digestCandidateBytes(CANDIDATE_BYTES);
const requestDigest = computeDesignReviewRequestDigest(request);
const scopeBasis = {
  purposeId: "purpose.design-review",
  tenantId: "tenant.quirk",
  audienceId: "audience.internal",
  destinationId: "destination.pull-request",
} as const;
const candidateDigest = digestCandidateBytes(CANDIDATE_BYTES);
const actionManifest: TribunalActionManifest = {
  kind: "TribunalActionManifest",
  protocolVersion: "1.0.0",
  caseId: request.id,
  requestDigest,
  subjectDigest,
  proposedEffect: "recommend",
  ...scopeBasis,
  candidates: [
    {
      digest: candidateDigest,
      generatorId: "generator.fixture.v1",
      independenceKey: "independence.candidate.fixture.v1",
    },
  ],
  selectedCandidateDigest: candidateDigest,
  prohibitedChangeChecks: request.prohibitedChanges.map((prohibition) => ({
    prohibition,
    status: "clear" as const,
    evidenceClaims: [
      {
        evidenceClaimId: "evidence.fixture.v1",
        contentDigest: PLACEHOLDER_DIGEST,
      },
    ],
  })),
  usage: {
    rounds: 1,
    inputTokens: 0,
    outputTokens: 0,
    wallClockMs: 1,
  },
};
let actionDigest = computeTribunalActionDigest(actionManifest);

const declaration: EvaluatorDeclaration = {
  kind: "EvaluatorDeclaration",
  protocolVersion: "1.0.0",
  id: "evaluator.contract.v1",
  criticRole: "referee",
  evaluatorType: "deterministic_validator",
  version: "1.0.0",
  independence: {
    key: "independence.contract.v1",
    operatorId: "operator.ci",
    modelFamily: "deterministic",
  },
  inspection: {
    allowedSourceLocators: [
      "fixture://tribunal/positive-basic",
      "fixture://tribunal/calibration-v1",
      "fixture://tribunal/holdout-v1",
    ],
    deniedSourceLocators: [
      "restricted://tribunal/secret",
      "env://tribunal/key",
    ],
    tools: ["vitest"],
    evidenceKinds: ["test_result"],
    temporalBoundary: "2026-08-21T13:00:00.000Z",
  },
  fallibility: {
    knownFailureModes: ["A fixture can miss a semantic failure."],
    calibrationEvidence: {
      locator: "fixture://tribunal/calibration-v1",
      digest: digestEvidenceBytes(CALIBRATION_BYTES),
    },
    calibratedAt: "2026-08-20T12:00:00.000Z",
    calibrationValidUntil: "2026-09-20T12:00:00.000Z",
    holdoutEvidence: {
      locator: "fixture://tribunal/holdout-v1",
      digest: digestEvidenceBytes(HOLDOUT_BYTES),
    },
    maxConfidence: 0.95,
    errorTendencies: ["false confidence after fixture drift"],
    unresolvedBlindSpots: ["subjective design quality"],
  },
  authority: {
    grantId: "grant.evaluator.v1",
    grantDigest: PLACEHOLDER_DIGEST,
    declaredEffects: ["recommend"],
    prohibitedEffects: [
      "approve",
      "publish",
      "mutate_canon",
      "promote_verdict",
    ],
  },
  provenance: {
    canonicalVersion: "design-tribunal@1",
    declarationDigest: PLACEHOLDER_DIGEST,
  },
};

const grant: AuthorityGrant = {
  grantId: declaration.authority.grantId,
  issuer: "human:bryan",
  subject: tribunalCaseSubject(request.id),
  scopes: [
    TRIBUNAL_EVALUATE_SCOPE,
    tribunalEvaluatorScope(declaration.id),
    tribunalDeclarationScope(computeDeclarationCoreDigest(declaration)),
    tribunalRealmScope("quirk-os"),
    tribunalSubjectIdScope(request.id),
    tribunalSubjectDigestScope(subjectDigest),
    tribunalTargetClassScope(request.artifactKind),
    tribunalPurposeScope(scopeBasis.purposeId),
    tribunalTenantScope(scopeBasis.tenantId),
    tribunalAudienceScope(scopeBasis.audienceId),
    tribunalDestinationScope(scopeBasis.destinationId),
    tribunalActionScope(actionDigest),
    tribunalEffectScope("recommend"),
  ],
  issuedAt: "2026-08-21T12:00:00.000Z",
  expiresAt: "2026-08-21T14:00:00.000Z",
  nonce: "grant-nonce-0001",
};
const evidence: DesignFinding["evidence"][number] = {
  kind: "test_result",
  locator: "fixture://tribunal/positive-basic",
  summary: "The positive fixture validates.",
  digest: digestEvidenceBytes(EVIDENCE_BYTES),
};
const evidenceClaim: EvidenceClaim = {
  kind: "EvidenceClaim",
  protocolVersion: "1.0.0",
  id: "evidence.fixture.v1",
  claimId: request.criteria[0].id,
  claim: "The canonical fixture passes deterministic validation.",
  subjectDigest,
  source: evidence,
  observable: true,
  inspectedBy: declaration.id,
  inspectionToolId: "vitest",
  inspectionMethod: "vitest fixture execution",
  observedAt: "2026-08-21T12:45:00.000Z",
  validUntil: "2026-08-22T12:45:00.000Z",
  confidence: 0.9,
  limitations: ["Does not prove subjective design quality."],
  retentionClass: "project",
  derivedFromEvidenceClaims: [],
  contentDigest: PLACEHOLDER_DIGEST,
};
evidenceClaim.contentDigest = computeEvidenceClaimContentDigest(evidenceClaim);
actionManifest.prohibitedChangeChecks[0].evidenceClaims[0].contentDigest =
  evidenceClaim.contentDigest;
actionDigest = computeTribunalActionDigest(actionManifest);
grant.scopes = grant.scopes.map((scope) =>
  scope.startsWith("quirk.tribunal.action:")
    ? tribunalActionScope(actionDigest)
    : scope,
);
const grantDigest = computeAuthorityGrantDigest(grant);
declaration.authority.grantDigest = grantDigest;
declaration.provenance.declarationDigest =
  computeDeclarationDigest(declaration);

const finding: DesignFinding = {
  id: "finding.contract.v1",
  runId: "trajectory.release.v1",
  criterionId: request.criteria[0].id,
  criticRole: "referee",
  verdict: "pass",
  severity: "note",
  claim: "Authority remains external.",
  evidence: [evidence],
  remediation: null,
  confidence: 0.86,
  blocksRelease: false,
  resolutionStatus: "open",
  createdAt: "2026-08-21T13:00:00.000Z",
};

const verdict: TribunalVerdict = {
  kind: "TribunalVerdict",
  protocolVersion: "1.0.0",
  id: finding.id,
  evaluatorDeclarationId: declaration.id,
  authorityGrantId: grant.grantId,
  subjectDigest,
  criterionRef: finding.criterionId,
  claimId: finding.criterionId,
  claim: finding.claim,
  disposition: "SUPPORTED",
  evidenceClaimIds: [evidenceClaim.id],
  confidence: finding.confidence,
  uncertainty: "Semantic quality still requires human judgment.",
  dissent: [],
  authorityEffectRequested: "recommend",
  authorityBasis: {
    kind: "grant",
    grantId: grant.grantId,
    grantDigest,
  },
  provenance: {
    trajectoryId: finding.runId,
    evaluatorVersion: declaration.version,
    declarationDigest: declaration.provenance.declarationDigest,
    sourceFindingDigest: computeDesignFindingDigest(finding),
    evidenceDigests: [evidenceClaim.contentDigest],
    createdAt: finding.createdAt,
    contentDigest: PLACEHOLDER_DIGEST,
  },
};
verdict.provenance.contentDigest = computeVerdictContentDigest(verdict);

const tribunalCase: TribunalCase = {
  kind: "TribunalCase",
  protocolVersion: "1.0.0",
  caseId: request.id,
  purpose: `${request.brief} Desired outcome: ${request.desiredOutcome}`,
  requesterId: "requester.product.v1",
  humanAuthorityId: request.humanAuthorityId!,
  trajectoryId: finding.runId,
  openedAt: "2026-08-21T12:30:00.000Z",
  evaluatedAt: "2026-08-21T13:00:00.000Z",
  requestDigest,
  humanApprovalRequired: request.humanApprovalRequired,
  proposedEffect: "recommend",
  operatingScope: { ...scopeBasis, actionDigest },
  subject: {
    id: request.id,
    realm: "quirk-os",
    targetClass: request.artifactKind,
    revision: "v7",
    locator: request.artifactLocator,
    digest: subjectDigest,
  },
  criteria: request.criteria,
  sourceRefs: request.sourceRefs,
  authorityGrants: [grant],
  evaluatorDeclarations: [declaration],
  evidenceClaims: [evidenceClaim],
  verdicts: [verdict],
  effectiveDecisionReceiptId: "receipt.review.v1",
  decisionReceipts: [],
};

const receipt: DecisionReceipt = {
  kind: "DecisionReceipt",
  protocolVersion: "1.0.0",
  id: "receipt.review.v1",
  caseId: tribunalCase.caseId,
  caseDigest: computeTribunalCaseDigest(tribunalCase),
  decision: {
    decision: "approved",
    authorityType: "human",
    authorityId: request.humanAuthorityId!,
    rationale:
      "The evaluator may recommend; the human decides what happens next.",
    decidedAt: "2026-08-21T13:02:00.000Z",
  },
  effect: "recommend",
  consideredVerdictIds: [verdict.id],
  acceptedEvidenceClaimIds: [evidenceClaim.id],
  rejectedOrDisputedEvidence: [],
  authorityGrantRefs: [{ grantId: grant.grantId, grantDigest }],
  reversibility: {
    kind: "reversible",
    rollbackRef: "git://revert/receipt.review.v1",
    deadline: "2026-09-21T13:02:00.000Z",
  },
  issuedAt: "2026-08-21T13:02:00.000Z",
  nonce: "receipt-nonce-0001",
  previousReceiptDigest: null,
  contentDigest: PLACEHOLDER_DIGEST,
};
receipt.contentDigest = computeDecisionReceiptContentDigest(receipt);
tribunalCase.decisionReceipts.push(receipt);

const fixture = {
  $schema: "quirk://contracts/design-tribunal/protocol/1.0.0",
  canonicalDesignRequest: request,
  canonicalDesignFinding: finding,
  canonicalActionManifest: actionManifest,
  tribunalCase,
  candidates: {
    [candidateDigest]: CANDIDATE_BYTES,
  },
  evidence: {
    "fixture://tribunal/positive-basic": EVIDENCE_BYTES,
    "fixture://tribunal/calibration-v1": CALIBRATION_BYTES,
    "fixture://tribunal/holdout-v1": HOLDOUT_BYTES,
  },
};
const rendered = await format(`${JSON.stringify(fixture)}\n`, {
  filepath: OUTPUT_PATH,
});

if (process.argv.includes("--write")) {
  writeFileSync(OUTPUT_PATH, rendered);
} else if (readFileSync(OUTPUT_PATH, "utf8") !== rendered) {
  console.error(
    `${OUTPUT_PATH} is stale; run bun scripts/generate-tribunal-fixture.ts --write.`,
  );
  process.exitCode = 1;
}
