# Preference Evidence Wedge

Status: **candidate reference implementation — not admitted**

This repository owns a deterministic, in-memory TypeScript reference for the candidate `preference-evidence-wedge.v1` contract. It does not own the contract. The source contract is pinned to `Quirk-Systems/quirk-core@0b4fc6debf5c93b94463c9a460d022cfbdf4a37b` at `schemas/preference-evidence-wedge.v1.schema.json`; organization topology and evidence policy remain owned by `Quirk-Systems/.github`.

## Bounded flow

The runnable reference accepts one explicit, non-sensitive authenticated-self statement about response density for repository-audit reports. It then:

1. evaluates the statement and fixed five-part scope without inventing evidence from silence or inference;
2. content-addresses a project-only proposal;
3. requires an explicit same-human decision and a signed grant bound to the exact proposal ID and digest;
4. simulates an unapplied in-memory projection and records an unapplied receipt;
5. leaves learning absent unless a later explicit confirmation carries a separate singleton grant bound to the exact receipt ID and digest;
6. records, but does not apply, the resulting edge.

All timestamps, actors, nonces, and verifier material are caller inputs. At each public transition, caller input is copied once from a closed set of own enumerable data descriptors into a plain immutable JSON snapshot. Accessors, symbols, undefined or numeric values, cycles, and malformed shapes fail closed; validation, authority checks, construction, and recording use only the captured snapshot. Previously governed stages stay captured by reference and must retain their opaque mark and completely frozen graph. Grant validity is checked at the exact recorded decision or confirmation timestamp; callers cannot supply a different verification clock.

Intermediate evaluation, proposal, authorization, and projection-receipt states are instances of a module-private, token-gated state class. Each complete copied public JSON graph is deeply frozen before use, while its class-private stage and original canonical digest cannot be copied by symbol reflection, spread, JSON reconstruction, prototype fabrication, or constructor access. Changed, accessor-backed, proxy-varying, or reconstructed state cannot disconnect checking from use, and caller-owned inputs remain unfrozen. That limitation is deliberate for this in-memory reference and is not a persistence contract. The demo uses fixed values and a local test-only secret so its JSON is byte-stable. Authority tokens and the secret are never printed.

## Authority boundary

The existing HMAC helper is extended only enough to demonstrate exact subject, issuer, singleton-scope, and content-digest binding. The authenticated session reference is an upstream assertion; this repository does not provision or prove Auth.js routes, identity infrastructure, credentials, revocation, or replay storage. The helper is a reference consent/state binding, not production authority.

The projection and learned edge always carry `applied: false`. Runtime authority, consumer authority, deployment evidence, and admission effect remain `none`. No consumer reads these values. Passing tests does not admit `quirk-core`, this contract, or any broader Preference Graph capability.

This wedge adds no database table, persistence, network or model call, UI behavior, system default, autonomous learning, actual response personalization, or `PreferenceBasis`.

## Source pin

`vendor/quirk-core/PIN.json` binds the source repository, full commit, path, Git blob SHA-1, byte SHA-256, candidate status, and no-admission effect. `bun run preference-contract:check` validates the closed pin and recomputes both digests offline.

That offline check establishes byte identity only. Source-commit tree membership is supported by the source pull request and its Git evidence receipt; the local script does not independently prove that remote relationship.

## Commands

```sh
bun run preference-contract:check
bun test src/lib/quirk/preference-evidence/__tests__/wedge.test.ts src/lib/quirk/governance/authority.test.ts
bun run preference-wedge:demo
```
