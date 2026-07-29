export type AuditAdvisory = {
  id: number;
  url: string;
  title: string;
  severity: "critical" | "high" | "moderate" | "low";
  vulnerable_versions: string;
};

export type AuditMap = Record<string, AuditAdvisory[]>;

export type DependencyManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type VerificationEvidence = {
  updateSucceeded: boolean;
  auditError: string | null;
  auditOutput: string;
  validatePassed: boolean;
  manifestBefore: DependencyManifest;
  manifestAfter: DependencyManifest;
};

export type VerificationAssessment = {
  verdict: "verified" | "failed";
  auditAfter: AuditMap | null;
  unexpectedManifestChanges: string[];
  failures: string[];
};

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

const SEVERITIES = new Set(["critical", "high", "moderate", "low"]);

// The ESC byte is what makes a sequence an ANSI code. Matching the bracket
// form alone would leave the ESC behind and would also eat literal text
// like "[32m" out of package names and advisory titles.
export function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

export function parseAuditOutput(
  output: string,
): { ok: true; audit: AuditMap } | { ok: false; error: string } {
  const clean = stripAnsi(output);
  const jsonStart = clean.indexOf("{");
  if (jsonStart === -1) {
    return { ok: false, error: "audit produced no JSON object" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean.slice(jsonStart));
  } catch (error) {
    return {
      ok: false,
      error: `audit JSON is not parseable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      error: "audit JSON must be a package-to-advisories object",
    };
  }

  for (const [dependency, advisories] of Object.entries(parsed)) {
    if (!Array.isArray(advisories)) {
      return {
        ok: false,
        error: `audit JSON entry for ${dependency} is not an advisory array`,
      };
    }

    for (const advisory of advisories) {
      if (advisory === null || typeof advisory !== "object") {
        return {
          ok: false,
          error: `audit JSON entry for ${dependency} contains a malformed advisory`,
        };
      }
      const candidate = advisory as Record<string, unknown>;
      if (
        typeof candidate.id !== "number" ||
        typeof candidate.url !== "string" ||
        typeof candidate.title !== "string" ||
        typeof candidate.severity !== "string" ||
        !SEVERITIES.has(candidate.severity) ||
        typeof candidate.vulnerable_versions !== "string"
      ) {
        return {
          ok: false,
          error: `audit JSON entry for ${dependency} contains a malformed advisory`,
        };
      }
    }
  }

  return { ok: true, audit: parsed as AuditMap };
}

function compatibilityLine(range: string): string | null {
  const match = range.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major === 0 ? `0.${minor}` : String(major);
}

export function findUnexpectedManifestChanges(
  before: DependencyManifest,
  after: DependencyManifest,
): string[] {
  const unexpected: string[] = [];

  for (const section of DEPENDENCY_SECTIONS) {
    const beforeEntries = before[section] ?? {};
    const afterEntries = after[section] ?? {};

    for (const [dependency, previousRange] of Object.entries(beforeEntries)) {
      const nextRange = afterEntries[dependency];
      if (nextRange === undefined) {
        unexpected.push(
          `${section}.${dependency} removed (was ${previousRange})`,
        );
        continue;
      }

      if (nextRange === previousRange) continue;

      const previousLine = compatibilityLine(previousRange);
      const nextLine = compatibilityLine(nextRange);
      if (
        previousLine === null ||
        nextLine === null ||
        previousLine !== nextLine
      ) {
        unexpected.push(
          `${section}.${dependency} crossed compatibility line: ${previousRange} -> ${nextRange}`,
        );
      }
    }

    for (const [dependency, nextRange] of Object.entries(afterEntries)) {
      if (beforeEntries[dependency] === undefined) {
        unexpected.push(`${section}.${dependency} added at ${nextRange}`);
      }
    }
  }

  return unexpected;
}

export function assessVerificationEvidence(
  evidence: VerificationEvidence,
): VerificationAssessment {
  const failures: string[] = [];
  let auditAfter: AuditMap | null = null;

  if (!evidence.updateSucceeded) {
    failures.push("bun update failed");
  }

  if (evidence.auditError) {
    failures.push(`audit command failed: ${evidence.auditError}`);
  } else {
    const parsed = parseAuditOutput(evidence.auditOutput);
    if (parsed.ok) {
      auditAfter = parsed.audit;
    } else {
      failures.push(parsed.error);
    }
  }

  const unexpectedManifestChanges = findUnexpectedManifestChanges(
    evidence.manifestBefore,
    evidence.manifestAfter,
  );
  if (unexpectedManifestChanges.length > 0) {
    failures.push(
      `dependency update escaped the patch/minor scope: ${unexpectedManifestChanges.join("; ")}`,
    );
  }

  if (!evidence.validatePassed) {
    failures.push("validate gate failed");
  }

  return {
    verdict: failures.length === 0 ? "verified" : "failed",
    auditAfter,
    unexpectedManifestChanges,
    failures,
  };
}
