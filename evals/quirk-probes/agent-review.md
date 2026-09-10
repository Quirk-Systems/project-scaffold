# Quirk Probes candidate review

Date: 2026-09-10. Reviewer: a separate coding agent, not an independent human reviewer.
Scope: `evals/quirk-probes` and `.github/workflows/quirk-probes-candidate.yml`, extending the candidate associated with PR #106. Parent source: `b892aefa558a736ffb50869e47b547559c627db9`. No source edits were made by this reviewer.

## Finding and disposition

One concrete low-severity defect was found and repaired by the implementation agent: the hash validator accepted uppercase hexadecimal requirements, but matching compared the string with a lowercase digest and incorrectly reported `STALE`. This failed closed; it did not grant authority. Reproduced on core SHA-256 `695bd52703f441a638ec2296dc6d2833a8f211ad67abebcb85085733c979e132` by passing `result.definitionDigest.toUpperCase()` to `inspectLinkedEvidence`: uppercase returned `STALE`, lowercase returned `CURRENT` for the same receipt.

The repaired contract requires canonical lowercase digests. Independent focused verification passed: the lowercase requirement remains `CURRENT`, while its uppercase form throws `ProbeValidationError` with `ERR_PROBE_VALIDATION` and an explicit lowercase requirement. The added regression test passes. No remaining concrete blocker was found in this bounded review. Disposition remains **Constrain** to local candidate evaluation and development use.

## Commands and observations

Runtime: Node `v24.19.0`.

- `node --test evals/session-composition/probe.test.mjs evals/quirk-probes/core.test.mjs evals/quirk-probes/replay.test.mjs`: final reviewed sources passed **77/77**, zero failed, skipped, cancelled, or todo. This comprises 48 inherited composition tests, 22 core tests, and 7 replay tests.
- `node evals/quirk-probes/replay.mjs --check`: passed against final evidence; **12 prohibited challenges rejected, 12 controls preserved**, and complete evidence matched the fresh replay.
- Two additional direct reviewer assertions passed for the lowercase repair described above.
- Before the lowercase repair, a fresh disposable local copy of both evaluation directories ran the README commands without repository metadata or private context: **76/76** tests; `--check`, `--write`, and `--check` each exited 0. Editing `productionValidation` to true then caused `--check` to exit 1 with `Recorded evidence differs from fresh replay`; the edited evidence bytes were unchanged. This establishes scoped cold local-copy operation for the supplied README, not general self-service usability.

Examined malformed JSON-domain and contract handling, missing and duplicate receipts, stale definition matching, target failure precedence, nondiscriminating baselines, self-promotion with recomputed hashes, source-byte verification before runner import, and CLI refusal to repair evidence during `--check`. Tests exercise these boundaries. The source implementation agrees with the documented unsigned simulation semantics: `allCurrent` is applicability, and permission, executed-effect, human-review, and production claims cannot be promoted through these results.

The workflow runs on bounded pull-request paths, checks out the exact PR head, requests read-only contents access, disables persisted checkout credentials, pins both actions to commit IDs, uses Node 24, and has a five-minute timeout. This reviewer inspected its local configuration; the implementation agent separately reports verifying the upstream action commits. This review did not run GitHub Actions.

## Reviewed byte identities

Paths below are relative to the repository root. SHA-256 values identify the reviewed candidate files; they are not authentication or approval.

| File | SHA-256 |
| --- | --- |
| `evals/quirk-probes/core.mjs` | `80c0be1551c808bcadf98736ede3fb5b7b4ec51848f8bec6ee96670f9ff2cbdb` |
| `evals/quirk-probes/core.test.mjs` | `182ae5b6129bc6dc3935d44ef3da46ed1e0d8eb77cf04570b96fba5123340a7b` |
| `evals/quirk-probes/replay.mjs` | `4288cf0cd6c2d70251500955027e61e226ef53e7d3c867db5d22fa6adffac508` |
| `evals/quirk-probes/replay.test.mjs` | `07ae7a9125cca79707b9ab237db8a52cb99fc255ed1c0f7cef1aafdd7b5ce5f7` |
| `evals/quirk-probes/source-pins.json` | `54ecaa49827a569673149a68e167814ce46bec42791ff2905e1de08cba6bfb02` |
| `evals/quirk-probes/README.md` | `5440462d4e6ae5d3bcbee23bb2286b68e5bc2a0c5c53124a9f013cfe21fa1ed4` |
| `evals/quirk-probes/evidence.json` | `02d641c90065855d6607ba7346c73b53a900383706fae10a1a5d4ec1762f24a8` |
| `.github/workflows/quirk-probes-candidate.yml` | `2e0e597dd9230e215d69ccb6340f4a26f3fc46015e1357c397b9549902fd6d60` |

## Limits

This review does not authenticate historical or external observations: a caller can fabricate a fully consistent generic receipt. The fixed adapter replays trusted local code; it is not a sandbox for arbitrary adapters, concurrent file mutation, or remote execution. Freshness is relative to independently supplied definition requirements, not wall-clock expiry or current production policy. No Task 4/5 integration, full repository validation, deployment, user-benefit measurement, or independent human admission is established here. The parent integration process owns its separate final checks. All candidate, deny-only, and effect-disabled boundaries remain in force.
