# Dependabot lockfile sync approval runbook

## Regression fixture (real PR)

Use PR [#83](https://github.com/Quirk-Systems/project-scaffold/pull/83) (`dependabot/npm_and_yarn/t3-oss/env-nextjs-0.13.11`).

- Pre-sync Dependabot run succeeded on SHA `85bd4fed53f712743631dce48ec489a0d7764eaa`:
  - Dependabot lockfile run `31631735938`
- Sync commit `e5036c3c732d176237655e4e052b9e2571161e57` (`chore(deps): sync bun.lock with package.json`) was authored by `github-actions[bot]`.
- Fresh `pull_request` runs were created on the synced SHA and completed with no jobs:
  - CI run `31631755958` (`failed`, `total_jobs=0`)
  - Dependabot lockfile run `31631756042` (`failure`, `total_jobs=0`)

`get_job_logs` on both runs returns `No failed jobs found` with `total_jobs: 0`, which is the no-jobs approval trap signature.

## Cause

The actor transition from `dependabot[bot]` to `github-actions[bot]` on the sync commit triggers repository Actions approval policy for bot-authored `pull_request` synchronize events. Those runs can land in an un-runnable terminal state (`action_required`/no-jobs behavior in the UI history).

## Guardrail implemented by this repository

The sync commit now includes a `skip-checks: true` trailer, so post-sync bot-authored synchronize runs are intentionally skipped. Instead, `.github/workflows/dependabot-lockfile.yml` itself supplies read-only evidence on the exact synced SHA:

1. frozen install proof,
2. `bun run validate`,
3. e2e (`bun run test:e2e`),
4. security (`bun audit --prod` + TruffleHog),
5. semantic governance checks (registry lint + manifest validation).

This keeps dependency-controlled code out of write-token jobs while removing the hidden approval trap from post-sync PR updates.
