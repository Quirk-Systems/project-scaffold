# September 10 repair evidence

**CANDIDATE / STATE_ONLY / TEST-ONLY. Human review OPEN.**

Baseline: #106 at `5f27d1c3ec5aa15e991c63582b5d8d25f55ca58e`.
The 49 selected local baseline files were checked against the Git blob identities
at that remote head. The local Git history is a diagnostic projection, not the
repository's commit history. Production sources and the original 60 plan code
blocks are unchanged by these repairs.

## What failed before repair

- [Scope regression](scope-red.tap): one targeted test failed because a denied
  proposal could use another candidate's trusted clean history and become eligible.
  [Historical test source](scope-red-test.mjs.txt) and
  [baseline identities](scope-baseline-identities.json) preserve the exact input
  construction and source hashes. The current adapter suite contains the portable
  regression and its valid other-candidate control.
- [Actual original verifier](original-verifier-tampered-receipt.json): only the
  original receipt was edited to assert admission, effect execution, human approval,
  runtime safety, and no unproved surfaces. The unchanged original verifier
  returned exit 0. Its [output](original-verifier-tampered-receipt.txt) is preserved.
  This is a demonstrated verifier omission, never evidence that those claims hold.
- [Initial receipt RED](receipt-initial-red.tap): 87 tests, 22 passed and 65 failed
  against a behavior-preserving extraction of the original selective checks.
  The [extracted helper](receipt-legacy-helper.mjs.txt) and
  [frozen initial tests](receipt-initial-tests.mjs.txt) identify that diagnostic
  baseline. [Initial GREEN](receipt-initial-green.tap) then passed all 87 tests.

Four additional receipt cases were added after that first repair, including the
third required log and a malformed digest edge case. That pre-integration 91-case suite
must not be described as 91 preimplementation failures. A later replay of the
legacy helper against the expanded suite produced 24 passes and 67 failures; it
is subsequent mutation evidence. The original #106 suite's first full run was
green; these September 10 repairs do not rewrite its earlier chronology.

## Current proof and remaining authority

Run `node evals/session-composition/adapter/verify.mjs --check` from the repository
root. The current [receipt](../verification.json) separates original probe,
adapter, and receipt-integrity counts. Its four raw logs record current adapter
tests, receipt tests, history-erasure mutation and the retained consolidation first
run from the concurrent update. Source hashes also cover this
historical evidence directory. Raw historical `.txt` sources retain their observed
local paths and are inspectable snapshots, not standalone commands.
Raw TAP logs retain reporter-generated whitespace; source whitespace checks exclude
those observation files rather than rewriting their recorded bytes.

[Scope review](scope-review.md) and [receipt review](receipt-review.md) are separate
agent assessments. They preserve the human gate. The root verification checks
the combined payload after these reviews; the containing Git commit identifies
the complete candidate. A hash or passing replay does not authenticate historical
runtime claims, establish durable history trust, or supply human consent.

[Full repository validation](repository-validation.txt) remained unavailable
locally. Task 4 execution with real grants, durable history authentication,
live-clock freshness/revocation, Task 6 consumption, concurrency/delegation,
repository integration, and independent human approval remain open.

## Preserved concurrent update

Before publication, #106 advanced to
`3f61af2d9a4dbc966e35bc757db14e5fbbee4a86`. Its 13 adapter tests, coverage map,
first-run log and development evidence were merged into this repair. The required
log registry grew from three to four entries. The first combined local run passed
218 of 219 tests: one historical-log control omitted the newly required fourth
key. The control was corrected to include the unchanged historical log digest;
no expected rejection or allowed behavior was relaxed. The combined suite then
passed 126 adapter and 93 receipt tests. This was an integration fixture correction,
not a new adapter defect or preimplementation RED/GREEN claim. The
[integration review](integration-review.md) covers the merge and final verifier
changes; the original adapter implementation, fixture context repair and pinned
plan loader remain unchanged from their reviewed versions.
