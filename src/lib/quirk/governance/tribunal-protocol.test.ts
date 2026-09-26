import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";
import {
  AuthorityGrantSchema,
  CONSTITUTIONAL_INVARIANTS,
  DecisionReceiptSchema,
  EvaluatorDeclarationSchema,
  EvidenceClaimSchema,
  TribunalVerdictSchema,
  validateDecisionReceipt,
  validateVerdictAgainstGrant,
} from "./tribunal-protocol";

const root = process.cwd();

type Fixture = {
  expected: { admissible: boolean; reason?: string };
  grant: unknown;
  declaration: unknown;
  evidence_claims: unknown;
  verdict: unknown;
  decision_receipt: unknown;
};

function readFixture(path: string): Fixture {
  return parseYaml(readFileSync(join(root, path), "utf8")) as Fixture;
}

function evaluateFixture(path: string) {
  const fixture = readFixture(path);
  const grant = AuthorityGrantSchema.parse(fixture.grant);
  const declaration = EvaluatorDeclarationSchema.parse(fixture.declaration);
  const evidence = EvidenceClaimSchema.array().parse(fixture.evidence_claims);
  const verdict = TribunalVerdictSchema.parse(fixture.verdict);
  const receipt = DecisionReceiptSchema.parse(fixture.decision_receipt);

  const verdictResult = validateVerdictAgainstGrant({
    grant,
    declaration,
    evidenceClaims: evidence,
    verdict,
  });

  const receiptResult = validateDecisionReceipt({
    receipt,
    verdict,
    grant,
    verdictAdmissible: verdictResult.ok,
  });

  return {
    expected: fixture.expected,
    admissible: verdictResult.ok && receiptResult.ok,
    reason: verdictResult.reason ?? receiptResult.reason,
  };
}

describe("tribunal protocol invariants", () => {
  it("ships all constitutional invariants", () => {
    expect(CONSTITUTIONAL_INVARIANTS).toEqual([
      "capability_implies_authority = false",
      "evaluation_implies_authority = false",
      "confidence_implies_authority = false",
      "consensus_implies_authority = false",
      "projection_implies_canon = false",
      "evaluator_self_escalation = false",
    ]);
  });

  it("accepts all positive fixtures", () => {
    const fixtures = readdirSync(join(root, "fixtures/tribunal/positive"))
      .filter((name) => name.endsWith(".yaml"))
      .map((name) => `fixtures/tribunal/positive/${name}`);

    for (const fixture of fixtures) {
      const result = evaluateFixture(fixture);
      expect(result.admissible, fixture).toBe(true);
      expect(result.expected.admissible, fixture).toBe(true);
    }
  });

  it("fails closed for all adversarial fixtures", () => {
    const fixtures = readdirSync(join(root, "fixtures/tribunal/adversarial"))
      .filter((name) => name.endsWith(".yaml"))
      .map((name) => `fixtures/tribunal/adversarial/${name}`);

    expect(fixtures.length).toBeGreaterThanOrEqual(11);

    for (const fixture of fixtures) {
      const result = evaluateFixture(fixture);
      expect(result.admissible, fixture).toBe(false);
      expect(result.expected.admissible, fixture).toBe(false);
      if (result.expected.reason) {
        expect(result.reason, fixture).toBe(result.expected.reason);
      }
    }
  });
});
