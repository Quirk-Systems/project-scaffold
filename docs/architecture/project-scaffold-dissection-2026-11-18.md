# Project Scaffold: dissection and successor proposal

**Status:** proposed topology; additive starter candidate implemented in this
working change. **Decision authority:** repository owner. **Recommended
disposition:** Split. This is not a repository rename, an accepted identity
change, a migration, a release, or a claim that the existing app is production
ready.

## The point

Give a new Quirk project a small, independently owned place to begin while
preserving the more unusual asset-making application, its existing history,
and the work that may eventually become reusable Quirk capabilities. A starter
should help a person get moving; it should not require them to inherit an
entire product and its identity to do so.

## What the source actually contains

The inspected `project-scaffold` default branch was
[`1e04dfc91941905fff7312403bf0817eb2768c0f`](https://github.com/Quirk-Systems/project-scaffold/tree/1e04dfc91941905fff7312403bf0817eb2768c0f).
At that snapshot:

| Layer                           | Evidence in the repository                                                                                         | What that demonstrates                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application baseline            | Root `package.json`, Next.js configuration, app shell, UI primitives and validation tooling                        | A reusable starting point exists, but is bundled with more than a baseline.                                                                         |
| Asset application               | `src/app/quirk`, `src/app/api/assets`, `src/lib/quirk`, pipelines and agents                                       | A product-shaped reference implementation exists. Its complete behavior and release readiness were not established by this inventory.               |
| Shared persistence and services | `src/lib/db/schema.ts`, `drizzle/`, auth, billing, email, analytics, media and AI clients                          | Auth and billing tables, Quirk asset tables and ontology tables share a schema and migrations. An extraction cannot be assumed to be a folder move. |
| Governance and experiments      | `src/lib/quirk/governance`, `preference-evidence`, design-tribunal contracts, conversation compiler and their docs | Different candidates have different authorities and maturity; their location here does not make this repo Quirk OS or make any candidate canonical. |
| Historical record               | `.quirk/evidence/`, the identity decision, and open branches and PRs                                               | Preserve source SHAs and prior claims. A new repository or receipt does not retroactively verify or approve them.                                   |

Two concrete starter contradictions were reproduced or inspected:

1. The old project checklist told a new project to change `package.json`'s
   name. Running the original identity check against a temporary copy with
   only that name changed exited 1, because the source repo's identity guard
   correctly requires `project-scaffold`.
2. The old bootstrap guide described SQLite and `local.db`; `drizzle.config.ts`,
   the database client, and the first migration use PostgreSQL and pgvector.
   The root `predev` script runs the database migration before the dev server.

At the inspected snapshot, a case-insensitive tracked-file search found 47
files containing `project-scaffold` (excluding `bun.lock`), including
historical receipts. This is a **lower-bound local search**, not a complete
inventory of external users, installations, links, deployments, or secrets.
The organization registry identifies the repo as a public reference, while
`quirk-os` and `quirk-core` have separate candidate responsibilities.

## Actual alternatives

| Approach                                                          | Benefit                                                                                             | Cost and reason for disposition                                                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the name and the entire combined app                         | No migration; preserves today's layout.                                                             | The starter/product coupling and setup contradiction remain unless repaired. Keep the existing identity during evaluation.                          |
| Rename the combined repository in place                           | A more recognizable Quirk name.                                                                     | A new label does not separate the jobs, and a rename affects identity checks and downstream references. Do not execute from a name alone.           |
| **Split the starter, product reference, and shared capabilities** | Each can evolve according to its own users, dependencies, permissions, evidence, and release cycle. | Requires an inventory, explicit ownership and compatibility proofs. Begin with an additive starter, then evaluate actual extraction.                |
| Rebuild everything                                                | A clean architectural slate.                                                                        | Highest risk of losing tested behavior, creative work, evidence and branch lineage; justified only if targeted extraction cannot meet the contract. |

## Proposed boundaries and names

These names are candidates, not accepted identities or newly created repos.

| Candidate                                     | Job and likely contents                                                                                                           | Boundary and open questions                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quirk Web Starter** (`quirk-web-starter`)   | A small independent web project with explicit opt-in additions. The present `starters/web` and generator are the first candidate. | Is a web-specific starter the right reusable unit, and which optional modules earn upkeep? Separate release, dependencies and local project identity. |
| **Quirk Asset Studio** (`quirk-asset-studio`) | The existing asset lifecycle reference: capture, annotate, mutate, diff, experiment, promotion and related surfaces.              | Name, owner, users and actual product scope are undecided. Do not confuse this working label with an already launched Quirk Studio product.           |
| **Shared contracts and runtime**              | Versioned meanings in `quirk-core`; operating composition in `quirk-os` where actually owned and admitted.                        | Transfer only after exact contract, owner, caller and compatibility review. Do not promote a reference implementation by moving it.                   |
| **Experiments and tools**                     | Conversation compiler, Tribunal, preference wedge and other independently valuable pieces.                                        | Keep source and review history; evaluate each capability separately before extracting, sharing or retiring it.                                        |

## What this change implements

- `starters/web` contains a minimal, independently named Next.js candidate
  with a local idea-and-next-move interaction. It has no configured database,
  auth, billing, AI provider or Quirk OS runtime.
- `scripts/create-quirk-starter.mjs` writes an explicit list of template files
  only to a new destination. It does not install packages, run scripts, create
  a remote repository, connect accounts or deploy. An I/O failure can leave a
  partial new directory; inspect it before cleanup.
- The generator creates `QUIRK-STARTER-RECEIPT.json` with the generated
  file hashes. It records file creation, not user approval, execution of the
  generated project, adoption, independent verification, or authority.
- The original identity guard and full reference application remain in place.
  The starter can be evaluated without changing the existing identity decision.
- The starter intentionally uses an independent npm lockfile and Node
  requirement. It is not a Bun workspace and does not claim parity with the
  root app's many integrations.

## Migration sequence, if the owner chooses to proceed

1. **Prove the starter:** clean install, tests, build, dependency audit, and
   real desktop/mobile/keyboard interaction. Compare it with using the root
   app for at least one actual new project. Record what is missing or unwanted.
2. **Inventory consumers:** identify derived projects, pinned paths and
   package references; organization registry and profile references; workflows
   and reusable actions; secrets and environment names; deployment settings,
   URLs, package/container names, permissions and branch policies. External
   consumers and owner-only settings remain unknown until inspected.
3. **Map the reference:** separate user-facing behavior, APIs, persistence,
   migrations, credentials, access control and operational ownership. Test
   extraction of a vertical slice with its real callers, fixtures and rollback;
   do not assume database tables or provider adapters can move alone.
4. **Reconcile existing work:** inspect the current heads, bases, checks and
   scope of the open PRs before replaying or superseding anything. At inspection
   there were 16 open PRs, including security work
   [#153](https://github.com/Quirk-Systems/project-scaffold/pull/153) and
   [#137](https://github.com/Quirk-Systems/project-scaffold/pull/137), the
   [Halo candidate #154](https://github.com/Quirk-Systems/project-scaffold/pull/154),
   and governance candidates [#98](https://github.com/Quirk-Systems/project-scaffold/pull/98)
   and [#55](https://github.com/Quirk-Systems/project-scaffold/pull/55).
   Inclusion in this list does not review, close, merge or validate them.
5. **Choose identities and cutover:** document the owner's decision, the exact
   destination, identity and registry changes, compatibility period, approved
   effects, cutover checks and recovery owner. The existing
   [identity decision](../canon/PROJECT_SCAFFOLD_IDENTITY.md) requires an
   impact inventory, a reversible plan, and a separately approved execution
   gate. Do not rewrite old evidence to make its historical names look new.
6. **Execute and verify only the approved cut:** bind a migration to source
   and destination revisions; test actual links, consumers, workflows and
   settings; retain old material until equivalence and rollback are proven.
   Stop on unaccounted consumers, lost behavior, authority ambiguity, failed
   checks or evidence gaps. Roll back using the recorded revisions and restore
   points; do not claim reversibility before testing it.

## Evidence and limits

- A fresh `bun audit --prod --json` against the inspected root lockfile on
  2026-11-18 exited 1 and returned nine advisory entries: three critical,
  three high, two moderate and one low, across DOMPurify, Next.js and Zod.
  The audit establishes affected dependency versions, not whether a particular
  exploit is reachable. The new starter's separate production audit returned
  zero advisories in the clean install observed during this change.
- The current root `next` dependency is `16.3.8`; the older security candidate
  in PR #153 describes `16.4.3`. On 2026-11-18, npm reported cache-related
  advisories affecting the latter as well. The new starter uses `16.4.6`;
  this does **not** repair the root app or update the existing security PRs.
  Reassess those branches against current advisories before integrating them.
- The generator and starter include focused automated checks. A receipt is a
  file integrity record, not proof that the app worked. Record real clean-build,
  browser, accessibility and human-use observations separately at the tested
  revision. Hosted checks and real-user acceptance remain separate.
- The scope here is the inspected default branch, selected open-PR metadata,
  a limited organization search and the new candidate. It is not an exhaustive
  security audit, consumer census, deployed-system audit or verification of
  the other PRs.

**Capability deposit:** a small, copyable starter and generation receipt are
available for trial. They have not yet demonstrated reuse across independent
Quirk projects, so no broader capability or quality admission is claimed.
