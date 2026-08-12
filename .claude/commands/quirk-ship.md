# /quirk-ship — prepare a branch for review

The canonical statement of this task is `.github/prompts/quirk-ship.prompt.md`.
Read it first; this file adds only what is specific to running it here.

## The gate

```bash
bun install --frozen-lockfile
bun run validate        # lint, type-check, unit tests, build
bun audit --prod        # must report no vulnerabilities
```

`bun run test:e2e` runs Chromium, Firefox, and WebKit. A web session has only
Chromium and no Postgres, so the full gate belongs to CI; locally the most you
can prove is `bun run test:e2e -- --project=chromium` against a reachable
`DATABASE_URL`. Report which of those you actually ran.

A production-path advisory is a blocker, not a follow-up. `.github/deps-policy.json`
classes critical and high production findings as fail-now; dev-only findings warn.

## Before proposing the pull request

1. Read the branch diff in full. Look for generated output, debug leftovers,
   unrelated edits, and anything secret-bearing.
2. Confirm `tsconfig.json` is not in the diff unless you changed it on purpose
   — `next build` rewrites it, and that rewrite is not a change worth carrying.
3. Compare against the current base without mutating the branch:
   `git fetch origin main && git diff origin/main...HEAD --stat`. Checks build
   the merge of your head into main, so a green local branch can still fail on
   a moved base — but merging is a change to the branch, so ask before doing it
   rather than doing it as part of preparing a review.
4. Use `.github/PULL_REQUEST_TEMPLATE.md` for the description's headings —
   Summary / Changes / Test plan / Notes for reviewer. The canonical prompt
   proposes a different six-heading layout (Outcome, Implementation,
   Verification, Risk, Review Focus, Follow-ups); that is the portable default
   for repositories without a template, and this repository has one. Its
   headings win here. Carry the intent of the six across anyway: what becomes
   possible goes in Summary, risk and review focus go in Notes for reviewer.

## Evidence

Every claim in the description needs a command and its observed result behind
it. Numbers should be measured, not estimated: "84/84 tests", "19 production
advisories to 0", not "tests pass" or "improved security".

State what you did not verify as plainly as what you did.

Do not commit, push, merge, or open a pull request unless asked to.
