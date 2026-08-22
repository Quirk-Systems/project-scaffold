import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  issueAuthorityGrant,
  verifyAuthorityGrant,
  type AuthorityGrant,
} from "../governance/authority";
import {
  TRIBUNAL_EVALUATE_SCOPE,
  TRIBUNAL_LIMITS,
  computeAuthorityGrantDigest,
  computeDecisionReceiptContentDigest,
  computeDecisionReceiptReplayKey,
  computeDeclarationDigest,
  computeEvidenceClaimContentDigest,
  computeTribunalCaseDigest,
  computeVerdictContentDigest,
  digestCanonical,
  digestEvidenceBytes,
  tribunalActionScope,
  tribunalAudienceScope,
  tribunalCaseSubject,
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
  type TribunalCase,
  type TribunalValidationContext,
} from "./protocol";

const SECRET = "tribunal-test-secret-that-is-long-enough";
const RECEIPT_ATTESTATION_SECRET =
  "tribunal-receipt-attestation-secret-that-is-long-enough";
const NOW = new Date("2026-08-21T13:05:00.000Z");
const EVALUATED_AT = "2026-08-21T13:00:00.000Z";
const PLACEHOLDER_DIGEST = `sha256:${"0".repeat(64)}`;
const EVIDENCE_BYTES = "observable fixture bytes";
const CALIBRATION_BYTES = "calibration fixture bytes";

type MutableContext = TribunalValidationContext & {
  authorityTokensByGrantId: Record<string, string>;
  trustedAuthorityIssuers: string[];
  trustedHumanAuthorities: string[];
  consumedReceiptDigests?: Map<string, string>;
  verifyDecisionReceipt?: TribunalValidationContext["verifyDecisionReceipt"];
};

type Harness = {
  tribunalCase: TribunalCase;
  context: MutableContext;
  decisionAttestations: Map<string, string>;
};

const decisionAttestationsByCase = new WeakMap<
  TribunalCase,
  Map<string, string>
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
) {
  return [
    TRIBUNAL_EVALUATE_SCOPE,
    tribunalEvaluatorScope(evaluatorId),
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
    SECRET,
  );
}

function makeHarness(): Harness {
  const subjectDigest = digestCanonical("artifact:v7");
  const actionDigest = digestCanonical({
    action: "recommend-review",
    subjectDigest,
  });
  const sourceDigest = digestEvidenceBytes(EVIDENCE_BYTES);

  const tribunalCase = {
    kind: "TribunalCase",
    protocolVersion: "1.0.0",
    caseId: "case.design.review.v1",
    purpose:
      "Evaluate a design artifact without transferring decision authority.",
    requesterId: "requester.product.v1",
    humanAuthorityId: "human:bryan",
    trajectoryId: "trajectory.release.v1",
    openedAt: "2026-08-21T12:30:00.000Z",
    evaluatedAt: EVALUATED_AT,
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
    authorityGrants: [] as AuthorityGrant[],
    evaluatorDeclarations: [
      {
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
          deniedSourceLocatorPrefixes: ["secret://", "env://"],
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
          holdoutDigest: digestCanonical("tribunal-holdout-v1"),
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
        claimId: "claim.contract-valid",
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
        inspectionMethod: "vitest fixture execution",
        observedAt: "2026-08-21T12:45:00.000Z",
        validUntil: "2026-08-22T12:45:00.000Z",
        confidence: 0.9,
        limitations: ["Does not prove subjective design quality."],
        retentionClass: "project",
        derivedFromEvidenceClaimIds: [],
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
        claimId: "claim.contract-valid",
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
  sealCase(tribunalCase);

  const decisionAttestations = new Map<string, string>();
  const harness: Harness = {
    tribunalCase,
    context: {
      now: NOW,
      authoritySecret: SECRET,
      authorityTokensByGrantId: {
        [grant.grantId]: issueAuthorityGrant(grant, SECRET),
      },
      verifyGrant: verifyAuthorityGrant,
      resolveGrantState: () => "active",
      resolveEvidence: (locator) =>
        locator === "fixture://tribunal/positive-basic"
          ? EVIDENCE_BYTES
          : locator === "fixture://tribunal/calibration-v1"
            ? CALIBRATION_BYTES
          : undefined,
      trustedAuthorityIssuers: ["human:bryan"],
      trustedHumanAuthorities: ["human:bryan"],
      consumedReceiptDigests: new Map(),
      verifyDecisionReceipt: ({ receipt }) =>
        decisionAttestations.get(receipt.id) ===
        computeTestReceiptAttestation(receipt.contentDigest),
    },
    decisionAttestations,
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
      expect(result.verifiedAuthorityGrants).toHaveLength(1);
      expect(result.authorityEffectPermittedByVerdict).toEqual({
        "verdict.recommend.v1": true,
      });
      expect(
        (result as typeof result & { caseEffectAuthorized?: boolean })
          .caseEffectAuthorized,
      ).toBe(true);
      expect(result.receiptReplayKeysToConsume).toEqual([
        computeDecisionReceiptReplayKey(
          harness.tribunalCase.decisionReceipts[0],
        ),
      ]);
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
  });

  it("normalizes equivalent string and binary evidence as the same bytes", () => {
    const expected = digestEvidenceBytes(EVIDENCE_BYTES);
    expect(digestEvidenceBytes(Buffer.from(EVIDENCE_BYTES, "utf8"))).toBe(
      expected,
    );

    const stringResolver = makeHarness();
    expectCodes(stringResolver, []);

    const binaryResolver = makeHarness();
    binaryResolver.context.resolveEvidence = () =>
      Buffer.from(EVIDENCE_BYTES, "utf8");
    expectCodes(binaryResolver, []);
  });

  it("executes the checked-in canonical fixture through the runtime validator", () => {
    const fixture = JSON.parse(
      readFileSync("fixtures/tribunal/protocol.v1.fixture.json", "utf8"),
    ) as { tribunalCase: TribunalCase; evidence: Record<string, string> };
    const tokenById = Object.fromEntries(
      fixture.tribunalCase.authorityGrants.map((grant) => [
        grant.grantId,
        issueAuthorityGrant(grant, SECRET),
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
      authoritySecret: SECRET,
      authorityTokensByGrantId: tokenById,
      verifyGrant: verifyAuthorityGrant,
      resolveGrantState: () => "active",
      resolveEvidence: (locator) => fixture.evidence[locator],
      trustedAuthorityIssuers: ["human:bryan"],
      trustedHumanAuthorities: ["human:bryan"],
      consumedReceiptDigests: new Map(),
      verifyDecisionReceipt: ({ receipt }) =>
        fixtureAttestations.get(receipt.id) ===
        computeTestReceiptAttestation(receipt.contentDigest),
    };
    const result = validateTribunalCase(fixture.tribunalCase, fixtureContext);

    expect(result.issues).toEqual([]);
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
    expectCodes(harness, ["UNKNOWN_EVALUATOR_DECLARATION_REF"]);
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
    expectCodes(harness, ["VERDICT_GRANT_BINDING_MISMATCH"]);
  });

  it.each([
    ["realm", "realm.other", "SUBJECT_REALM_OUT_OF_SCOPE"],
    ["id", "artifact.other.v7", "SUBJECT_ID_OUT_OF_SCOPE"],
    ["targetClass", "document", "SUBJECT_TARGET_CLASS_OUT_OF_SCOPE"],
  ] as const)("checks the signed subject %s axis", (field, value, code) => {
    const harness = makeHarness();
    harness.tribunalCase.subject[field] = value;
    sealCase(harness.tribunalCase);
    expectCodes(harness, [code]);
  });

  it("checks signed agentic purpose scope", () => {
    const harness = makeHarness();
    harness.tribunalCase.operatingScope.purposeId = "purpose.other";
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["PURPOSE_OUT_OF_SCOPE"]);
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
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["DECLARATION_EFFECT_EXCEEDS_GRANT"]);
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
    expectCodes(harness, ["EVIDENCE_REQUIRED"]);
  });

  it("rejects dangling evidence references without crashing", () => {
    const harness = makeHarness();
    harness.tribunalCase.verdicts[0].evidenceClaimIds = ["evidence.missing"];
    harness.tribunalCase.decisionReceipts[0].acceptedEvidenceClaimIds = [
      "evidence.missing",
    ];
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["UNKNOWN_EVIDENCE_CLAIM_REF"]);
  });

  it("binds consumed evidence to the verdict evaluator", () => {
    const harness = makeHarness();
    harness.tribunalCase.evidenceClaims[0].inspectedBy = "evaluator.other.v1";
    sealCase(harness.tribunalCase);
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
    expect(result.authorityEffectPermittedByVerdict).toEqual({
      "verdict.recommend.v1": false,
    });
    expect(result.caseEffectAuthorized).toBe(false);
  });

  it("requires evidence bytes to be resolvable and digest-matched", () => {
    const harness = makeHarness();
    harness.context.resolveEvidence = () => undefined;
    expectCodes(harness, ["EVIDENCE_SOURCE_UNRESOLVED"]);

    harness.context.resolveEvidence = () => "different bytes";
    expectCodes(harness, ["EVIDENCE_DIGEST_MISMATCH"]);
  });

  it("fails closed when evidence infrastructure throws", () => {
    const harness = makeHarness();
    harness.context.resolveEvidence = () => {
      throw new Error("adapter failure containing secret material");
    };

    expect(() => validationCodes(harness)).not.toThrow();
    expectCodes(harness, ["EVIDENCE_SOURCE_UNRESOLVED"]);
  });

  it("rejects missing and malformed evidence digests with exact codes", () => {
    const missing = makeHarness();
    delete missing.tribunalCase.evidenceClaims[0].source.digest;
    sealCase(missing.tribunalCase);
    expectCodes(missing, ["EVIDENCE_DIGEST_REQUIRED"]);

    const malformed = makeHarness();
    malformed.tribunalCase.evidenceClaims[0].source.digest = "sha256:redacted";
    sealCase(malformed.tribunalCase);
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
    sealCase(harness.tribunalCase);
    expectCodes(harness, [
      "EVIDENCE_CYCLE",
      "EVIDENCE_DIGEST_MISMATCH",
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
    derived.derivedFromEvidenceClaimIds = [source.id];
    harness.tribunalCase.evaluatorDeclarations[0].inspection.evidenceKinds.push(
      "evidence_claim",
    );
    harness.tribunalCase.evidenceClaims.push(derived);
    sealCase(harness.tribunalCase);
    expectCodes(harness, []);

    derived.source.digest = PLACEHOLDER_DIGEST;
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["EVIDENCE_DIGEST_MISMATCH"]);
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
    sealCase(harness.tribunalCase);

    expectCodes(harness, [
      "DECISION_RECEIPT_CANNOT_BE_PRIMARY_EVIDENCE",
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
    second.derivedFromEvidenceClaimIds = ["evidence.fixture.v1"];
    harness.tribunalCase.evidenceClaims[0].source = {
      kind: "evidence_claim",
      locator: second.id,
      summary: "Derived from the second claim.",
      digest: digestCanonical(second.id),
    };
    harness.tribunalCase.evidenceClaims[0].derivedFromEvidenceClaimIds = [
      second.id,
    ];
    harness.tribunalCase.evidenceClaims.push(second);
    harness.tribunalCase.evaluatorDeclarations[0].inspection.evidenceKinds.push(
      "evidence_claim",
    );
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["EVIDENCE_CYCLE", "EVIDENCE_DIGEST_MISMATCH"]);
  });

  it("binds verdict evidence to the same stable claim and trajectory", () => {
    const claim = makeHarness();
    claim.tribunalCase.evidenceClaims[0].claimId = "claim.unrelated";
    sealCase(claim.tribunalCase);
    expectCodes(claim, ["EVIDENCE_CLAIM_BINDING_MISMATCH"]);

    const trajectory = makeHarness();
    trajectory.tribunalCase.verdicts[0].provenance.trajectoryId =
      "trajectory.unrelated.v1";
    sealCase(trajectory.tribunalCase);
    expectCodes(trajectory, ["TRAJECTORY_MISMATCH"]);

    const criterion = makeHarness();
    criterion.tribunalCase.verdicts[0].criterionRef = "criterion.unrelated";
    sealHarness(criterion);
    expectCodes(criterion, ["UNKNOWN_CRITERION_REF"]);
  });

  it("enforces the evaluator's declared evidence cutoff", () => {
    const harness = makeHarness();
    harness.tribunalCase.evaluatorDeclarations[0].inspection.temporalBoundary =
      "2026-08-21T12:44:59.999Z";
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["EVIDENCE_AFTER_INSPECTION_BOUNDARY"]);
  });

  it("enforces structured source inspection policy with deny precedence", () => {
    const denied = makeHarness();
    denied.tribunalCase.evidenceClaims[0].source.locator =
      "secret://tribunal/positive-basic";
    denied.context.resolveEvidence = (locator) =>
      locator === "secret://tribunal/positive-basic"
        ? EVIDENCE_BYTES
        : locator === "fixture://tribunal/calibration-v1"
          ? CALIBRATION_BYTES
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
    sealCase(stale.tribunalCase);
    expectCodes(stale, ["CALIBRATION_STALE"]);

    const contaminated = makeHarness();
    contaminated.tribunalCase.evaluatorDeclarations[0].fallibility.holdoutDigest =
      contaminated.tribunalCase.subject.digest;
    sealCase(contaminated.tribunalCase);
    expectCodes(contaminated, ["CALIBRATION_HOLDOUT_CONTAMINATED"]);

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
        : undefined;
    expectCodes(unresolved, ["CALIBRATION_EVIDENCE_UNRESOLVED"]);

    const changed = makeHarness();
    changed.context.resolveEvidence = (locator) =>
      locator === "fixture://tribunal/positive-basic"
        ? EVIDENCE_BYTES
        : locator === "fixture://tribunal/calibration-v1"
          ? "different calibration bytes"
          : undefined;
    expectCodes(changed, ["CALIBRATION_EVIDENCE_DIGEST_MISMATCH"]);
  });

  it("rejects evaluator identities that only look independent", () => {
    const harness = makeHarness();
    const declaration = structuredClone(
      harness.tribunalCase.evaluatorDeclarations[0],
    );
    declaration.id = "evaluator.contract.v2";
    declaration.version = "2.0.0";
    declaration.authority.grantId = "grant.evaluator.v2";
    const grant = {
      ...structuredClone(harness.tribunalCase.authorityGrants[0]),
      grantId: "grant.evaluator.v2",
      scopes: grantScopes(harness.tribunalCase, declaration.id),
      nonce: "grant-nonce-0002",
    };
    declaration.authority.grantDigest = computeAuthorityGrantDigest(grant);
    harness.tribunalCase.evaluatorDeclarations.push(declaration);
    resignGrant(harness, grant);
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["EVALUATOR_INDEPENDENCE_COLLISION"]);
  });

  it("treats shared operators and model families as correlated", () => {
    const harness = makeHarness();
    const declaration = structuredClone(
      harness.tribunalCase.evaluatorDeclarations[0],
    );
    declaration.id = "evaluator.contract.v2";
    declaration.version = "2.0.0";
    declaration.independence.key = "independence.contract.v2";
    declaration.authority.grantId = "grant.evaluator.v2";
    const grant = {
      ...structuredClone(harness.tribunalCase.authorityGrants[0]),
      grantId: "grant.evaluator.v2",
      scopes: grantScopes(harness.tribunalCase, declaration.id),
      nonce: "grant-nonce-0002",
    };
    declaration.authority.grantDigest = computeAuthorityGrantDigest(grant);
    harness.tribunalCase.evaluatorDeclarations.push(declaration);
    resignGrant(harness, grant);
    sealCase(harness.tribunalCase);

    expectCodes(harness, ["EVALUATOR_INDEPENDENCE_COLLISION"]);
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
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["DISPUTED_VERDICTS_UNACKNOWLEDGED"]);
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
    sealCase(harness.tribunalCase);
    expectCodes(harness, [
      "DISPUTED_VERDICTS_UNACKNOWLEDGED",
      "RECEIPT_VERDICT_BINDING_MISMATCH",
    ]);
  });

  it("requires a human receipt for authority-bearing proposed effects", () => {
    const harness = makeHarness();
    harness.tribunalCase.proposedEffect = "publish";
    harness.tribunalCase.decisionReceipts = [];
    delete harness.tribunalCase.effectiveDecisionReceiptId;
    expectCodes(harness, ["DECISION_RECEIPT_REQUIRED"]);
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
    expect(
      (result as typeof result & { caseEffectAuthorized?: boolean })
        .caseEffectAuthorized,
    ).toBe(false);
  });

  it("binds a receipt to the exact human authority, case, evidence, grants, and effect", () => {
    const owner = makeHarness();
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

  it("appends an authenticated receipt without rewriting consumed history", () => {
    const harness = makeHarness();
    const first = harness.tribunalCase.decisionReceipts[0];
    first.reversibility.deadline = "2026-08-21T13:04:00.000Z";
    sealHarness(harness);
    const originalCaseDigest = computeTribunalCaseDigest(harness.tribunalCase);
    const originalReceiptDigest = first.contentDigest;
    const originalAttestation = harness.decisionAttestations.get(first.id);
    harness.context.consumedReceiptDigests?.set(
      computeDecisionReceiptReplayKey(first),
      first.contentDigest,
    );

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
    expect(result.caseEffectAuthorized).toBe(false);
    expect(result.receiptReplayKeysToConsume).toEqual([
      computeDecisionReceiptReplayKey(second),
    ]);

    harness.tribunalCase.decisionReceipts.reverse();
    expect(validateTribunalCase(harness.tribunalCase, harness.context).issues).toEqual(
      [],
    );
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
    expect(
      (result as typeof result & { caseEffectAuthorized?: boolean })
        .caseEffectAuthorized,
    ).toBe(false);

    (
      harness.tribunalCase as TribunalCase & {
        effectiveDecisionReceiptId?: string;
      }
    ).effectiveDecisionReceiptId = approved.id;
    sealCase(harness.tribunalCase);
    expectCodes(harness, ["EFFECTIVE_RECEIPT_MISMATCH"]);
  });

  it.each(["rollbackRef", "deadline"] as const)(
    "requires reversible receipt %s data",
    (field) => {
      const harness = makeHarness();
      delete harness.tribunalCase.decisionReceipts[0].reversibility[field];
      harness.tribunalCase.decisionReceipts[0].contentDigest =
        computeDecisionReceiptContentDigest(
          harness.tribunalCase.decisionReceipts[0],
        );
      attestReceipts(harness);
      expectCodes(harness, ["RECEIPT_ROLLBACK_REQUIRED"]);
    },
  );

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
    expect(result.caseEffectAuthorized).toBe(false);
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
    revoked.context.resolveGrantState = () => "revoked";
    expectCodes(revoked, ["AUTHORITY_GRANT_INACTIVE"]);

    const result = validateTribunalCase(revoked.tribunalCase, revoked.context);
    expect(result.verifiedAuthorityGrants).toEqual([]);
    expect(result.authorityEffectPermittedByVerdict).toEqual({
      "verdict.recommend.v1": false,
    });
    expect(
      (result as typeof result & { caseEffectAuthorized?: boolean })
        .caseEffectAuthorized,
    ).toBe(false);
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
