# Independent agent review — Quirk Probes consumer

Date: 2026-09-10. Owner: `Quirk-Systems/project-scaffold`.
Disposition: **No concrete defects found in the bounded consumer continuation.**
This is a separate agent review, not independent human approval or runtime safety proof.

## Scope and verification

Reviewed the pure consumer/profile model, bounded strict-JSON ingress, file inspector,
three corresponding test files, frozen Scaffold review profile, consumer usage,
README, and candidate workflow. Inspected the reused core/replay trust boundary.

- Ran the README command `node --test evals/session-composition/probe.test.mjs evals/quirk-probes/*.test.mjs`: **107 tests passed**, zero failures/skips, Node **v24.19.0**.
- Ran the documented default inspector, explicit profile/evidence JSON invocation,
  `--help`, and `replay.mjs --check` in a disposable local copy of the two eval
  directories, using the written command path without private setup instructions.
  Every command returned 0. An absolute inspector path also succeeded from `/tmp`.
- Compared every copied file's SHA-256 before/after those commands: all contents
  unchanged. Failure probes preserved their supplied input bytes.
- Independently exercised an empty receipt array (MISSING/1), valid result array
  (CURRENT/0), altered full-report implementation metadata (MISMATCH/1), nonfinite
  numbers (INVALID_NUMBER/2), escape-equivalent duplicate keys (DUPLICATE_KEY/2),
  extra envelope fields (EVIDENCE_SHAPE/2), and a FIFO (NOT_A_FILE/2 without blocking).
  All output permission, effect-execution, and independent-human-review flags stayed false.
- Tests demonstrate separately edited required pins remain STALE, incoming evidence
  cannot set the required pin, source drift blocks before importing the altered
  runner, malformed/duplicate/self-promoted receipts cannot yield readiness,
  and byte/depth/node budgets and invalid UTF-8 fail explicitly.

## Assessment

The file inspector establishes its required digest from the separate profile and
its fresh observations through a fixed local adapter. Recorded and replayed
results are checked independently. Full-report metadata disagreement blocks the
top-level `evidenceReady` even when the nested receipt is intact. Profile data cannot
select a command or import path. The documented distinction between row `ready`
and complete `evidenceReady` matches implementation.

Status and recovery messages preserve the rejected input, expose missing/stale/
failed evidence, and keep the human decision open. The reader-facing command path
works without editing pins or receipts. The workflow invokes this same path after
tests and complete replay; hosted CI was not executed by this reviewer.

## Limits

No proof of faster or better human decisions. No human review, source authentication,
remote producer authentication, live policy/history/revocation proof, concurrent
file-mutation protection, arbitrary-code sandboxing, OS/Skills/Preference integration,
or full repository validation. The pure `inspectConsumer` caller remains responsible
for trusted replay provenance, as documented. Review does not imply all conceivable
inputs were tested. This checkout has no local Git HEAD; reviewed files are identified
by SHA-256 below rather than claiming an unverified reviewed commit.

## Reviewed file identities

| File | SHA-256 |
| --- | --- |
| `evals/quirk-probes/consumer.mjs` | `cf73fa161b4608b7d7d1d3a4109e5523d6c0f623fb4164554b43df67669767e7` |
| `evals/quirk-probes/input.mjs` | `f6ecbda0e702956c68692b310b7d72475452b98819cb0900921dd328d4d7193d` |
| `evals/quirk-probes/inspect.mjs` | `239e865ea891209e5e4ab3edb5e3a222054cd50d7443598c3bd3a8dbd5575073` |
| `evals/quirk-probes/consumer.test.mjs` | `7c9c0e5c5531a14b5f17f51249227ffffdb0184efee5168446038303a679b6f6` |
| `evals/quirk-probes/input.test.mjs` | `ab775b37e6b54de52ff86207df77c424518ca6b57a74ffc4d2d297105fab75ce` |
| `evals/quirk-probes/inspect.test.mjs` | `14a7263fd5fa6f10d1ea8b4f32311173ce5ce5a802e34a39c530caa73153c83c` |
| `evals/quirk-probes/consumers/scaffold-review.json` | `0cbbb7c57d640a77c5a630fd49fe2cbedbfb9f653a997ddebfedd0c74a754e59` |
| `evals/quirk-probes/consumer.md` | `844fb515590c8cf42c1909fd1fba8713895adc3d0fe6994d5ee67c29ef1b1d96` |
| `evals/quirk-probes/README.md` | `e3d7d39f06d087363d9f74e9581bc97d8752367c14bdb6cc4d6e548bdc39b49e` |
| `.github/workflows/quirk-probes-candidate.yml` | `f11fa83056a2f449c50e6aec824d6ce061f12fb4ddf103be3ec082ab55a4fc3b` |
| `evals/quirk-probes/core.mjs` | `80c0be1551c808bcadf98736ede3fb5b7b4ec51848f8bec6ee96670f9ff2cbdb` |
| `evals/quirk-probes/replay.mjs` | `4288cf0cd6c2d70251500955027e61e226ef53e7d3c867db5d22fa6adffac508` |
| `evals/quirk-probes/evidence.json` | `02d641c90065855d6607ba7346c73b53a900383706fae10a1a5d4ec1762f24a8` |
| `evals/quirk-probes/source-pins.json` | `54ecaa49827a569673149a68e167814ce46bec42791ff2905e1de08cba6bfb02` |
