# Project Scaffold Rename Proposal Closure Audit

Status: **SUPERSEDED — DO NOT EXECUTE**  
Decision date: **2026-08-11**  
Canonical decision: [Project Scaffold Identity](../canon/PROJECT_SCAFFOLD_IDENTITY.md)

## Decision

The proposed `Quirk-Systems/project-scaffold` → `Quirk-Systems/quirk-os`
rename is cancelled.

- `Quirk-Systems/project-scaffold` remains the public application scaffold,
  GitHub template, and reference implementation.
- `Quirk-Systems/quirk-os` remains a separate repository and must be evaluated
  on its own contents, authority, and release lifecycle.
- No repository gains Quirk OS identity because it contains Quirk OS-shaped
  capabilities.

## Closed execution paths

The following instructions are retired and must not be executed:

1. moving or archiving `Quirk-Systems/quirk-os` to clear its name;
2. renaming `Quirk-Systems/project-scaffold`;
3. rewriting the scaffold manifest or package identity to `quirk-os`;
4. relying on GitHub redirects as an identity migration;
5. treating issue #75 or PR #76 as active authority.

Issue #75 is closed as not planned. PR #76 is closed unmerged. Their history is
retained as decision evidence.

## Current identity evidence

| Check | Required value |
| --- | --- |
| Repository | `Quirk-Systems/project-scaffold` |
| Manifest domain | `application-scaffold` |
| Package name | `project-scaffold` |
| README identity | Project Scaffold |
| Repository role | Runnable scaffold and reference toolkit |
| Quirk OS relationship | Separate system and repository |

`bun run identity:check` verifies the machine-checkable fields and fails
closed during `bun run validate`.

## Remaining literal “Quirk OS” references

Literal references must be classified, not globally replaced:

- **repository identity:** invalid; repair to Project Scaffold;
- **bundled reference application or UI label:** permitted when it clearly
  describes the example domain rather than repository authority;
- **historical decision evidence:** retained with superseded status;
- **external Quirk OS repository:** permitted when linked to
  `Quirk-Systems/quirk-os`.

## Cross-repository correction

Organization profile, portfolio registry, repository strategy, and the former
rename runbook in `Quirk-Systems/.github` must carry the same separation
decision. Repository-local correctness does not override stale organization
canon.

## Reopening rule

Reopening the rename requires a new owner-approved decision that satisfies the
change-control contract in the canonical identity document. Capability,
maintainer access, or a stale plan is not authority.
