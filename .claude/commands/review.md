# Review

Deep code review of the current diff or specified files.

## Process

Run `git diff HEAD` (or `git diff main...HEAD` for full branch), then analyze:

### Security
- SQL injection via string interpolation
- XSS via unescaped user output  
- Missing input validation at API boundaries
- Secrets or tokens in code or logs
- Auth checks missing or bypassable
- IDOR — user accessing another user's resource

### Correctness
- Logic errors, off-by-one, wrong conditions
- Unhandled edge cases (null, empty, zero, negative)
- Race conditions in async code
- Swallowed errors (bare catch blocks)

### Performance
- N+1 queries (loop with DB call inside)
- Missing indexes for new query patterns
- Unbounded result sets (no pagination)
- Unnecessary re-renders or recomputation

### Maintainability
- Functions doing more than one thing
- Magic numbers without named constants
- Deep nesting that can be flattened
- Unclear names

## Output

```markdown
## Summary
[One paragraph. Approved or changes requested?]

### 🔴 Blocking
- `file.ts:42` — [problem + specific fix]

### 🟡 Warnings
- `file.ts:78` — [description + suggestion]

### 💡 Suggestions
- `file.ts:12` — [optional improvement]
```

## Rules
- Cite file and line number
- Suggest the fix, not just the problem
- Don't flag style — that's the linter's job
- Don't invent problems that aren't there
