# Repository Architecture

## Migration posture

This branch creates the foundational surfaces without moving the existing root Next.js application. That avoids a high-risk lockfile, deployment, path-alias, and hosting migration in the same change as the architecture introduction.

## Desired end state

```text
apps/          product surfaces
packages/      stable provider-independent libraries
registries/    declarative canonical knowledge
rulesets/      machine-checkable policy
runtimes/      execution profiles
schemas/       interoperability contracts
templates/     generator-ready foundations
tooling/       CLI, generators, validators, inspection
docs/          architecture, semantics, operations, decisions
.github/       secure automation, actions, and contribution surfaces
```

## Promotion gates

A directory becomes a Bun workspace package only after its public interface, owner, tests, and compatibility policy are proven. The root application moves into `apps/control` only after a clean deployment preview demonstrates identical behavior.

## Supply-chain baseline

- external GitHub Actions are pinned to immutable full commit SHAs
- workflow permissions are explicit and minimal
- dependency review blocks new high-severity vulnerable dependencies
- CodeQL analyzes JavaScript and TypeScript
- TruffleHog scans repository history
- the existing dependency policy continues to publish a canonical audit issue
