# Commit

Analyze the current diff and execute a well-formed conventional commit.

## Steps

1. Run `git diff`, `git diff --staged`, `git status` to see all changes
2. Stage relevant files — never: .env files, secrets, build artifacts, console.logs
3. Draft commit message:

```
<type>(<scope>): <description>

[body — WHY, not what. Wrap at 72 chars.]

[footer — "Closes #123", "BREAKING CHANGE: ..."]
```

**Types:** feat | fix | docs | refactor | test | chore | ci | perf | revert

## Rules
- Imperative mood: "add" not "added"
- Subject line max 72 chars, no trailing period
- If changes span multiple concerns, propose splitting
- Show the message before executing — confirm then commit
