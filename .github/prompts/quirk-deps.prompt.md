---
name: quirk-deps
description: Audit dependency changes and upgrade risk
agent: ask
---

Analyze the dependency changes in the current branch or pull request.

For every changed direct dependency determine:

- previous and new versions
- major, minor, patch, prerelease, or lockfile-only change
- why it appears in the dependency graph
- relevant breaking or behavioral changes
- runtime, build, security, and peer-dependency risk
- required code or configuration migrations
- existing test coverage for affected behavior

Inspect lockfile changes for:

- unexpected transitive churn
- duplicate package versions
- runtime substitutions
- removed integrity protections
- changed install scripts
- ecosystem or engine requirement changes

Conclude with:

- **SAFE TO APPROVE**
- **APPROVE AFTER SPECIFIED CHECKS**
- **REQUEST CHANGES**

Draft a concise GitHub review comment supporting that verdict.
