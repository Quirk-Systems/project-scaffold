# Repo Health Report

> Run this checklist before every release. Green = shippable. Red = fix first.

---

## Health Score (15 Points)

Score your repo 1 point per green item. 12+ = healthy. Under 10 = fix before shipping.

| # | Check | How to Verify |
|---|-------|--------------|
| 1 | All CI checks pass | GitHub Actions: all green |
| 2 | Zero TypeScript errors | `bun run type-check` exits 0 |
| 3 | Zero ESLint errors | `bun run lint` exits 0 |
| 4 | Test coverage ≥ 80% on core logic | `bun run test:coverage` |
| 5 | No high/critical CVEs in deps | `bun audit` or `bunx better-npm-audit` |
| 6 | All deps within 2 major versions of latest | `bunx npm-check-updates` |
| 7 | No `.env` or secrets committed | `git log -p | grep -i secret` |
| 8 | E2E tests pass on all 3 browsers | `bun run test:e2e` |
| 9 | Production build succeeds | `bun run build` exits 0 |
| 10 | Bundle size within budget (see below) | `bun run build` — check `.next/build-manifest` |
| 11 | No `console.log` in src (only debug) | `grep -r "console.log" src/` |
| 12 | No `TODO` / `FIXME` older than 30 days | `git log -S "TODO"` |
| 13 | DB migrations are applied and committed | `bun run db:generate && git diff` |
| 14 | README accurately describes project | Manual review |
| 15 | CLAUDE.md up to date with stack | Manual review |

---

## Bundle Budget

| Route | JS Budget | Image Budget |
|-------|-----------|--------------|
| `/` (homepage) | < 150 kB gzipped | < 500 kB total |
| Any page | < 250 kB gzipped | — |
| First load JS shared | < 90 kB | — |

Check with:
```bash
bun run build
# Look for "First Load JS" column in the output table
# Anything red in Next.js build output = over budget
```

---

## Type Safety Score

```bash
# Count any-typed expressions (aim for 0 in src/)
grep -r ": any" src/ | grep -v ".test." | wc -l
grep -r "as any" src/ | grep -v ".test." | wc -l

# Check for ts-ignore usage (should be 0 or documented)
grep -r "@ts-ignore\|@ts-nocheck" src/ | wc -l
```

Target: 0 `any` in production code, 0 `@ts-ignore` without comment explaining why.

---

## Test Coverage Breakdown

```bash
bun run test:coverage
```

Targets:
| Category | Threshold |
|----------|-----------|
| Statements | ≥ 80% |
| Branches | ≥ 75% |
| Functions | ≥ 80% |
| Lines | ≥ 80% |

Configure in `vitest.config.ts`:
```typescript
coverage: {
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
}
```

---

## Dependency Freshness

```bash
# See which packages have updates
bunx npm-check-updates

# Interactive update (choose which to bump)
bunx npm-check-updates -i

# Check for unused dependencies
bunx depcheck
```

---

## Git Hygiene

```bash
# Stale branches (merged to main, not deleted)
git branch -r --merged main | grep -v main

# Large files in history
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | grep '^blob' | sort -k3 -rn | head -20

# Commits without tests (rough heuristic)
git log --oneline --no-merges | head -20
# then inspect suspicious commits manually
```

---

## Accessibility Quick Check

```bash
# Run axe in E2E tests (add to playwright setup)
import { checkA11y } from 'axe-playwright';

test('homepage is accessible', async ({ page }) => {
  await page.goto('/');
  await checkA11y(page, null, { runOnly: ['wcag2a', 'wcag2aa'] });
});
```

---

## Weekly Health Run (One Command)

```bash
# Add to package.json scripts
"health": "bun run type-check && bun run lint && bun run test:coverage && bun run build && bunx npm-check-updates --errorLevel 2"
```
