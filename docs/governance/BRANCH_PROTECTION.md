# Branch Protection

> Ruleset configuration for `Quirk-Systems/project-scaffold`. Records what is enabled, why, and how to work within it.

---

## Active Rulesets

### `Protect main`

**Target branch:** `main`
**Location:** GitHub → Settings → Rulesets

| Rule | Enabled | Rationale |
|------|---------|-----------|
| Restrict deletions | Yes | Prevent accidental deletion of `main` |
| Block force pushes | Yes | Preserve linear history; prevent overwriting others' work |
| Require pull request before merging | Yes | Every change reviewed before landing |
| Require status checks to pass | Yes | CI must be green before merge |
| Require linear history | Yes | Clean scaffold history; enforces squash/rebase merges |
| Require signed commits | No | Add when contributor workflow is stable |
| Bypass list | Empty | No emergency bypass — use a revert PR instead |

---

## Required Status Checks

These are the GitHub Actions job names that must pass before a PR can merge.
Both come from `.github/workflows/ci.yml`.

| Check name | What it runs |
|------------|--------------|
| `validate` | `bun install` → `lint` → `type-check` → `test:run` → `build` |
| `e2e` | `playwright install` → `test:e2e` (Chromium, Firefox, WebKit) |

> To see these check names in GitHub: open any PR → scroll to the checks section → the job name shown is what to add to the ruleset.

---

## Release Branch Ruleset (Future)

When release branches are introduced:

**Ruleset name:** `Protect release branches`
**Target:** `release/*`

Recommended rules:
- Restrict deletions
- Block force pushes
- Require pull request before merging
- Require status checks to pass (`validate`, `e2e`)

Create this ruleset when `release/*` branches are part of the workflow.

---

## Working Within These Rules

### Normal workflow

```bash
# Never push directly to main — it will be rejected
git checkout -b feature/my-feature
# ... make changes ...
git push -u origin feature/my-feature
# Open a PR on GitHub — CI runs automatically
# Merge after CI passes and review is done
```

### Merge strategy

Linear history is required. Use **squash merge** or **rebase merge** — not a regular merge commit.

In GitHub PR UI: select **"Squash and merge"** or **"Rebase and merge"**.

### If CI is failing

Fix the root cause. Do not bypass hooks or use `--no-verify`.

```bash
bun run validate   # runs lint + type-check + test + build locally
bun run test:e2e   # run E2E suite locally if needed
```

---

## Adding a New Required Check

1. Add the new job to `.github/workflows/ci.yml`
2. Open a PR and let it run — confirm the job name appears in the PR checks list
3. Go to GitHub → Settings → Rulesets → `Protect main` → Status checks
4. Add the exact job name as a required check
5. Update this document with the new check in the table above

---

## Emergency Override Policy

There is no bypass list. If something must land immediately:

1. Open a PR (even a one-line change)
2. Get at least one approval
3. If CI is broken due to infrastructure (not code): note in PR description
4. Merge via squash

**Never force push to `main`.** If a bad commit lands, open a revert PR.

---

## Governance Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-10 | Initial ruleset created | Scaffold hardening |
