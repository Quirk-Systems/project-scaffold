# /deps-audit — full-intelligence dependency audit

Run the complete dependency-update routine for this repository. The
mechanical layer is `bun run deps:audit` (scripts/deps-audit.ts) — start
there, then add the judgment the script can't.

## Procedure

1. **Detect scope**: package managers, manifests, lockfiles (package.json +
   bun.lock here), Docker base images, GitHub Actions pins, and
   infrastructure dependencies. Name exactly what was scanned and what was
   absent.
2. **Run the mechanical scan**: `bun run deps:audit`. Treat its output as
   the finding inventory, not the final report.
3. **Classify every finding**: direct vs transitive; runtime vs dev vs
   build vs CI. Verify the script's production-path flags against
   `bun audit --prod`.
4. **Research each security finding**: read the GHSA advisory. Determine
   exploit status (actively exploited? PoC public?), the actual affected
   surface in THIS codebase (is the vulnerable code path reachable?), and
   the safest fix version — not merely the newest.
5. **For each major upgrade**: read the upstream changelog/migration guide.
   List concrete breaking changes that touch this codebase (grep for the
   affected APIs), required code migrations, and whether peer-coupled
   packages (zod, t3-env, hookform/resolvers, next-auth — see
   dependabot.yml) must move together.
6. **Estimate effort honestly**: trivial (bump + validate), moderate
   (config/code touches), significant (migration PR with review cycles).
   Predict whether tests, build, or type-check will break, and why.
7. **Verify what you can**: apply proposed low-risk updates on a branch,
   run `bun install` + `bun run validate`, diff the lockfile before/after,
   and check for peer-dependency conflicts. Label every finding
   **verified**, **partially verified**, or **unverified** — never imply
   verification that didn't run.
8. **Flag health signals**: abandoned/deprecated/renamed packages,
   restrictive license changes, duplicate libraries serving one purpose,
   pins that are too loose (`*`, `latest`) or too tight (exact pins that
   block security patches), and stale lockfile entries.
9. **Prioritize**: actively exploited → critical/high CVE (production-path
   first) → breaking majors → minors → patches.
10. **Act, don't just report**:
    - Group verified patch/minor updates into one maintenance PR.
    - Keep each major/high-risk upgrade in its own isolated PR.
    - For critical production-path vulnerabilities: fix immediately on a
      branch and open the PR in the same session — do not wait for Monday.
    - Every finding ends with one action: update immediately / isolated
      migration PR / group into maintenance PR / replace dependency /
      accept temporarily (with documented reason) / no action required.

## Report format

Group by severity, use the script's stable block format (Repository,
Severity, Dependency, Current → Recommended, Update type, Why it matters,
Breaking changes, Security advisory, Affected surface, Required migration,
Verification status, Recommended action). Lead with criticals and a
concise remediation path. If everything is current and secure, say so
briefly with the date and scope of the audit.
