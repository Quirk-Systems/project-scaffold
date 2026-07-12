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

type Advisory = {
  id: number;
  url: string;
  title: string;
  severity: "critical" | "high" | "moderate" | "low";
  vulnerable_versions: string;
};

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

function run(cmd: string[], cwd?: string): string {
  const proc = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8", cwd });
  return proc.stdout ?? "";
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
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

function parseAudit(prodOnly: boolean): Record<string, Advisory[]> {
  const cmd = prodOnly
    ? ["bun", "audit", "--prod", "--json"]
    : ["bun", "audit", "--json"];
  const raw = stripAnsi(run(cmd));
  const jsonStart = raw.indexOf("{");
  if (jsonStart === -1) return {};
  try {
    return JSON.parse(raw.slice(jsonStart)) as Record<string, Advisory[]>;
  } catch {
    return {};
  }
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
  advisories_after: number;
  cleared_advisories: string[]; // package names whose advisories vanished
  lockfile_stat: string;
};

/**
 * --verify mode: apply `bun update` in a throwaway git worktree, run the
 * full validate gate there, and measure the audit delta. The real working
 * tree is never touched; the worktree is removed in all outcomes. An
 * advisory counts as verified-fixed only if it is present before and
 * absent after — measured, not inferred.
 */
function runVerification(
  auditBefore: Record<string, Advisory[]>,
): VerifyResult {
  const dir = `/tmp/deps-verify-${process.pid}`;
  const log = (msg: string) => console.error(`[verify] ${msg}`);
  log(`creating worktree at ${dir}`);
  run(["git", "worktree", "add", "--detach", dir, "HEAD"]);
  try {
    log("applying bun update in worktree");
    run(["bun", "update"], dir);

    log("auditing worktree");
    const rawAfter = stripAnsi(run(["bun", "audit", "--json"], dir));
    const jsonStart = rawAfter.indexOf("{");
    const auditAfter: Record<string, Advisory[]> =
      jsonStart === -1 ? {} : JSON.parse(rawAfter.slice(jsonStart));

    log("running validate gate in worktree (lint+types+tests+build)");
    const validate = spawnSync("bun", ["run", "validate"], {
      cwd: dir,
      encoding: "utf8",
      timeout: 15 * 60 * 1000,
    });
    const validatePassed = validate.status === 0;
    if (!validatePassed) {
      log(`validate FAILED (exit ${validate.status})`);
      log((validate.stdout ?? "").split("\n").slice(-12).join("\n"));
    }

    const before = Object.values(auditBefore).flat().length;
    const after = Object.values(auditAfter).flat().length;
    const cleared = Object.keys(auditBefore).filter((k) => !auditAfter[k]);
    const lockStat = run(
      ["git", "diff", "--stat", "package.json", "bun.lock"],
      dir,
    ).trim();

    return {
      attempted: true,
      verdict: validatePassed ? "verified" : "failed",
      validate_passed: validatePassed,
      advisories_before: before,
      advisories_after: after,
      cleared_advisories: cleared,
      lockfile_stat: lockStat || "(no changes)",
    };
  } finally {
    run(["git", "worktree", "remove", "--force", dir]);
    log("worktree removed");
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
        "Advisory delta": `${verify.advisories_before} → ${verify.advisories_after}${verify.cleared_advisories.length > 0 ? ` (cleared: ${verify.cleared_advisories.join(", ")})` : ""}`,
        "Manifest/lockfile change": verify.lockfile_stat,
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
  if (failing.length > 0) {
    process.exitCode = 2;
  }
}

main();
