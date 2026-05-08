# Code Quality Report

> Code quality isn't about aesthetics. It's about the cost of the next change.

---

## Complexity Metrics

High cyclomatic complexity = hard to test, easy to break.

```bash
# Count complexity hotspots
bunx ts-complexity-report --format table src/**/*.ts src/**/*.tsx

# Or with eslint
# Add to eslint.config.mjs:
# "complexity": ["warn", { "max": 10 }]
```

Targets:
| Metric | Good | Warning | Critical |
|--------|------|---------|---------|
| Cyclomatic complexity per function | ≤ 5 | 6–10 | > 10 |
| Lines per function | ≤ 30 | 31–50 | > 50 |
| Parameters per function | ≤ 4 | 5–7 | > 7 |
| File length | ≤ 300 | 301–500 | > 500 |
| Nesting depth | ≤ 3 | 4–5 | > 5 |

---

## Dead Code Detection

```bash
# Find unused exports
bunx ts-prune

# Find unreachable files
bunx unimported

# Find unused CSS (Tailwind purge handles this, but for raw CSS):
bunx purgecss --css src/**/*.css --content src/**/*.tsx
```

---

## Duplication Analysis

```bash
# Find copy-pasted code blocks
bunx jscpd src/ --min-lines 5 --min-tokens 50 --reporters console

# Output: shows duplicated blocks with line numbers
# Rule: if you copied it twice, extract it
```

---

## Documentation Coverage

```bash
# Check JSDoc coverage on public APIs
bunx typedoc --plugin typedoc-plugin-coverage src/lib/ --coverageFailAt 80
```

When to add docs:
- Public API functions (exported from lib/)
- Complex algorithm — explain the *why*, not the *what*
- Non-obvious performance decisions
- Workarounds for upstream bugs (link the issue)

When NOT to add docs:
- Self-explanatory function names (`getUserById` needs no doc)
- Internal implementation details that change frequently
- Comments that just restate the code

---

## ESLint Rule Review

Current config extends `next/core-web-vitals + next/typescript + prettier`.

Consider adding:
```javascript
// eslint.config.mjs
{
  rules: {
    // Prevent accidental floating promises
    "@typescript-eslint/no-floating-promises": "error",

    // Enforce exhaustive switch on union types
    "@typescript-eslint/switch-exhaustiveness-check": "error",

    // No console in production (use proper logger)
    "no-console": ["warn", { allow: ["warn", "error"] }],

    // Consistent import ordering
    "import/order": ["warn", {
      groups: ["builtin", "external", "internal"],
      "newlines-between": "always",
    }],

    // Prevent magic numbers
    "@typescript-eslint/no-magic-numbers": ["warn", {
      ignore: [0, 1, -1],
      ignoreEnums: true,
      ignoreReadonlyClassProperties: true,
    }],
  }
}
```

---

## Naming Conventions Audit

```bash
# Find PascalCase hooks (should be camelCase use-*)
grep -r "function Use" src/hooks/

# Find non-kebab-case component files in ui/
ls src/components/ui/ | grep -v "^[a-z-]*\.tsx$"

# Find relative imports that should use @/ alias
grep -r "from '\.\." src/ | grep -v "node_modules"
```

---

## Coupling Analysis

High coupling = changes cascade everywhere. Signs:
- File imports from 10+ different modules
- Changing a type in `schema.ts` breaks 15 files
- Tests require complex setup with many mocks

```bash
# Count imports per file (high count = potential coupling issue)
grep -r "^import" src/ | awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -20
```

---

## Code Review Checklist

Before approving any PR:

```markdown
### Logic
- [ ] Does it do what the PR description says?
- [ ] Are edge cases handled? (empty arrays, null, 0, -1, max values)
- [ ] No off-by-one errors in loops/indices?
- [ ] Async errors handled (try/catch or `.catch()`)?

### Security
- [ ] User input validated with Zod?
- [ ] Auth checked in API routes?
- [ ] No secrets hardcoded?

### Performance
- [ ] No obvious N+1 queries?
- [ ] No expensive computation in render?
- [ ] Large assets optimized?

### Tests
- [ ] New code has tests?
- [ ] Tests test behavior, not implementation?
- [ ] E2E test for user-facing flows?

### Conventions
- [ ] Uses `@/` imports?
- [ ] "use client" only where needed?
- [ ] Follows naming conventions?
- [ ] `cn()` for conditional class names?
```

---

## Automated Quality Gates

Add to CI to catch regressions:
```yaml
# .github/workflows/ci.yml
- name: Complexity check
  run: bunx ts-complexity-report --maxComplexity 15 src/**/*.ts

- name: Duplication check
  run: bunx jscpd src/ --min-lines 10 --threshold 5

- name: Dead code check
  run: bunx ts-prune --error
```
