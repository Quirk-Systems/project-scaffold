# CI reconciliation follow-up — October 31, 2026

Base: PR #137 `ff7900a0c9f3ccc78b90d75dc194a775e91a02a4`, containing PR #153 `234a00cf994288d7836f5df4af1954b56bb292e0`. Main remains `1e04dfc91941905fff7312403bf0817eb2768c0f`.

## Corrections

- Scope esbuild `^0.25.12` to `@esbuild-kit/core-utils`, removing its 0.18.20 dependency. Other esbuild consumers retain their own versions; this avoids the prior global-override compatibility problem.
- Scope glob `^14.0.3` to react-email, removing 13.0.6. Email template discovery and HTML export pass.
- Override consumers declaring minimatch `^10` to `^11.0.3`. TypeScript ESLint uses the named API, while legacy ESLint plugins retain callable minimatch 3.1.5. A global major override would break those plugins.
- Nested overrides require lockfile format 3, supported by the pinned Bun 1.4.3. An install into a fresh node_modules directory confirms actual runtime resolutions, rather than trusting the audit or an incrementally updated directory.
- Run TruffleHog with `if: ${{ !cancelled() }}` so dependency-audit failures cannot skip the independent scan. Neither check permits failure. Its immutable action SHA `31ce31ee1abbcc7dc8eee5764c17121c3044c8b2`, release comment and explicit scanner version remain 3.99.7, checked by the workflow regression test.

Default-deny permissions, contents:read, disabled checkout credentials, frozen installs, caches, Node matrix, coverage, PostgreSQL service and report upload remain intact.

## Verification

Node 24.19.0 / Bun 1.4.3:

- `bun install --frozen-lockfile` after moving the old node_modules directory: passed. Scoped runtime resolutions are esbuild 0.25.12, glob 14.0.3, TypeScript ESLint minimatch 11.0.3; legacy React ESLint minimatch remains 3.1.5.
- `bun run validate`: preference/identity checks, lint, types, 274 tests in 29 files and production build passed. Named configuration exports remove all three pre-existing lint warnings without changing their values.
- Additional Node 22.22.2 and 24.15.0 lanes: lint and all 274 tests passed; Node 22.22.2 type checking also passed.
- `bun run test:run src/__tests__/ci-workflow.test.ts`: all 12 passed. Removing the scanner condition deliberately produced one failing test; restoring it passed.
- `bun run test:coverage`: 274 tests passed; statements 56.10%, branches 58.24%, functions 53.48%, lines 57.55%.
- `bunx drizzle-kit --version`: 0.31.11, ORM 0.45.3. `@esbuild-kit/core-utils` synchronous and asynchronous transforms of `export const n: number = 42` both pass. Database migrations were not run.
- `bunx email export --dir src/emails --outDir ../evidence/email-export`: passed, producing welcome and magic-link HTML.
- `bunx playwright test --list`: 21 tests discovered. `bunx playwright install chromium firefox webkit` failed because the Chromium download was an invalid/truncated ZIP. Browser assertions remain unexecuted.
- `bun audit --prod`: exit 0, no vulnerabilities across 164 packages.
- `bun audit --json`: exit 1, one moderate advisory remains; raw output is in `ci-followup-2026-10-31/full-audit.json`. No advisory exclusions were introduced.

The remaining GHSA-g3hv-75wg-m249 metadata covers all minimatch versions below 11.0.1. Its published description concerns `firstPhasePreProcess()` amplification with `optimizationLevel >= 2` in 10.2.6. The installed 3.1.5 source has neither that function nor optimizationLevel. This is a reachability assessment of this specific advisory, not a clean audit claim. Safe removal of the broad finding requires upstream advisory clarification or compatible releases of the legacy ESLint consumers; forcing the new API globally is not an acceptable fix.

## Hosted blocker and merge order

The security check annotation for check run 124474504587 explicitly says: “The job was not started because your account is locked due to a billing issue.” The raw annotation is retained in `ci-followup-2026-10-31/hosted-annotations.json`. This replaces the earlier reports' uncertainty about the zero-step failures; it is not evidence of a test or audit failure.

An account administrator must resolve GitHub billing before hosted CI can run. Do not weaken security or validation requirements to work around it. Final-head hosted CI, browser execution, secret scanning, evidence binding, semantic checks and applicable review remain unproved. No hosted success or merge is claimed.

Once validation is restored, merge #153 before #137 using merge commits to preserve receipt ancestry. #137 contains #152's exact scanner upgrade; merging #152 separately is unnecessary, and it must never restore a stale scanner version. #141 is closed without merging and is not an active dependency. #142/#149 are already included in #153's ancestry. User authorization to push and merge is recorded, but does not establish that these checks have passed.
