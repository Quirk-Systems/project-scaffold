/**
 * Dependency audit — the mechanical layer of the update routine.
 *
 * Usage:
 *   bun run deps:audit            # markdown report to stdout
 *
 * Scope: this repository — package.json + bun.lock (bun/npm ecosystem) and
 * .github/workflows/*.yml action pins. Docker/infrastructure manifests are
 * detected and reported when present. For the full intelligent audit
 * (CVE research, migration steps, grouped PRs, verification runs) use the
 * /deps-audit Claude command, which wraps this script.
 *
 * Priority order: critical/high CVE (production-path first) -> breaking
 * major -> minor -> patch. Findings use a stable per-item block so reports
 * diff cleanly week over week.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
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

type Finding = {
  priority: number;
  block: string;
};

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

function run(cmd: string[]): string {
  const proc = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8" });
  return proc.stdout ?? "";
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\[[0-9;]*m/g, "");
}

function parseMajor(v: string): number {
  return Number(v.replace(/^[^\d]*/, "").split(".")[0] ?? 0);
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

function depClass(
  name: string,
  pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  },
): string {
  if (pkg.dependencies?.[name]) return "runtime (direct)";
  if (pkg.devDependencies?.[name]) return "dev (direct)";
  return "transitive";
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

function block(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join("\n");
}

function main() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const today = new Date().toISOString().slice(0, 10);

  const fullAudit = parseAudit(false);
  const prodAudit = parseAudit(true);
  const prodVulnerable = new Set(Object.keys(prodAudit));
  const outdated = parseOutdated();
  const outdatedByName = new Map(outdated.map((r) => [r.name, r]));

  const findings: Finding[] = [];

  // --- Security advisories, ranked by severity then production-path ---
  for (const [name, advisories] of Object.entries(fullAudit)) {
    for (const adv of advisories) {
      const prodPath = prodVulnerable.has(name);
      const row = outdatedByName.get(name);
      const cls = depClass(name, pkg);
      const fixTarget = row
        ? row.update !== row.current
          ? `${row.update} (in-range)`
          : `${row.latest} (requires ${updateType(row.current, row.latest)} bump)`
        : "transitive — bump the direct parent or add an override";
      findings.push({
        priority: SEVERITY_RANK[adv.severity] * 2 + (prodPath ? 0 : 1),
        block: [
          `### ${adv.severity.toUpperCase()}: ${name} — ${adv.title}`,
          block({
            Repository: "Quirk-Systems/project-scaffold",
            Severity: `${adv.severity}${prodPath ? " · PRODUCTION-PATH" : " · dev/build-only"}`,
            Dependency: `\`${name}\` (${cls})`,
            "Current → Recommended": row
              ? `${row.current} → ${fixTarget}`
              : `locked → ${fixTarget}`,
            "Update type": row
              ? updateType(row.current, row.latest)
              : "override",
            "Security advisory": `[${adv.url.split("/").pop()}](${adv.url}) — vulnerable ${adv.vulnerable_versions}`,
            "Affected surface": prodPath
              ? "production runtime tree"
              : "dev/build tooling only",
            "Verification status": "unverified — recommended",
            "Recommended action": prodPath
              ? "Update immediately"
              : SEVERITY_RANK[adv.severity] <= 1
                ? "Create isolated migration PR"
                : "Group into low-risk maintenance PR",
          }),
        ].join("\n"),
      });
    }
  }

  // --- Outdated (non-vulnerable) dependencies ---
  const patchMinorBatch: string[] = [];
  for (const row of outdated) {
    if (fullAudit[row.name]) continue; // already reported above
    const type = updateType(row.current, row.latest);
    const cls = depClass(row.name, pkg);
    const range =
      pkg.dependencies?.[row.name] ?? pkg.devDependencies?.[row.name];
    const pin = pinHealth(range);
    if (type !== "major") {
      patchMinorBatch.push(
        `- \`${row.name}\` ${row.current} → ${row.latest} (${type}, ${cls})${pin ? ` — ${pin}` : ""}`,
      );
      continue;
    }
    findings.push({
      priority: 10 + (PEER_COUPLED.has(row.name) ? 0 : 1),
      block: [
        `### MAJOR: ${row.name} ${parseMajor(row.current)} → ${parseMajor(row.latest)}`,
        block({
          Repository: "Quirk-Systems/project-scaffold",
          Severity: "maintenance",
          Dependency: `\`${row.name}\` (${cls})`,
          "Current → Recommended": `${row.current} → ${row.update !== row.current ? `${row.update} now; ${row.latest} via migration` : `${row.latest} via migration`}`,
          "Update type": "major (breaking)",
          "Breaking changes": PEER_COUPLED.has(row.name)
            ? "peer-coupled — see .github/dependabot.yml ignore rationale"
            : "review upstream changelog before migrating",
          "Estimated effort": effortFor("major", row.name),
          "Verification status": "unverified — recommended",
          "Recommended action": "Create isolated migration PR",
        }),
      ].join("\n"),
    });
  }

  // --- Emit ---
  const lines: string[] = [];
  const criticalCount = Object.values(fullAudit)
    .flat()
    .filter((a) => a.severity === "critical").length;
  lines.push(`# Dependency audit — ${today}`);
  lines.push("");
  lines.push(
    `Scope: \`Quirk-Systems/project-scaffold\` @ default branch — package.json/bun.lock (bun), .github/workflows actions. No Dockerfile or infrastructure manifests present.`,
  );
  lines.push("");
  if (criticalCount > 0) {
    lines.push(
      `> 🚨 **${criticalCount} critical advisor${criticalCount === 1 ? "y" : "ies"} — see top of findings for remediation.**`,
    );
    lines.push("");
  }

  findings.sort((a, b) => a.priority - b.priority);
  for (const f of findings) {
    lines.push(f.block, "");
  }

  if (patchMinorBatch.length > 0) {
    lines.push(`### Groupable low-risk batch (patch/minor, no advisories)`);
    lines.push(
      "Safe to upgrade together in one maintenance PR (`bun update` then validate):",
      "",
    );
    lines.push(...patchMinorBatch, "");
  }

  const actionIssues = actionsFindings();
  if (actionIssues.length > 0) {
    lines.push(`### GitHub Actions pin health`);
    lines.push(...actionIssues.map((s) => `- ${s}`), "");
  }

  if (findings.length === 0 && patchMinorBatch.length === 0) {
    lines.push(`All dependencies current and advisory-free as of ${today}.`);
  }

  lines.push("---");
  lines.push(
    "_Mechanical scan by `scripts/deps-audit.ts`. Run the `/deps-audit` command for migration research, grouped PRs, and verified upgrades._",
  );

  console.log(lines.join("\n"));
}

main();
