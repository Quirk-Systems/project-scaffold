# Halo CodeRabbit trial 01 — evidence and usefulness

Date: 2026-11-01. Status: CANDIDATE / RELEASE HOLD.

## Result

One manual full review executed and published two substantive issues. Both were verified; neither was a false positive. CodeRabbit submitted **CHANGES_REQUESTED**, not approval. The behavioral issue was also independently reproduced during review processing before the bot published it. That overlap supports correctness but is not evidence of time saved.

- [PR #154](https://github.com/Quirk-Systems/project-scaffold/pull/154)
- Reviewed head: `9b6b322500f3aa3e7cd430a6c2d1e2a0bd576665`.
- Base: `1e04dfc91941905fff7312403bf0817eb2768c0f`.
- [Single manual request](https://github.com/Quirk-Systems/project-scaffold/pull/154#issuecomment-6562397393): 18:56:07 UTC.
- [Bot acknowledgment](https://github.com/Quirk-Systems/project-scaffold/pull/154#issuecomment-6562398673): 18:56:13 UTC.
- [Published review](https://github.com/Quirk-Systems/project-scaffold/pull/154#pullrequestreview-5729763108): 19:01:49 UTC; commit_id matches the reviewed head.
- Request-to-publication latency: **5 minutes 42 seconds**.
- CodeRabbit reports **Advanced**, **CHILL**, Repository UI configuration, eight files selected, and one included review consumed.
- No repository YAML applied; none was present in the reviewed repository tree or the inspected organization configuration repository. The original draft skip was expected configuration behavior; the manual command worked without enabling automatic draft reviews.
- The GitHub CodeRabbit check was still `in_progress` immediately after the submitted review. Publication is proven independently of that asynchronous check badge.

## Triage

| Issue                                                                                                                                        | Classification                                                                                     | Evidence and correction                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Feedback changes during hashing can restore stale proof](https://github.com/Quirk-Systems/project-scaffold/pull/154#discussion_r4436942521) | CodeRabbit: Minor, Data Integrity. Verified application defect affecting local approval integrity. | A controlled digest barrier reproduced a verified receipt for old text while the textarea showed new text. Disable feedback while busy, and bind completion to an input revision so queued/programmatic input invalidates stale success or failure. Require a fresh click after invalidation. |
| [Plan still says hosted CI is pending](https://github.com/Quirk-Systems/project-scaffold/pull/154#discussion_r4436942518)                    | CodeRabbit: Minor, Maintainability. Verified evidence defect.                                      | PLAN.md contradicted the PR's known failed checks. Record the original exact SHA and failed runs, zero executed CI validation/security steps, skipped E2E, reported missing logs, and unconfirmed code-level diagnosis. Keep later-head evidence separate.                                    |
| Halo tests excluded from the normal validation/CI path                                                                                       | Independently discovered integration gap; **not attributed to CodeRabbit**.                        | Vitest includes only src TypeScript tests. Added `test:halo` to package scripts, local validate, and the existing CI validation job. No new workflow permissions or draft-review settings.                                                                                                    |

False positives: **0 among the 2 actionable issues**. This is a very small sample, not a precision estimate for the product.

The extra **0% docstring coverage / 80% threshold** warning is treated as a low-priority policy advisory, not a demonstrated runtime defect or an independently adopted release requirement. Its measurement was not independently reproduced. No broad docstring rewrite or review-policy change was made.

## Scope of assessment

- **Correctness / human approval:** the stale-proof race is reproduced and fixed. A/B/Neither, explicit approval, reset, and optional feedback remain intact. Neither still emits no chosen candidate hash.
- **Deterministic receipt verification:** all ten existing adversarial and determinism tests still pass. `public/halo/receipt.mjs` is unchanged, as are the original fixture text, alternatives, page HTML, and binding specification. Receipts remain unsigned, locally generated, candidate-only, `applied:false`, and `authority:none`.
- **Security:** the correction introduces no network, storage, new application dependencies, signing claim, or execution authority. No separate Security Review report or security-specific issue was published in the inspected discussion. Advanced-plan execution is demonstrated; incremental value of its Security Review feature is **not yet demonstrated**.
- **Accessibility:** native controls and existing status announcements are preserved. Feedback is disabled during processing and re-enabled after success or failure. Synthetic HTML/DOM checks do not establish real keyboard, mobile, screen-reader, or reduced-motion acceptance.
- **Realistic failure behavior:** new tests cover delayed hashing with a changed input, crypto failure clearing previous proof with retry, and clipboard denial retaining a manually copyable receipt. These are controlled simulations, not live-browser observations.

## Validation and effort

Environment: Node 24.22.1; Bun 1.4.4 installed in a temporary tool directory. Frozen dependency installation succeeded without dependency or lockfile changes.

- Baseline at the reviewed head: **12/12 Halo tests pass**.
- Added race regression: **failed before correction** (stale proof became visible), then passed.
- Final `bun run validate`: **PASS** — preference-contract and repository identity checks, lint (three pre-existing config warnings), type checking, **252/252 Vitest tests**, **15/15 Halo tests**, and production build.
- `git diff --check` and formatting checks apply to changed files.
- Next.js automatically rewrote tsconfig.json while building; that generated change was restored and is not part of this correction. The existing middleware deprecation warning remains.
- Browser attempt: Chromium executable absent; one standard Playwright installation command failed after its built-in download retries with invalid ZIP archives. No browser acceptance claim.
- Original CI run `41302633504`: validation and security failed with `steps:[]`, `runner_id:0`; E2E skipped. This proves unexecuted hosted gates, not an application failure. Connector access to check annotations was rejected as an unsupported URL, so no billing/root-cause inference is made here.
- Effort: one failing reproduction; one bounded client-state fix; one evidence-ledger correction; one test-wiring correction; **three added regression scenarios**. Touched JS files were formatted to satisfy existing hooks. No human correction-time or saved-time estimate was measured.
- This corrective commit is a descendant of the reviewed head. The original review does **not** cover the corrective commit; hosted checks must also be assessed at that resulting SHA.

## Trial decision

**Continue with one more bounded trial; do not infer purchase ROI or release readiness.**

The service successfully reviewed a draft on demand and supplied two accurate, concrete comments, including a meaningful approval-integrity race. The modest warning noise and absence of a dedicated security result leave Advanced-specific value unresolved. A further trial should measure independently verified new defects, false positives, correction time, and whether Security Review yields actionable security evidence on an appropriate authorized change.

No organization-wide draft reviews, autofix service, merge, deployment, human acceptance, or authority promotion was enabled. Original source remains in the parent commit. Human acceptance and green exact-head hosted CI remain separate requirements.
