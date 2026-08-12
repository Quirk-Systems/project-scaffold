# Project Scaffold Archive Transition

Status: **OWNER APPROVED; GATE INCOMPLETE**

Approval authority: **Quirk Systems repository owner**

Approval date: **2026-08-12**

Inventory observed: **2026-08-12 09:03 UTC**

Extraction base: [`80938de`](https://github.com/Quirk-Systems/project-scaffold/commit/80938de9bcad1f145d043a19c560450a2b45f3a1)

## Decision and truth boundary

The owner approved moving `Quirk-Systems/project-scaffold` from active
development to archive. The repository is frozen now and becomes `archived`
only after every gate below is evidenced. Until GitHub archive mode is enabled,
`frozen` is the truthful machine-readable lifecycle.

This decision does not rename or promote this repository. Project Scaffold
remains a historical application scaffold and reference implementation;
[`Quirk-Systems/quirk-os`](https://github.com/Quirk-Systems/quirk-os) is a
separate downstream system. Issue
[#75](https://github.com/Quirk-Systems/project-scaffold/issues/75) and PR
[#76](https://github.com/Quirk-Systems/project-scaffold/pull/76) remain closed,
superseded evidence and must not be reopened as archive work.

## Work-item disposition

Allowed classifications are `merge here`, `transfer`, `superseded`,
`duplicate`, and `close as not planned`. The repository owner is the decision
owner unless another owner is named. Closing a transferred item requires a live
destination link; copying code without that link does not satisfy closure.

### Open issues

| Item                                                                                      | Classification | Owner                      | Dependency                                             | Closure criterion                                                                               |
| ----------------------------------------------------------------------------------------- | -------------- | -------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [#64 Agent Governance Layer](https://github.com/Quirk-Systems/project-scaffold/issues/64) | transfer       | `@bryansayler`, Quirk OS   | destination issue in `quirk-os`; reconcile PR #66      | Destination tracks the 11 primitives and links the preserved source, then close here            |
| [#59 Containment Contract](https://github.com/Quirk-Systems/project-scaffold/issues/59)   | transfer       | `@bryansayler`, Quirk OS   | destination issue in `quirk-os`; reconcile PR #60      | Destination owns contract enforcement and links source evidence, then close here                |
| [#57 Ontology Registry](https://github.com/Quirk-Systems/project-scaffold/issues/57)      | transfer       | `@bryansayler`, Quirk Core | verified second independent consumer; reconcile PR #61 | Create a provenance-linked `quirk-core` candidate only after consumer evidence, then close here |
| [#56 Formatting baseline](https://github.com/Quirk-Systems/project-scaffold/issues/56)    | superseded     | `@bryansayler`             | archive validation; PR #62                             | Terminal release validates without broad historical reformatting; close with archive decision   |

### Open pull requests

No open PR is accepted as-is. All are based on pre-freeze work and must be
closed after the action below. Closing also dismisses outstanding review
requests; no unresolved review thread may be carried into the archive.

| PR                                                                                            | Classification       | Owner                      | Dependency                         | Closure criterion                                                               |
| --------------------------------------------------------------------------------------------- | -------------------- | -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| [#77 Anthropic SDK](https://github.com/Quirk-Systems/project-scaffold/pull/77)                | close as not planned | `@dependabot`              | none                               | Close; successors choose their own supported SDK                                |
| [#72 Claude setup/schema refactor](https://github.com/Quirk-Systems/project-scaffold/pull/72) | superseded           | `@bryansayler`             | archive validation                 | Preserve useful learnings through successor-local work; close mixed PR          |
| [#71 TypeScript 7](https://github.com/Quirk-Systems/project-scaffold/pull/71)                 | close as not planned | `@dependabot`              | none                               | Close major upgrade                                                             |
| [#70 vite-tsconfig-paths 6](https://github.com/Quirk-Systems/project-scaffold/pull/70)        | close as not planned | `@dependabot`              | none                               | Close major upgrade                                                             |
| [#67 workflow permissions](https://github.com/Quirk-Systems/project-scaffold/pull/67)         | superseded           | `@bryansayler`             | terminal archive commit            | Confirm equivalent `contents: read` hardening is on the terminal branch; close  |
| [#66 governance scaffold](https://github.com/Quirk-Systems/project-scaffold/pull/66)          | transfer             | `@bryansayler`, Quirk OS   | destination issue for #64          | Re-evaluate against current Quirk OS contracts; preserve provenance; close here |
| [#65 testing group](https://github.com/Quirk-Systems/project-scaffold/pull/65)                | close as not planned | `@dependabot`              | none                               | Close major test-stack update                                                   |
| [#62 Prettier baseline](https://github.com/Quirk-Systems/project-scaffold/pull/62)            | superseded           | `@bryansayler`             | issue #56 disposition              | Close without a repository-wide historical rewrite                              |
| [#61 ontology registry](https://github.com/Quirk-Systems/project-scaffold/pull/61)            | transfer             | `@bryansayler`, Quirk Core | second-consumer proof for #57      | Rebuild as a scoped, provenance-linked candidate in `quirk-core`; close here    |
| [#60 containment contract](https://github.com/Quirk-Systems/project-scaffold/pull/60)         | transfer             | `@bryansayler`, Quirk OS   | destination issue for #59          | Re-evaluate against Quirk OS runtime; preserve provenance; close here           |
| [#55 foundational architecture](https://github.com/Quirk-Systems/project-scaffold/pull/55)    | transfer             | `@bryansayler`, Quirk OS   | destination architecture inventory | Transfer only still-relevant contracts, never repository identity; close draft  |
| [#52 setup-node 7](https://github.com/Quirk-Systems/project-scaffold/pull/52)                 | close as not planned | `@dependabot`              | none                               | Close; no terminal toolchain major                                              |
| [#49 SWERVEME proof](https://github.com/Quirk-Systems/project-scaffold/pull/49)               | close as not planned | `@bryansayler`             | none                               | Preserve branch/PR history as an unsupported experiment; close draft            |
| [#46 Lefthook 2](https://github.com/Quirk-Systems/project-scaffold/pull/46)                   | close as not planned | `@dependabot`              | none                               | Close major upgrade                                                             |
| [#44 commitlint CLI 21](https://github.com/Quirk-Systems/project-scaffold/pull/44)            | close as not planned | `@dependabot`              | none                               | Close major upgrade                                                             |
| [#37 commitlint config 21](https://github.com/Quirk-Systems/project-scaffold/pull/37)         | close as not planned | `@dependabot`              | none                               | Close peer-coupled major upgrade                                                |
| [#32 checkout 7](https://github.com/Quirk-Systems/project-scaffold/pull/32)                   | close as not planned | `@dependabot`              | none                               | Close terminal workflow major                                                   |
| [#16 t3-env 0.13](https://github.com/Quirk-Systems/project-scaffold/pull/16)                  | close as not planned | `@dependabot`              | none                               | Close stale integration upgrade                                                 |

### Resolved during the transition

Concurrent work merged three PRs after the initial freeze inventory and before
the archive branch incorporated current `main`:

| PR                                                                                          | Resolution | Main commit                                                                                                    | Archive treatment                                                                                |
| ------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [#80 Never #0001 authority gate](https://github.com/Quirk-Systems/project-scaffold/pull/80) | merged     | [`826022f`](https://github.com/Quirk-Systems/project-scaffold/commit/826022f3f9310be43bd68944a4255f3dedcc7534) | Preserve as terminal history; Quirk OS transfer still requires destination review and provenance |
| [#79 Conversation Compiler](https://github.com/Quirk-Systems/project-scaffold/pull/79)      | merged     | [`abff877`](https://github.com/Quirk-Systems/project-scaffold/commit/abff8779b7aa3f9a593e5e0bafe8046f3e241378) | Remains proposed, not canon; destination must run its own corpus and admission                   |
| [#78 `@types/node` 26](https://github.com/Quirk-Systems/project-scaffold/pull/78)           | merged     | [`64b09bc`](https://github.com/Quirk-Systems/project-scaffold/commit/64b09bc790ddc303c220348101dc333df50806f7) | Include in terminal validation; no additional migration work                                     |

The initial inventory was four issues plus 21 PRs. A second query after those
merges found four issues plus 18 PRs. Draft PRs #79 and #80 had no review
threads or submitted reviews before merge. No remaining PR may be merged merely
to make the count zero; transferred value must first receive a destination and
all other work must close with its recorded rationale.

## Extraction map

The extraction unit is the contract and its provenance, not the directory.
Destination repositories must adapt and validate the material independently.

| Source surface                                                                     | Destination                                   | Status and gate                                                                   |
| ---------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/quirk/`, Quirk API examples, lifecycle agents                             | `quirk-os`                                    | Reference only; transfer selected contracts, not the application wholesale        |
| Design Tribunal skill, critics, contracts, fixtures, docs, ledger candidate        | `quirk-os`                                    | Transfer as `candidate`; all 11 admission requirements rerun there                |
| Agent governance, containment, authority-gate, and conversation-compiler PRs       | `quirk-os`                                    | Transfer through destination issues with original PR/commit links                 |
| `src/lib/ai/` voice/persona examples                                               | `quirk-os` when demanded by an active surface | No package extraction without a real second consumer                              |
| Ontology proposal and Git-canonical contracts                                      | `quirk-core`                                  | Candidate only; extraction waits for a verified second independent importer       |
| Organization prompts, policies, repository lifecycle, shared workflows             | `.github`                                     | Apply by an authorized change in that repository; do not treat this copy as canon |
| Generic Next.js scaffold, billing, email, auth, database, and integration examples | terminal Project Scaffold release             | Historical reference; no designated maintained successor                          |
| Product-specific experiments such as SWERVEME and one-of-one offers                | terminal Project Scaffold history             | Unsupported examples; not transferred automatically                               |

Every destination record must include the source repository, source path,
source commit, originating issue/PR, destination owner, lifecycle status, and
independent validation evidence. The terminal release tag supplies immutable
provenance for files not tied to an earlier commit.

## Successor validation evidence

Successor existence is not validation.

| Repository   | Observed evidence                                                                                                                                     | Archive consequence                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `quirk-os`   | Live, separate repository with contracts, agents, skills, tests, and workflows; recent candidate workflows were `action_required` at observation time | Independence is plausible but the required validation/security/migration/deployment evidence is not complete |
| `quirk-core` | Live, sparse candidate repository with Git canon and Supabase migration material; its only observed candidate-validation run failed                   | Blocks ontology extraction and archive completion until green independent validation                         |
| `.github`    | Live organization-authority repository, but profile and repository strategy still assert the cancelled rename                                         | Blocks archive completion until cross-repository canon is corrected                                          |

For each adopted system, attach links proving:

1. repository-local validation and security checks pass;
2. migrations apply and roll back in isolation;
3. deployment or explicit non-deployment status is documented;
4. ownership, permissions, environments, and support are declared;
5. the system runs without Project Scaffold private context;
6. rollback and failure recovery are tested.

## Design Tribunal disposition

Design Tribunal is transferred conceptually to `quirk-os` as a **candidate**,
not admitted here. Its 11 admission requirements remain mandatory in the
destination. The builder/critic/referee separation and historical findings must
survive transfer.

Supabase owns the private `quirk_internal` migration sequence; Drizzle owns the
application schema and excludes `quirk_internal`. Git owns canonical contracts,
while Supabase is projection/evidence storage only. The retained SQL is not
production evidence. Quirk OS must prove isolated apply, security assertions,
rollback, advisor results, and generated types before making integration or
release claims.

## Required organization corrections

These changes belong to `Quirk-Systems/.github` and require a separate,
authorized change there:

1. In `profile/README.md`, point `quirk-os` to
   `https://github.com/Quirk-Systems/quirk-os`; remove the claim that Project
   Scaffold is a kernel awaiting rename; list Project Scaffold as a frozen
   historical reference pending archive.
2. Supersede section 2 and the Phase 0 rename step in
   `docs/REPOSITORY_STRATEGY.md`.
3. Classify `project-scaffold` as `reference / frozen → archived` and the actual
   `quirk-os` repository according to its own approved lifecycle.
4. Mark the old rename runbook `SUPERSEDED — DO NOT EXECUTE`.
5. Update the machine-readable portfolio registry and links, then run the
   organization semantic-governance checks.

Repository-local documentation cannot claim those external corrections are
complete.

## Terminal release

Proposed tag: `project-scaffold-archive-2026-08-12`

Release title: **Project Scaffold — terminal archive release**

Release notes:

- freezes the runnable scaffold and bundled reference implementation;
- preserves the decision that Project Scaffold is not Quirk OS;
- records extraction targets and source provenance;
- transfers Design Tribunal as an unadmitted Quirk OS candidate;
- leaves ontology extraction gated on a second independent consumer;
- declares product experiments and generic integrations unsupported;
- provides no security or compatibility support after GitHub archival.

Before publishing, record the exact terminal commit SHA, run
`bun run validate`, the applicable E2E and security checks, verify the tag
points to that SHA, and attach the resulting URLs here. Do not publish a
terminal release while any archive gate is false.

### Local pre-release evidence

The archive branch produced the following local evidence on 2026-08-12:

- `bun install --frozen-lockfile` passed with Bun 1.3.14 after regenerating the
  inconsistent lockfile and restoring a Vite-compatible React plugin;
- `bun run validate` passed: identity, lint (zero errors), strict types, 146 unit
  tests, and the production build;
- `bun audit --prod` reported no vulnerabilities after safe transitive
  `dompurify` and `nanoid` overrides;
- Playwright passed all six Chromium, Firefox, and WebKit tests against a
  temporary PostgreSQL 16 service.

This local evidence does not replace required default-branch CI, secret
scanning, CodeQL, or the final release/tag checks.

## Migration guidance

Consumers should not track this repository's default branch after the terminal
release. Pin the terminal tag for historical reproduction. Move active Quirk OS
contracts to destination-owned versions in `quirk-os`; consume `quirk-core`
only after it publishes independently validated contracts. Copy generic
scaffold examples into a maintained application and assume ownership of their
dependencies, secrets, migrations, and security posture.

No runtime, package, database, deployment, or link is guaranteed after archive.
Supabase rows and copied files are not canonical authority.

## Archive gate

- [x] Owner approved retirement.
- [x] Repository identity remains Project Scaffold, separate from Quirk OS.
- [x] Issue and PR disposition is complete and owner-assigned.
- [x] Extraction targets and second-consumer gates are documented.
- [x] Design Tribunal has a candidate destination and migration-authority decision.
- [ ] Every transferred item has a live destination issue and provenance link.
- [ ] All four issues and 18 remaining PRs are closed; no review request or thread remains.
- [ ] `quirk-os` passes its independent validation, security, migration, and deployment gates.
- [ ] `quirk-core` passes independent validation and has second-consumer evidence before ontology extraction.
- [ ] `.github` profile, strategy, runbook, and portfolio registry carry the separation decision.
- [ ] Project Scaffold terminal validation, E2E, dependency audit, secret scan, and CodeQL are green.
- [ ] Terminal commit SHA is recorded and the terminal release/tag is published.
- [ ] Default-branch required checks are green with no pending runs.
- [ ] Owner performs final sign-off after reviewing this evidence.
- [ ] GitHub archive mode is enabled and its read-only state is verified.

The final operator must re-query GitHub immediately before sign-off. Archive
mode is the last action, never a substitute for the checks above.
