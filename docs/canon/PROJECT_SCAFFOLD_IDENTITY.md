# Project Scaffold Identity

Status: **Accepted**  
Decision date: **2026-08-11**  
Authority: **Quirk Systems repository owner**  
Supersedes: [Issue #75](https://github.com/Quirk-Systems/project-scaffold/issues/75) and [PR #76](https://github.com/Quirk-Systems/project-scaffold/pull/76)

## CANON

`Quirk-Systems/project-scaffold` remains **Project Scaffold**. It will not be
renamed or promoted into Quirk OS merely because it can host Quirk OS-shaped
features.

```yaml
id: toolkit.project_scaffold
type: toolkit
version: 1.0.0
status: active
owner: Quirk-Systems
repository: Quirk-Systems/project-scaffold
purpose: >
  Provide a runnable, inspectable, replaceable application baseline and
  reference implementation for Quirk projects.
human_authority:
  - repository_owner_approves_identity_change
  - downstream_product_owners_choose_what_to_adopt
```

## Owned responsibility

Project Scaffold owns:

1. a runnable baseline for new application repositories;
2. broadly reusable project conventions and integration examples;
3. seams for extracting modules when real consumers justify extraction;
4. deterministic validation of the scaffold's own integrity;
5. reference implementations that may be copied, composed, replaced, or
   discarded by downstream projects.

## Explicit exclusions

Project Scaffold does not own:

- Quirk OS canon, kernel identity, product roadmap, runtime control plane, or
  deployment authority;
- organization-wide governance or cross-repository admission;
- the canonical catalog for templates, variables, boilerplates, scaffolds,
  setups, playbooks, agents, apps, capabilities, or cross-platform skills;
- automatic authority to promote a reference capability into a primary Quirk
  system.

## Relationship contract

| Object | Relationship to Project Scaffold |
| --- | --- |
| Quirk OS | Separate downstream system and repository with its own canon, runtime, evidence, permissions, and release lifecycle |
| Quirk construction catalog | Separate upstream catalog/composer that may publish versioned construction objects consumed by this repository |
| Generated repositories | Independent consumers; adoption never creates a permanent reverse dependency |
| Quirk canon | External authority; projections in this repository cannot silently rewrite it |

## Identity invariants

The repository must retain all of these invariants:

- repository: `Quirk-Systems/project-scaffold`;
- package name: `project-scaffold`;
- manifest domain: `application-scaffold`;
- README title: `Project Scaffold`;
- Quirk OS references describe examples, consumers, or boundaries—not the
  identity of this repository.

`bun run identity:check` enforces the machine-checkable subset and runs inside
`bun run validate`.

## Failure modes

| Failure | Detection | Required response |
| --- | --- | --- |
| Identity drift | Manifest, package, or README stops naming Project Scaffold | Block validation and repair the identity fields |
| Domain capture | A bundled example is treated as authority for the entire repo | Split the product into its own repository |
| Reference inflation | A demonstration is advertised as the canonical system | Constrain the claim and record the true evidence level |
| Reverse dependency | Generated repos cannot evolve without this repo's private context | Extract a versioned contract or document the bounded dependency |
| Authority laundering | Maintainer capability is treated as approval to rename or promote | Deny the transition and require explicit owner decision |

## Change control

A future identity change requires all of the following:

1. an explicit owner-approved decision;
2. an alternative analysis that includes retaining Project Scaffold;
3. an impact inventory covering consumers, links, packages, integrations,
   secrets, environments, rulesets, and deployments;
4. proof that owners, permissions, lifecycle, failure modes, and evidence are
   compatible rather than merely adjacent;
5. a reversible migration plan and a separately approved execution gate.

Absent that complete decision, the identity guard fails closed.
