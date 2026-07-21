---
name: quirk-review
description: Perform a decision-grade code or pull-request review
agent: ask
---

Review the selected changes against the repository's actual conventions.

Prioritize:

1. Incorrect behavior.
2. Security, authorization, privacy, or secret-handling failures.
3. Data loss and migration hazards.
4. Broken public contracts or backward compatibility.
5. Race conditions, retries, partial failure, and idempotency.
6. Missing tests for meaningful behavior.
7. Performance regressions.
8. Unnecessary complexity.

For every finding include:

- Severity: blocker, high, medium, or low.
- Exact location.
- Failure scenario.
- Why it matters.
- Smallest credible correction.

Do not report hypothetical style preferences as defects.

Finish with exactly one verdict:

- **APPROVE**
- **APPROVE WITH NON-BLOCKING NOTES**
- **REQUEST CHANGES**

Explain what evidence would change the verdict.
