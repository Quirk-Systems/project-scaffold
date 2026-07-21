# Quirk Systems Repository Architecture

This repository is the reference scaffold for the Quirk Foundational Architecture (QFA).

## Lifecycle

`Trigger → Context → Memory → Preference → Capability → Authority → Execution → Evidence → Asset → Signal → Reuse`

## Canonical / Runtime / Projection

- **Canonical:** versioned definitions, schemas, rulesets, templates, and decisions in Git.
- **Runtime:** code that validates, authorizes, executes, observes, and recovers.
- **Projection:** databases, indexes, dashboards, and generated documentation optimized for access.

A projection never silently becomes the source of truth.

## Repository surfaces

| Surface              | Purpose                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `apps/`              | Quirk Control, Docs, Pages, and Studio product surfaces                                      |
| `packages/`          | provider-independent domain libraries                                                        |
| `registries/`        | declarative systems, terms, capabilities, pipelines, runtimes, pages, actions, and templates |
| `rulesets/`          | enforceable repository, runtime, semantic, and file-management policy                        |
| `runtimes/`          | named execution profiles and capability boundaries                                           |
| `schemas/`           | interoperable data contracts                                                                 |
| `templates/`         | generator-ready system, capability, decision, and work packet foundations                    |
| `tooling/`           | Quirk CLI, generators, validation, and repository inspection                                 |
| `docs/`              | architecture, semantics, operations, decisions, and migration plans                          |
| `.github/actions/`   | reusable local Quirk Actions                                                                 |
| `.github/workflows/` | CI, dependency review, code scanning, and operational automation                             |

## Boundary rule

Code may depend inward on contracts and stable domain interfaces. Provider-specific behavior belongs behind adapters. Canonical registries may be projected into runtime stores, but runtime writes may not mutate canonical definitions without a reviewed Git change.

Run `bun run quirk:doctor` and `bun run quirk:validate` before extending the scaffold.
