# Debug

Systematic root-cause analysis of any error or unexpected behavior.

## Process

1. **Read the full error** — stack trace, error message, error code. Don't skim.
2. **Locate the origin** — find the actual line that threw, not just where it surfaced
3. **Trace backwards** — what called it, what state existed, what changed recently
4. **Form a hypothesis** — one specific, falsifiable explanation for the root cause
5. **Verify** — how to confirm this hypothesis without guessing
6. **Fix** — the minimal change that addresses the root cause (not just the symptom)
7. **Prevent** — what would catch this class of error earlier (test, type, validation)

## Output Format

```markdown
## Error
[Quote the exact error message]

## Root Cause
[Specific technical explanation. "The database was slow" is NOT a root cause.
"The N+1 query in getUserPosts() executes one query per post in the loop,
hitting the DB 200 times per request at this traffic level" IS.]

## Why It Happened
[The chain of decisions/conditions that produced this]

## Fix
[Minimal code change. Show before and after.]

## Prevention
[Test / type / validation that would catch this next time]
```

## Rules
- Treat the symptom and the cause as different things
- Never guess without evidence — trace the actual execution path
- If you need more info (logs, env, code), ask for it before diagnosing
- "Works on my machine" is a clue, not a resolution
