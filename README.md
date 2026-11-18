# Project Scaffold

**A runnable application scaffold and reference implementation for Quirk Systems. This repository is not Quirk OS.**

The canonical repository identity remains
[`Quirk-Systems/project-scaffold`](https://github.com/Quirk-Systems/project-scaffold).
It exists to provide a reusable baseline for starting, testing, and evolving
Quirk projects without forcing every generated project to become the same
product.

See [Project Scaffold Identity](docs/canon/PROJECT_SCAFFOLD_IDENTITY.md) for the
boundary, ownership rules, and change-control contract.

## Start a new project

For a small, independently named web application, try the **candidate**
[Quirk Web Starter](starters/web/README.md):

```bash
node scripts/create-quirk-starter.mjs --name my-quirk-project --output ../my-quirk-project
cd ../my-quirk-project
npm ci
npm test
npm run dev
```

The destination must not already exist. The generator copies an explicit file
list, does not install or execute anything, and records file hashes in a local
generation receipt. The starter has its own identity; it does not carry this
repository's identity guard, asset application, integrations, or authority.
It is an early candidate, not an admitted product or a proven replacement for
the full reference application. See the
[dissection and migration proposal](docs/architecture/project-scaffold-dissection-2026-11-18.md).

### Proposed: Quirk Conversation Compiler

`Quirk Wrap` specifies how consequential conversation deltas become typed,
source-backed, evaluated repository changes. The proposed runner binds output
to host-owned source hashes, exact canon grants, pinned repository state,
scoped mutation authority, and executor receipts; it preserves corrections and
contradictions and returns an honest no-op when no durable artifact is
justified. See the
[capability pack](docs/capabilities/conversation-compiler/README.md).

## What this repository owns

- a working Next.js application baseline with TypeScript, Tailwind, testing,
  CI, security checks, database wiring, and common integrations;
- executable examples of Quirk-domain modules and agent patterns;
- project-start conventions, validation commands, and extraction seams;
- a reference implementation that downstream templates and generated
  repositories may reuse, fork, replace, or omit.

## What this repository does not own

- Quirk OS canon, kernel authority, or organization-wide runtime governance;
- the central catalog and lifecycle for templates, variables, boilerplates,
  playbooks, agents, apps, capabilities, or cross-platform skills;
- permission to rename itself because Quirk OS-shaped capabilities happen to
  be implemented here.

Capability does not imply authority. A reference module can prove a pattern
without promoting its containing repository into the system it demonstrates.

## Bundled Quirk reference implementation

The current scaffold includes a substantial asset-lifecycle example:

```text
capture → annotate → mutate → diff → experiment → promote → publish
```

It includes versioned assets, annotations, semantic diffs, experiments,
pipelines, media storage, agent roles, voice composition, billing, email,
analytics, and authentication. These modules are deliberately inspectable
working examples. Their presence does not change the repository identity.

## Run the existing reference application

```bash
bun install --frozen-lockfile
cp .env.example .env
# Configure a reachable PostgreSQL database with the pgvector extension.
bun run dev
```

`bun run dev` first runs the database migration. Most integrations are
lazy-initialized, and individual features require their own configuration.
The clean starter above does not require the reference application's database.

## Commands

| Command                          | Description                                        |
| -------------------------------- | -------------------------------------------------- |
| `bun run dev`                    | Run the development server                         |
| `bun run identity:check`         | Verify the repository identity invariants          |
| `bun run validate`               | Identity guard, lint, type-check, tests, and build |
| `bun run db:migrate` / `db:seed` | Apply migrations / seed example data               |
| `bun run test:e2e`               | Run the Playwright suite                           |
| `bun run email:dev`              | Preview email templates                            |

## Repository structure

The repository is a single application with extraction-ready module
boundaries. See [Architecture](docs/ARCHITECTURE.md) for the implemented
reference application's topology and [CLAUDE.md](CLAUDE.md) for working
conventions.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

[Apache 2.0](LICENSE)
