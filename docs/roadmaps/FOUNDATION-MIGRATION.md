# Foundation Migration Roadmap

## Phase 1 — Additive foundation

- create apps, packages, registries, rulesets, runtimes, schemas, templates, and tooling
- add CLI validation
- pin GitHub Actions
- add dependency review and CodeQL
- preserve the existing root application

## Phase 2 — Prove package boundaries

- add focused tests to each package
- use package interfaces from the root application
- add workspace manifests only when lockfile regeneration is part of the reviewed change
- add Turborepo after there are enough independent tasks to justify orchestration overhead

## Phase 3 — Move the application

- copy the root Next.js app to `apps/control`
- update deployment and path configuration
- compare production builds and E2E behavior
- remove the root compatibility layout only after parity is proven

## Phase 4 — Runtime and projection

- project registries into PostgreSQL
- emit Universal Quirk Events
- add durable workers and reconciliation
- add authority middleware
- add trace correlation and proof bundles

## Phase 5 — Product surfaces

- Quirk Docs registry reference
- Quirk Pages publication workflow
- Quirk Studio experimentation boundary
- Quirk Control operational console
