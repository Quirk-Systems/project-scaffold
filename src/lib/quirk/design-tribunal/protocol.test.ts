import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

import {
  issueAuthorityGrant,
  verifyAuthorityGrant,
  type AuthorityGrant,
} from "../governance/authority";
import type {
  DesignEvidence,
  DesignFinding,
  DesignReviewRequest,
} from "./contracts";
import {
  computeDesignFindingDigest,
  computeDesignReviewRequestDigest,
} from "./compatibility";
import {
  TRIBUNAL_EVALUATE_SCOPE,
  TRIBUNAL_LIMITS,
  computeAuthorityGrantDigest,
  computeDecisionReceiptContentDigest,
  computeDecisionReceiptReplayKey,
  computeDeclarationCoreDigest,
  computeDeclarationDigest,
  computeEvidenceClaimContentDigest,
  computeTribunalActionDigest,
  computeTribunalCaseDigest,
  computeTribunalCommitTransitionDigest,
  computeVerdictContentDigest,
  digestCandidateBytes,
  digestCanonical,
  digestEvidenceBytes,
  isTribunalInputGraphSafe,
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
  validateTribunalCase,
  verifyTribunalCommitPreconditions,
  type TribunalActionManifest,
  type TribunalCase,
  type TribunalValidationContext,
} from "./protocol";

const AUTHORITY_TEST_ROOT = "tribunal-test-key-derivation-root";
const RECEIPT_ATTESTATION_SECRET =
  "tribunal-receipt-attestation-secret-that-is-long-enough";
const NOW = new Date("2026-08-21T13:05:00.000Z");
const EVALUATED_AT = "2026-08-21T13:00:00.000Z";
const PLACEHOLDER_DIGEST = `sha256:${"0".repeat(64)}`;
const EVIDENCE_BYTES = "observable fixture bytes";
const CALIBRATION_BYTES = "calibration fixture bytes";
const HOLDOUT_BYTES = "holdout fixture bytes";
const CANDIDATE_BYTES = "candidate artifact bytes";

function authoritySigningKey(issuer: string) {
  return {
    issuer,
    keyId: "test-authority.2026-08",
    keyBytes: createHmac("sha256", AUTHORITY_TEST_ROOT).update(issuer).digest(),
  };
}

function resolveAuthorityKey({
  issuer,
  keyId,
}: {
  issuer: string;
  keyId: string;
}) {
  const key = authoritySigningKey(issuer);
  return keyId === key.keyId ? key.keyBytes : undefined;
}

type MutableContext = TribunalValidationContext & {
  authorityTokensByGrantId: Record<string, string>;
  trustedAuthorityIssuers: string[];
  trustedHumanAuthorities: string[];
  consumedReceiptDigests?: Map<string, string>;
  verifyDecisionReceipt?: TribunalValidationContext["verifyDecisionReceipt"];
  resolveReceiptHead?: (
    caseId: string,
  ) => { receiptId: string; contentDigest: string } | null | undefined;
};

type Harness = {
  tribunalCase: TribunalCase;
  context: MutableContext;
  decisionAttestations: Map<string, string>;
  canonicalRequest: DesignReviewRequest;
  canonicalFindings: Map<string, DesignFinding>;
  actionManifest: TribunalActionManifest;
  principalAliases: Map<string, string>;
};

const decisionAttestationsByCase = new WeakMap<
  TribunalCase,
  Map<string, string>
>();
const canonicalFindingsByCase = new WeakMap<
  TribunalCase,
  Map<string, DesignFinding>
>();

function computeTestReceiptAttestation(contentDigest: string): string {
  return createHmac("sha256", RECEIPT_ATTESTATION_SECRET)
    .update(contentDigest)
    .digest("hex");
}

function grantScopes(
  tribunalCase: TribunalCase,
  evaluatorId: string,
  effects = ["recommend"] as const,
  declaration = tribunalCase.evaluatorDeclarations.find(
    (candidate) => candidate.id === evaluatorId,
  ),
) {
  if (!declaration) throw new Error(`Missing declaration ${evaluatorId}.`);
  return [
    TRIBUNAL_EVALUATE_SCOPE,
    tribunalEvaluatorScope(evaluatorId),
    tribunalDeclarationScope(computeDeclarationCoreDigest(declaration)),
    tribunalRealmScope(tribunalCase.subject.realm),
    tribunalSubjectIdScope(tribunalCase.subject.id),
    tribunalSubjectDigestScope(tribunalCase.subject.digest),
    tribunalTargetClassScope(tribunalCase.subject.targetClass),
    tribunalPurposeScope(tribunalCase.operatingScope.purposeId),
    tribunalTenantScope(tribunalCase.operatingScope.tenantId),
    tribunalAudienceScope(tribunalCase.operatingScope.audienceId),
    tribunalDestinationScope(tribunalCase.operatingScope.destinationId),
    tribunalActionScope(tribunalCase.operatingScope.actionDigest),
    ...effects.map(tribunalEffectScope),
  ];
}

function sealCase(tribunalCase: TribunalCase): void {
  for (const declaration of tribunalCase.evaluatorDeclarations) {
    declaration.provenance.declarationDigest =
      computeDeclarationDigest(declaration);
  }

  for (const claim of tribunalCase.evidenceClaims) {
    claim.contentDigest = computeEvidenceClaimContentDigest(claim);
  }

  const canonicalFindings = canonicalFindingsByCase.get(tribunalCase);
  for (const verdict of tribunalCase.verdicts) {
    const declaration = tribunalCase.evaluatorDeclarations.find(
      (candidate) => candidate.id === verdict.evaluatorDeclarationId,
    );
    verdict.provenance.evaluatorVersion =
      declaration?.version ?? verdict.provenance.evaluatorVersion;
    verdict.provenance.declarationDigest =
      declaration?.provenance.declarationDigest ??
      verdict.provenance.declarationDigest;
    verdict.provenance.evidenceDigests = verdict.evidenceClaimIds
      .map(
        (id) =>
          tribunalCase.evidenceClaims.find((claim) => claim.id === id)
            ?.contentDigest,
      )
      .filter((digest): digest is string => Boolean(digest));
    if (canonicalFindings) {
      const existing = canonicalFindings.get(verdict.id);
      const evidence = verdict.evidenceClaimIds.flatMap((id) => {
        const source = tribunalCase.evidenceClaims.find(
          (claim) => claim.id === id,
        )?.source;
        return source &&
          !["evidence_claim", "tribunal_verdict", "decision_receipt"].includes(
            source.kind,
          )
          ? [source as DesignEvidence]
          : [];
      });
      const sourceFinding: DesignFinding = {
        id: verdict.id,
        runId: verdict.provenance.trajectoryId,
        criterionId: verdict.criterionRef,
        criticRole: existing?.criticRole ?? "referee",
        verdict:
          verdict.disposition === "SUPPORTED"
            ? "pass"
            : verdict.disposition === "CONTRADICTED"
              ? "fail"
              : "unresolved",
        severity: existing?.severity ?? "note",
        claim: verdict.claim,
        evidence,
        remediation: existing?.remediation ?? null,
        confidence: verdict.confidence,
        blocksRelease: existing?.blocksRelease ?? false,
        resolutionStatus: existing?.resolutionStatus ?? "open",
        createdAt: verdict.provenance.createdAt,
      };
      if (sourceFinding.evidence.length > 0) {
        canonicalFindings.set(verdict.id, sourceFinding);
        verdict.provenance.sourceFindingDigest =
          computeDesignFindingDigest(sourceFinding);
      }
    }
    verdict.provenance.contentDigest = computeVerdictContentDigest(verdict);
  }

  const caseDigest = computeTribunalCaseDigest(tribunalCase);
  const orderedReceipts = [...tribunalCase.decisionReceipts].sort(
    (left, right) => Date.parse(left.issuedAt) - Date.parse(right.issuedAt),
  );
  let previousReceiptDigest: string | null = null;
  for (const receipt of orderedReceipts) {
    receipt.caseDigest = caseDigest;
    receipt.previousReceiptDigest = previousReceiptDigest;
    receipt.contentDigest = computeDecisionReceiptContentDigest(receipt);
    previousReceiptDigest = receipt.contentDigest;
  }
  const attestations = decisionAttestationsByCase.get(tribunalCase);
  if (attestations) {
    attestations.clear();
    for (const receipt of tribunalCase.decisionReceipts) {
      attestations.set(
        receipt.id,
        computeTestReceiptAttestation(receipt.contentDigest),
      );
    }
  }
}

function attestReceipts(harness: Harness): void {
  harness.decisionAttestations.clear();
  for (const receipt of harness.tribunalCase.decisionReceipts) {
    harness.decisionAttestations.set(
      receipt.id,
      computeTestReceiptAttestation(receipt.contentDigest),
    );
  }
}

function sealHarness(harness: Harness): void {
  sealCase(harness.tribunalCase);
  for (const check of harness.actionManifest.prohibitedChangeChecks) {
    for (const reference of check.evidenceClaims) {
      const claim = harness.tribunalCase.evidenceClaims.find(
        ({ id }) => id === reference.evidenceClaimId,
      );
      if (claim) reference.contentDigest = claim.contentDigest;
    }
  }
  if (harness.actionManifest.baselineEvidence) {
    const baseline = harness.tribunalCase.evidenceClaims.find(
      ({ id }) =>
        id === harness.actionManifest.baselineEvidence?.evidenceClaimId,
    );
    if (baseline) {
      harness.actionManifest.baselineEvidence.contentDigest =
        baseline.contentDigest;
    }
  }
  harness.tribunalCase.operatingScope.actionDigest =
    computeTribunalActionDigest(harness.actionManifest);
  for (const grant of harness.tribunalCase.authorityGrants) {
    grant.scopes = grant.scopes.map((scope) =>
      scope.startsWith("quirk.tribunal.action:")
        ? tribunalActionScope(harness.tribunalCase.operatingScope.actionDigest)
        : scope,
    );
  }
  for (const declaration of harness.tribunalCase.evaluatorDeclarations) {
    const grant = harness.tribunalCase.authorityGrants.find(
      (candidate) => candidate.grantId === declaration.authority.grantId,
    );
    if (!grant) continue;
    const declarationScope = tribunalDeclarationScope(
      computeDeclarationCoreDigest(declaration),
    );
    let replacedDeclarationScope = false;
    grant.scopes = grant.scopes.map((scope) => {
      if (!scope.startsWith("quirk.tribunal.declaration:")) return scope;
      if (replacedDeclarationScope) return scope;
      replacedDeclarationScope = true;
      return declarationScope;
    });
    if (!replacedDeclarationScope) grant.scopes.push(declarationScope);
    const grantDigest = computeAuthorityGrantDigest(grant);
    declaration.authority.grantDigest = grantDigest;
    for (const verdict of harness.tribunalCase.verdicts) {
      if (verdict.authorityGrantId !== grant.grantId) continue;
      verdict.authorityBasis.grantDigest = grantDigest;
    }
    for (const receipt of harness.tribunalCase.decisionReceipts) {
      for (const reference of receipt.authorityGrantRefs) {
        if (reference.grantId === grant.grantId) {
          reference.grantDigest = grantDigest;
        }
      }
    }
    harness.context.authorityTokensByGrantId[grant.grantId] =
      issueAuthorityGrant(grant, authoritySigningKey(grant.issuer));
  }
  sealCase(harness.tribunalCase);
  attestReceipts(harness);
}

function resignGrant(harness: Harness, grant: AuthorityGrant): void {
  const index = harness.tribunalCase.authorityGrants.findIndex(
    (candidate) => candidate.grantId === grant.grantId,
  );
  if (index >= 0) harness.tribunalCase.authorityGrants[index] = grant;
  else harness.tribunalCase.authorityGrants.push(grant);
  harness.context.authorityTokensByGrantId[grant.grantId] = issueAuthorityGrant(
    grant,
    authoritySigningKey(grant.issuer),
  );
}

function rebindCanonicalRequest(
  harness: Harness,
  mutate: (request: DesignReviewRequest) => void,
): void {
  mutate(harness.canonicalRequest);
  const tribunalCase = harness.tribunalCase;
  tribunalCase.requestDigest = computeDesignReviewRequestDigest(
    harness.canonicalRequest,
  );
  harness.actionManifest.requestDigest = tribunalCase.requestDigest;
  harness.actionManifest.prohibitedChangeChecks =
    harness.canonicalRequest.prohibitedChanges.map(
      (prohibition) =>
        harness.actionManifest.prohibitedChangeChecks.find(
          (check) => check.prohibition === prohibition,
        ) ?? {
          prohibition,
          status: "clear" as const,
          evidenceClaims: [
            {
              evidenceClaimId: tribunalCase.evidenceClaims[0].id,
              contentDigest: tribunalCase.evidenceClaims[0].contentDigest,
            },
          ],
        },
    );
  tribunalCase.purpose = `${harness.canonicalRequest.brief} Desired outcome: ${harness.canonicalRequest.desiredOutcome}`;
  tribunalCase.humanApprovalRequired =
    harness.canonicalRequest.humanApprovalRequired;
  if (harness.canonicalRequest.humanAuthorityId) {
    tribunalCase.humanAuthorityId = harness.canonicalRequest.humanAuthorityId;
  }
  tribunalCase.criteria = structuredClone(harness.canonicalRequest.criteria);
  tribunalCase.sourceRefs = [...harness.canonicalRequest.sourceRefs];
  tribunalCase.operatingScope.actionDigest = computeTribunalActionDigest(
    harness.actionManifest,
  );
  for (const grant of tribunalCase.authorityGrants) {
    grant.scopes = grant.scopes.map((scope) =>
      scope.startsWith("quirk.tribunal.action:")
        ? tribunalActionScope(tribunalCase.operatingScope.actionDigest)
        : scope,
    );
  }
  sealHarness(harness);
}

function rebindActionManifest(harness: Harness): void {
  harness.tribunalCase.operatingScope.actionDigest =
    computeTribunalActionDigest(harness.actionManifest);
  for (const grant of harness.tribunalCase.authorityGrants) {
    grant.scopes = grant.scopes.map((scope) =>
      scope.startsWith("quirk.tribunal.action:")
        ? tribunalActionScope(harness.tribunalCase.operatingScope.actionDigest)
        : scope,
    );
  }
  sealHarness(harness);
}

function resealVerdictsAndReceiptsWithoutCanonicalSync(harness: Harness): void {
  for (const verdict of harness.tribunalCase.verdicts) {
    verdict.provenance.contentDigest = computeVerdictContentDigest(verdict);
  }
  const caseDigest = computeTribunalCaseDigest(harness.tribunalCase);
  const orderedReceipts = [...harness.tribunalCase.decisionReceipts].sort(
    (left, right) => Date.parse(left.issuedAt) - Date.parse(right.issuedAt),
  );
  let previousReceiptDigest: string | null = null;
  for (const receipt of orderedReceipts) {
    receipt.caseDigest = caseDigest;
    receipt.previousReceiptDigest = previousReceiptDigest;
    receipt.contentDigest = computeDecisionReceiptContentDigest(receipt);
    previousReceiptDigest = receipt.contentDigest;
  }
  attestReceipts(harness);
}

function makeHarness(): Harness {
  const subjectDigest = digestCandidateBytes(CANDIDATE_BYTES);
  const canonicalRequest: DesignReviewRequest = {
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
  const requestDigest = computeDesignReviewRequestDigest(canonicalRequest);
  const operatingScope = {
    purposeId: "purpose.design-review",
    tenantId: "tenant.quirk",
    audienceId: "audience.internal",
    destinationId: "destination.pull-request",
  } as const;
  const candidateDigest = digestCandidateBytes(CANDIDATE_BYTES);
  const actionManifest: TribunalActionManifest = {
    kind: "TribunalActionManifest",
    protocolVersion: "1.0.0",
    caseId: "case.design.review.v1",
    requestDigest,
    subjectDigest,
    proposedEffect: "recommend",
    ...operatingScope,
    candidates: [
      {
        digest: candidateDigest,
        generatorId: "generator.fixture.v1",
        independenceKey: "independence.candidate.fixture.v1",
      },
    ],
    selectedCandidateDigest: candidateDigest,
    prohibitedChangeChecks: canonicalRequest.prohibitedChanges.map(
      (prohibition) => ({
        prohibition,
        status: "clear" as const,
        evidenceClaims: [
          {
            evidenceClaimId: "evidence.fixture.v1",
            contentDigest: PLACEHOLDER_DIGEST,
          },
        ],
      }),
    ),
    usage: {
      rounds: 1,
      inputTokens: 0,
      outputTokens: 0,
      wallClockMs: 1,
    },
  };
  const actionDigest = computeTribunalActionDigest(actionManifest);
  const sourceDigest = digestEvidenceBytes(EVIDENCE_BYTES);

  const tribunalCase = {
    kind: "TribunalCase",
    protocolVersion: "1.0.0",
    caseId: "case.design.review.v1",
    purpose: `${canonicalRequest.brief} Desired outcome: ${canonicalRequest.desiredOutcome}`,
    requesterId: "requester.product.v1",
    humanAuthorityId: "human:bryan",
    trajectoryId: "trajectory.release.v1",
    openedAt: "2026-08-21T12:30:00.000Z",
    evaluatedAt: EVALUATED_AT,
    requestDigest,
    humanApprovalRequired: true,
    proposedEffect: "recommend",
    operatingScope: {
      ...operatingScope,
      actionDigest,
    },
    subject: {
      id: canonicalRequest.id,
      realm: "quirk-os",
      targetClass: "app",
      revision: "v7",
      locator: "src/app/page.tsx",
      digest: subjectDigest,
    },
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
    sourceRefs: ["docs/quirk/design-tribunal/README.md"],
    authorityGrants: [] as AuthorityGrant[],
    evaluatorDeclarations: [
      {
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
          temporalBoundary: EVALUATED_AT,
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
      },
    ],
    evidenceClaims: [
      {
        kind: "EvidenceClaim",
        protocolVersion: "1.0.0",
        id: "evidence.fixture.v1",
        claimId: "criterion.authority",
        claim: "The canonical fixture passes deterministic validation.",
        subjectDigest,
        source: {
          kind: "test_result",
          locator: "fixture://tribunal/positive-basic",
          summary: "The positive fixture validates.",
          digest: sourceDigest,
        },
        observable: true,
        inspectedBy: "evaluator.contract.v1",
        inspectionToolId: "vitest",
        inspectionMethod: "vitest fixture execution",
        observedAt: "2026-08-21T12:45:00.000Z",
        validUntil: "2026-08-22T12:45:00.000Z",
        confidence: 0.9,
        limitations: ["Does not prove subjective design quality."],
        retentionClass: "project",
        derivedFromEvidenceClaims: [],
        contentDigest: PLACEHOLDER_DIGEST,
      },
    ],
    verdicts: [
      {
        kind: "TribunalVerdict",
        protocolVersion: "1.0.0",
        id: "verdict.recommend.v1",
        evaluatorDeclarationId: "evaluator.contract.v1",
        authorityGrantId: "grant.evaluator.v1",
        subjectDigest,
        criterionRef: "criterion.authority",
        claimId: "criterion.authority",
        claim: "The compatibility contract is structurally ready for review.",
        disposition: "SUPPORTED",
        evidenceClaimIds: ["evidence.fixture.v1"],
        confidence: 0.86,
        uncertainty: "Semantic quality still requires human judgment.",
        dissent: [],
        authorityEffectRequested: "recommend",
        authorityBasis: {
          kind: "grant",
          grantId: "grant.evaluator.v1",
          grantDigest: PLACEHOLDER_DIGEST,
        },
        provenance: {
          trajectoryId: "trajectory.release.v1",
          evaluatorVersion: "1.0.0",
          declarationDigest: PLACEHOLDER_DIGEST,
          sourceFindingDigest: digestCanonical(
            "finding.contract.v1",
            "quirk.design-tribunal.design-finding.v1",
          ),
          evidenceDigests: [PLACEHOLDER_DIGEST],
          createdAt: EVALUATED_AT,
          contentDigest: PLACEHOLDER_DIGEST,
        },
      },
    ],
    effectiveDecisionReceiptId: "receipt.review.v1",
    decisionReceipts: [
      {
        kind: "DecisionReceipt",
        protocolVersion: "1.0.0",
        id: "receipt.review.v1",
        caseId: "case.design.review.v1",
        caseDigest: PLACEHOLDER_DIGEST,
        decision: {
          decision: "approved",
          authorityType: "human",
          authorityId: "human:bryan",
          rationale:
            "The evaluator may recommend; the human decides what happens next.",
          decidedAt: "2026-08-21T13:02:00.000Z",
        },
        effect: "recommend",
        consideredVerdictIds: ["verdict.recommend.v1"],
        acceptedEvidenceClaimIds: ["evidence.fixture.v1"],
        rejectedOrDisputedEvidence: [],
        authorityGrantRefs: [
          { grantId: "grant.evaluator.v1", grantDigest: PLACEHOLDER_DIGEST },
        ],
        reversibility: {
          kind: "reversible",
          rollbackRef: "git://revert/receipt.review.v1",
          deadline: "2026-09-21T13:02:00.000Z",
        },
        issuedAt: "2026-08-21T13:02:00.000Z",
        nonce: "receipt-nonce-0001",
        previousReceiptDigest: null,
        contentDigest: PLACEHOLDER_DIGEST,
      },
    ],
  } satisfies TribunalCase;

  tribunalCase.evidenceClaims[0].contentDigest =
    computeEvidenceClaimContentDigest(tribunalCase.evidenceClaims[0]);
  actionManifest.prohibitedChangeChecks[0].evidenceClaims[0].contentDigest =
    tribunalCase.evidenceClaims[0].contentDigest;
  tribunalCase.operatingScope.actionDigest =
    computeTribunalActionDigest(actionManifest);

  const grant: AuthorityGrant = {
    grantId: "grant.evaluator.v1",
    issuer: "human:bryan",
    subject: tribunalCaseSubject(tribunalCase.caseId),
    scopes: grantScopes(tribunalCase, "evaluator.contract.v1"),
    issuedAt: "2026-08-21T12:00:00.000Z",
    expiresAt: "2026-08-21T14:00:00.000Z",
    nonce: "grant-nonce-0001",
  };
  tribunalCase.authorityGrants.push(grant);

  const grantDigest = computeAuthorityGrantDigest(grant);
  tribunalCase.evaluatorDeclarations[0].authority.grantDigest = grantDigest;
  tribunalCase.verdicts[0].authorityBasis.grantDigest = grantDigest;
  tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
    grantDigest;
  const canonicalFindings = new Map<string, DesignFinding>([
    [
      tribunalCase.verdicts[0].id,
      {
        id: tribunalCase.verdicts[0].id,
        runId: tribunalCase.trajectoryId,
        criterionId: tribunalCase.verdicts[0].criterionRef,
        criticRole: "referee",
        verdict: "pass",
        severity: "note",
        claim: tribunalCase.verdicts[0].claim,
        evidence: [tribunalCase.evidenceClaims[0].source],
        remediation: null,
        confidence: tribunalCase.verdicts[0].confidence,
        blocksRelease: false,
        resolutionStatus: "open",
        createdAt: tribunalCase.verdicts[0].provenance.createdAt,
      },
    ],
  ]);
  canonicalFindingsByCase.set(tribunalCase, canonicalFindings);
  sealCase(tribunalCase);

  const decisionAttestations = new Map<string, string>();
  const principalAliases = new Map<string, string>([
    ["human:bryan", "principal.bryan"],
    ["evaluator.contract.v1", "principal.evaluator.contract.v1"],
    ["operator.ci", "principal.operator.ci"],
  ]);
  const harness: Harness = {
    tribunalCase,
    context: {
      now: NOW,
      resolveAuthorityKey,
      authorityTokensByGrantId: {
        [grant.grantId]: issueAuthorityGrant(
          grant,
          authoritySigningKey(grant.issuer),
        ),
      },
      verifyGrant: verifyAuthorityGrant,
      resolveGrantState: () => ({
        state: "active",
        version: "grant-lifecycle.v1",
      }),
      resolvePolicyState: () => ({ version: "tribunal-policy.v1" }),
      resolveEvidence: (locator) =>
        locator === "fixture://tribunal/positive-basic"
          ? EVIDENCE_BYTES
          : locator === "fixture://tribunal/calibration-v1"
            ? CALIBRATION_BYTES
            : locator === "fixture://tribunal/holdout-v1"
              ? HOLDOUT_BYTES
              : undefined,
      resolveDesignReviewRequest: (digest) =>
        digest === computeDesignReviewRequestDigest(canonicalRequest)
          ? canonicalRequest
          : undefined,
      resolveDesignFinding: (digest) =>
        [...canonicalFindings.values()].find(
          (finding) => computeDesignFindingDigest(finding) === digest,
        ),
      resolveTribunalActionManifest: (digest) =>
        digest === computeTribunalActionDigest(actionManifest)
          ? actionManifest
          : undefined,
      resolveCandidate: (digest) =>
        digest === digestCandidateBytes(CANDIDATE_BYTES)
          ? CANDIDATE_BYTES
          : undefined,
      verifyActionManifest: () => true,
      verifyEvidenceClaim: () => true,
      verifyTribunalVerdict: () => true,
      resolvePrincipalId: (principal) =>
        principalAliases.get(principal) ?? principal,
      trustedAuthorityIssuers: ["human:bryan"],
      trustedHumanAuthorities: ["human:bryan"],
      consumedReceiptDigests: new Map(),
      appliedEffectDigests: new Map(),
      resolveReceiptHead: (caseId) => {
        if (caseId !== tribunalCase.caseId) return undefined;
        const latest = [...tribunalCase.decisionReceipts]
          .sort(
            (left, right) =>
              Date.parse(left.issuedAt) - Date.parse(right.issuedAt),
          )
          .at(-1);
        return latest
          ? { receiptId: latest.id, contentDigest: latest.contentDigest }
          : null;
      },
      verifyDecisionReceipt: ({ receipt }) =>
        decisionAttestations.get(receipt.id) ===
        computeTestReceiptAttestation(receipt.contentDigest),
    },
    decisionAttestations,
    canonicalRequest,
    canonicalFindings,
    actionManifest,
    principalAliases,
  };
  decisionAttestationsByCase.set(tribunalCase, decisionAttestations);
  attestReceipts(harness);
  return harness;
}

function validationCodes(harness: Harness): string[] {
  const result = validateTribunalCase(harness.tribunalCase, harness.context);
  return [...new Set(result.issues.map((issue) => issue.code))].sort();
}

function expectCodes(harness: Harness, expected: string[]): void {
  expect(validationCodes(harness)).toEqual([...expected].sort());
}

describe("Tribunal protocol v1", () => {
  it("accepts the minimum five-role compatibility case", () => {
    const harness = makeHarness();
    const result = validateTribunalCase(harness.tribunalCase, harness.context);

    expect(result).toMatchObject({ ok: true, issues: [] });
    if (result.ok) {
      const transition = result.commitTransition;
      expect(transition).not.toBeNull();
      if (!transition) throw new Error("Expected a commit transition.");
      expect(result.verifiedAuthorityGrants).toHaveLength(1);
      expect(result.verifiedAuthorityGrants[0].keyReference).toEqual({
        issuer: "human:bryan",
        keyId: "test-authority.2026-08",
      });
      expect(result.evaluatorEffectWithinGrant).toEqual({
        "verdict.recommend.v1": true,
      });
      expect(transition).toMatchObject({
        caseId: harness.tribunalCase.caseId,
        preconditions: {
          policyState: { expectedVersion: "tribunal-policy.v1" },
        },
        stateWrites: {
          receiptAppends: [],
          replayWrites: [
            {
              key: computeDecisionReceiptReplayKey(
                harness.tribunalCase.decisionReceipts[0],
              ),
              expectedDigest: null,
              nextDigest:
                harness.tribunalCase.decisionReceipts[0].contentDigest,
            },
          ],
        },
        effect: {
          actionDigest: harness.tribunalCase.operatingScope.actionDigest,
          selectedCandidate: {
            digest: harness.actionManifest.selectedCandidateDigest,
            encoding: "base64",
            byteLength: new TextEncoder().encode(CANDIDATE_BYTES).byteLength,
          },
          proposedEffect: harness.tribunalCase.proposedEffect,
          purposeId: harness.tribunalCase.operatingScope.purposeId,
          tenantId: harness.tribunalCase.operatingScope.tenantId,
          audienceId: harness.tribunalCase.operatingScope.audienceId,
          destinationId: harness.tribunalCase.operatingScope.destinationId,
          validatedAt: NOW.toISOString(),
          idempotencyWrite: { expectedDigest: null },
        },
      });
      expect(
        Buffer.from(transition.effect!.selectedCandidate.bytes, "base64"),
      ).toEqual(Buffer.from(CANDIDATE_BYTES));
      expect(
        verifyTribunalCommitPreconditions(
          transition,
          transition.transitionDigest,
          {
            now: NOW,
            resolvePolicyState: () => ({ version: "tribunal-policy.v1" }),
            resolveGrantState: () => ({
              state: "active",
              version: "grant-lifecycle.v1",
            }),
          },
        ),
      ).toBe(true);
      expect("caseEffectAuthorized" in result).toBe(false);
    }
  });

  it("uses a domain-separated, portable canonical hash", () => {
    const versionedDigest = digestCanonical as unknown as (
      value: unknown,
      domain: string,
    ) => string;

    expect(versionedDigest({ b: 2, a: "é" }, "test.vector")).toBe(
      "sha256:b543a77767206cb9fb1f2e32ba0d47e6ba67cc21c411c54c0bc5e33c4ab1b4b1",
    );
    expect(
      versionedDigest(
        {
          "\ufffd": 2,
          "😀": 1,
          tiny: 1e-27,
          n: 333333333.33333329,
        },
        "test.portability",
      ),
    ).toBe(
      "sha256:d7eda4511925a3146e0a41dac15c0045226a0aeb297511bf19c90379e2096cfc",
    );
    expect(versionedDigest({ 2: "two", 10: "ten" }, "test.integer-keys")).toBe(
      "sha256:32c7f726a4122211b9fde7803b8ee105807bc23d1ff6333e5957ef9c4d292715",
    );

    for (const unsupported of [
      new Date("2026-08-21T13:00:00.000Z"),
      new Map(),
      new Set(),
      { omitted: undefined },
      [undefined],
      new Uint16Array([1]),
    ]) {
      expect(() => digestCanonical(unsupported)).toThrow(TypeError);
    }
  });

  it("normalizes equivalent string and binary evidence as the same bytes", () => {
    const expected = digestEvidenceBytes(EVIDENCE_BYTES);
    expect(expected).toBe(
      "sha256:eebd5f8818aa0f32a85d116ea8fd2f500acd9a4b95702535a4eaae34db0e81b5",
    );
    expect(digestEvidenceBytes(Buffer.from(EVIDENCE_BYTES, "utf8"))).toBe(
      expected,
    );

    const stringResolver = makeHarness();
    expectCodes(stringResolver, []);

    const binaryResolver = makeHarness();
    binaryResolver.context.resolveEvidence = (locator) =>
      Buffer.from(
        locator === "fixture://tribunal/calibration-v1"
          ? CALIBRATION_BYTES
          : locator === "fixture://tribunal/holdout-v1"
            ? HOLDOUT_BYTES
            : EVIDENCE_BYTES,
        "utf8",
      );
    expectCodes(binaryResolver, []);
  });

  it("hashes intrinsic backing bytes across realms and rejects typed-array spoofing", () => {
    const expected = digestEvidenceBytes(new Uint8Array([0x12, 0x34]));
    const crossRealm = runInNewContext("new Uint8Array([0x12, 0x34])") as
      Uint8Array | unknown;
    expect(digestEvidenceBytes(crossRealm as Uint8Array)).toBe(expected);

    const customIterator = new Uint8Array([0x12, 0x34]);
    Object.defineProperty(customIterator, Symbol.iterator, {
      value: function* () {
        yield 0;
      },
    });
    expect(digestEvidenceBytes(customIterator)).toBe(expected);

    const spoofed = new Uint16Array([0x1234]);
    Object.defineProperty(spoofed, "BYTES_PER_ELEMENT", { value: 1 });
    expect(() => digestEvidenceBytes(spoofed as unknown as Uint8Array)).toThrow(
      TypeError,
    );
  });

  it("executes the checked-in canonical fixture through the runtime validator", () => {
    const fixture = JSON.parse(
      readFileSync("fixtures/tribunal/protocol.v1.fixture.json", "utf8"),
    ) as {
      canonicalDesignRequest: DesignReviewRequest;
      canonicalDesignFinding: DesignFinding;
      canonicalActionManifest: TribunalActionManifest;
      tribunalCase: TribunalCase;
      evidence: Record<string, string>;
      candidates: Record<string, string>;
    };
    const tokenById = Object.fromEntries(
      fixture.tribunalCase.authorityGrants.map((grant) => [
        grant.grantId,
        issueAuthorityGrant(grant, authoritySigningKey(grant.issuer)),
      ]),
    );
    const fixtureAttestations = new Map(
      fixture.tribunalCase.decisionReceipts.map((receipt) => [
        receipt.id,
        computeTestReceiptAttestation(receipt.contentDigest),
      ]),
    );
    const fixtureContext: MutableContext = {
      now: NOW,
      resolveAuthorityKey,
      authorityTokensByGrantId: tokenById,
      verifyGrant: verifyAuthorityGrant,
      resolveGrantState: () => ({
        state: "active",
        version: "grant-lifecycle.v1",
      }),
      resolvePolicyState: () => ({ version: "tribunal-policy.v1" }),
      resolveEvidence: (locator) => fixture.evidence[locator],
      resolveDesignReviewRequest: (digest) =>
        digest ===
        computeDesignReviewRequestDigest(fixture.canonicalDesignRequest)
          ? fixture.canonicalDesignRequest
          : undefined,
      resolveDesignFinding: (digest) =>
        digest === computeDesignFindingDigest(fixture.canonicalDesignFinding)
          ? fixture.canonicalDesignFinding
          : undefined,
      resolveTribunalActionManifest: (digest) =>
        digest === computeTribunalActionDigest(fixture.canonicalActionManifest)
          ? fixture.canonicalActionManifest
          : undefined,
      resolveCandidate: (digest) => fixture.candidates[digest],
      verifyActionManifest: () => true,
      verifyEvidenceClaim: () => true,
      verifyTribunalVerdict: () => true,
      resolvePrincipalId: (principal) =>
        principal === "human:bryan"
          ? "principal.bryan"
          : principal === "evaluator.contract.v1"
            ? "principal.evaluator.contract.v1"
            : principal === "operator.ci"
              ? "principal.operator.ci"
              : principal,
      trustedAuthorityIssuers: ["human:bryan"],
      trustedHumanAuthorities: ["human:bryan"],
      consumedReceiptDigests: new Map(),
      appliedEffectDigests: new Map(),
      resolveReceiptHead: (caseId) => {
        if (caseId !== fixture.tribunalCase.caseId) return undefined;
        const receipt = fixture.tribunalCase.decisionReceipts.at(-1);
        return receipt
          ? { receiptId: receipt.id, contentDigest: receipt.contentDigest }
          : null;
      },
      verifyDecisionReceipt: ({ receipt }) =>
        fixtureAttestations.get(receipt.id) ===
        computeTestReceiptAttestation(receipt.contentDigest),
    };
    const result = validateTribunalCase(fixture.tribunalCase, fixtureContext);

    expect(result.issues).toEqual([]);
  });

  it("requires trusted canonical request and finding sources", () => {
    const missingRequest = makeHarness();
    missingRequest.context.resolveDesignReviewRequest = () => undefined;
    expectCodes(missingRequest, ["CANONICAL_REQUEST_UNRESOLVED"]);

    const missingFinding = makeHarness();
    missingFinding.context.resolveDesignFinding = () => undefined;
    expectCodes(missingFinding, ["CANONICAL_FINDING_UNRESOLVED"]);

    const driftedRequest = makeHarness();
    driftedRequest.context.resolveDesignReviewRequest = () => ({
      ...driftedRequest.canonicalRequest,
      audience: "A resolver-substituted audience",
    });
    expectCodes(driftedRequest, ["CANONICAL_REQUEST_DIGEST_MISMATCH"]);

    const unknownField = makeHarness();
    unknownField.context.resolveDesignReviewRequest = () => ({
      ...unknownField.canonicalRequest,
      authority_grants: [],
    });
    expectCodes(unknownField, ["CANONICAL_REQUEST_INVALID"]);
  });

  it("cannot launder raw verdict fields through a source-finding digest", () => {
    const harness = makeHarness();
    const verdict = harness.tribunalCase.verdicts[0];
    verdict.claim = "Caller-controlled replacement prose.";
    resealVerdictsAndReceiptsWithoutCanonicalSync(harness);

    expect(validationCodes(harness)).toContain(
      "CANONICAL_FINDING_BINDING_MISMATCH",
    );

    const inactive = makeHarness();
    const finding = inactive.canonicalFindings.get(
      inactive.tribunalCase.verdicts[0].id,
    )!;
    finding.resolutionStatus = "verified";
    inactive.tribunalCase.verdicts[0].provenance.sourceFindingDigest =
      computeDesignFindingDigest(finding);
    resealVerdictsAndReceiptsWithoutCanonicalSync(inactive);
    expectCodes(inactive, ["CANONICAL_FINDING_INACTIVE"]);
  });

  it("charges malformed canonical resolver payloads to the shared budget", () => {
    const harness = makeHarness();
    const original = harness.tribunalCase.verdicts[0];
    harness.tribunalCase.verdicts = Array.from({ length: 6 }, (_, index) => ({
      ...structuredClone(original),
      id: `verdict.budget.v${index + 1}`,
      provenance: {
        ...structuredClone(original.provenance),
        sourceFindingDigest: digestCanonical(
          `malformed-finding-${index}`,
          "quirk.design-tribunal.design-finding.v1",
        ),
      },
    }));
    harness.tribunalCase.decisionReceipts[0].consideredVerdictIds =
      harness.tribunalCase.verdicts.map(({ id }) => id);
    resealVerdictsAndReceiptsWithoutCanonicalSync(harness);

    const malformedFinding = {
      padding: Array.from({ length: 31 }, () => "x".repeat(60_000)),
    };
    let calls = 0;
    harness.context.resolveDesignFinding = () => {
      calls += 1;
      return malformedFinding;
    };

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues.map(({ code }) => code)).toContain(
      "EXTERNAL_RESOLUTION_BUDGET_EXCEEDED",
    );
    expect(calls).toBeLessThan(harness.tribunalCase.verdicts.length);
    expect(result.commitTransition).toBeNull();
  });

  it("requires a trusted action manifest bound to the exact executable scope", () => {
    const missing = makeHarness();
    missing.context.resolveTribunalActionManifest = () => undefined;
    expectCodes(missing, ["ACTION_MANIFEST_UNRESOLVED"]);

    const substituted = makeHarness();
    substituted.context.resolveTribunalActionManifest = () => ({
      ...substituted.actionManifest,
      selectedCandidateDigest: digestCanonical("substituted-candidate"),
      candidates: [
        {
          digest: digestCanonical("substituted-candidate"),
          generatorId: "generator.substituted.v1",
          independenceKey: "independence.substituted.v1",
        },
      ],
    });
    expectCodes(substituted, [
      "ACTION_MANIFEST_BINDING_MISMATCH",
      "ACTION_MANIFEST_DIGEST_MISMATCH",
      "CANDIDATE_SOURCE_UNRESOLVED",
    ]);

    const rebound = makeHarness();
    rebound.actionManifest.destinationId = "destination.other";
    rebindActionManifest(rebound);
    expectCodes(rebound, ["ACTION_MANIFEST_BINDING_MISMATCH"]);
  });

  it("authenticates action semantics and exact candidate byte snapshots", () => {
    const unavailable = makeHarness();
    unavailable.context.verifyActionManifest = undefined;
    expectCodes(unavailable, ["ACTION_MANIFEST_VERIFIER_UNAVAILABLE"]);

    const rejected = makeHarness();
    rejected.context.verifyActionManifest = () => false;
    expectCodes(rejected, ["ACTION_MANIFEST_AUTHENTICATION_FAILED"]);

    const asynchronous = makeHarness();
    asynchronous.context.verifyActionManifest = (() =>
      Promise.resolve(
        true,
      )) as unknown as TribunalValidationContext["verifyActionManifest"];
    expectCodes(asynchronous, ["ACTION_MANIFEST_AUTHENTICATION_FAILED"]);

    const missingCandidate = makeHarness();
    missingCandidate.context.resolveCandidate = () => undefined;
    expectCodes(missingCandidate, ["CANDIDATE_SOURCE_UNRESOLVED"]);

    const substitutedBytes = makeHarness();
    substitutedBytes.context.resolveCandidate = () => "different candidate";
    expectCodes(substitutedBytes, ["CANDIDATE_DIGEST_MISMATCH"]);

    const oversized = makeHarness();
    oversized.context.resolveCandidate = () =>
      "x".repeat(TRIBUNAL_LIMITS.serializedBytes + 1);
    expectCodes(oversized, ["CANDIDATE_SOURCE_UNRESOLVED"]);
  });

  it("latches the cumulative external-resolution budget before later ports run", () => {
    const harness = makeHarness();
    const candidates = Array.from({ length: 4 }, (_, index) => {
      const bytes = `${index}`.padEnd(1_999_900, "x");
      return { bytes, digest: digestCandidateBytes(bytes) };
    });
    harness.actionManifest.candidates = candidates.map(({ digest }, index) => ({
      digest,
      generatorId: `generator.budget.v${index + 1}`,
      independenceKey: `independence.budget.v${index + 1}`,
    }));
    harness.actionManifest.selectedCandidateDigest = candidates[0].digest;
    harness.actionManifest.subjectDigest = candidates[0].digest;
    harness.tribunalCase.subject.digest = candidates[0].digest;
    harness.tribunalCase.evidenceClaims[0].subjectDigest = candidates[0].digest;
    harness.tribunalCase.verdicts[0].subjectDigest = candidates[0].digest;
    let candidateCalls = 0;
    harness.context.resolveCandidate = (digest) => {
      candidateCalls += 1;
      return candidates.find((candidate) => candidate.digest === digest)?.bytes;
    };
    let findingCalls = 0;
    harness.context.resolveDesignFinding = () => {
      findingCalls += 1;
      return undefined;
    };
    let evidenceCalls = 0;
    harness.context.resolveEvidence = () => {
      evidenceCalls += 1;
      return undefined;
    };
    rebindCanonicalRequest(harness, (request) => {
      request.budget.maxCandidates = 4;
    });

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues.map(({ code }) => code)).toContain(
      "EXTERNAL_RESOLUTION_BUDGET_EXCEEDED",
    );
    expect(candidateCalls).toBe(4);
    expect(findingCalls).toBe(0);
    expect(evidenceCalls).toBe(0);
    expect(result.commitTransition).toBeNull();
  });

  it("isolates action-verifier mutations from authenticated inputs", () => {
    const harness = makeHarness();
    const originalManifest = structuredClone(harness.actionManifest);
    const originalRequest = structuredClone(harness.canonicalRequest);
    const originalEvidence = structuredClone(
      harness.tribunalCase.evidenceClaims,
    );
    const originalNow = harness.context.now.getTime();

    harness.context.verifyActionManifest = (input) => {
      input.manifest.usage.rounds = 10;
      input.request.brief = "mutated verifier brief";
      input.evidenceClaims[0].claim = "mutated verifier evidence";
      input.candidates[0].bytes.fill(0);
      input.now.setTime(0);
      return true;
    };

    expectCodes(harness, []);
    expect(harness.actionManifest).toEqual(originalManifest);
    expect(harness.canonicalRequest).toEqual(originalRequest);
    expect(harness.tribunalCase.evidenceClaims).toEqual(originalEvidence);
    expect(harness.context.now.getTime()).toBe(originalNow);
  });

  it("requires out-of-band evaluator attestations for evidence and verdicts", () => {
    const missingEvidenceVerifier = makeHarness();
    missingEvidenceVerifier.context.verifyEvidenceClaim = undefined;
    expectCodes(missingEvidenceVerifier, ["EVIDENCE_VERIFIER_UNAVAILABLE"]);

    const rejectedEvidence = makeHarness();
    rejectedEvidence.context.verifyEvidenceClaim = () => false;
    expectCodes(rejectedEvidence, ["EVIDENCE_AUTHENTICATION_FAILED"]);

    const asynchronousEvidence = makeHarness();
    asynchronousEvidence.context.verifyEvidenceClaim = (() =>
      Promise.resolve(
        true,
      )) as unknown as TribunalValidationContext["verifyEvidenceClaim"];
    expectCodes(asynchronousEvidence, ["EVIDENCE_AUTHENTICATION_FAILED"]);

    const missingVerdictVerifier = makeHarness();
    missingVerdictVerifier.context.verifyTribunalVerdict = undefined;
    expectCodes(missingVerdictVerifier, ["VERDICT_VERIFIER_UNAVAILABLE"]);

    const rejectedVerdict = makeHarness();
    rejectedVerdict.context.verifyTribunalVerdict = () => false;
    expectCodes(rejectedVerdict, ["VERDICT_AUTHENTICATION_FAILED"]);

    const asynchronousVerdict = makeHarness();
    asynchronousVerdict.context.verifyTribunalVerdict = (() =>
      Promise.resolve(
        true,
      )) as unknown as TribunalValidationContext["verifyTribunalVerdict"];
    expectCodes(asynchronousVerdict, ["VERDICT_AUTHENTICATION_FAILED"]);
  });

  it("isolates evaluator-attestation mutations and binds the canonical critic role", () => {
    const harness = makeHarness();
    const originalCase = structuredClone(harness.tribunalCase);
    const originalFinding = structuredClone(
      harness.canonicalFindings.values().next().value!,
    );
    const originalNow = harness.context.now.getTime();
    harness.context.verifyEvidenceClaim = (input) => {
      input.claim.claim = "mutated evidence attestation";
      input.declaration.criticRole = "experience";
      input.now.setTime(0);
      return true;
    };
    harness.context.verifyTribunalVerdict = (input) => {
      input.verdict.claim = "mutated verdict attestation";
      input.declaration.criticRole = "experience";
      input.finding.criticRole = "experience";
      input.evidenceClaims[0].claim = "mutated verdict evidence";
      input.now.setTime(0);
      return true;
    };

    expectCodes(harness, []);
    expect(harness.tribunalCase).toEqual(originalCase);
    expect(harness.canonicalFindings.values().next().value).toEqual(
      originalFinding,
    );
    expect(harness.context.now.getTime()).toBe(originalNow);

    const roleMismatch = makeHarness();
    roleMismatch.canonicalFindings.values().next().value!.criticRole =
      "experience";
    sealHarness(roleMismatch);
    expectCodes(roleMismatch, ["CANONICAL_FINDING_BINDING_MISMATCH"]);
  });

  it("enforces experimental candidate, usage, prohibition, and baseline constraints", () => {
    const candidates = makeHarness();
    rebindCanonicalRequest(candidates, (request) => {
      request.mode = "one_of_one";
    });
    expectCodes(candidates, ["ACTION_CANDIDATE_REQUIREMENT_UNMET"]);

    const correlatedCandidates = makeHarness();
    const correlatedBytes = "correlated candidate bytes";
    const correlatedDigest = digestCandidateBytes(correlatedBytes);
    correlatedCandidates.actionManifest.candidates.push({
      digest: correlatedDigest,
      generatorId: "generator.fixture.v2",
      independenceKey:
        correlatedCandidates.actionManifest.candidates[0].independenceKey,
    });
    const baseCandidateResolver = correlatedCandidates.context.resolveCandidate;
    correlatedCandidates.context.resolveCandidate = (digest) =>
      digest === correlatedDigest
        ? correlatedBytes
        : baseCandidateResolver(digest);
    rebindCanonicalRequest(correlatedCandidates, (request) => {
      request.mode = "one_of_one";
    });
    expectCodes(correlatedCandidates, [
      "ACTION_CANDIDATE_INDEPENDENCE_UNVERIFIED",
    ]);

    const budget = makeHarness();
    budget.actionManifest.usage.rounds =
      budget.canonicalRequest.budget.maxRounds + 1;
    rebindActionManifest(budget);
    expectCodes(budget, ["ACTION_BUDGET_EXCEEDED"]);

    const prohibition = makeHarness();
    prohibition.actionManifest.prohibitedChangeChecks[0].status = "unresolved";
    rebindActionManifest(prohibition);
    expectCodes(prohibition, ["PROHIBITED_CHANGE_UNCLEARED"]);

    const missingCheck = makeHarness();
    missingCheck.actionManifest.prohibitedChangeChecks = [];
    rebindActionManifest(missingCheck);
    expectCodes(missingCheck, ["ACTION_PROHIBITION_CHECK_MISMATCH"]);

    const baseline = makeHarness();
    rebindCanonicalRequest(baseline, (request) => {
      delete request.noBaselineReason;
      request.baselineLocator = "fixture://tribunal/baseline-v1";
    });
    expectCodes(baseline, ["ACTION_BASELINE_EVIDENCE_REQUIRED"]);
  });

  it("requires exact observable evidence for action-only safety checks", () => {
    const addActionOnlyEvidence = (harness: Harness, observable: boolean) => {
      const bytes = "action-only prohibition evidence";
      const claim = structuredClone(harness.tribunalCase.evidenceClaims[0]);
      claim.id = "evidence.action-only.v1";
      claim.claim = "The proposed action clears the named prohibition.";
      claim.observable = observable;
      claim.source = {
        kind: "test_result",
        locator: "fixture://tribunal/action-only",
        summary: "Action-only prohibition result.",
        digest: digestEvidenceBytes(bytes),
      };
      claim.derivedFromEvidenceClaims = [];
      harness.tribunalCase.evidenceClaims.push(claim);
      harness.tribunalCase.decisionReceipts[0].rejectedOrDisputedEvidence.push({
        evidenceClaimId: claim.id,
        reason: "This claim is consumed by the action safety check.",
      });
      harness.actionManifest.prohibitedChangeChecks[0].evidenceClaims.push({
        evidenceClaimId: claim.id,
        contentDigest: PLACEHOLDER_DIGEST,
      });
      harness.tribunalCase.evaluatorDeclarations[0].inspection.allowedSourceLocators.push(
        claim.source.locator,
      );
      const baseResolver = harness.context.resolveEvidence;
      harness.context.resolveEvidence = (locator) =>
        locator === claim.source.locator ? bytes : baseResolver(locator);
      sealHarness(harness);
    };

    const unobservable = makeHarness();
    addActionOnlyEvidence(unobservable, false);
    expectCodes(unobservable, ["EVIDENCE_UNOBSERVABLE"]);

    const mismatchedReference = makeHarness();
    addActionOnlyEvidence(mismatchedReference, true);
    const rawManifest = structuredClone(mismatchedReference.actionManifest);
    rawManifest.prohibitedChangeChecks[0].evidenceClaims[1].contentDigest =
      PLACEHOLDER_DIGEST;
    mismatchedReference.context.resolveTribunalActionManifest = () =>
      rawManifest;
    const codes = validationCodes(mismatchedReference);
    expect(codes).toContain("ACTION_PROHIBITION_CHECK_MISMATCH");
    expect(codes).toContain("ACTION_MANIFEST_DIGEST_MISMATCH");

    const rejectedSafety = makeHarness();
    addActionOnlyEvidence(rejectedSafety, true);
    const rejectedSafetyResult = validateTribunalCase(
      rejectedSafety.tribunalCase,
      rejectedSafety.context,
    );
    expect(rejectedSafetyResult.issues).toEqual([]);
    expect(rejectedSafetyResult.commitTransition?.effect).toBeNull();

    const acceptedSafety = makeHarness();
    addActionOnlyEvidence(acceptedSafety, true);
    const acceptedReceipt = acceptedSafety.tribunalCase.decisionReceipts[0];
    acceptedReceipt.rejectedOrDisputedEvidence =
      acceptedReceipt.rejectedOrDisputedEvidence.filter(
        ({ evidenceClaimId }) => evidenceClaimId !== "evidence.action-only.v1",
      );
    acceptedReceipt.acceptedEvidenceClaimIds.push("evidence.action-only.v1");
    sealHarness(acceptedSafety);
    expect(
      validateTribunalCase(acceptedSafety.tribunalCase, acceptedSafety.context)
        .commitTransition?.effect,
    ).not.toBeNull();
  });

  it.each([
    ["authority_grants", "authorityGrants"],
    ["evaluator_declarations", "evaluatorDeclarations"],
    ["evidence_claims", "evidenceClaims"],
    ["tribunal_verdicts", "verdicts"],
    ["decision_receipts", "decisionReceipts"],
  ])("rejects the unmerged PR #98 %s dialect", (legacy, canonical) => {
    const harness = makeHarness();
    const raw = harness.tribunalCase as unknown as Record<string, unknown>;
    raw[legacy] = raw[canonical];
    delete raw[canonical];

    expectCodes(harness, ["LEGACY_DIALECT_UNSUPPORTED"]);
  });

  it("rejects mixed canonical and legacy aliases as ambiguous", () => {
    const harness = makeHarness();
    (
      harness.tribunalCase as unknown as Record<string, unknown>
    ).authority_grants = [];
    expectCodes(harness, ["AMBIGUOUS_ALIAS"]);
  });

  it("rejects unknown protocol fields", () => {
    const harness = makeHarness();
    (
      harness.tribunalCase as unknown as Record<string, unknown>
    ).confidenceAuthority = true;
    expectCodes(harness, ["PROTOCOL_SCHEMA_INVALID"]);
  });

  it("bounds shallow collections and strings before expensive validation", () => {
    const oversizedArray = makeHarness();
    oversizedArray.tribunalCase.sourceRefs = Array.from(
      { length: TRIBUNAL_LIMITS.roleItems + 1 },
      (_, index) => `source:${index}`,
    );
    expectCodes(oversizedArray, ["PROTOCOL_SCHEMA_INVALID"]);

    const oversizedString = makeHarness();
    oversizedString.tribunalCase.purpose = "x".repeat(
      TRIBUNAL_LIMITS.longTextChars + 1,
    );
    expectCodes(oversizedString, ["PROTOCOL_SCHEMA_INVALID"]);

    const raw = {
      kind: "TribunalCase",
      values: new Array(TRIBUNAL_LIMITS.rawArrayItems + 1).fill("scalar"),
    };
    const result = validateTribunalCase(raw, makeHarness().context);
    expect(result.issues.map(({ code }) => code)).toEqual([
      "INPUT_GRAPH_UNSAFE",
    ]);
  });

  it("contains revoked proxies at every public graph-safety boundary", () => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();

    expect(() => isTribunalInputGraphSafe(revocable.proxy)).not.toThrow();
    expect(isTribunalInputGraphSafe(revocable.proxy)).toBe(false);
    const result = validateTribunalCase(revocable.proxy, makeHarness().context);
    expect(result.issues).toMatchObject([{ code: "INPUT_GRAPH_UNSAFE" }]);
    expect(() =>
      computeTribunalActionDigest(
        revocable.proxy as unknown as TribunalActionManifest,
      ),
    ).toThrow(TypeError);

    let proxyTrapCalls = 0;
    const oscillating = new Proxy(
      {},
      {
        ownKeys() {
          proxyTrapCalls += 1;
          return [];
        },
      },
    );
    expect(isTribunalInputGraphSafe(oscillating)).toBe(false);
    expect(proxyTrapCalls).toBe(0);
  });

  it("rejects present undefined leaves before schema parsing or hashing", () => {
    const rawCase = makeHarness();
    (
      rawCase.tribunalCase.decisionReceipts[0]
        .reversibility as unknown as Record<string, unknown>
    ).rollbackRef = undefined;
    expect(() =>
      validateTribunalCase(rawCase.tribunalCase, rawCase.context),
    ).not.toThrow();
    expectCodes(rawCase, ["INPUT_GRAPH_UNSAFE"]);

    const request = makeHarness();
    request.context.resolveDesignReviewRequest = () => ({
      ...request.canonicalRequest,
      artifactId: undefined,
    });
    expect(() =>
      validateTribunalCase(request.tribunalCase, request.context),
    ).not.toThrow();
    expect(validationCodes(request)).toContain("CANONICAL_REQUEST_INVALID");

    const action = makeHarness();
    action.context.resolveTribunalActionManifest = () => ({
      ...action.actionManifest,
      baselineEvidence: undefined,
    });
    expect(() =>
      validateTribunalCase(action.tribunalCase, action.context),
    ).not.toThrow();
    expect(validationCodes(action)).toContain("ACTION_MANIFEST_INVALID");

    const finding = makeHarness();
    finding.context.resolveDesignFinding = () => ({
      ...finding.canonicalFindings.values().next().value!,
      remediation: undefined,
    });
    expect(() =>
      validateTribunalCase(finding.tribunalCase, finding.context),
    ).not.toThrow();
    expect(validationCodes(finding)).toContain("CANONICAL_FINDING_INVALID");

    const hidden = Object.defineProperty({}, "hidden", {
      value: "unmetered",
      enumerable: false,
    });
    expect(isTribunalInputGraphSafe(hidden)).toBe(false);
    const hiddenFinding = makeHarness();
    hiddenFinding.context.resolveDesignFinding = () =>
      Object.defineProperty(
        structuredClone(hiddenFinding.canonicalFindings.values().next().value!),
        "hidden",
        { value: "x".repeat(60_000), enumerable: false },
      );
    expect(validationCodes(hiddenFinding)).toContain(
      "CANONICAL_FINDING_INVALID",
    );
  });

  it("rejects duplicate verdict evidence IDs before multiset binding", () => {
    const harness = makeHarness();
    harness.tribunalCase.verdicts[0].evidenceClaimIds.push(
      harness.tribunalCase.verdicts[0].evidenceClaimIds[0],
    );
    expectCodes(harness, ["PROTOCOL_SCHEMA_INVALID"]);
  });

  it("rejects duplicate object IDs before reference maps can shadow them", () => {
    const harness = makeHarness();
    harness.tribunalCase.evaluatorDeclarations.push(
      structuredClone(harness.tribunalCase.evaluatorDeclarations[0]),
    );
    expectCodes(harness, ["DUPLICATE_OBJECT_ID"]);
  });

  it("fails closed on a missing evaluator declaration instead of throwing", () => {
    const harness = makeHarness();
    harness.tribunalCase.verdicts[0].evaluatorDeclarationId =
      "evaluator.missing";
    sealCase(harness.tribunalCase);
    expectCodes(harness, [
      "GRANT_UNOWNED",
      "UNKNOWN_EVALUATOR_DECLARATION_REF",
    ]);
  });

  it("binds the signed grant to the exact Tribunal case", () => {
    const harness = makeHarness();
    const grant = {
      ...harness.tribunalCase.authorityGrants[0],
      subject: "tribunal-case:other",
    };
    resignGrant(harness, grant);
    const digest = computeAuthorityGrantDigest(grant);
    harness.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      digest;
    harness.tribunalCase.verdicts[0].authorityBasis.grantDigest = digest;
    harness.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      digest;
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["GRANT_CASE_BINDING_MISMATCH"]);
  });

  it("rejects proxy evaluator scope even when the token is genuinely signed", () => {
    const harness = makeHarness();
    const grant = structuredClone(harness.tribunalCase.authorityGrants[0]);
    grant.scopes = grant.scopes.map((scope) =>
      scope === tribunalEvaluatorScope("evaluator.contract.v1")
        ? tribunalEvaluatorScope("evaluator.proxy.v1")
        : scope,
    );
    resignGrant(harness, grant);
    const digest = computeAuthorityGrantDigest(grant);
    harness.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      digest;
    harness.tribunalCase.verdicts[0].authorityBasis.grantDigest = digest;
    harness.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      digest;
    sealCase(harness.tribunalCase);
    expectCodes(harness, [
      "GRANT_EVALUATOR_SCOPE_MISMATCH",
      "PROXY_GRANT_FORBIDDEN",
    ]);
  });

  it("rejects cross-grant borrowing by a verdict", () => {
    const harness = makeHarness();
    const other = {
      ...structuredClone(harness.tribunalCase.authorityGrants[0]),
      grantId: "grant.other.v1",
      nonce: "grant-nonce-other",
    };
    resignGrant(harness, other);
    harness.tribunalCase.verdicts[0].authorityGrantId = other.grantId;
    harness.tribunalCase.verdicts[0].authorityBasis.grantId = other.grantId;
    harness.tribunalCase.verdicts[0].authorityBasis.grantDigest =
      computeAuthorityGrantDigest(other);
    harness.tribunalCase.decisionReceipts[0].authorityGrantRefs = [
      {
        grantId: other.grantId,
        grantDigest: computeAuthorityGrantDigest(other),
      },
    ];
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["GRANT_UNOWNED", "VERDICT_GRANT_BINDING_MISMATCH"]);
  });

  it.each([
    ["realm", "realm.other", "SUBJECT_REALM_OUT_OF_SCOPE"],
    ["id", "artifact.other.v7", "SUBJECT_ID_OUT_OF_SCOPE"],
    ["targetClass", "document", "SUBJECT_TARGET_CLASS_OUT_OF_SCOPE"],
  ] as const)("checks the signed subject %s axis", (field, value, code) => {
    const harness = makeHarness();
    harness.tribunalCase.subject[field] = value;
    sealCase(harness.tribunalCase);
    expectCodes(harness, [
      ...(field === "realm" ? [] : ["CANONICAL_REQUEST_BINDING_MISMATCH"]),
      code,
    ]);
  });

  it("checks signed agentic purpose scope", () => {
    const harness = makeHarness();
    harness.tribunalCase.operatingScope.purposeId = "purpose.other";
    sealCase(harness.tribunalCase);
    expectCodes(harness, [
      "ACTION_MANIFEST_BINDING_MISMATCH",
      "PURPOSE_OUT_OF_SCOPE",
    ]);
  });

  it("rejects authority advertised by a declaration but absent from its grant", () => {
    const harness = makeHarness();
    harness.tribunalCase.evaluatorDeclarations[0].authority.declaredEffects.push(
      "approve",
    );
    harness.tribunalCase.evaluatorDeclarations[0].authority.prohibitedEffects =
      harness.tribunalCase.evaluatorDeclarations[0].authority.prohibitedEffects.filter(
        (effect) => effect !== "approve",
      );
    sealHarness(harness);
    expectCodes(harness, ["DECLARATION_EFFECT_EXCEEDS_GRANT"]);
  });

  it("binds the declaration's inspection, calibration, and independence core into signed scope", () => {
    const harness = makeHarness();
    harness.tribunalCase.evaluatorDeclarations[0].fallibility.knownFailureModes.push(
      "A caller-added failure mode after authority issuance.",
    );
    sealCase(harness.tribunalCase);

    expectCodes(harness, ["DECLARATION_CORE_OUT_OF_SCOPE"]);
  });

  it("requires evaluator classes compatible with each canonical criterion gate", () => {
    const harness = makeHarness();
    harness.tribunalCase.evaluatorDeclarations[0].evaluatorType = "model";
    sealHarness(harness);

    expectCodes(harness, ["CRITERION_GATE_EVALUATOR_MISMATCH"]);
  });

  it("rejects a verdict effect that the evaluator never declared", () => {
    const harness = makeHarness();
    const grant = structuredClone(harness.tribunalCase.authorityGrants[0]);
    grant.scopes.push(tribunalEffectScope("approve"));
    resignGrant(harness, grant);
    const grantDigest = computeAuthorityGrantDigest(grant);
    harness.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      grantDigest;
    harness.tribunalCase.verdicts[0].authorityEffectRequested = "approve";
    harness.tribunalCase.verdicts[0].authorityBasis.grantDigest = grantDigest;
    harness.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      grantDigest;
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["REQUESTED_EFFECT_UNDECLARED"]);
  });

  it.each([
    ["confidence", "AUTHORITY_DERIVED_FROM_CONFIDENCE"],
    ["consensus", "AUTHORITY_DERIVED_FROM_CONSENSUS"],
    ["historical_accuracy", "AUTHORITY_DERIVED_FROM_HISTORICAL_ACCURACY"],
  ] as const)("never derives authority from %s", (kind, code) => {
    const harness = makeHarness();
    harness.tribunalCase.verdicts[0].authorityBasis.kind = kind;
    sealCase(harness.tribunalCase);
    expectCodes(harness, [code]);
  });

  it("rejects unsupported dispositions that request an effect", () => {
    const harness = makeHarness();
    harness.tribunalCase.verdicts[0].disposition = "INSUFFICIENT";
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["DISPOSITION_EFFECT_INVALID"]);
  });

  it("requires evidence for a supported verdict", () => {
    const harness = makeHarness();
    harness.tribunalCase.verdicts[0].evidenceClaimIds = [];
    harness.tribunalCase.decisionReceipts[0].acceptedEvidenceClaimIds = [];
    sealCase(harness.tribunalCase);
    expectCodes(harness, [
      "CANONICAL_FINDING_BINDING_MISMATCH",
      "EVIDENCE_REQUIRED",
      "RECEIPT_EVIDENCE_ACCOUNTING_INCOMPLETE",
    ]);
  });

  it("requires every canonical criterion and evidence claim to be consumed", () => {
    const criterion = makeHarness();
    rebindCanonicalRequest(criterion, (request) => {
      request.criteria.push({
        id: "criterion.provenance",
        title: "Provenance is explicit",
        dimension: "provenance",
        requirement: "Every executable claim has a canonical source.",
        gate: "deterministic",
        evidenceRequired: ["source_reference"],
        blocksRelease: true,
      });
    });
    expectCodes(criterion, ["CRITERION_UNEVALUATED"]);

    const orphan = makeHarness();
    const orphanBytes = "orphan adverse evidence";
    const orphanClaim = structuredClone(orphan.tribunalCase.evidenceClaims[0]);
    orphanClaim.id = "evidence.orphan-adverse.v1";
    orphanClaim.claim = "Unconsumed evidence contradicts the recommendation.";
    orphanClaim.source = {
      kind: "test_result",
      locator: "fixture://tribunal/orphan-adverse",
      summary: "An adverse result that no verdict cites.",
      digest: digestEvidenceBytes(orphanBytes),
    };
    orphan.tribunalCase.evidenceClaims.push(orphanClaim);
    orphan.tribunalCase.decisionReceipts[0].rejectedOrDisputedEvidence.push({
      evidenceClaimId: orphanClaim.id,
      reason: "The decision accounts for the adverse orphan explicitly.",
    });
    orphan.tribunalCase.evaluatorDeclarations[0].inspection.allowedSourceLocators.push(
      orphanClaim.source.locator,
    );
    const baseResolver = orphan.context.resolveEvidence;
    orphan.context.resolveEvidence = (locator) =>
      locator === orphanClaim.source.locator
        ? orphanBytes
        : baseResolver(locator);
    sealHarness(orphan);
    expectCodes(orphan, ["EVIDENCE_UNCONSUMED"]);
  });

  it("enforces every canonical criterion's required evidence kinds", () => {
    const harness = makeHarness();
    rebindCanonicalRequest(harness, (request) => {
      request.criteria[0].evidenceRequired = ["screenshot"];
    });

    expectCodes(harness, ["EVIDENCE_REQUIRED"]);
  });

  it("rejects dangling evidence references without crashing", () => {
    const harness = makeHarness();
    harness.tribunalCase.verdicts[0].evidenceClaimIds = ["evidence.missing"];
    harness.tribunalCase.decisionReceipts[0].acceptedEvidenceClaimIds = [
      "evidence.missing",
    ];
    sealCase(harness.tribunalCase);
    expectCodes(harness, [
      "CANONICAL_FINDING_BINDING_MISMATCH",
      "EVIDENCE_REQUIRED",
      "RECEIPT_EVIDENCE_ACCOUNTING_INCOMPLETE",
      "UNKNOWN_EVIDENCE_CLAIM_REF",
    ]);
  });

  it("binds consumed evidence to the verdict evaluator", () => {
    const harness = makeHarness();
    harness.tribunalCase.evidenceClaims[0].inspectedBy = "evaluator.other.v1";
    sealHarness(harness);
    expectCodes(harness, [
      "EVIDENCE_INSPECTOR_MISMATCH",
      "UNKNOWN_EVALUATOR_DECLARATION_REF",
    ]);
  });

  it("does not let explicitly unobservable evidence support a verdict", () => {
    const harness = makeHarness();
    harness.tribunalCase.evidenceClaims[0].observable = false;
    sealHarness(harness);

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues.map(({ code }) => code)).toContain(
      "EVIDENCE_UNOBSERVABLE",
    );
    expect(result.evaluatorEffectWithinGrant).toEqual({
      "verdict.recommend.v1": false,
    });
    expect(result.commitTransition).toBeNull();
  });

  it("does not launder an unobservable ancestor through observable derived evidence", () => {
    const harness = makeHarness();
    const source = harness.tribunalCase.evidenceClaims[0];
    source.observable = false;
    source.contentDigest = computeEvidenceClaimContentDigest(source);
    const derived = structuredClone(source);
    derived.id = "evidence.observable-wrapper.v1";
    derived.observable = true;
    derived.source = {
      kind: "evidence_claim",
      locator: source.id,
      summary: "Observable wrapper around an unobservable ancestor.",
      digest: source.contentDigest,
    };
    derived.derivedFromEvidenceClaims = [
      { evidenceClaimId: source.id, contentDigest: source.contentDigest },
    ];
    harness.tribunalCase.evidenceClaims.push(derived);
    harness.tribunalCase.verdicts[0].evidenceClaimIds = [derived.id];
    harness.tribunalCase.decisionReceipts[0].acceptedEvidenceClaimIds = [
      source.id,
      derived.id,
    ];
    harness.tribunalCase.evaluatorDeclarations[0].inspection.evidenceKinds.push(
      "evidence_claim",
    );
    sealHarness(harness);

    expectCodes(harness, ["EVIDENCE_UNOBSERVABLE"]);
  });

  it("binds every inspection to an exact declared tool and locator", () => {
    const tool = makeHarness();
    tool.tribunalCase.evidenceClaims[0].inspectionToolId = "undeclared.tool";
    sealHarness(tool);
    expectCodes(tool, ["EVIDENCE_TOOL_UNDECLARED"]);

    const locator = makeHarness();
    const lookalike = "fixture://tribunal/positive-basic/child";
    locator.tribunalCase.evidenceClaims[0].source.locator = lookalike;
    locator.context.resolveEvidence = (candidate) =>
      candidate === lookalike
        ? EVIDENCE_BYTES
        : candidate === "fixture://tribunal/calibration-v1"
          ? CALIBRATION_BYTES
          : candidate === "fixture://tribunal/holdout-v1"
            ? HOLDOUT_BYTES
            : undefined;
    sealHarness(locator);
    expectCodes(locator, ["OUT_OF_SCOPE_EVIDENCE"]);
  });

  it("requires evidence bytes to be resolvable and digest-matched", () => {
    const harness = makeHarness();
    harness.context.resolveEvidence = (locator) =>
      locator === "fixture://tribunal/calibration-v1"
        ? CALIBRATION_BYTES
        : locator === "fixture://tribunal/holdout-v1"
          ? HOLDOUT_BYTES
          : undefined;
    expectCodes(harness, ["EVIDENCE_SOURCE_UNRESOLVED"]);

    harness.context.resolveEvidence = (locator) =>
      locator === "fixture://tribunal/calibration-v1"
        ? CALIBRATION_BYTES
        : locator === "fixture://tribunal/holdout-v1"
          ? HOLDOUT_BYTES
          : "different bytes";
    expectCodes(harness, ["EVIDENCE_DIGEST_MISMATCH"]);
  });

  it("fails closed when evidence infrastructure throws", () => {
    const harness = makeHarness();
    harness.context.resolveEvidence = (locator) => {
      if (locator === "fixture://tribunal/calibration-v1") {
        return CALIBRATION_BYTES;
      }
      if (locator === "fixture://tribunal/holdout-v1") return HOLDOUT_BYTES;
      throw new Error("adapter failure containing secret material");
    };

    expect(() => validationCodes(harness)).not.toThrow();
    expectCodes(harness, ["EVIDENCE_SOURCE_UNRESOLVED"]);
  });

  it("rejects malformed, asynchronous, hostile, and oversized evidence port results", () => {
    const hostile = {
      toJSON() {
        throw new Error("hostile evidence serializer");
      },
    };
    const badValues: unknown[] = [
      42,
      Promise.resolve(EVIDENCE_BYTES),
      hostile,
      "x".repeat(TRIBUNAL_LIMITS.rawStringBytes + 1),
    ];

    for (const badValue of badValues) {
      const harness = makeHarness();
      harness.context.resolveEvidence = (() =>
        badValue) as unknown as TribunalValidationContext["resolveEvidence"];
      expect(() => validationCodes(harness)).not.toThrow();
      expectCodes(harness, [
        "CALIBRATION_EVIDENCE_UNRESOLVED",
        "CALIBRATION_HOLDOUT_UNRESOLVED",
        "EVIDENCE_SOURCE_UNRESOLVED",
      ]);
    }
  });

  it("rejects missing and malformed evidence digests with exact codes", () => {
    const missing = makeHarness();
    delete missing.tribunalCase.evidenceClaims[0].source.digest;
    sealHarness(missing);
    expectCodes(missing, ["EVIDENCE_DIGEST_REQUIRED"]);

    const malformed = makeHarness();
    malformed.tribunalCase.evidenceClaims[0].source.digest = "sha256:redacted";
    sealHarness(malformed);
    expectCodes(malformed, ["EVIDENCE_DIGEST_INVALID"]);
  });

  it("rejects verdict laundering and the resulting protocol cycle", () => {
    const harness = makeHarness();
    harness.tribunalCase.evidenceClaims[0].source = {
      kind: "tribunal_verdict",
      locator: "verdict.recommend.v1",
      summary: "A verdict cannot become its own evidence.",
      digest: digestCanonical("verdict.recommend.v1"),
    };
    harness.tribunalCase.evaluatorDeclarations[0].inspection.evidenceKinds.push(
      "tribunal_verdict",
    );
    sealHarness(harness);
    expectCodes(harness, [
      "CANONICAL_FINDING_BINDING_MISMATCH",
      "EVIDENCE_CYCLE",
      "EVIDENCE_DIGEST_MISMATCH",
      "EVIDENCE_REQUIRED",
      "VERDICT_CANNOT_BE_PRIMARY_EVIDENCE",
    ]);
  });

  it("binds internal evidence to an existing object and its exact digest", () => {
    const harness = makeHarness();
    const source = harness.tribunalCase.evidenceClaims[0];
    const derived = structuredClone(source);
    derived.id = "evidence.derived.v1";
    derived.source = {
      kind: "evidence_claim",
      locator: source.id,
      summary: "A derived claim with an exact content-addressed source.",
      digest: source.contentDigest,
    };
    derived.derivedFromEvidenceClaims = [
      { evidenceClaimId: source.id, contentDigest: source.contentDigest },
    ];
    harness.tribunalCase.evaluatorDeclarations[0].inspection.evidenceKinds.push(
      "evidence_claim",
    );
    harness.tribunalCase.evidenceClaims.push(derived);
    harness.tribunalCase.verdicts[0].evidenceClaimIds = [derived.id];
    harness.tribunalCase.decisionReceipts[0].acceptedEvidenceClaimIds = [
      source.id,
      derived.id,
    ];
    sealHarness(harness);
    expectCodes(harness, []);

    derived.source.digest = PLACEHOLDER_DIGEST;
    sealHarness(harness);
    expectCodes(harness, ["EVIDENCE_DIGEST_MISMATCH"]);
  });

  it("cannot launder freshness through source or derived evidence links", () => {
    const buildDerived = () => {
      const harness = makeHarness();
      const source = harness.tribunalCase.evidenceClaims[0];
      const derived = structuredClone(source);
      derived.id = "evidence.temporal-derived.v1";
      derived.source = {
        kind: "evidence_claim",
        locator: source.id,
        summary: "A content-addressed derivative of the source claim.",
        digest: source.contentDigest,
      };
      derived.derivedFromEvidenceClaims = [
        { evidenceClaimId: source.id, contentDigest: source.contentDigest },
      ];
      harness.tribunalCase.evaluatorDeclarations[0].inspection.evidenceKinds.push(
        "evidence_claim",
      );
      harness.tribunalCase.evidenceClaims.push(derived);
      harness.tribunalCase.verdicts[0].evidenceClaimIds = [derived.id];
      harness.tribunalCase.decisionReceipts[0].acceptedEvidenceClaimIds = [
        source.id,
        derived.id,
      ];
      return { harness, source, derived };
    };

    const observedBeforeSource = buildDerived();
    observedBeforeSource.derived.observedAt = "2026-08-21T12:44:59.999Z";
    sealHarness(observedBeforeSource.harness);
    expect(validationCodes(observedBeforeSource.harness)).toContain(
      "TEMPORAL_ORDER_INVALID",
    );

    const outlivesSource = buildDerived();
    outlivesSource.derived.validUntil = "2026-08-22T12:45:00.001Z";
    sealHarness(outlivesSource.harness);
    expect(validationCodes(outlivesSource.harness)).toContain(
      "TEMPORAL_ORDER_INVALID",
    );
  });

  it("rejects decision-receipt laundering and dangling receipt evidence", () => {
    const harness = makeHarness();
    harness.tribunalCase.evidenceClaims[0].source = {
      kind: "decision_receipt",
      locator: "receipt.missing.v1",
      summary: "A named decision is not primary evidence.",
      digest: PLACEHOLDER_DIGEST,
    };
    harness.tribunalCase.evaluatorDeclarations[0].inspection.evidenceKinds.push(
      "decision_receipt",
    );
    sealHarness(harness);

    expectCodes(harness, [
      "CANONICAL_FINDING_BINDING_MISMATCH",
      "DECISION_RECEIPT_CANNOT_BE_PRIMARY_EVIDENCE",
      "EVIDENCE_REQUIRED",
      "UNKNOWN_DECISION_RECEIPT_REF",
    ]);
  });

  it("rejects derived-evidence cycles", () => {
    const harness = makeHarness();
    const second = structuredClone(harness.tribunalCase.evidenceClaims[0]);
    second.id = "evidence.fixture.v2";
    second.source = {
      kind: "evidence_claim",
      locator: "evidence.fixture.v1",
      summary: "Derived from the first claim.",
      digest: digestCanonical("evidence.fixture.v1"),
    };
    second.derivedFromEvidenceClaims = [
      {
        evidenceClaimId: "evidence.fixture.v1",
        contentDigest: harness.tribunalCase.evidenceClaims[0].contentDigest,
      },
    ];
    harness.tribunalCase.evidenceClaims[0].source = {
      kind: "evidence_claim",
      locator: second.id,
      summary: "Derived from the second claim.",
      digest: digestCanonical(second.id),
    };
    harness.tribunalCase.evidenceClaims[0].derivedFromEvidenceClaims = [
      { evidenceClaimId: second.id, contentDigest: second.contentDigest },
    ];
    harness.tribunalCase.evidenceClaims.push(second);
    harness.tribunalCase.evaluatorDeclarations[0].inspection.evidenceKinds.push(
      "evidence_claim",
    );
    sealHarness(harness);
    expectCodes(harness, [
      "CANONICAL_FINDING_BINDING_MISMATCH",
      "EVIDENCE_CYCLE",
      "EVIDENCE_DIGEST_MISMATCH",
      "EVIDENCE_REQUIRED",
      "RECEIPT_EVIDENCE_ACCOUNTING_INCOMPLETE",
    ]);
  });

  it("binds verdict evidence to the same stable claim and trajectory", () => {
    const claim = makeHarness();
    claim.tribunalCase.evidenceClaims[0].claimId = "claim.unrelated";
    sealHarness(claim);
    expectCodes(claim, ["EVIDENCE_CLAIM_BINDING_MISMATCH"]);

    const trajectory = makeHarness();
    trajectory.tribunalCase.verdicts[0].provenance.trajectoryId =
      "trajectory.unrelated.v1";
    sealCase(trajectory.tribunalCase);
    expectCodes(trajectory, ["TRAJECTORY_MISMATCH"]);

    const criterion = makeHarness();
    criterion.tribunalCase.verdicts[0].criterionRef = "criterion.unrelated";
    criterion.tribunalCase.verdicts[0].claimId = "criterion.unrelated";
    criterion.tribunalCase.evidenceClaims[0].claimId = "criterion.unrelated";
    sealHarness(criterion);
    expectCodes(criterion, ["CRITERION_UNEVALUATED", "UNKNOWN_CRITERION_REF"]);
  });

  it("enforces the evaluator's declared evidence cutoff", () => {
    const harness = makeHarness();
    harness.tribunalCase.evaluatorDeclarations[0].inspection.temporalBoundary =
      "2026-08-21T12:44:59.999Z";
    sealHarness(harness);
    expectCodes(harness, ["EVIDENCE_AFTER_INSPECTION_BOUNDARY"]);
  });

  it("enforces structured source inspection policy with deny precedence", () => {
    const denied = makeHarness();
    denied.tribunalCase.evaluatorDeclarations[0].inspection.allowedSourceLocators.push(
      "restricted://tribunal/secret",
    );
    denied.tribunalCase.evidenceClaims[0].source.locator =
      "restricted://tribunal/secret";
    denied.context.resolveEvidence = (locator) =>
      locator === "restricted://tribunal/secret"
        ? EVIDENCE_BYTES
        : locator === "fixture://tribunal/calibration-v1"
          ? CALIBRATION_BYTES
          : locator === "fixture://tribunal/holdout-v1"
            ? HOLDOUT_BYTES
            : undefined;
    sealHarness(denied);
    expectCodes(denied, ["OUT_OF_SCOPE_EVIDENCE"]);

    const notAllowed = makeHarness();
    notAllowed.tribunalCase.evidenceClaims[0].source.locator =
      "other://tribunal/positive-basic";
    notAllowed.context.resolveEvidence = (locator) =>
      locator === "other://tribunal/positive-basic"
        ? EVIDENCE_BYTES
        : locator === "fixture://tribunal/calibration-v1"
          ? CALIBRATION_BYTES
          : locator === "fixture://tribunal/holdout-v1"
            ? HOLDOUT_BYTES
            : undefined;
    sealHarness(notAllowed);
    expectCodes(notAllowed, ["OUT_OF_SCOPE_EVIDENCE"]);
  });

  it("bounds verdict confidence by fresh calibration evidence", () => {
    const overconfident = makeHarness();
    overconfident.tribunalCase.verdicts[0].confidence = 0.99;
    sealCase(overconfident.tribunalCase);
    expectCodes(overconfident, ["CONFIDENCE_EXCEEDS_CALIBRATION"]);

    const stale = makeHarness();
    stale.tribunalCase.evaluatorDeclarations[0].fallibility.calibrationValidUntil =
      "2026-08-21T12:59:59.999Z";
    sealHarness(stale);
    expectCodes(stale, ["CALIBRATION_STALE"]);

    const contaminated = makeHarness();
    contaminated.tribunalCase.evaluatorDeclarations[0].fallibility.holdoutEvidence =
      {
        locator: "fixture://tribunal/positive-basic",
        digest:
          contaminated.tribunalCase.evidenceClaims[0].source.digest ??
          PLACEHOLDER_DIGEST,
      };
    sealHarness(contaminated);
    expectCodes(contaminated, ["CALIBRATION_HOLDOUT_CONTAMINATED"]);

    const candidateContaminated = makeHarness();
    const candidateDeclaration =
      candidateContaminated.tribunalCase.evaluatorDeclarations[0];
    candidateDeclaration.fallibility.holdoutEvidence = {
      locator: "fixture://tribunal/selected-candidate-holdout",
      digest: digestEvidenceBytes(CANDIDATE_BYTES),
    };
    candidateDeclaration.inspection.allowedSourceLocators.push(
      candidateDeclaration.fallibility.holdoutEvidence.locator,
    );
    const candidateBaseResolver = candidateContaminated.context.resolveEvidence;
    candidateContaminated.context.resolveEvidence = (locator) =>
      locator === candidateDeclaration.fallibility.holdoutEvidence.locator
        ? CANDIDATE_BYTES
        : candidateBaseResolver(locator);
    sealHarness(candidateContaminated);
    expectCodes(candidateContaminated, ["CALIBRATION_HOLDOUT_CONTAMINATED"]);

    const calibrationBoundary = makeHarness();
    calibrationBoundary.tribunalCase.evaluatorDeclarations[0].fallibility.calibrationValidUntil =
      EVALUATED_AT;
    sealHarness(calibrationBoundary);
    expectCodes(calibrationBoundary, ["CALIBRATION_STALE"]);

    const evidenceBoundary = makeHarness();
    evidenceBoundary.tribunalCase.evidenceClaims[0].validUntil = EVALUATED_AT;
    sealHarness(evidenceBoundary);
    expectCodes(evidenceBoundary, ["EVIDENCE_STALE"]);
  });

  it("requires calibration evidence to resolve to its declared bytes", () => {
    const unresolved = makeHarness();
    unresolved.context.resolveEvidence = (locator) =>
      locator === "fixture://tribunal/positive-basic"
        ? EVIDENCE_BYTES
        : locator === "fixture://tribunal/holdout-v1"
          ? HOLDOUT_BYTES
          : undefined;
    expectCodes(unresolved, ["CALIBRATION_EVIDENCE_UNRESOLVED"]);

    const changed = makeHarness();
    changed.context.resolveEvidence = (locator) =>
      locator === "fixture://tribunal/positive-basic"
        ? EVIDENCE_BYTES
        : locator === "fixture://tribunal/calibration-v1"
          ? "different calibration bytes"
          : locator === "fixture://tribunal/holdout-v1"
            ? HOLDOUT_BYTES
            : undefined;
    expectCodes(changed, ["CALIBRATION_EVIDENCE_DIGEST_MISMATCH"]);
  });

  it("snapshots each evidence locator once and rejects holdout locator reuse", () => {
    const harness = makeHarness();
    const declaration = harness.tribunalCase.evaluatorDeclarations[0];
    declaration.fallibility.holdoutEvidence = {
      locator: declaration.fallibility.calibrationEvidence.locator,
      digest: digestEvidenceBytes(HOLDOUT_BYTES),
    };
    let calibrationCalls = 0;
    harness.context.resolveEvidence = (locator) => {
      if (locator === "fixture://tribunal/positive-basic") {
        return EVIDENCE_BYTES;
      }
      if (locator === "fixture://tribunal/calibration-v1") {
        calibrationCalls += 1;
        return calibrationCalls === 1 ? CALIBRATION_BYTES : HOLDOUT_BYTES;
      }
      return undefined;
    };
    sealHarness(harness);

    expectCodes(harness, [
      "CALIBRATION_HOLDOUT_CONTAMINATED",
      "CALIBRATION_HOLDOUT_DIGEST_MISMATCH",
    ]);
    expect(calibrationCalls).toBe(1);
  });

  it("rejects evaluator identities that only look independent", () => {
    const harness = makeHarness();
    const declaration = structuredClone(
      harness.tribunalCase.evaluatorDeclarations[0],
    );
    declaration.id = "evaluator.contract.v2";
    declaration.version = "2.0.0";
    declaration.independence = {
      key: "independence.contract.v2",
      operatorId: "operator.other.v2",
      modelFamily: "deterministic.other.v2",
    };
    harness.principalAliases.set(
      declaration.id,
      "principal.evaluator.contract.v1",
    );
    declaration.authority.grantId = "grant.evaluator.v2";
    const grant = {
      ...structuredClone(harness.tribunalCase.authorityGrants[0]),
      grantId: "grant.evaluator.v2",
      scopes: grantScopes(
        harness.tribunalCase,
        declaration.id,
        ["recommend"],
        declaration,
      ),
      nonce: "grant-nonce-0002",
    };
    declaration.authority.grantDigest = computeAuthorityGrantDigest(grant);
    harness.tribunalCase.evaluatorDeclarations.push(declaration);
    resignGrant(harness, grant);
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["EVALUATOR_INDEPENDENCE_COLLISION", "GRANT_UNOWNED"]);
  });

  it("treats shared operators and model families as correlated", () => {
    const harness = makeHarness();
    const declaration = structuredClone(
      harness.tribunalCase.evaluatorDeclarations[0],
    );
    declaration.id = "evaluator.contract.v2";
    declaration.version = "2.0.0";
    declaration.independence = {
      key: "independence.contract.v2",
      operatorId: "operator.ci.alias",
      modelFamily: "deterministic.other",
    };
    harness.principalAliases.set(
      declaration.independence.operatorId,
      "principal.operator.ci",
    );
    declaration.authority.grantId = "grant.evaluator.v2";
    const grant = {
      ...structuredClone(harness.tribunalCase.authorityGrants[0]),
      grantId: "grant.evaluator.v2",
      scopes: grantScopes(
        harness.tribunalCase,
        declaration.id,
        ["recommend"],
        declaration,
      ),
      nonce: "grant-nonce-0002",
    };
    declaration.authority.grantDigest = computeAuthorityGrantDigest(grant);
    harness.tribunalCase.evaluatorDeclarations.push(declaration);
    resignGrant(harness, grant);
    sealCase(harness.tribunalCase);

    expectCodes(harness, ["EVALUATOR_INDEPENDENCE_COLLISION", "GRANT_UNOWNED"]);

    const crossAxis = makeHarness();
    const crossDeclaration = structuredClone(
      crossAxis.tribunalCase.evaluatorDeclarations[0],
    );
    crossDeclaration.id = "evaluator.cross-axis.v2";
    crossDeclaration.version = "2.0.0";
    crossDeclaration.independence = {
      key: "independence.cross-axis.v2",
      operatorId: "operator.cross-axis.v2",
      modelFamily: "deterministic.cross-axis.v2",
    };
    crossAxis.principalAliases.set(
      crossDeclaration.independence.operatorId,
      "principal.evaluator.contract.v1",
    );
    crossDeclaration.authority.grantId = "grant.cross-axis.v2";
    const crossGrant = {
      ...structuredClone(crossAxis.tribunalCase.authorityGrants[0]),
      grantId: "grant.cross-axis.v2",
      scopes: grantScopes(
        crossAxis.tribunalCase,
        crossDeclaration.id,
        ["recommend"],
        crossDeclaration,
      ),
      nonce: "grant-nonce-cross-axis-0002",
    };
    crossDeclaration.authority.grantDigest =
      computeAuthorityGrantDigest(crossGrant);
    crossAxis.tribunalCase.evaluatorDeclarations.push(crossDeclaration);
    resignGrant(crossAxis, crossGrant);
    sealCase(crossAxis.tribunalCase);
    expectCodes(crossAxis, [
      "EVALUATOR_INDEPENDENCE_COLLISION",
      "GRANT_UNOWNED",
    ]);
  });

  it("fails closed when canonical principal resolution is missing or asynchronous", () => {
    const missing = makeHarness();
    missing.context.resolvePrincipalId = () => undefined;
    expectCodes(missing, ["PRINCIPAL_IDENTITY_UNVERIFIED"]);

    const asynchronous = makeHarness();
    asynchronous.context.resolvePrincipalId = (() =>
      Promise.resolve(
        "principal.synthetic",
      )) as unknown as TribunalValidationContext["resolvePrincipalId"];
    expect(() => validationCodes(asynchronous)).not.toThrow();
    expectCodes(asynchronous, ["PRINCIPAL_IDENTITY_UNVERIFIED"]);
  });

  it("requires exactly one evaluator principal per grant", () => {
    const proxyScope = makeHarness();
    const grant = structuredClone(proxyScope.tribunalCase.authorityGrants[0]);
    grant.scopes.push(tribunalEvaluatorScope("evaluator.proxy.v1"));
    resignGrant(proxyScope, grant);
    const grantDigest = computeAuthorityGrantDigest(grant);
    proxyScope.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      grantDigest;
    proxyScope.tribunalCase.verdicts[0].authorityBasis.grantDigest =
      grantDigest;
    proxyScope.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      grantDigest;
    sealCase(proxyScope.tribunalCase);
    expectCodes(proxyScope, ["PROXY_GRANT_FORBIDDEN"]);

    const shared = makeHarness();
    const declaration = structuredClone(
      shared.tribunalCase.evaluatorDeclarations[0],
    );
    declaration.id = "evaluator.other.v1";
    declaration.independence = {
      key: "independence.other.v1",
      operatorId: "operator.other.v1",
      modelFamily: "model.other.v1",
    };
    shared.tribunalCase.evaluatorDeclarations.push(declaration);
    sealCase(shared.tribunalCase);
    expectCodes(shared, [
      "GRANT_EVALUATOR_SCOPE_MISMATCH",
      "GRANT_SHARED_BETWEEN_EVALUATORS",
      "PROXY_GRANT_FORBIDDEN",
    ]);
  });

  it("rejects a signed grant that no evaluator declaration owns", () => {
    const harness = makeHarness();
    const orphan = {
      ...structuredClone(harness.tribunalCase.authorityGrants[0]),
      grantId: "grant.orphan.v1",
      nonce: "grant-nonce-orphan",
    };
    resignGrant(harness, orphan);
    sealHarness(harness);

    expectCodes(harness, ["GRANT_UNOWNED"]);
    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.verifiedAuthorityGrants).toEqual([]);
  });

  it("detects disputes by stable claim ID, not prose", () => {
    const harness = makeHarness();
    const grant = structuredClone(harness.tribunalCase.authorityGrants[0]);
    grant.scopes.push(tribunalEffectScope("block"));
    resignGrant(harness, grant);
    const grantDigest = computeAuthorityGrantDigest(grant);
    const declaration = harness.tribunalCase.evaluatorDeclarations[0];
    declaration.authority.grantDigest = grantDigest;
    declaration.authority.declaredEffects.push("block");
    harness.tribunalCase.verdicts[0].authorityBasis.grantDigest = grantDigest;
    const contradicted = structuredClone(harness.tribunalCase.verdicts[0]);
    contradicted.id = "verdict.block.v1";
    contradicted.claim = "Different prose, same stable claim.";
    contradicted.disposition = "CONTRADICTED";
    contradicted.authorityEffectRequested = "block";
    contradicted.authorityBasis.grantDigest = grantDigest;
    harness.tribunalCase.verdicts.push(contradicted);
    harness.tribunalCase.decisionReceipts = [];
    delete harness.tribunalCase.effectiveDecisionReceiptId;
    sealHarness(harness);
    expectCodes(harness, [
      "BLOCKING_CRITERION_REQUIRES_HUMAN",
      "DECISION_RECEIPT_REQUIRED",
      "DISPUTED_VERDICTS_UNACKNOWLEDGED",
    ]);
  });

  it("does not let an irrelevant receipt suppress evaluator disagreement", () => {
    const harness = makeHarness();
    const grant = structuredClone(harness.tribunalCase.authorityGrants[0]);
    grant.scopes.push(tribunalEffectScope("block"));
    resignGrant(harness, grant);
    const grantDigest = computeAuthorityGrantDigest(grant);
    harness.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      grantDigest;
    harness.tribunalCase.evaluatorDeclarations[0].authority.declaredEffects.push(
      "block",
    );
    harness.tribunalCase.verdicts[0].authorityBasis.grantDigest = grantDigest;
    const contradicted = structuredClone(harness.tribunalCase.verdicts[0]);
    contradicted.id = "verdict.block.v1";
    contradicted.disposition = "CONTRADICTED";
    contradicted.authorityEffectRequested = "block";
    contradicted.authorityBasis.grantDigest = grantDigest;
    harness.tribunalCase.verdicts.push(contradicted);
    harness.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      grantDigest;
    sealHarness(harness);
    expectCodes(harness, [
      "DISPUTED_VERDICTS_UNACKNOWLEDGED",
      "RECEIPT_VERDICT_BINDING_MISMATCH",
    ]);
  });

  it("detects disagreement even when raw verdicts split caller-controlled claim IDs", () => {
    const harness = makeHarness();
    const grant = harness.tribunalCase.authorityGrants[0];
    grant.scopes.push(tribunalEffectScope("block"));
    const declaration = harness.tribunalCase.evaluatorDeclarations[0];
    declaration.authority.declaredEffects.push("block");
    const opposed = structuredClone(harness.tribunalCase.verdicts[0]);
    opposed.id = "verdict.split-claim.v1";
    opposed.claimId = "claim.caller-selected.v1";
    opposed.disposition = "CONTRADICTED";
    opposed.authorityEffectRequested = "block";
    harness.tribunalCase.verdicts.push(opposed);
    harness.tribunalCase.decisionReceipts = [];
    delete harness.tribunalCase.effectiveDecisionReceiptId;
    sealHarness(harness);

    const codes = validationCodes(harness);
    expect(codes).toContain("CANONICAL_FINDING_BINDING_MISMATCH");
    expect(codes).toContain("DISPUTED_VERDICTS_UNACKNOWLEDGED");
  });

  it("requires human acknowledgment for SUPPORTED and DISPUTED verdicts on one criterion", () => {
    const harness = makeHarness();
    const grant = harness.tribunalCase.authorityGrants[0];
    grant.scopes.push(tribunalEffectScope("observe"));
    const declaration = harness.tribunalCase.evaluatorDeclarations[0];
    declaration.authority.declaredEffects.push("observe");
    const disputed = structuredClone(harness.tribunalCase.verdicts[0]);
    disputed.id = "verdict.disputed.v1";
    disputed.disposition = "DISPUTED";
    disputed.authorityEffectRequested = "observe";
    harness.tribunalCase.verdicts.push(disputed);
    harness.tribunalCase.decisionReceipts = [];
    delete harness.tribunalCase.effectiveDecisionReceiptId;
    sealHarness(harness);

    const codes = validationCodes(harness);
    expect(codes).toContain("BLOCKING_CRITERION_REQUIRES_HUMAN");
    expect(codes).toContain("DISPUTED_VERDICTS_UNACKNOWLEDGED");
  });

  it("requires a human receipt for authority-bearing proposed effects", () => {
    const harness = makeHarness();
    harness.tribunalCase.proposedEffect = "publish";
    harness.tribunalCase.decisionReceipts = [];
    delete harness.tribunalCase.effectiveDecisionReceiptId;
    expectCodes(harness, [
      "ACTION_MANIFEST_BINDING_MISMATCH",
      "DECISION_RECEIPT_REQUIRED",
    ]);
  });

  it("honors canonical request and criterion human-gate semantics", () => {
    const noGate = makeHarness();
    rebindCanonicalRequest(noGate, (request) => {
      request.humanApprovalRequired = false;
    });
    noGate.tribunalCase.decisionReceipts = [];
    delete noGate.tribunalCase.effectiveDecisionReceiptId;
    const noGateResult = validateTribunalCase(
      noGate.tribunalCase,
      noGate.context,
    );
    expect(noGateResult.ok).toBe(true);
    expect(noGateResult.commitTransition?.effect).not.toBeNull();

    const criterionGate = makeHarness();
    criterionGate.tribunalCase.evaluatorDeclarations[0].evaluatorType =
      "human_reviewer";
    rebindCanonicalRequest(criterionGate, (request) => {
      request.criteria[0].gate = "human";
    });
    criterionGate.tribunalCase.decisionReceipts = [];
    delete criterionGate.tribunalCase.effectiveDecisionReceiptId;
    expectCodes(criterionGate, ["DECISION_RECEIPT_REQUIRED"]);
  });

  it("requires an approved human gate for blocking counter-signals without inventing evaluator support", () => {
    const configureBlockingVerdict = (harness: Harness): void => {
      const grant = harness.tribunalCase.authorityGrants[0];
      if (!grant.scopes.includes(tribunalEffectScope("block"))) {
        grant.scopes.push(tribunalEffectScope("block"));
      }
      const declaration = harness.tribunalCase.evaluatorDeclarations[0];
      if (!declaration.authority.declaredEffects.includes("block")) {
        declaration.authority.declaredEffects.push("block");
      }
      const verdict = harness.tribunalCase.verdicts[0];
      verdict.disposition = "CONTRADICTED";
      verdict.authorityEffectRequested = "block";
      sealHarness(harness);
    };

    const missingHuman = makeHarness();
    missingHuman.tribunalCase.decisionReceipts = [];
    delete missingHuman.tribunalCase.effectiveDecisionReceiptId;
    configureBlockingVerdict(missingHuman);
    expectCodes(missingHuman, [
      "BLOCKING_CRITERION_REQUIRES_HUMAN",
      "DECISION_RECEIPT_REQUIRED",
    ]);

    const approvedHuman = makeHarness();
    configureBlockingVerdict(approvedHuman);
    const result = validateTribunalCase(
      approvedHuman.tribunalCase,
      approvedHuman.context,
    );
    expect(result.issues).toEqual([]);
    expect(result.commitTransition?.effect).toBeNull();
    expect(result.evaluatorEffectWithinGrant).toEqual({
      "verdict.recommend.v1": true,
    });

    const rejectedHuman = makeHarness();
    configureBlockingVerdict(rejectedHuman);
    rejectedHuman.tribunalCase.decisionReceipts[0].decision.decision =
      "rejected";
    rejectedHuman.tribunalCase.decisionReceipts[0].reversibility = {
      kind: "irreversible",
    };
    sealHarness(rejectedHuman);
    const rejectedResult = validateTribunalCase(
      rejectedHuman.tribunalCase,
      rejectedHuman.context,
    );
    expect(rejectedResult.issues).toEqual([]);
    expect(rejectedResult.commitTransition?.effect).toBeNull();
    expect(
      rejectedResult.commitTransition?.stateWrites.replayWrites,
    ).toHaveLength(1);
  });

  it("requires separation between evaluator principals and positive human decisions", () => {
    const harness = makeHarness();
    harness.principalAliases.set("operator.ci", "principal.bryan");
    sealHarness(harness);

    expectCodes(harness, [
      "DECISION_EVALUATOR_SEPARATION_REQUIRED",
      "GRANT_SELF_ISSUED",
    ]);
  });

  it("records a separated-identity rejection without authorizing an effect", () => {
    const harness = makeHarness();
    const grant = harness.tribunalCase.authorityGrants[0];
    grant.issuer = "authority:root";
    harness.context.trustedAuthorityIssuers.push(grant.issuer);
    harness.principalAliases.set(grant.issuer, "principal.authority.root");
    harness.principalAliases.set(
      harness.tribunalCase.evaluatorDeclarations[0].id,
      "principal.bryan",
    );
    const receipt = harness.tribunalCase.decisionReceipts[0];
    receipt.decision.decision = "rejected";
    receipt.reversibility = { kind: "irreversible" };
    sealHarness(harness);

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues).toEqual([]);
    expect(result.commitTransition?.effect).toBeNull();
  });

  it("requires out-of-band authentication for every human receipt", () => {
    const unavailable = makeHarness();
    unavailable.context.verifyDecisionReceipt = undefined;
    expectCodes(unavailable, ["DECISION_VERIFIER_UNAVAILABLE"]);

    const forged = makeHarness();
    forged.context.verifyDecisionReceipt = () => false;
    expectCodes(forged, ["DECISION_AUTHENTICATION_FAILED"]);

    const throwing = makeHarness();
    throwing.context.verifyDecisionReceipt = () => {
      throw new Error("human attestation provider unavailable");
    };
    expect(() => validationCodes(throwing)).not.toThrow();
    expectCodes(throwing, ["DECISION_AUTHENTICATION_FAILED"]);

    const asynchronous = makeHarness();
    asynchronous.context.verifyDecisionReceipt = (() =>
      Promise.resolve(
        true,
      )) as unknown as TribunalValidationContext["verifyDecisionReceipt"];
    expectCodes(asynchronous, ["DECISION_AUTHENTICATION_FAILED"]);
  });

  it("isolates authenticated state from a mutating receipt verifier", () => {
    const harness = makeHarness();
    const receipt = harness.tribunalCase.decisionReceipts[0];
    receipt.decision.decision = "rejected";
    sealHarness(harness);
    const originalDeadline = receipt.reversibility.deadline;
    const originalNow = harness.context.now.getTime();
    harness.context.verifyDecisionReceipt = ({ receipt: candidate, now }) => {
      candidate.decision.decision = "approved";
      candidate.reversibility.deadline = "2099-01-01T00:00:00.000Z";
      now.setTime(0);
      return true;
    };

    const result = validateTribunalCase(harness.tribunalCase, harness.context);

    expect(result.issues).toEqual([]);
    expect(result.commitTransition?.effect).toBeNull();
    expect(receipt.decision.decision).toBe("rejected");
    expect(receipt.reversibility.deadline).toBe(originalDeadline);
    expect(harness.context.now.getTime()).toBe(originalNow);
  });

  it("does not let a receipt verifier extend an authenticated rollback window", () => {
    const harness = makeHarness();
    const receipt = harness.tribunalCase.decisionReceipts[0];
    receipt.reversibility.deadline = "2026-08-21T13:04:00.000Z";
    sealHarness(harness);
    harness.context.verifyDecisionReceipt = ({ receipt: candidate }) => {
      candidate.reversibility.deadline = "2099-01-01T00:00:00.000Z";
      return true;
    };

    const result = validateTribunalCase(harness.tribunalCase, harness.context);

    expect(result.issues.map(({ code }) => code)).toEqual([
      "EFFECTIVE_ROLLBACK_WINDOW_EXPIRED",
    ]);
    expect(result.commitTransition).toBeNull();
    expect(receipt.reversibility.deadline).toBe("2026-08-21T13:04:00.000Z");
  });

  it("authenticates full receipt content beyond its public content hash", () => {
    const harness = makeHarness();
    const receipt = harness.tribunalCase.decisionReceipts[0];
    const originalAttestation = harness.decisionAttestations.get(receipt.id);

    receipt.decision.rationale = "A forged rationale with a recomputed hash.";
    receipt.contentDigest = computeDecisionReceiptContentDigest(receipt);

    expect(harness.decisionAttestations.get(receipt.id)).toBe(
      originalAttestation,
    );
    expectCodes(harness, ["DECISION_AUTHENTICATION_FAILED"]);
  });

  it("keeps a valid negative human decision non-executable", () => {
    const harness = makeHarness();
    harness.tribunalCase.decisionReceipts[0].decision.decision = "rejected";
    harness.tribunalCase.decisionReceipts[0].contentDigest =
      computeDecisionReceiptContentDigest(
        harness.tribunalCase.decisionReceipts[0],
      );
    attestReceipts(harness);

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues).toEqual([]);
    expect(result.commitTransition?.effect).toBeNull();
  });

  it("does not activate from evidence the approving receipt rejected", () => {
    const harness = makeHarness();
    const receipt = harness.tribunalCase.decisionReceipts[0];
    const evidenceClaimId = receipt.acceptedEvidenceClaimIds[0];
    receipt.acceptedEvidenceClaimIds = [];
    receipt.rejectedOrDisputedEvidence.push({
      evidenceClaimId,
      reason: "The human rejects this evidence for activation.",
    });
    sealHarness(harness);

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues).toEqual([]);
    expect(result.commitTransition).not.toBeNull();
    expect(result.commitTransition?.effect).toBeNull();
  });

  it("binds a receipt to the exact human authority, case, evidence, grants, and effect", () => {
    const owner = makeHarness();
    owner.principalAliases.set("human:other", "principal.other");
    owner.context.trustedHumanAuthorities.push("human:other");
    owner.tribunalCase.decisionReceipts[0].decision.authorityId = "human:other";
    sealCase(owner.tribunalCase);
    expectCodes(owner, ["DECISION_OWNER_MISMATCH"]);

    const caseDigest = makeHarness();
    caseDigest.tribunalCase.decisionReceipts[0].caseDigest = PLACEHOLDER_DIGEST;
    caseDigest.tribunalCase.decisionReceipts[0].contentDigest =
      computeDecisionReceiptContentDigest(
        caseDigest.tribunalCase.decisionReceipts[0],
      );
    attestReceipts(caseDigest);
    expectCodes(caseDigest, ["RECEIPT_CASE_DIGEST_MISMATCH"]);

    const evidence = makeHarness();
    evidence.tribunalCase.decisionReceipts[0].acceptedEvidenceClaimIds = [];
    evidence.tribunalCase.decisionReceipts[0].contentDigest =
      computeDecisionReceiptContentDigest(
        evidence.tribunalCase.decisionReceipts[0],
      );
    attestReceipts(evidence);
    expectCodes(evidence, ["RECEIPT_EVIDENCE_ACCOUNTING_INCOMPLETE"]);

    const effect = makeHarness();
    effect.tribunalCase.decisionReceipts[0].effect = "observe";
    effect.tribunalCase.decisionReceipts[0].contentDigest =
      computeDecisionReceiptContentDigest(
        effect.tribunalCase.decisionReceipts[0],
      );
    attestReceipts(effect);
    expectCodes(effect, ["RECEIPT_EFFECT_MISMATCH"]);
  });

  it("rejects receipt tampering, replay, and missing replay infrastructure", () => {
    const tampered = makeHarness();
    tampered.tribunalCase.decisionReceipts[0].contentDigest =
      PLACEHOLDER_DIGEST;
    expectCodes(tampered, ["RECEIPT_CONTENT_HASH_MISMATCH"]);

    const replayed = makeHarness();
    const replayedReceipt = replayed.tribunalCase.decisionReceipts[0];
    replayed.context.consumedReceiptDigests?.set(
      computeDecisionReceiptReplayKey(replayedReceipt),
      replayedReceipt.contentDigest,
    );
    expectCodes(replayed, ["DECISION_RECEIPT_REPLAYED"]);

    const changedReplay = makeHarness();
    const changedReceipt = changedReplay.tribunalCase.decisionReceipts[0];
    changedReplay.context.consumedReceiptDigests?.set(
      computeDecisionReceiptReplayKey(changedReceipt),
      PLACEHOLDER_DIGEST,
    );
    expectCodes(changedReplay, ["DECISION_RECEIPT_TAMPERED"]);

    const noLedger = makeHarness();
    noLedger.context.consumedReceiptDigests = undefined;
    expectCodes(noLedger, ["REPLAY_CHECK_REQUIRED"]);
  });

  it("requires a runtime-validated external receipt head", () => {
    const missing = makeHarness();
    missing.context.resolveReceiptHead = undefined;
    expectCodes(missing, ["RECEIPT_HEAD_UNVERIFIED"]);

    for (const invalid of [
      Promise.resolve(null),
      { receiptId: "receipt.review.v1" },
      Object.defineProperty({}, "receiptId", {
        get() {
          throw new Error("hostile head store result");
        },
      }),
    ]) {
      const malformed = makeHarness();
      malformed.context.resolveReceiptHead = (() =>
        invalid) as unknown as MutableContext["resolveReceiptHead"];
      expect(() => validationCodes(malformed)).not.toThrow();
      expectCodes(malformed, ["RECEIPT_HEAD_UNVERIFIED"]);
    }
  });

  it("rejects receipt-history truncation against the external head", () => {
    const harness = makeHarness();
    const first = harness.tribunalCase.decisionReceipts[0];
    const second = structuredClone(first);
    second.id = "receipt.review.v2";
    second.nonce = "receipt-nonce-0002";
    second.issuedAt = "2026-08-21T13:03:00.000Z";
    second.decision.decidedAt = second.issuedAt;
    second.decision.decision = "rejected";
    second.reversibility.rollbackRef = "git://revert/receipt.review.v2";
    harness.tribunalCase.decisionReceipts.push(second);
    harness.tribunalCase.effectiveDecisionReceiptId = second.id;
    sealHarness(harness);
    const trustedHead = {
      receiptId: second.id,
      contentDigest: second.contentDigest,
    };
    harness.context.resolveReceiptHead = () => trustedHead;

    harness.tribunalCase.decisionReceipts = [first];
    harness.tribunalCase.effectiveDecisionReceiptId = first.id;
    const result = validateTribunalCase(harness.tribunalCase, harness.context);

    expect(result.issues.map(({ code }) => code)).toEqual([
      "RECEIPT_HEAD_MISMATCH",
    ]);
    expect(result.commitTransition).toBeNull();
  });

  it("appends an authenticated receipt without rewriting consumed history", () => {
    const harness = makeHarness();
    const first = harness.tribunalCase.decisionReceipts[0];
    first.reversibility.deadline = "2026-08-21T13:04:00.000Z";
    sealHarness(harness);
    const originalCaseDigest = computeTribunalCaseDigest(harness.tribunalCase);
    const originalReceiptDigest = first.contentDigest;
    const originalAttestation = harness.decisionAttestations.get(first.id);
    const firstReplayKey = computeDecisionReceiptReplayKey(first);
    harness.context.consumedReceiptDigests?.set(
      firstReplayKey,
      first.contentDigest,
    );
    const persistedHead = {
      receiptId: first.id,
      contentDigest: first.contentDigest,
    };
    harness.context.resolveReceiptHead = () => persistedHead;

    const second = structuredClone(first);
    second.id = "receipt.review.v2";
    second.nonce = "receipt-nonce-0002";
    second.issuedAt = "2026-08-21T13:03:00.000Z";
    second.decision.decidedAt = second.issuedAt;
    second.decision.decision = "rejected";
    second.reversibility.rollbackRef = "git://revert/receipt.review.v2";
    second.reversibility.deadline = "2026-09-21T13:03:00.000Z";
    harness.tribunalCase.decisionReceipts.push(second);
    harness.tribunalCase.effectiveDecisionReceiptId = second.id;
    sealCase(harness.tribunalCase);
    harness.decisionAttestations.set(
      second.id,
      computeTestReceiptAttestation(second.contentDigest),
    );

    expect(computeTribunalCaseDigest(harness.tribunalCase)).toBe(
      originalCaseDigest,
    );
    expect(first.contentDigest).toBe(originalReceiptDigest);
    expect(harness.decisionAttestations.get(first.id)).toBe(
      originalAttestation,
    );
    expect(second.previousReceiptDigest).toBe(first.contentDigest);

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues).toEqual([]);
    expect(result.commitTransition?.effect).toBeNull();

    harness.context.consumedReceiptDigests?.delete(firstReplayKey);
    const absentHistoricalState = validateTribunalCase(
      harness.tribunalCase,
      harness.context,
    );
    expect(absentHistoricalState.issues).toEqual([]);
    expect(absentHistoricalState.commitTransition?.effect).toBeNull();

    harness.context.consumedReceiptDigests?.set(
      firstReplayKey,
      PLACEHOLDER_DIGEST,
    );
    expectCodes(harness, ["DECISION_RECEIPT_TAMPERED"]);
    harness.context.consumedReceiptDigests?.set(
      firstReplayKey,
      first.contentDigest,
    );

    harness.tribunalCase.decisionReceipts.reverse();
    expect(
      validateTribunalCase(harness.tribunalCase, harness.context).issues,
    ).toEqual([]);
  });

  it("commits later approved receipts without repeating an applied effect", () => {
    const harness = makeHarness();
    const first = harness.tribunalCase.decisionReceipts[0];
    const firstResult = validateTribunalCase(
      harness.tribunalCase,
      harness.context,
    );
    const appliedWrite = firstResult.commitTransition?.effect?.idempotencyWrite;
    if (!appliedWrite) throw new Error("Expected initial effect transition.");
    harness.context.appliedEffectDigests?.set(
      appliedWrite.key,
      appliedWrite.nextDigest,
    );
    harness.context.consumedReceiptDigests?.set(
      computeDecisionReceiptReplayKey(first),
      first.contentDigest,
    );
    harness.context.resolveReceiptHead = () => ({
      receiptId: first.id,
      contentDigest: first.contentDigest,
    });

    const second = structuredClone(first);
    second.id = "receipt.review.approved.v2";
    second.nonce = "receipt-nonce-approved-0002";
    second.issuedAt = "2026-08-21T13:03:00.000Z";
    second.decision.decidedAt = second.issuedAt;
    second.decision.rationale =
      "The same authenticated action remains approved without re-execution.";
    second.reversibility.rollbackRef =
      "git://revert/receipt.review.approved.v2";
    second.reversibility.deadline = "2026-09-21T13:03:00.000Z";
    harness.tribunalCase.decisionReceipts.push(second);
    harness.tribunalCase.effectiveDecisionReceiptId = second.id;
    sealHarness(harness);

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues).toEqual([]);
    expect(result.commitTransition?.effect).toBeNull();
    expect(result.commitTransition?.stateWrites.receiptAppends).toEqual([
      {
        key: second.id,
        expectedDigest: null,
        nextDigest: second.contentDigest,
        receipt: second,
      },
    ]);
    expect(
      result.commitTransition?.stateWrites.receiptAppends[0].receipt,
    ).not.toBe(second);
    expect(
      verifyTribunalCommitPreconditions(
        result.commitTransition,
        result.commitTransition!.transitionDigest,
        {
          now: NOW,
          resolvePolicyState: () => ({ version: "tribunal-policy.v1" }),
          resolveGrantState: () => ({
            state: "active",
            version: "grant-lifecycle.v1",
          }),
        },
      ),
    ).toBe(true);

    const absentState = makeHarness();
    absentState.context.appliedEffectDigests = undefined;
    expectCodes(absentState, ["EFFECT_IDEMPOTENCY_CHECK_REQUIRED"]);

    const mismatchedState = makeHarness();
    mismatchedState.context.appliedEffectDigests = new Map([
      [appliedWrite.key, PLACEHOLDER_DIGEST],
    ]);
    expectCodes(mismatchedState, ["EFFECT_IDEMPOTENCY_STATE_MISMATCH"]);
  });

  it("rejects a broken receipt-history link", () => {
    const chained = makeHarness();
    const first = chained.tribunalCase.decisionReceipts[0];
    chained.context.consumedReceiptDigests?.set(
      computeDecisionReceiptReplayKey(first),
      first.contentDigest,
    );
    const second = structuredClone(first);
    second.id = "receipt.review.v2";
    second.nonce = "receipt-nonce-0002";
    second.issuedAt = "2026-08-21T13:03:00.000Z";
    second.decision.decidedAt = second.issuedAt;
    second.reversibility.rollbackRef = "git://revert/receipt.review.v2";
    chained.tribunalCase.decisionReceipts.push(second);
    chained.tribunalCase.effectiveDecisionReceiptId = second.id;
    sealHarness(chained);

    second.previousReceiptDigest = PLACEHOLDER_DIGEST;
    second.contentDigest = computeDecisionReceiptContentDigest(second);
    chained.decisionAttestations.set(
      second.id,
      computeTestReceiptAttestation(second.contentDigest),
    );
    expectCodes(chained, ["RECEIPT_CHAIN_MISMATCH"]);
  });

  it("uses the human, case, and nonce replay identity rather than receipt ID", () => {
    const harness = makeHarness();
    const receipt = harness.tribunalCase.decisionReceipts[0];
    harness.context.consumedReceiptDigests?.set(
      computeDecisionReceiptReplayKey(receipt),
      receipt.contentDigest,
    );
    receipt.id = "receipt.rewrapped.v1";
    harness.tribunalCase.effectiveDecisionReceiptId = receipt.id;
    sealCase(harness.tribunalCase);

    expectCodes(harness, ["DECISION_RECEIPT_TAMPERED"]);
  });

  it("rejects duplicate receipt nonces inside one case", () => {
    const harness = makeHarness();
    const duplicate = structuredClone(harness.tribunalCase.decisionReceipts[0]);
    duplicate.id = "receipt.review.v2";
    duplicate.issuedAt = "2026-08-21T13:03:00.000Z";
    duplicate.decision.decidedAt = duplicate.issuedAt;
    harness.tribunalCase.decisionReceipts.push(duplicate);
    harness.tribunalCase.effectiveDecisionReceiptId = duplicate.id;
    sealCase(harness.tribunalCase);

    expectCodes(harness, ["DUPLICATE_RECEIPT_NONCE"]);
  });

  it("selects the latest receipt as the only effective human decision", () => {
    const harness = makeHarness();
    const approved = harness.tribunalCase.decisionReceipts[0];
    const rejected = structuredClone(approved);
    rejected.id = "receipt.review.v2";
    rejected.nonce = "receipt-nonce-0002";
    rejected.issuedAt = "2026-08-21T13:03:00.000Z";
    rejected.decision.decidedAt = rejected.issuedAt;
    rejected.decision.decision = "rejected";
    harness.tribunalCase.decisionReceipts.push(rejected);
    (
      harness.tribunalCase as TribunalCase & {
        effectiveDecisionReceiptId?: string;
      }
    ).effectiveDecisionReceiptId = rejected.id;
    sealCase(harness.tribunalCase);

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues).toEqual([]);
    expect(result.commitTransition?.effect).toBeNull();

    (
      harness.tribunalCase as TribunalCase & {
        effectiveDecisionReceiptId?: string;
      }
    ).effectiveDecisionReceiptId = approved.id;
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["EFFECTIVE_RECEIPT_MISMATCH"]);
  });

  it.each(["rollbackRef", "deadline"] as const)(
    "requires reversible receipt %s data in the strict schema",
    (field) => {
      const harness = makeHarness();
      delete harness.tribunalCase.decisionReceipts[0].reversibility[field];
      harness.tribunalCase.decisionReceipts[0].contentDigest =
        computeDecisionReceiptContentDigest(
          harness.tribunalCase.decisionReceipts[0],
        );
      attestReceipts(harness);
      expectCodes(harness, ["PROTOCOL_SCHEMA_INVALID"]);
    },
  );

  it("forbids rollback data on an irreversible receipt", () => {
    const harness = makeHarness();
    harness.tribunalCase.decisionReceipts[0].reversibility = {
      kind: "irreversible",
      rollbackRef: "git://revert/forbidden",
      deadline: "2026-08-21T14:00:00.000Z",
    } as never;
    expectCodes(harness, ["PROTOCOL_SCHEMA_INVALID"]);
  });

  it("rejects an oversized rollback locator without throwing in transition construction", () => {
    const harness = makeHarness();
    harness.tribunalCase.decisionReceipts[0].reversibility.rollbackRef =
      "r".repeat(TRIBUNAL_LIMITS.locatorChars + 1);
    sealHarness(harness);

    expect(() =>
      validateTribunalCase(harness.tribunalCase, harness.context),
    ).not.toThrow();
    expectCodes(harness, ["PROTOCOL_SCHEMA_INVALID"]);
  });

  it("records a negative irreversible receipt without rollback machinery", () => {
    const harness = makeHarness();
    const receipt = harness.tribunalCase.decisionReceipts[0];
    receipt.decision.decision = "rejected";
    receipt.reversibility = { kind: "irreversible" };
    sealHarness(harness);

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues).toEqual([]);
    expect(result.commitTransition?.effect).toBeNull();
  });

  it("does not authorize after the effective rollback window expires", () => {
    const harness = makeHarness();
    harness.tribunalCase.decisionReceipts[0].reversibility.deadline =
      "2026-08-21T13:04:59.999Z";
    harness.tribunalCase.decisionReceipts[0].contentDigest =
      computeDecisionReceiptContentDigest(
        harness.tribunalCase.decisionReceipts[0],
      );
    attestReceipts(harness);

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues.map(({ code }) => code)).toContain(
      "EFFECTIVE_ROLLBACK_WINDOW_EXPIRED",
    );
    expect(result.commitTransition).toBeNull();
  });

  it("enforces temporal ordering with the injected clock", () => {
    const harness = makeHarness();
    harness.tribunalCase.decisionReceipts[0].issuedAt =
      "2026-08-21T12:59:59.999Z";
    harness.tribunalCase.decisionReceipts[0].decision.decidedAt =
      "2026-08-21T12:59:59.999Z";
    harness.tribunalCase.decisionReceipts[0].contentDigest =
      computeDecisionReceiptContentDigest(
        harness.tribunalCase.decisionReceipts[0],
      );
    attestReceipts(harness);
    expectCodes(harness, ["TEMPORAL_ORDER_INVALID"]);
  });

  it("fails closed when grant lifecycle state is absent or inactive", () => {
    const absent = makeHarness();
    absent.context.resolveGrantState = undefined;
    expectCodes(absent, ["AUTHORITY_LIFECYCLE_UNVERIFIED"]);

    const revoked = makeHarness();
    revoked.context.resolveGrantState = () => ({
      state: "revoked",
      version: "grant-lifecycle.v2",
    });
    expectCodes(revoked, ["AUTHORITY_GRANT_INACTIVE"]);

    const result = validateTribunalCase(revoked.tribunalCase, revoked.context);
    expect(result.verifiedAuthorityGrants).toEqual([]);
    expect(result.evaluatorEffectWithinGrant).toEqual({
      "verdict.recommend.v1": false,
    });
    expect(result.commitTransition).toBeNull();
  });

  it("requires a synchronous versioned trust-policy snapshot", () => {
    const missing = makeHarness();
    missing.context.resolvePolicyState = undefined;
    expectCodes(missing, ["POLICY_STATE_UNVERIFIED"]);

    for (const value of [
      Promise.resolve({ version: "tribunal-policy.v1" }),
      { version: "tribunal-policy.v1", unboundTrust: true },
      { version: undefined },
    ]) {
      const malformed = makeHarness();
      malformed.context.resolvePolicyState = () => value;
      expect(() => validationCodes(malformed)).not.toThrow();
      expectCodes(malformed, ["POLICY_STATE_UNVERIFIED"]);
    }
  });

  it("binds activation to current policy, lifecycle versions, expiry, and exact bytes", () => {
    const harness = makeHarness();
    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    const transition = result.commitTransition;
    expect(transition?.effect).not.toBeNull();
    if (!transition?.effect) throw new Error("Expected executable transition.");
    const grant = harness.tribunalCase.authorityGrants[0];
    expect(transition.effect.preconditions.grantLifecycles).toEqual([
      {
        grant: {
          issuer: grant.issuer,
          grantId: grant.grantId,
          grantDigest: computeAuthorityGrantDigest(grant),
          nonce: grant.nonce,
        },
        signingKey: {
          issuer: grant.issuer,
          keyId: "test-authority.2026-08",
        },
        expectedState: "active",
        expectedVersion: "grant-lifecycle.v1",
      },
    ]);

    const check = (
      now: Date,
      policyVersion = "tribunal-policy.v1",
      state = "active" as "active" | "revoked",
      lifecycleVersion = "grant-lifecycle.v1",
    ) =>
      verifyTribunalCommitPreconditions(
        transition,
        transition.transitionDigest,
        {
          now,
          resolvePolicyState: () => ({ version: policyVersion }),
          resolveGrantState: () => ({ state, version: lifecycleVersion }),
        },
      );
    expect(check(NOW)).toBe(true);
    expect(check(NOW, "tribunal-policy.v2")).toBe(false);
    expect(check(NOW, "tribunal-policy.v1", "revoked")).toBe(false);
    expect(
      check(NOW, "tribunal-policy.v1", "active", "grant-lifecycle.v2"),
    ).toBe(false);
    expect(
      new Date(transition.effect.preconditions.executeBefore).getTime(),
    ).toBe(new Date(transition.effect.validUntil).getTime());
    expect(check(new Date(transition.effect.preconditions.executeBefore))).toBe(
      false,
    );

    const tampered = structuredClone(transition);
    tampered.effect!.selectedCandidate.bytes =
      Buffer.from("tampered candidate").toString("base64");
    expect(
      verifyTribunalCommitPreconditions(tampered, transition.transitionDigest, {
        now: NOW,
        resolvePolicyState: () => ({ version: "tribunal-policy.v1" }),
        resolveGrantState: () => ({
          state: "active",
          version: "grant-lifecycle.v1",
        }),
      }),
    ).toBe(false);

    const tamperers: Array<
      (candidate: NonNullable<typeof transition>) => void
    > = [
      (candidate) => {
        candidate.caseId = "case.tampered.v1";
      },
      (candidate) => {
        candidate.stateWrites.receiptHead.nextHead = null;
      },
      (candidate) => {
        candidate.stateWrites.replayWrites[0].key = PLACEHOLDER_DIGEST;
      },
      (candidate) => {
        candidate.effect!.actionDigest = PLACEHOLDER_DIGEST;
      },
      (candidate) => {
        candidate.effect!.proposedEffect = "publish";
      },
      (candidate) => {
        candidate.effect!.destinationId = "destination.tampered";
      },
      (candidate) => {
        candidate.effect!.validUntil = "2026-08-21T13:30:00.000Z";
      },
      (candidate) => {
        candidate.effect!.idempotencyWrite.nextDigest = PLACEHOLDER_DIGEST;
      },
      (candidate) => {
        candidate.effect!.decisionReceipt!.contentDigest = PLACEHOLDER_DIGEST;
      },
      (candidate) => {
        candidate.transitionDigest = PLACEHOLDER_DIGEST;
      },
    ];
    for (const tamper of tamperers) {
      const candidate = structuredClone(transition);
      tamper(candidate);
      expect(
        verifyTribunalCommitPreconditions(
          candidate,
          transition.transitionDigest,
          {
            now: NOW,
            resolvePolicyState: () => ({ version: "tribunal-policy.v1" }),
            resolveGrantState: () => ({
              state: "active",
              version: "grant-lifecycle.v1",
            }),
          },
        ),
      ).toBe(false);
    }

    const internallyRehashed = (
      candidate: NonNullable<typeof transition>,
    ): string => {
      const basis = {
        caseId: candidate.caseId,
        preconditions: candidate.preconditions,
        stateWrites: candidate.stateWrites,
        effect: candidate.effect,
      };
      const digest = computeTribunalCommitTransitionDigest(basis);
      candidate.transitionDigest = digest;
      return digest;
    };
    const impossibleReceipt = structuredClone(transition);
    impossibleReceipt.effect!.decisionReceipt!.reversibilityKind =
      "irreversible";
    expect(
      verifyTribunalCommitPreconditions(
        impossibleReceipt,
        internallyRehashed(impossibleReceipt),
        {
          now: NOW,
          resolvePolicyState: () => ({ version: "tribunal-policy.v1" }),
          resolveGrantState: () => ({
            state: "active",
            version: "grant-lifecycle.v1",
          }),
        },
      ),
    ).toBe(false);

    const mismatchedSigningIssuer = structuredClone(transition);
    mismatchedSigningIssuer.effect!.preconditions.grantLifecycles[0].signingKey.issuer =
      "authority:other";
    expect(
      verifyTribunalCommitPreconditions(
        mismatchedSigningIssuer,
        internallyRehashed(mismatchedSigningIssuer),
        {
          now: NOW,
          resolvePolicyState: () => ({ version: "tribunal-policy.v1" }),
          resolveGrantState: () => ({
            state: "active",
            version: "grant-lifecycle.v1",
          }),
        },
      ),
    ).toBe(false);
  });

  it("loads the expected transition digest from trusted job state", () => {
    const harness = makeHarness();
    const transition = validateTribunalCase(
      harness.tribunalCase,
      harness.context,
    ).commitTransition;
    if (!transition?.effect) throw new Error("Expected executable transition.");
    const jobId = "tribunal-job.v1";
    const trustedJobDigests = new Map([[jobId, transition.transitionDigest]]);
    const submitted = structuredClone(transition);
    submitted.effect!.destinationId = "destination.attacker";
    const submittedBasis = {
      caseId: submitted.caseId,
      preconditions: submitted.preconditions,
      stateWrites: submitted.stateWrites,
      effect: submitted.effect,
    };
    submitted.transitionDigest =
      computeTribunalCommitTransitionDigest(submittedBasis);
    const trustedExpectedDigest = trustedJobDigests.get(jobId);
    if (!trustedExpectedDigest) throw new Error("Missing trusted job digest.");

    expect(
      verifyTribunalCommitPreconditions(submitted, trustedExpectedDigest, {
        now: NOW,
        resolvePolicyState: () => ({ version: "tribunal-policy.v1" }),
        resolveGrantState: () => ({
          state: "active",
          version: "grant-lifecycle.v1",
        }),
      }),
    ).toBe(false);
  });

  it("keys grant lifecycle state by issuer, digest, and nonce", () => {
    const stale = makeHarness();
    const oldGrant = stale.tribunalCase.authorityGrants[0];
    const replacement = {
      ...structuredClone(oldGrant),
      nonce: "grant-nonce-replacement-v2",
    };
    const replacementDigest = computeAuthorityGrantDigest(replacement);
    const seen: Array<{
      issuer: string;
      grantId: string;
      grantDigest: string;
      nonce: string;
    }> = [];
    stale.context.resolveGrantState = (reference) => {
      seen.push(reference);
      return reference.grantDigest === replacementDigest &&
        reference.nonce === replacement.nonce
        ? { state: "active", version: "grant-lifecycle.v2" }
        : { state: "superseded", version: "grant-lifecycle.v2" };
    };
    expectCodes(stale, ["AUTHORITY_GRANT_INACTIVE"]);
    expect(seen[0]).toEqual({
      issuer: oldGrant.issuer,
      grantId: oldGrant.grantId,
      grantDigest: computeAuthorityGrantDigest(oldGrant),
      nonce: oldGrant.nonce,
    });

    resignGrant(stale, replacement);
    stale.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      replacementDigest;
    stale.tribunalCase.verdicts[0].authorityBasis.grantDigest =
      replacementDigest;
    stale.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      replacementDigest;
    sealCase(stale.tribunalCase);
    expectCodes(stale, []);
  });

  it("does not allow a grant to authorize an earlier verdict", () => {
    const harness = makeHarness();
    const grant = {
      ...structuredClone(harness.tribunalCase.authorityGrants[0]),
      issuedAt: "2026-08-21T13:01:00.000Z",
    };
    resignGrant(harness, grant);
    const grantDigest = computeAuthorityGrantDigest(grant);
    harness.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      grantDigest;
    harness.tribunalCase.verdicts[0].authorityBasis.grantDigest = grantDigest;
    harness.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      grantDigest;
    sealCase(harness.tribunalCase);

    expectCodes(harness, ["AUTHORITY_GRANT_NOT_YET_VALID"]);
  });

  it("contains throwing or prototype-inherited authority infrastructure", () => {
    const throwing = makeHarness();
    throwing.context.verifyGrant = () => {
      throw new Error("verifier unavailable");
    };
    expect(() => validationCodes(throwing)).not.toThrow();
    expectCodes(throwing, ["AUTHORITY_VERIFIER_UNAVAILABLE"]);

    const lifecycle = makeHarness();
    lifecycle.context.resolveGrantState = () => {
      throw new Error("lifecycle unavailable");
    };
    expect(() => validationCodes(lifecycle)).not.toThrow();
    expectCodes(lifecycle, ["AUTHORITY_LIFECYCLE_UNVERIFIED"]);

    const inherited = makeHarness();
    inherited.context.authorityTokensByGrantId = Object.create(
      inherited.context.authorityTokensByGrantId,
    ) as Record<string, string>;
    expectCodes(inherited, ["AUTHORITY_TOKEN_MISSING"]);

    const revokedStore = makeHarness();
    const revoked = Proxy.revocable(
      revokedStore.context.authorityTokensByGrantId,
      {},
    );
    revoked.revoke();
    revokedStore.context.authorityTokensByGrantId = revoked.proxy;
    expect(() => validationCodes(revokedStore)).not.toThrow();
    expectCodes(revokedStore, ["AUTHORITY_TOKEN_MISSING"]);

    const accessorStore = makeHarness();
    let tokenGetterCalled = false;
    accessorStore.context.authorityTokensByGrantId = Object.defineProperty(
      {},
      "grant.evaluator.v1",
      {
        enumerable: true,
        get() {
          tokenGetterCalled = true;
          return "hostile-token";
        },
      },
    ) as Record<string, string>;
    expectCodes(accessorStore, ["AUTHORITY_TOKEN_MISSING"]);
    expect(tokenGetterCalled).toBe(false);

    const throwingShape = Object.defineProperty({}, "authorized", {
      get() {
        throw new Error("hostile verifier result");
      },
    });
    const malformedDecisions: unknown[] = [
      Promise.resolve({ authorized: true }),
      {
        authorized: false,
        never: "never.capability_implies_authority",
        reason: "unknown_reason",
      },
      { authorized: true },
      throwingShape,
    ];
    for (const malformedDecision of malformedDecisions) {
      const malformed = makeHarness();
      malformed.context.verifyGrant = (() =>
        malformedDecision) as unknown as TribunalValidationContext["verifyGrant"];
      expect(() => validationCodes(malformed)).not.toThrow();
      expectCodes(malformed, ["AUTHORITY_VERIFIER_UNAVAILABLE"]);
    }
  });

  it("snapshots the validation clock before calling authority ports", () => {
    const harness = makeHarness();
    const originalNow = harness.context.now.getTime();
    harness.context.verifyGrant = (input) => {
      const decision = verifyAuthorityGrant(input);
      input.now?.setTime(0);
      return decision;
    };

    const result = validateTribunalCase(harness.tribunalCase, harness.context);

    expect(result.issues).toEqual([]);
    expect(result.verifiedAuthorityGrants[0]?.verifiedAt).toBe(
      NOW.toISOString(),
    );
    expect(harness.context.now.getTime()).toBe(originalNow);

    const crossRealm = makeHarness();
    crossRealm.context.now = runInNewContext(
      `new Date(${JSON.stringify(NOW.toISOString())})`,
    ) as Date;
    expectCodes(crossRealm, []);
  });

  it("rejects oversized authority tokens before invoking the verifier", () => {
    const harness = makeHarness();
    harness.context.authorityTokensByGrantId["grant.evaluator.v1"] = "x".repeat(
      TRIBUNAL_LIMITS.authorityTokenChars + 1,
    );
    let verifierCalled = false;
    harness.context.verifyGrant = (input) => {
      verifierCalled = true;
      return verifyAuthorityGrant(input);
    };

    expectCodes(harness, ["AUTHORITY_TOKEN_TOO_LARGE"]);
    expect(verifierCalled).toBe(false);
  });

  it("rejects self-issued and untrusted grants", () => {
    const selfIssued = makeHarness();
    const grant = {
      ...structuredClone(selfIssued.tribunalCase.authorityGrants[0]),
      issuer: "evaluator.contract.v1",
    };
    selfIssued.context.trustedAuthorityIssuers.push("evaluator.contract.v1");
    resignGrant(selfIssued, grant);
    const digest = computeAuthorityGrantDigest(grant);
    selfIssued.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      digest;
    selfIssued.tribunalCase.verdicts[0].authorityBasis.grantDigest = digest;
    selfIssued.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      digest;
    sealCase(selfIssued.tribunalCase);
    expectCodes(selfIssued, ["GRANT_SELF_ISSUED"]);

    const untrusted = makeHarness();
    untrusted.principalAliases.set("system:unknown", "principal.unknown");
    const untrustedGrant = {
      ...structuredClone(untrusted.tribunalCase.authorityGrants[0]),
      issuer: "system:unknown",
    };
    resignGrant(untrusted, untrustedGrant);
    const untrustedDigest = computeAuthorityGrantDigest(untrustedGrant);
    untrusted.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      untrustedDigest;
    untrusted.tribunalCase.verdicts[0].authorityBasis.grantDigest =
      untrustedDigest;
    untrusted.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      untrustedDigest;
    sealCase(untrusted.tribunalCase);
    expectCodes(untrusted, ["AUTHORITY_GRANT_ISSUER_UNTRUSTED"]);

    const operatorIssued = makeHarness();
    const operatorGrant = {
      ...structuredClone(operatorIssued.tribunalCase.authorityGrants[0]),
      issuer:
        operatorIssued.tribunalCase.evaluatorDeclarations[0].independence
          .operatorId,
    };
    operatorIssued.context.trustedAuthorityIssuers.push(operatorGrant.issuer);
    resignGrant(operatorIssued, operatorGrant);
    const operatorDigest = computeAuthorityGrantDigest(operatorGrant);
    operatorIssued.tribunalCase.evaluatorDeclarations[0].authority.grantDigest =
      operatorDigest;
    operatorIssued.tribunalCase.verdicts[0].authorityBasis.grantDigest =
      operatorDigest;
    operatorIssued.tribunalCase.decisionReceipts[0].authorityGrantRefs[0].grantDigest =
      operatorDigest;
    sealCase(operatorIssued.tribunalCase);
    expectCodes(operatorIssued, ["GRANT_SELF_ISSUED"]);
  });

  it("detects declaration, evidence-set, evaluator-version, and subject hash drift", () => {
    const declaration = makeHarness();
    declaration.tribunalCase.evaluatorDeclarations[0].provenance.declarationDigest =
      PLACEHOLDER_DIGEST;
    declaration.tribunalCase.verdicts[0].provenance.declarationDigest =
      PLACEHOLDER_DIGEST;
    declaration.tribunalCase.verdicts[0].provenance.contentDigest =
      computeVerdictContentDigest(declaration.tribunalCase.verdicts[0]);
    expectCodes(declaration, ["DECLARATION_HASH_MISMATCH"]);

    const evidenceSet = makeHarness();
    evidenceSet.tribunalCase.verdicts[0].provenance.evidenceDigests = [];
    evidenceSet.tribunalCase.verdicts[0].provenance.contentDigest =
      computeVerdictContentDigest(evidenceSet.tribunalCase.verdicts[0]);
    sealCase({
      ...evidenceSet.tribunalCase,
      evaluatorDeclarations: [],
      evidenceClaims: [],
      decisionReceipts: [],
    } as TribunalCase);
    expectCodes(evidenceSet, ["EVIDENCE_HASH_SET_MISMATCH"]);

    const version = makeHarness();
    version.tribunalCase.verdicts[0].provenance.evaluatorVersion = "0.0.0";
    version.tribunalCase.verdicts[0].provenance.contentDigest =
      computeVerdictContentDigest(version.tribunalCase.verdicts[0]);
    expectCodes(version, ["EVALUATOR_VERSION_MISMATCH"]);

    const subject = makeHarness();
    subject.tribunalCase.verdicts[0].subjectDigest =
      digestCanonical("other-subject");
    subject.tribunalCase.verdicts[0].provenance.contentDigest =
      computeVerdictContentDigest(subject.tribunalCase.verdicts[0]);
    sealCase({
      ...subject.tribunalCase,
      verdicts: [],
      decisionReceipts: [],
    } as TribunalCase);
    expectCodes(subject, ["SUBJECT_REVISION_MISMATCH"]);
  });

  it("rejects credential-shaped material, including browser-exposed keys", () => {
    const harness = makeHarness();
    harness.tribunalCase.evidenceClaims[0].claim =
      "NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-not-a-real-secret";
    sealCase(harness.tribunalCase);
    expectCodes(harness, [
      "BROWSER_EXPOSED_SECRET_FORBIDDEN",
      "SECRET_MATERIAL_FORBIDDEN",
    ]);

    const resolved = makeHarness();
    const resolvedSecret =
      "NEXT_PUBLIC_EXPERIMENT_TOKEN=sk-proj-resolved-secret-material";
    resolved.tribunalCase.evidenceClaims[0].source.digest =
      digestEvidenceBytes(resolvedSecret);
    const baseResolver = resolved.context.resolveEvidence;
    resolved.context.resolveEvidence = (locator) =>
      locator === "fixture://tribunal/positive-basic"
        ? resolvedSecret
        : baseResolver(locator);
    sealHarness(resolved);
    const result = validateTribunalCase(
      resolved.tribunalCase,
      resolved.context,
    );
    expect(result.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "BROWSER_EXPOSED_SECRET_FORBIDDEN",
        "SECRET_MATERIAL_FORBIDDEN",
      ]),
    );
    expect(JSON.stringify(result.issues)).not.toContain(resolvedSecret);
  });

  it("rejects native authority tokens before invoking ports and redacts issue refs", () => {
    const harness = makeHarness();
    const token =
      harness.context.authorityTokensByGrantId["grant.evaluator.v1"];
    harness.tribunalCase.purpose = token;
    let resolverCalled = false;
    harness.context.resolveEvidence = () => {
      resolverCalled = true;
      return EVIDENCE_BYTES;
    };

    const result = validateTribunalCase(harness.tribunalCase, harness.context);
    expect(result.issues.map(({ code }) => code)).toContain(
      "SECRET_MATERIAL_FORBIDDEN",
    );
    expect(resolverCalled).toBe(false);
    expect(JSON.stringify(result.issues)).not.toContain(token);

    const rawRef = makeHarness();
    const secretLocator = `https://example.invalid/evidence?token=${token}`;
    rawRef.tribunalCase.evidenceClaims[0].source.locator = secretLocator;
    rawRef.context.resolveEvidence = () => undefined;
    sealCase(rawRef.tribunalCase);
    const rawRefResult = validateTribunalCase(
      rawRef.tribunalCase,
      rawRef.context,
    );
    expect(JSON.stringify(rawRefResult.issues)).not.toContain(secretLocator);
    expect(JSON.stringify(rawRefResult.issues)).not.toContain(token);
  });

  it("handles cyclic raw input without throwing", () => {
    const raw: Record<string, unknown> = { kind: "TribunalCase" };
    raw.self = raw;
    const harness = makeHarness();

    expect(() => validateTribunalCase(raw, harness.context)).not.toThrow();
    const result = validateTribunalCase(raw, harness.context);
    expect(result.issues.map(({ code }) => code)).toContain(
      "INPUT_GRAPH_UNSAFE",
    );
  });
});
