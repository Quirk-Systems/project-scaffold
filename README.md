# Project Scaffold

> [!IMPORTANT]
> **Archive transition approved 2026-08-12.** This repository is frozen while
> the [archive gate](docs/operations/ARCHIVE_TRANSITION.md#archive-gate) is
> completed. It is a historical application scaffold and reference
> implementation—not Quirk OS and not a source of current Quirk canon. No new
> feature work is accepted.

**A runnable application scaffold and reference implementation for Quirk Systems. This repository is not Quirk OS.**

The canonical repository identity remains
[`Quirk-Systems/project-scaffold`](https://github.com/Quirk-Systems/project-scaffold).
It exists to provide a reusable baseline for starting, testing, and evolving
Quirk projects without forcing every generated project to become the same
product.

See [Project Scaffold Identity](docs/canon/PROJECT_SCAFFOLD_IDENTITY.md) for the
boundary, ownership rules, and change-control contract.

## Successors and support

- [`Quirk-Systems/quirk-os`](https://github.com/Quirk-Systems/quirk-os) owns
  active Quirk OS runtime and governance work.
- [`Quirk-Systems/quirk-core`](https://github.com/Quirk-Systems/quirk-core) is
  the candidate home for shared canonical contracts when real consumer evidence
  satisfies its extraction gates.
- [`Quirk-Systems/.github`](https://github.com/Quirk-Systems/.github) owns
  organization policy and portfolio metadata.

This repository receives archive-transition, critical security, and historical
integrity fixes only. Existing users should pin the terminal release once it is
published; there is no compatibility or security-support commitment after the
GitHub repository is archived. See the
[archive transition ledger](docs/operations/ARCHIVE_TRANSITION.md) for
provenance, migration guidance, unsupported surfaces, and remaining gates.

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

## Getting started

```bash
bun install
cp .env.example .env
bun run dev
```

Most integrations are lazy-initialized so the scaffold can build with no
secrets. Individual features become active when their required environment
variables are configured.

## Commands

| Command | Description |
| --- | --- |
| `bun run dev` | Run the development server |
| `bun run identity:check` | Verify the repository identity invariants |
| `bun run validate` | Identity guard, lint, type-check, tests, and build |
| `bun run db:migrate` / `db:seed` | Apply migrations / seed example data |
| `bun run test:e2e` | Run the Playwright suite |
| `bun run email:dev` | Preview email templates |

## Repository structure

The repository is a single application with extraction-ready module
boundaries. See [Architecture](docs/ARCHITECTURE.md) for the implemented
reference application's topology and [CLAUDE.md](CLAUDE.md) for working
conventions.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

[Apache 2.0](LICENSE)
