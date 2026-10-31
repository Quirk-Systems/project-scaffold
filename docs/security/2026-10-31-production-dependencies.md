# Production dependency remediation — October 31, 2026

The candidate clears all eight production audit findings reproduced on main
`1e04dfc91941905fff7312403bf0817eb2768c0f` and PR #137
`0440f2cb837d3e05efff832f6a0e0ea37e3560f1`. Their manifests and lockfiles were
identical. The full audit falls from 30 findings (3 critical, 8 high, 14 moderate,
5 low) to three moderate development-tool findings. This is a dependency repair,
not evidence that the CI proposal caused the vulnerabilities or that the app was
exploited.

## Recovered work and integration

- Reuses PR #142 at `566f0f6d3c969a707a482eb2819da02c030acc09` as an ancestor,
  but raises its still-vulnerable Next 16.4.0 to the patched 16.4 line.
- Reuses PR #149 at `92d683a652c9ec21b47d7343db5b1c69988e43a3` as an ancestor,
  including its Node `^22.22.2 || ^24.15.0` contract, three CI lanes, Bun 1.4.3,
  paired Vitest/coverage 5.0.5, jsdom 30.1.3, Playwright 1.64.1 and receipt.
  The renderer now needs Node >=20.19; the reused runtime correction covers it.
- Reuses the T3 Env 0.13.11 version proposed in #131 as part of the coordinated
  Zod migration; #131 alone leaves vulnerable Zod in place.
- Preserves #136's Tinypool removal and existing security overrides. #111's
  Next 16.3.3 would downgrade main. Closed, unmerged #116's global esbuild
  override had a documented email-preview regression and is not reused.
- PR #137's TruffleHog 3.99.7 reconciliation remains a separate CI change.
  Its merge with this runtime proposal requires preserving both the matrix and
  cache invalidation by Node version. Do not replace either workflow wholesale.
  Merge the dependency repair before the reconciled CI proposal, with merge
  commits so evidence subjects remain reachable. Only then consider #142/#149
  superseded and #152 covered by #137. No PR is approved for merge by this report.

## Exact production findings

Severity below is the fresh Bun audit classification; advisory websites can show
different CVSS scores. The JSON audit snapshots preserve the scanner response.

| Package and path                                                                             | Advisory                                                                                                                        | Severity | Installed before → after | Published fix                                                                        |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------ | ------------------------------------------------------------------------------------ |
| Direct `next`; also peer of `next-auth`                                                      | [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), Server Actions denial of service                      | High     | 16.3.8 → 16.4.3          | 16.4.1                                                                               |
| Same Next paths                                                                              | [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw), image optimization RCE                                | Critical | 16.3.8 → 16.4.3          | 16.4.1; sharp >=0.35.5                                                               |
| Same Next paths                                                                              | [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr), typed-array cache deserialization RCE                 | Critical | 16.3.8 → 16.4.3          | 16.4.1                                                                               |
| `posthog-js → dompurify`                                                                     | [GHSA-cg2g-xh64-v4q7](https://github.com/advisories/GHSA-cg2g-xh64-v4q7), shadow-root template sanitization bypass              | Critical | 3.4.16 → 3.4.17          | 3.4.17                                                                               |
| Same DOMPurify path                                                                          | [GHSA-mrv2-3pqr-j5jr](https://github.com/advisories/GHSA-mrv2-3pqr-j5jr), detached subtree event handlers                       | High     | 3.4.16 → 3.4.17          | 3.4.17                                                                               |
| Same DOMPurify path                                                                          | [GHSA-c6gr-qvv4-5v3f](https://github.com/advisories/GHSA-c6gr-qvv4-5v3f), XHTML SMIL sanitization bypass                        | Low      | 3.4.16 → 3.4.17          | 3.4.17                                                                               |
| Direct `zod`; Anthropic SDK and T3 Env peers; also ESLint React hooks in full graph          | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), oversized constrained collection resource consumption | High     | 3.25.76 → 4.6.7          | 4.6.6                                                                                |
| `@react-email/render → html-to-text → deepmerge`, including renderer nested under components | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), returned-object prototype poisoning                   | Low      | deepmerge 4.3.1 removed  | No patched deepmerge release; renderer 2.2.0 uses html-to-text 10.0.1 / deepmerge-ts |

The app has Server Actions and request-body Zod parsing. Next image/cache and
DOMPurify exploit prerequisites were not demonstrated in this app. The email
converter merges options; an attacker-controlled options path was not established.
These limits are not used to suppress any audit finding.

## Changes and compatibility checks

Next and eslint-config-next have matching `^16.4.1` floors, locked to 16.4.3.
The sharp floor is `^0.35.5` (locked 0.35.5); DOMPurify is `^3.4.17`.
Zod is `^4.6.6`, locked 4.6.7. T3 Env 0.13.11 supports Standard Schema;
resolvers `^5.2.2` resolves to 5.9.2 and supports Zod 4. Both one-argument
`z.record` calls now explicitly use string keys. Tests preserve request error
shape, arbitrary metadata values, resolver errors and environment fail-closed
behavior. No `zod/v3` compatibility import or forced incompatible peer is used.

Renderer `^2.2.0` is applied to the direct package and components' nested renderer
with an override. Both public render entry points retain HTML/plain-text sign-in
URLs; welcome names remain HTML-escaped. The production graph contains no
deepmerge. No email was sent during testing.

The full audit exposed a nested Zod 4.6.5 under ESLint after the direct migration;
the Zod override removes it. Compatible fast-uri 3.1.9 and Vite 6.4.5 floors
clear their four and five advisories respectively. #149 also removes the two
old mocker findings and updates the jsdom/Undici path (eight findings).
All removed advisory IDs can be compared in the attached audit JSON.

## Verification

Local execution used Linux x64 and Bun 1.4.3 for final checks. Initial baseline
audits and early checks used Bun 1.4.2. Exact commands, exit codes and timestamps
are in `production-dependencies-2026-10-31/results.json`.

| Check                                                                   | Result                                                                                                      |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Main and unchanged #137 `bun audit --prod`                              | Both exit 1: same 8 findings, 3 critical / 3 high / 2 low                                                   |
| Candidate production audit                                              | Exit 0: no vulnerabilities, 164 packages                                                                    |
| Fresh checkout, empty-cache `bun install --frozen-lockfile`             | Exit 0; package.json and bun.lock unchanged; no peer warnings                                               |
| Audit after that cold installation                                      | Exit 0: no production vulnerabilities                                                                       |
| Full `bun audit --json`                                                 | Exit 1: three moderate dev-tool advisories below                                                            |
| `bun run validate`, Node 22.22.2 / 24.15.0 / 24.19.0                    | All pass: 259 tests, types, identity/preference contracts, lint (3 existing warnings), production builds    |
| Final validate after adding three environment regressions, Node 24.19.0 | Pass: 262 tests, types, contracts, lint and build                                                           |
| `bun run test:coverage`, Node 24.19.0                                   | Pass: 262 tests / 28 files; 56.10% statements, 57.55% lines, untested files included                        |
| Zod bounded-array comparison                                            | Baseline visits 1,000 elements; candidate rejects before visiting any; both reject the same oversized input |
| Playwright discovery                                                    | Pass: 21 cases across Chromium, Firefox and WebKit                                                          |
| Playwright Chromium installation                                        | Exit 1: repeated invalid/truncated ZIP downloads; browser assertions not run                                |

Next's generated tsconfig edits were restored after builds, as in prior repairs.
The configured build-only `SKIP_ENV_VALIDATION=1` is unchanged; new environment
tests explicitly verify rejection with that variable absent. No audit ignore,
severity threshold, permissive failure setting or mutable action pin was added.

## Remaining full-audit findings and merge conditions

| Finding                                                                            | Vulnerable installed path                                                                | Fixed version / follow-up                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99), moderate | `drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild@0.18.20`      | >=0.25.0; migrate the loader path upstream. Bun's grouped output also lists installed 0.25.12/0.28.2, which are outside this advisory range. Do not reuse #116's global override. |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), moderate | `react-email → glob@13.0.6`                                                              | 14.0.2; separate CLI compatibility upgrade.                                                                                                                                       |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), moderate | ESLint/eslintrc minimatch 3.1.5; typescript-eslint and react-email/glob minimatch 10.2.6 | 11.0.1; separate coordinated tooling update rather than forcing a major through old consumers.                                                                                    |

Production dependency failure is resolved in the candidate. Main and #137's
previous head remain vulnerable until the repair is integrated. Merge still
requires final-head hosted CI, browser checks, secret scanning, Evidence Binding,
semantic checks and applicable review. The earlier hosted jobs had no steps and
no assigned runner; this is separate from dependency audit failures. Local passes
do not establish a hosted success or resolve the unverified startup cause.

The existing immutable action pins and security gates are retained. A follow-up
merge into #137 must retain its exact TruffleHog action SHA and scanner 3.99.7,
update cache keys for the reused Node matrix, retain coverage, and bind fresh
evidence for the combined tree. No deployment is part of this work.
