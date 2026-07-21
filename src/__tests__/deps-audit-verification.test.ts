import { describe, expect, it } from "vitest";
import {
  assessVerificationEvidence,
  type DependencyManifest,
} from "../../scripts/deps-audit-verification";

const validAudit = JSON.stringify({
  vite: [
    {
      id: 1,
      url: "https://github.com/advisories/GHSA-example",
      title: "example advisory",
      severity: "high",
      vulnerable_versions: "<6.4.3",
    },
  ],
});

const manifestBefore: DependencyManifest = {
  dependencies: {
    next: "^15.1.0",
    react: "^19.0.0",
  },
  devDependencies: {
    vitest: "~3.2.6",
  },
};

const safeManifestAfter: DependencyManifest = {
  dependencies: {
    next: "^15.5.0",
    react: "^19.2.0",
  },
  devDependencies: {
    vitest: "~3.2.7",
  },
};

describe("dependency verification evidence", () => {
  it.each([
    {
      name: "fails when the audit command fails",
      auditError: "spawn bun ENOENT",
      auditOutput: validAudit,
      manifestAfter: safeManifestAfter,
      expectedVerdict: "failed",
      expectedFailure: "audit command failed",
    },
    {
      name: "fails when audit output contains no JSON",
      auditError: null,
      auditOutput: "bun audit v1.3.14\n",
      manifestAfter: safeManifestAfter,
      expectedVerdict: "failed",
      expectedFailure: "audit produced no JSON object",
    },
    {
      name: "fails when an update crosses a major compatibility line",
      auditError: null,
      auditOutput: validAudit,
      manifestAfter: {
        ...safeManifestAfter,
        dependencies: {
          ...safeManifestAfter.dependencies,
          next: "^16.0.0",
        },
      },
      expectedVerdict: "failed",
      expectedFailure: "next crossed compatibility line",
    },
    {
      name: "fails when an update removes a direct dependency",
      auditError: null,
      auditOutput: validAudit,
      manifestAfter: {
        ...safeManifestAfter,
        dependencies: {
          next: "^15.5.0",
        },
      },
      expectedVerdict: "failed",
      expectedFailure: "react removed",
    },
    {
      name: "accepts parseable audit evidence and in-line updates",
      auditError: null,
      auditOutput: validAudit,
      manifestAfter: safeManifestAfter,
      expectedVerdict: "verified",
      expectedFailure: null,
    },
  ])("$name", (testCase) => {
    const result = assessVerificationEvidence({
      updateSucceeded: true,
      auditError: testCase.auditError,
      auditOutput: testCase.auditOutput,
      validatePassed: true,
      manifestBefore,
      manifestAfter: testCase.manifestAfter,
    });

    expect(result.verdict).toBe(testCase.expectedVerdict);
    if (testCase.expectedFailure) {
      expect(result.failures.join(" ")).toContain(testCase.expectedFailure);
    } else {
      expect(result.failures).toEqual([]);
    }
  });
});
