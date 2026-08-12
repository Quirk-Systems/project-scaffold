# Never #0001 — Capability Does Not Imply Authority

Status: **candidate / reference implementation**

This repository is the first application proving `never.capability_implies_authority` against a real mutation path.

## Protected mutation

`POST /api/runs/:id/promote` previously allowed code with access to `promoteRun()` to create an approved canonical asset. The mutation now requires an independently signed authority grant scoped to `quirk.run.promote` and the exact `run:<id>` subject.

## Runtime contract

The caller supplies the compact signed grant in `x-quirk-authority`. The server verifies it with `QUIRK_AUTHORITY_HMAC_SECRET`.

Promotion fails closed when the grant is missing, malformed, forged, expired, scoped to another operation, scoped to another run, or when verifier configuration is unavailable.

The guard lives inside `src/lib/quirk/experiments.ts`, not only in the HTTP route. Agents, jobs, future CLIs, and alternate transports therefore cannot bypass the Never by invoking domain code directly.

Successful promotion records `authority_grant_id` and `authority_issuer` in canonical asset metadata for provenance.

## Self-eval

`src/lib/quirk/governance/authority.test.ts` exercises the first adversarial cases:

1. capability without a grant is denied;
2. unavailable verification infrastructure fails closed;
3. forged/tampered authority is denied;
4. authority for another governed subject is denied;
5. expired authority is denied;
6. independently signed, scoped, current authority passes.

`bun run validate` is the merge gate. Never #0001 remains a candidate until CI produces execution evidence that these tests pass.

## Deployment requirement

Production deployments that expose governed mutations must configure `QUIRK_AUTHORITY_HMAC_SECRET` independently from authentication secrets. Missing configuration intentionally disables promotion rather than weakening the gate.

## Next hardening

This HMAC grant is the smallest deployable reference contract, not the final authority service. Graduation should replace shared-secret issuance with a dedicated authority issuer using asymmetric signatures, persisted grant/revocation records, nonce replay protection, NeverReceipts, and an auditable Proposed Move approval flow while preserving this verifier interface and fail-closed semantics.
