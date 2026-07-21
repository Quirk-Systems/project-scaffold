/**
 * Dependency audit — the mechanical layer of the update routine.
 *
 * Usage:
 *   bun run deps:audit                      # markdown report to stdout
 *   bun run deps:audit -- --json <path>     # also write machine-readable JSON
 *   bun run deps:audit -- --verify          # apply `bun update` in a throwaway
 *                                           # git worktree, run the validate
 *                                           # gate + audit delta there, and
 *                                           # label cleared findings verified;
 *                                           # the working tree is never touched
 *
 * Scope: this repository — package.json + bun.lock (bun/npm ecosystem) and
 * .github/workflows/*.yml action pins. Docker/infrastructure manifests are
 * detected and reported when present. For the full intelligent audit
 * (CVE research, migration steps, grouped PRs, verification runs) use the
 * /deps-audit Claude command, which wraps this script.
 *
 * Escalation is policy-as-code: .github/deps-policy.json decides which
 * finding classes fail the process (exit 2, after the report is fully
 * written) so CI behavior is deterministic even when no agent runs.
 *
 * Priority order: critical/high CVE (production-path first) -> breaking
 * major -> minor -> patch. Findings use a stable per-item block so reports
 * diff cleanly week over week.
 */

import {
  readFileSync,
  readdirSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assessVerificationEvidence,
  parseAuditOutput,
  type AuditAdvisory as Advisory,
  type AuditMap,
  type DependencyManifest,
} from "./deps-audit-verification";

type OutdatedRow = {
  name: string;
  current: string;
  update: string; // safest: highest version satisfying the manifest range
  latest: string;
};

type PolicyRule = {
  action?: string;
  deadline_days?: number;
  pr?: string;
  automerge?: boolean;
};

type FindingRecord = {
  repository: string;
  ecosystem: string;
  dependency: string;
  current_version: string;
  recommended_version: string;
  severity: string;
  update_type: string;
  production_path: boolean;
  direct: boolean;
  environment: "runtime" | "dev" | "transitive";
  advisory_id: string | null;
  advisory_url: string | null;
  advisory_title: string | null;
  vulnerable_versions: string | null;
  fix_available: boolean;
  upgrade_effort: string;
  verification: "verified" | "partially-verified" | "unverified";
  recommended_action: string;
  policy_class: string | null;
  deadline_days: number | null;
  priority: number;
};

const REPO = "Quirk-Systems/project-scaffold";

const SEVERITY_RANK: Record<Advisory["severity"], number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
};

// Majors on these need coordinated migrations (see .github/dependabot.yml).
const PEER_COUPLED = new Set([
  "zod",
  "@t3-oss/env-nextjs",
  "@hookform/resolvers",
  "next-auth",
]);

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  error: string | null;
};

function runCommand(
  cmd: string[],
  cwd?: string,
  timeout?: number,
): CommandResult {
  const proc = spawnSync(cmd[0], cmd.slice(1), {
    encoding: "utf8",
    cwd,
    timeout,
  });
  return {
    status: proc.status,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
    error: proc.error?.message ?? null,
  };
}

function run(cmd: string[], cwd?: string): string {
  return runCommand(cmd, cwd).stdout;
}

function commandSucceeded(result: CommandResult): boolean {
  return result.error === null && result.status === 0;
}

function commandFailure(command: string, result: CommandResult): string {
  const detail = result.error || result.stderr.trim() || result.stdout.trim();
  return `${command} failed (exit ${result.status ?? "unknown"})${detail ? `: ${detail}` : ""}`;
}

function stripAnsi(s: string): string {
  return s.replace(/\[[0-9;]*m/g, "");
}

function updateType(current: string, target: string): string {
  const [cM, cm] = current.split(".").map((n) => Number(n.replace(/\D.*/, "")));
  const [tM, tm] = target.split(".").map((n) => Number(n.replace(/\D.*/, "")));
  if (tM > cM) return "major";
  if (tm > (cm ?? 0)) return "minor";
  return "patch";
}

function effortFor(type: string, name: string): string {
  if (type === "major") {
    return PEER_COUPLED.has(name)
      ? "significant (peer-coupled — coordinated migration PR required)"
      : "significant";
  }
  return type === "minor" ? "moderate" : "trivial";
}

function parseOutdated(): OutdatedRow[] {
  const raw = stripAnsi(run(["bun", "outdated"]));
  const rows: OutdatedRow[] = [];
  for (const line of raw.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    // | name | current | update | latest |
    if (cells.length >= 5 && /^\d/.test(cells[2] ?? "")) {
      rows.push({
        name: cells[1].replace(/\s*\(dev\)$/, ""),
        current: cells[2],
        update: cells[3],
        latest: cells[4],
      });
    }
  }
  return rows;
}

function parseAudit(prodOnly: boolean): AuditMap {
  const cmd = prodOnly
    ? ["bun", "audit", "--prod", "--json"]
    : ["bun", "audit", "--json"];
  const result = runCommand(cmd);
  if (result.error || result.status === null) {
    throw new Error(commandFailure(cmd.join(" "), result));
  }

  const parsed = parseAuditOutput(result.stdout);
  if (!parsed.ok) {
    throw new Error(`${cmd.join(" ")} failed closed: ${parsed.error}`);
  }
  return parsed.audit;
}

function loadPolicy(): Record<string, PolicyRule> {
  const path = ".github/deps-policy.json";
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, PolicyRule>;
  } catch {
    return {};
  }
}

function policyClassFor(severity: string, prodPath: boolean): string {
  if (severity === "critical") {
    return prodPath ? "critical_production" : "critical_dev_only";
  }
  if (severity === "high") {
    return prodPath ? "high_production" : "high_dev_only";
  }
  return "moderate_or_low";
}

function environmentFor(
  name: string,
  pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  },
): { environment: FindingRecord["environment"]; direct: boolean } {
  if (pkg.dependencies?.[name]) return { environment: "runtime", direct: true };
  if (pkg.devDependencies?.[name]) return { environment: "dev", direct: true };
  return { environment: "transitive", direct: false };
}

function pinHealth(range: string | undefined): string | null {
  if (!range) return null;
  if (range === "*" || range === "latest") return "pinned too loosely";
  if (/^\d/.test(range)) return "pinned exactly (no patch drift possible)";
  return null;
}

function actionsFindings(): string[] {
  const dir = ".github/workflows";
  if (!existsSync(dir)) return [];
  const unpinned: string[] = [];
  for (const f of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(f)) continue;
    const body = readFileSync(join(dir, f), "utf8");
    for (const m of body.matchAll(/uses:\s*([^\s#]+)/g)) {
      const ref = m[1];
      if (ref.includes("@main") || ref.includes("@master")) {
        unpinned.push(`${f}: \`${ref}\` tracks a moving branch`);
      }
    }
  }
  return unpinned;
}

type VerifyResult = {
  attempted: boolean;
  verdict: "verified" | "failed";
  validate_passed: boolean;
  advisories_before: number;
  advisories_after: number | null;
  cleared_advisories: string[]; // package names whose advisories vanished
  lockfile_stat: string;
  unexpected_manifest_changes: string[];
  failure_reasons: string[];
  cleanup: {
    attempted: boolean;
    removed: boolean;
    error: string | null;
  };
};

/**
 * --verify mode: apply `bun update` in a throwaway git worktree, run the
 * full validate gate there, and measure the audit delta. The real working
 * tree is never touched; cleanup is attempted and reported in all outcomes. An
 * advisory counts as verified-fixed only if it is present before and
 * absent after — measured, not inferred.
 */
function runVerification(auditBefore: AuditMap): VerifyResult {
  const dir = `/tmp/deps-verify-${process.pid}`;
  const log = (msg: string) => console.error(`[verify] ${msg}`);
  const result: VerifyResult = {
    attempted: true,
    verdict: "failed",
    validate_passed: false,
    advisories_before: Object.values(auditBefore).flat().length,
    advisories_after: null,
    cleared_advisories: [],
    lockfile_stat: "(unavailable)",
    unexpected_manifest_changes: [],
    failure_reasons: [],
    cleanup: {
      attempted: false,
      removed: false,
      error: null,
    },
  };

  log(`creating worktree at ${dir}`);
  const worktree = runCommand([
    "git",
    "worktree",
    "add",
    "--detach",
    dir,
    "HEAD",
  ]);
  if (!commandSucceeded(worktree)) {
    const failure = commandFailure("git worktree add", worktree);
    result.failure_reasons.push(failure);
    log(failure);
    log("worktree was not created; cleanup not attempted");
    return result;
  }

  try {
    const manifestBefore = JSON.parse(
      readFileSync(join(dir, "package.json"), "utf8"),
    ) as DependencyManifest;

    log("applying bun update in worktree");
    const update = runCommand(["bun", "update"], dir);
    if (!commandSucceeded(update)) {
      const failure = commandFailure("bun update", update);
      result.failure_reasons.push(failure);
      log(failure);
      return result;
    }

    const manifestAfter = JSON.parse(
      readFileSync(join(dir, "package.json"), "utf8"),
    ) as DependencyManifest;

    log("auditing worktree");
    const audit = runCommand(["bun", "audit", "--json"], dir);
    const auditError =
      audit.error || audit.status === null
        ? commandFailure("bun audit --json", audit)
        : null;

    log("running validate gate in worktree (lint+types+tests+build)");
    const validate = runCommand(
      ["bun", "run", "validate"],
      dir,
      15 * 60 * 1000,
    );
    result.validate_passed = commandSucceeded(validate);
    if (!result.validate_passed) {
      log(`validate FAILED (exit ${validate.status})`);
      log((validate.stdout ?? "").split("\n").slice(-12).join("\n"));
    }

    const assessment = assessVerificationEvidence({
      updateSucceeded: true,
      auditError,
      auditOutput: audit.stdout,
      validatePassed: result.validate_passed,
      manifestBefore,
      manifestAfter,
    });
    result.verdict = assessment.verdict;
    result.unexpected_manifest_changes = assessment.unexpectedManifestChanges;
    result.failure_reasons.push(...assessment.failures);

    if (assessment.auditAfter) {
      result.advisories_after = Object.values(
        assessment.auditAfter,
      ).flat().length;
      result.cleared_advisories = Object.keys(auditBefore).filter(
        (dependency) => !assessment.auditAfter?.[dependency],
      );
    }

    const lockStat = runCommand(
      ["git", "diff", "--stat", "package.json", "bun.lock"],
      dir,
    );
    if (commandSucceeded(lockStat)) {
      result.lockfile_stat = lockStat.stdout.trim() || "(no changes)";
    } else {
      const failure = commandFailure("git diff --stat", lockStat);
      result.failure_reasons.push(failure);
      result.verdict = "failed";
    }

    for (const failure of result.failure_reasons) {
      log(failure);
    }

    return result;
  } catch (error) {
    const failure = `verification crashed: ${error instanceof Error ? error.message : String(error)}`;
    result.failure_reasons.push(failure);
    result.verdict = "failed";
    log(failure);
    return result;
  } finally {
    result.cleanup.attempted = true;
    const cleanup = runCommand(["git", "worktree", "remove", "--force", dir]);
    if (commandSucceeded(cleanup)) {
      result.cleanup.removed = true;
      log("worktree removed");
    } else {
      const failure = commandFailure("git worktree remove", cleanup);
      result.cleanup.error = failure;
      result.failure_reasons.push(failure);
      result.verdict = "failed";
      log(`cleanup FAILED: ${failure}`);
    }
  }
}

function mdBlock(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join("\n");
}

function recordToMarkdown(r: FindingRecord): string {
  const header =
    r.advisory_title !== null
      ? `### ${r.severity.toUpperCase()}: ${r.dependency} — ${r.advisory_title}`
      : `### MAJOR: ${r.dependency} ${r.current_version} → ${r.recommended_version}`;
  return [
    header,
    mdBlock({
      Repository: r.repository,
      Severity: `${r.severity}${
        r.advisory_id
          ? r.production_path
            ? " · PRODUCTION-PATH"
            : " · dev/build-only"
          : ""
      }`,
      Dependency: `\`${r.dependency}\` (${r.environment}${r.direct ? ", direct" : ""})`,
      "Current → Recommended": `${r.current_version} → ${r.recommended_version}`,
      "Update type": r.update_type,
      ...(r.advisory_url
        ? {
            "Security advisory": `[${r.advisory_id}](${r.advisory_url}) — vulnerable ${r.vulnerable_versions}`,
            "Affected surface": r.production_path
              ? "production runtime tree"
              : "dev/build tooling only",
          }
        : {
            "Breaking changes": PEER_COUPLED.has(r.dependency)
              ? "peer-coupled — see .github/dependabot.yml ignore rationale"
              : "review upstream changelog before migrating",
          }),
      "Estimated effort": r.upgrade_effort,
      ...(r.policy_class
        ? {
            Policy: `${r.policy_class}${r.deadline_days !== null ? ` — remediation SLA ${r.deadline_days}d` : ""}`,
          }
        : {}),
      "Verification status": `${r.verification} — recommended`,
      "Recommended action": r.recommended_action,
    }),
  ].join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const jsonFlag = args.indexOf("--json");
  const jsonPath = jsonFlag !== -1 ? args[jsonFlag + 1] : null;
  const verifyMode = args.includes("--verify");

  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const policy = loadPolicy();
  const scannedAt = new Date().toISOString();
  const today = scannedAt.slice(0, 10);

  const fullAudit = parseAudit(false);
  const prodVulnerable = new Set(Object.keys(parseAudit(true)));
  const outdated = parseOutdated();
  const outdatedByName = new Map(outdated.map((r) => [r.name, r]));

  const records: FindingRecord[] = [];

  // --- Security advisories ---
  for (const [name, advisories] of Object.entries(fullAudit)) {
    for (const adv of advisories) {
      const prodPath = prodVulnerable.has(name);
      const row = outdatedByName.get(name);
      const { environment, direct } = environmentFor(name, pkg);
      const cls = policyClassFor(adv.severity, prodPath);
      const rule = policy[cls] ?? {};
      const recommended = row
        ? row.update !== row.current
          ? `${row.update} (in-range)`
          : `${row.latest} (requires ${updateType(row.current, row.latest)} bump)`
        : "bump direct parent or add an override";
      records.push({
        repository: REPO,
        ecosystem: "bun",
        dependency: name,
        current_version: row?.current ?? "locked (transitive)",
        recommended_version: recommended,
        severity: adv.severity,
        update_type: row ? updateType(row.current, row.latest) : "override",
        production_path: prodPath,
        direct,
        environment,
        advisory_id: adv.url.split("/").pop() ?? String(adv.id),
        advisory_url: adv.url,
        advisory_title: adv.title,
        vulnerable_versions: adv.vulnerable_versions,
        fix_available: Boolean(row),
        upgrade_effort: row
          ? effortFor(updateType(row.current, row.latest), name)
          : "moderate (override)",
        verification: "unverified",
        recommended_action: prodPath
          ? "update-immediately"
          : SEVERITY_RANK[adv.severity] <= 1
            ? "isolated-migration-pr"
            : "group-into-maintenance-pr",
        policy_class: cls,
        deadline_days: rule.deadline_days ?? null,
        priority: SEVERITY_RANK[adv.severity] * 2 + (prodPath ? 0 : 1),
      });
    }
  }

  // --- Outdated (non-vulnerable) majors + groupable batch ---
  const batch: {
    dependency: string;
    current_version: string;
    recommended_version: string;
    update_type: string;
    environment: string;
    pin_note: string | null;
  }[] = [];
  for (const row of outdated) {
    if (fullAudit[row.name]) continue;
    const type = updateType(row.current, row.latest);
    const { environment, direct } = environmentFor(row.name, pkg);
    const range =
      pkg.dependencies?.[row.name] ?? pkg.devDependencies?.[row.name];
    if (type !== "major") {
      batch.push({
        dependency: row.name,
        current_version: row.current,
        recommended_version: row.latest,
        update_type: type,
        environment,
        pin_note: pinHealth(range),
      });
      continue;
    }
    records.push({
      repository: REPO,
      ecosystem: "bun",
      dependency: row.name,
      current_version: row.current,
      recommended_version:
        row.update !== row.current
          ? `${row.update} now; ${row.latest} via migration`
          : `${row.latest} via migration`,
      severity: "maintenance",
      update_type: "major",
      production_path: environment === "runtime",
      direct,
      environment,
      advisory_id: null,
      advisory_url: null,
      advisory_title: null,
      vulnerable_versions: null,
      fix_available: true,
      upgrade_effort: effortFor("major", row.name),
      verification: "unverified",
      recommended_action: "isolated-migration-pr",
      policy_class: null,
      deadline_days: null,
      priority: 10 + (PEER_COUPLED.has(row.name) ? 0 : 1),
    });
  }

  records.sort((a, b) => a.priority - b.priority);

  // --- Optional worktree verification ---
  let verify: VerifyResult | null = null;
  if (verifyMode) {
    verify = runVerification(fullAudit);
    if (verify.verdict === "verified") {
      for (const r of records) {
        if (r.advisory_id && verify.cleared_advisories.includes(r.dependency)) {
          r.verification = "verified";
          r.recommended_version += " — cleared by `bun update` (verified)";
          r.recommended_action = "apply-bun-update-verified";
        }
      }
    }
  }

  // --- Policy verdict ---
  const failing = records.filter(
    (r) => r.policy_class && policy[r.policy_class]?.action === "fail",
  );
  const criticalCount = records.filter((r) => r.severity === "critical").length;

  // --- Markdown report ---
  const lines: string[] = [];
  lines.push("<!-- quirk-dependency-audit -->");
  lines.push(`# Dependency audit — ${today}`);
  lines.push("");
  lines.push(
    `Scope: \`${REPO}\` @ default branch — package.json/bun.lock (bun), .github/workflows actions. No Dockerfile or infrastructure manifests present.`,
  );
  lines.push("");
  if (criticalCount > 0) {
    lines.push(
      `> 🚨 **${criticalCount} critical advisor${criticalCount === 1 ? "y" : "ies"} — see top of findings for remediation.**`,
    );
    lines.push("");
  }
  if (failing.length > 0) {
    lines.push(
      `> ❌ **Policy: ${failing.length} finding(s) in a fail class (${[...new Set(failing.map((f) => f.policy_class))].join(", ")}) — this run exits non-zero.**`,
    );
    lines.push("");
  }

  for (const r of records) {
    lines.push(recordToMarkdown(r), "");
  }

  if (batch.length > 0) {
    lines.push(`### Groupable low-risk batch (patch/minor, no advisories)`);
    lines.push(
      "Safe to upgrade together in one maintenance PR (`bun update` then validate):",
      "",
    );
    for (const b of batch) {
      lines.push(
        `- \`${b.dependency}\` ${b.current_version} → ${b.recommended_version} (${b.update_type}, ${b.environment})${b.pin_note ? ` — ${b.pin_note}` : ""}`,
      );
    }
    lines.push("");
  }

  if (verify?.attempted) {
    lines.push(`### Verification run (\`--verify\`, throwaway worktree)`);
    lines.push(
      mdBlock({
        Verdict: verify.verdict === "verified" ? "✅ verified" : "❌ failed",
        "Validate gate": verify.validate_passed
          ? "lint + type-check + tests + build all green after `bun update`"
          : "FAILED — do not apply this batch without investigation",
        "Advisory delta":
          verify.advisories_after === null
            ? `${verify.advisories_before} → unknown (audit output rejected)`
            : `${verify.advisories_before} → ${verify.advisories_after}${verify.cleared_advisories.length > 0 ? ` (cleared: ${verify.cleared_advisories.join(", ")})` : ""}`,
        "Manifest/lockfile change": verify.lockfile_stat,
        "Scope gate":
          verify.unexpected_manifest_changes.length === 0
            ? "passed — no dependency additions, removals, or compatibility-line crossings"
            : `FAILED — ${verify.unexpected_manifest_changes.join("; ")}`,
        Cleanup: verify.cleanup.removed
          ? "worktree removed"
          : verify.cleanup.attempted
            ? `FAILED — ${verify.cleanup.error ?? "unknown cleanup error"}`
            : "not attempted because worktree creation failed",
        ...(verify.failure_reasons.length > 0
          ? { Failures: verify.failure_reasons.join("; ") }
          : {}),
      }),
      "",
    );
  }

  const actionIssues = actionsFindings();
  if (actionIssues.length > 0) {
    lines.push(`### GitHub Actions pin health`);
    lines.push(...actionIssues.map((s) => `- ${s}`), "");
  }

  if (records.length === 0 && batch.length === 0) {
    lines.push(`All dependencies current and advisory-free as of ${today}.`);
  }

  lines.push("---");
  lines.push(
    "_Mechanical scan by `scripts/deps-audit.ts`. Run the `/deps-audit` command for migration research, grouped PRs, and verified upgrades._",
  );

  console.log(lines.join("\n"));

  // --- Machine-readable output ---
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          repository: REPO,
          ecosystem: "bun",
          scanned_at: scannedAt,
          clean: records.length === 0 && batch.length === 0,
          policy_fail: failing.length > 0,
          summary: {
            critical: criticalCount,
            high: records.filter((r) => r.severity === "high").length,
            moderate: records.filter((r) => r.severity === "moderate").length,
            low: records.filter((r) => r.severity === "low").length,
            majors: records.filter((r) => r.severity === "maintenance").length,
            batch_size: batch.length,
          },
          findings: records,
          groupable_batch: batch,
          actions_pin_issues: actionIssues,
          verify,
        },
        null,
        2,
      ) + "\n",
    );
  }

  // Policy-as-code exit: after the report is fully written, so a failing
  // run still produces the issue/artifact it exists to produce.
  if (verify?.verdict === "failed") {
    process.exitCode = 3;
  } else if (failing.length > 0) {
    process.exitCode = 2;
  }
}

main();
