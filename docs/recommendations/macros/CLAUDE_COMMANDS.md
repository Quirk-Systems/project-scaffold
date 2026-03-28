# Claude Slash Commands

> Drop these in `.claude/commands/` as `.md` files. Run with `/command-name`.

---

## Setup

```bash
mkdir -p .claude/commands
```

Each `.md` file becomes a `/command`. The file content is the prompt Claude runs.

---

## `/ship` — Validate, Commit, Push

```markdown
# Ship

Run the full validation suite, then commit and push if everything passes.

Steps:
1. Run `bun run validate` (lint + type-check + test + build)
2. If any step fails, stop and report which step failed with the full error
3. If all pass, stage all modified tracked files
4. Generate a conventional commit message based on the diff (type(scope): description)
5. Commit with that message
6. Push to the current branch

Do not push if validation fails.
```

---

## `/audit` — Security + Dependency Audit

```markdown
# Audit

Run a full security and dependency audit on this codebase.

Steps:
1. Run `bun audit` and report any vulnerabilities (high/critical first)
2. Run `bunx depcheck` to find unused dependencies
3. Run `bunx npm-check-updates` to list outdated packages
4. Search source for hardcoded secrets (API keys, passwords, tokens)
5. Check for `console.log` in src/ (should not be in production code)
6. Check for `any` types in TypeScript (grep for `: any` and `as any`)
7. Report findings as a prioritized list: Critical → High → Medium → Low

Output a summary table at the end with counts per severity.
```

---

## `/scaffold` — Generate Component with Tests

```markdown
# Scaffold Component

Given a component name and description, generate:
1. The component file in `src/components/`
2. A unit test file alongside it
3. Export from the appropriate index if one exists

Requirements:
- Follow existing patterns in `src/components/ui/`
- Use `cn()` from `@/lib/utils` for class names
- Use `"use client"` only if the component needs hooks or events
- Use TypeScript with proper prop types (no `any`)
- Test file should use Vitest + React Testing Library
- Test behavior, not implementation
- Include at least 3 test cases: renders correctly, handles main interaction, handles edge case

Ask me for the component name and description if not provided.
```

---

## `/review` — Code Review

```markdown
# Code Review

Review the current git diff (or specified files) for:

**Logic**
- Correctness: does it do what it claims?
- Edge cases: empty arrays, null, undefined, -1, 0, max values
- Off-by-one errors
- Async errors that aren't caught

**Security**
- User input validated with Zod?
- Auth checked before data access?
- No hardcoded secrets?
- No SQL injection risk?

**Performance**
- Any N+1 queries?
- Expensive computation in render path?
- Unnecessary re-renders?

**Code Quality**
- Follows project conventions?
- Uses @/ imports?
- No magic numbers?
- Function complexity too high?

Output as a structured list grouped by category. Include file:line references.
Be direct. Skip minor style issues handled by linter.
```

---

## `/debug` — Systematic Debugging

```markdown
# Debug

Given an error or unexpected behavior, debug it systematically:

1. Read the full error message and stack trace (don't skip lines)
2. Identify the file and line number where the error originates
3. Explain what the error means in plain terms
4. Form 2-3 hypotheses about the root cause
5. For each hypothesis, describe what evidence would confirm or deny it
6. Check the code for the most likely hypothesis
7. Propose the minimal fix
8. Suggest how to prevent this class of error in the future

Never guess. Trace the actual code path.
```

---

## `/docs` — Generate Documentation

```markdown
# Generate Documentation

For the selected code or specified file, generate:

1. A one-line summary of what it does
2. For each exported function/component:
   - One-line description
   - Parameters with types and descriptions
   - Return value description
   - At least one usage example
   - Any side effects, gotchas, or important behavior notes

3. For components specifically:
   - Props table (name, type, required, description, default)
   - Example usage snippet

Format as markdown. Be concise. Don't document the obvious.
```

---

## `/migrate` — Database Migration

```markdown
# Database Migration

Help create and apply a database migration:

1. Ask what schema change is needed (if not provided)
2. Show the current schema from `src/lib/db/schema.ts`
3. Propose the updated schema with the change applied
4. Run `bun run db:generate` to generate the migration file
5. Show the generated SQL migration
6. Ask for confirmation before running `bun run db:push`
7. After applying, verify the change with `bun run db:studio`

Always check for data loss implications before proceeding.
```

---

## `/perf` — Performance Analysis

```markdown
# Performance Analysis

Analyze this codebase for performance issues:

1. **Bundle size**: Run `ANALYZE=true bun run build` and identify the largest chunks
2. **React renders**: Search for components that might re-render unnecessarily (missing memo, unstable callbacks/objects in props)
3. **DB queries**: Find any N+1 patterns in server components or API routes
4. **Images**: Check for missing `width`/`height` on Image components, missing `priority` on above-fold images
5. **Caching**: Find fetch calls missing `next.revalidate` that should be cached
6. **Code splitting**: Identify large components that could be dynamically imported

For each issue found, explain the impact and suggest the fix.
```

---

## `/standup` — Daily Summary

```markdown
# Standup

Summarize what changed in this repository since yesterday:

1. Run `git log --since="24 hours ago" --oneline --no-merges`
2. For each commit, briefly describe the change in plain language
3. Run `git diff HEAD~$(git log --since="24 hours ago" --oneline | wc -l) --stat` to show changed files
4. Identify any open TODOs or FIXMEs added recently
5. Highlight any breaking changes or schema migrations

Format as a concise standup update.
```

---

## `/health` — Repo Health Check

```markdown
# Health Check

Run the full repo health audit from docs/recommendations/reports/REPO_HEALTH.md:

1. Run `bun run type-check` — report errors
2. Run `bun run lint` — report errors
3. Run `bun run test:run` — report failures and coverage summary
4. Run `bun run build` — report build errors or bundle size warnings
5. Run `bun audit` — report vulnerabilities
6. Check for console.log in src/ (excluding tests)
7. Check for `any` types in src/ (excluding tests)
8. Count TODO/FIXME comments

Score each check pass/fail and output a health score out of 15 (see REPO_HEALTH.md).
```
