import { describe, expect, it } from "vitest";

import {
  deriveReleaseStatus,
  type DesignFinding,
} from "./contracts";

const finding = (
  overrides: Partial<DesignFinding> = {},
): DesignFinding => ({
  id: "finding.example",
  runId: "run.example",
  criterionId: "criterion.example",
  criticRole: "experience",
  verdict: "fail",
  severity: "minor",
  claim: "The example criterion fails.",
  evidence: [
    {
      kind: "code_reference",
      locator: "src/example.ts:1",
      summary: "The referenced implementation demonstrates the failure.",
    },
  ],
  remediation: "Repair the example criterion.",
  confidence: 0.9,
  blocksRelease: false,
  resolutionStatus: "open",
  createdAt: "2026-08-11T21:23:00.000Z",
  ...overrides,
});

describe("deriveReleaseStatus", () => {
  it("1. passes when no actionable findings or approval remain", () => {
    expect(deriveReleaseStatus({ findings: [] })).toBe("pass");
  });

  it("2. fails on an open blocker", () => {
    expect(
      deriveReleaseStatus({
        findings: [finding({ severity: "blocker", blocksRelease: true })],
      }),
    ).toBe("fail");
  });

  it("3. fails when a major finding explicitly blocks release", () => {
    expect(
      deriveReleaseStatus({
        findings: [finding({ severity: "major", blocksRelease: true })],
      }),
    ).toBe("fail");
  });

  it("4. stays unresolved when blocking evidence is unresolved", () => {
    expect(
      deriveReleaseStatus({
        findings: [
          finding({
            verdict: "unresolved",
            severity: "blocker",
            blocksRelease: true,
          }),
        ],
      }),
    ).toBe("unresolved");
  });

  it("5. reports budget exhaustion before pretending a safe decision", () => {
    expect(
      deriveReleaseStatus({
        findings: [finding()],
        budgetExhausted: true,
      }),
    ).toBe("budget_exhausted");
  });

  it("6. requires human authority after technical gates pass", () => {
    expect(
      deriveReleaseStatus({
        findings: [],
        humanApprovalRequired: true,
      }),
    ).toBe("human_required");
  });

  it("7. passes after the required human approval is present", () => {
    expect(
      deriveReleaseStatus({
        findings: [],
        humanApprovalRequired: true,
        humanApproved: true,
      }),
    ).toBe("pass");
  });

  it("8. allows named non-blocking debt without calling it clean", () => {
    expect(deriveReleaseStatus({ findings: [finding()] })).toBe(
      "pass_with_debt",
    );
  });

  it("9. preserves a waived blocker without blocking the current release", () => {
    expect(
      deriveReleaseStatus({
        findings: [
          finding({
            severity: "blocker",
            blocksRelease: true,
            resolutionStatus: "waived",
          }),
        ],
      }),
    ).toBe("pass");
  });

  it("10. ignores an evidenced false alarm while retaining history", () => {
    expect(
      deriveReleaseStatus({
        findings: [
          finding({
            severity: "blocker",
            blocksRelease: true,
            resolutionStatus: "false_alarm",
          }),
        ],
      }),
    ).toBe("pass");
  });

  it("11. does not turn verified passing evidence into debt", () => {
    expect(
      deriveReleaseStatus({
        findings: [
          finding({
            verdict: "pass",
            severity: "note",
            remediation: null,
            resolutionStatus: "verified",
          }),
        ],
      }),
    ).toBe("pass");
  });
});
