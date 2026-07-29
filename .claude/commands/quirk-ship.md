# /quirk-ship — prepare a branch for review

The canonical statement of this task is `.github/prompts/quirk-ship.prompt.md`.
Read it first; this file adds only what is specific to running it here.

## The gate

```bash
bun install --frozen-lockfile
bun run validate        # lint, type-check, unit tests, build
bun audit --prod        # must report no vulnerabilities
bun run test:e2e        # needs a Postgres at DATABASE_URL
```

A production-path advisory is a blocker, not a follow-up. `.github/deps-policy.json`
classes critical and high production findings as fail-now; dev-only findings warn.

## Before proposing the pull request

1. Read the branch diff in full. Look for generated output, debug leftovers,
   unrelated edits, and anything secret-bearing.
2. Confirm `tsconfig.json` is not in the diff unless you changed it on purpose
   — `next build` rewrites it, and that rewrite is not a change worth carrying.
3. Merge `origin/main` and re-run the gate. Checks build the merge of your head
   into main, so a green local branch can still fail on a moved base.
4. Mirror `.github/PULL_REQUEST_TEMPLATE.md`. Treat it as a layout to fill in.

## Evidence

Every claim in the description needs a command and its observed result behind
it. Numbers should be measured, not estimated: "84/84 tests", "19 production
advisories to 0", not "tests pass" or "improved security".

State what you did not verify as plainly as what you did.

Do not commit, push, merge, or open a pull request unless asked to.
