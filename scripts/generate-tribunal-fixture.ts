import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";

import type { AuthorityGrant } from "../src/lib/quirk/governance/authority";
import {
  computeAuthorityGrantDigest,
  computeDecisionReceiptContentDigest,
  computeDeclarationDigest,
  computeEvidenceClaimContentDigest,
  computeTribunalCaseDigest,
  computeVerdictContentDigest,
  digestCanonical,
  digestEvidenceBytes,
  type DecisionReceipt,
  type EvaluatorDeclaration,
  type EvidenceClaim,
  type TribunalCase,
  type TribunalVerdict,
} from "../src/lib/quirk/design-tribunal/protocol";

const OUTPUT_PATH = "fixtures/tribunal/protocol.v1.fixture.json";
const PLACEHOLDER_DIGEST = `sha256:${"0".repeat(64)}`;
const EVIDENCE_BYTES = "observable fixture bytes";
const CALIBRATION_BYTES = "calibration fixture bytes";

const subjectDigest = digestCanonical("artifact:v7");
const actionDigest = digestCanonical({
  action: "recommend-review",
  subjectDigest,
});

const grant: AuthorityGrant = {
  grantId: "grant.evaluator.v1",
  issuer: "human:bryan",
  subject: "tribunal-case:case.design.review.v1",
  scopes: [
    "quirk.tribunal.evaluate",
    "quirk.tribunal.evaluator:evaluator.contract.v1",
    "quirk.tribunal.realm:quirk-os",
    "quirk.tribunal.subject-id:artifact.design.v7",
    `quirk.tribunal.subject:${subjectDigest}`,
    "quirk.tribunal.target-class:app",
    "quirk.tribunal.purpose:purpose.design-review",
    "quirk.tribunal.tenant:tenant.quirk",
    "quirk.tribunal.audience:audience.internal",
    "quirk.tribunal.destination:destination.pull-request",
    `quirk.tribunal.action:${actionDigest}`,
    "quirk.tribunal.effect:recommend",
  ],
  issuedAt: "2026-08-21T12:00:00.000Z",
  expiresAt: "2026-08-21T14:00:00.000Z",
  nonce: "grant-nonce-0001",
};
const grantDigest = computeAuthorityGrantDigest(grant);

const declaration: EvaluatorDeclaration = {
  kind: "EvaluatorDeclaration",
  protocolVersion: "1.0.0",
  id: "evaluator.contract.v1",
  evaluatorType: "deterministic_validator",
  version: "1.0.0",
  independence: {
    key: "independence.contract.v1",
    operatorId: "operator.ci",
    modelFamily: "deterministic",
  },
  inspection: {
    canInspect: ["repository fixtures"],
    cannotInspect: ["secrets", "unprovided runtime state"],
    allowedSourceLocatorPrefixes: ["fixture://tribunal/"],
    deniedSourceLocatorPrefixes: ["restricted://", "env://"],
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
    holdoutDigest: digestCanonical("tribunal-holdout-v1"),
    maxConfidence: 0.95,
    errorTendencies: ["false confidence after fixture drift"],
    unresolvedBlindSpots: ["subjective design quality"],
  },
  authority: {
    grantId: grant.grantId,
    grantDigest,
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
declaration.provenance.declarationDigest =
  computeDeclarationDigest(declaration);

const evidenceClaim: EvidenceClaim = {
  kind: "EvidenceClaim",
  protocolVersion: "1.0.0",
  id: "evidence.fixture.v1",
  claimId: "claim.contract-valid",
  claim: "The canonical fixture passes deterministic validation.",
  subjectDigest,
  source: {
    kind: "test_result",
    locator: "fixture://tribunal/positive-basic",
    summary: "The positive fixture validates.",
    digest: digestEvidenceBytes(EVIDENCE_BYTES),
  },
  observable: true,
  inspectedBy: declaration.id,
  inspectionMethod: "vitest fixture execution",
  observedAt: "2026-08-21T12:45:00.000Z",
  validUntil: "2026-08-22T12:45:00.000Z",
  confidence: 0.9,
  limitations: ["Does not prove subjective design quality."],
  retentionClass: "project",
  derivedFromEvidenceClaimIds: [],
  contentDigest: PLACEHOLDER_DIGEST,
};
evidenceClaim.contentDigest = computeEvidenceClaimContentDigest(evidenceClaim);

const verdict: TribunalVerdict = {
  kind: "TribunalVerdict",
  protocolVersion: "1.0.0",
  id: "verdict.recommend.v1",
  evaluatorDeclarationId: declaration.id,
  authorityGrantId: grant.grantId,
  subjectDigest,
  criterionRef: "criterion.authority",
  claimId: "claim.contract-valid",
  claim: "The compatibility contract is structurally ready for review.",
  disposition: "SUPPORTED",
  evidenceClaimIds: [evidenceClaim.id],
  confidence: 0.86,
  uncertainty: "Semantic quality still requires human judgment.",
  dissent: [],
  authorityEffectRequested: "recommend",
  authorityBasis: {
    kind: "grant",
    grantId: grant.grantId,
    grantDigest,
  },
  provenance: {
    trajectoryId: "trajectory.release.v1",
    evaluatorVersion: declaration.version,
    declarationDigest: declaration.provenance.declarationDigest,
    evidenceDigests: [evidenceClaim.contentDigest],
    createdAt: "2026-08-21T13:00:00.000Z",
    contentDigest: PLACEHOLDER_DIGEST,
  },
};
verdict.provenance.contentDigest = computeVerdictContentDigest(verdict);

const tribunalCase: TribunalCase = {
  kind: "TribunalCase",
  protocolVersion: "1.0.0",
  caseId: "case.design.review.v1",
  purpose:
    "Evaluate a design artifact without transferring decision authority.",
  requesterId: "requester.product.v1",
  humanAuthorityId: "human:bryan",
  trajectoryId: "trajectory.release.v1",
  openedAt: "2026-08-21T12:30:00.000Z",
  evaluatedAt: "2026-08-21T13:00:00.000Z",
  proposedEffect: "recommend",
  operatingScope: {
    purposeId: "purpose.design-review",
    tenantId: "tenant.quirk",
    audienceId: "audience.internal",
    destinationId: "destination.pull-request",
    actionDigest,
  },
  subject: {
    id: "artifact.design.v7",
    realm: "quirk-os",
    targetClass: "app",
    revision: "v7",
    locator: "src/app/page.tsx",
    digest: subjectDigest,
  },
  criterionRefs: ["criterion.authority", "criterion.evidence"],
  sourceRefs: ["docs/quirk/design-tribunal/README.md"],
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
    authorityId: "human:bryan",
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
  tribunalCase,
  evidence: {
    "fixture://tribunal/positive-basic": EVIDENCE_BYTES,
    "fixture://tribunal/calibration-v1": CALIBRATION_BYTES,
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
