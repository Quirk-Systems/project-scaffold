# Consumer continuation evidence

Session date: 2026-09-10. Owner: `Quirk-Systems/project-scaffold`.
Baseline: `0c88fced79af56b5e24a0b0934fa95677a98584d`, continuing draft PR #106.
Disposition: **Constrain** to local candidate evidence review.

## Decision and finish condition

The prior package had a reusable applicability checker, but its executable demo
derived requirements from its own newly produced receipt. That checked consistency
without demonstrating a consumer-owned expectation. Operators also lacked a file
inspection command with clear failure recovery.

This pass implements the smallest consumer within the owning scaffold: one
separately frozen requirement, bounded file ingestion, fixed fresh replay,
explicit status and recovery, JSON for automation, and CI consumption. Finish
means a documented command can reproduce healthy evidence, refuse false readiness
for stale/invalid/missing data or changed sources, and preserve every input.

An OS/Skills cross-repository rollout was deferred because this local consumer
boundary can be demonstrated first. A new Probes service, database, generic
adapter dispatcher, or approval workflow would add machinery without evidence of
need. Existing human gates remain preserved, and the user's coding/documentation
authorization covers this reversible candidate continuation.

## Changes and reuse

| Artifact | Responsibility |
| --- | --- |
| `consumers/scaffold-review.json` | Literal consumer requirement selected from the verified baseline |
| `consumer.mjs` | Pure comparison of recorded and freshly replayed results using the existing core |
| `input.mjs` | Bounded UTF-8 JSON input with duplicate-key refusal |
| `inspect.mjs` | Read-only file workflow, fixed replay, plain-language report, JSON, exit codes |
| Three new test files | Profile, ingress, CLI, and failure/recovery checks |
| `README.md`, `consumer.md` | One-command entry and aligned usage/contract guidance |
| Existing Quirk Probes workflow | Discovers probe tests and invokes the consumer at the PR head |

The prior core, replay, evidence, source pins, and all Task 4/5 adapter files stay
byte-identical. There is no second composition matcher. The new consumer calls
the existing `inspectLinkedEvidence` and `replay` APIs. Its profile never updates
itself from arriving evidence. No new package dependency, model call, shell
dispatcher, graph sink, scheduler, migration, or production entry point is added.

## Observed results

Node **v24.19.0**. Commands from the repository root:

```bash
node --test --test-reporter=tap evals/session-composition/probe.test.mjs evals/quirk-probes/*.test.mjs
node evals/quirk-probes/replay.mjs --check
node evals/quirk-probes/inspect.mjs
node evals/quirk-probes/inspect.mjs --json
```

| Check | Observed result |
| --- | --- |
| Inherited probe suites | 77/77 pass |
| Consumer model | 11/11 pass |
| Bounded JSON/file input | 8/8 pass |
| Consumer CLI and integration | 11/11 pass |
| Combined | **107/107 pass**, zero failures |
| Original replay | Complete historical evidence still matches; 12 challenges rejected, 12 controls preserved |
| Default consumer | Recorded CURRENT, replay CURRENT, observation MATCH, envelope MATCH |
| Independently changed requirement | Old record and old replay both STALE; profile unchanged by inspection |
| Changed pinned source | Old record remains CURRENT relative to its pin; fresh replay BLOCKED; readiness false |
| Missing file / duplicate receipts | MISSING / INVALID remain distinct |
| Duplicate JSON keys | INPUT_ERROR before discarded fields can hide earlier claims |
| Altered complete-report metadata | Envelope MISMATCH prevents readiness despite intact nested result |
| Non-discriminating observations | INCONCLUSIVE preserved despite a passing local replay |
| Unknown adapter / invalid flags | Refused; data cannot create an executable command |
| Successful inspection | Profile, source pins, evidence, and original source bytes unchanged |
| Full `bun run validate` | Attempted; exit 127 because Bun is unavailable |

The first completed implementation passed its 30 new checks. This was not a
preimplementation RED/GREEN exercise. The combined final run is retained in
[consumer-validation.tap](consumer-validation.tap), SHA-256
`ed7b90c1da8236cdb5c584484152ad4b2f2b62ff8d0bbeee6b3ab3c6f3baab69`.
Its measured test duration was 1636.532679 ms. These counts are deterministic
checks, with grouped assertions, not independent attack attempts or outcome data.

The consumer requirement is
`7c2153ebb941a06be23ba1829739a3b967742a9d5c6130e15e8b51d997b42b3b`.
Its profile digest is
`f606e3999c7fd34f504fec1237b78ced65b4ce8c99d71fd0f25d59a44829f66e`.
These are content bindings, not signatures or human approval.

## Evidence continuity

| Protected artifact | Unchanged SHA-256 |
| --- | --- |
| `core.mjs` | `80c0be1551c808bcadf98736ede3fb5b7b4ec51848f8bec6ee96670f9ff2cbdb` |
| `replay.mjs` | `4288cf0cd6c2d70251500955027e61e226ef53e7d3c867db5d22fa6adffac508` |
| `evidence.json` | `02d641c90065855d6607ba7346c73b53a900383706fae10a1a5d4ec1762f24a8` |
| `source-pins.json` | `54ecaa49827a569673149a68e167814ce46bec42791ff2905e1de08cba6bfb02` |

The local selected-file projection matched the live PR's published blob identities
before edits. The baseline Git tree is the publication base; unrelated files are
preserved. Original [development evidence](development.md) and
[agent review](agent-review.md) describe the earlier pass at its own version.
The [consumer review](consumer-agent-review.md) identifies this pass's reviewed
bytes and limits. Neither review substitutes for independent human approval.

## Compounding result and remaining uncertainty

Implemented deposit: `capability.probes.review-local-evidence`, owned by the
scaffold and built on `capability.probes.inspect-bound-evidence`. The file workflow
removes the need for each local consumer to write its own pin handling, JSON
ingress, replay call, and diagnostic output. This is demonstrated code reuse;
time saved, better human decisions, and downstream adoption remain **unmeasured**.

The reusable model still accepts caller-supplied replay observations. Only this
fixed local file workflow establishes its own fresh execution. Remote producer
authentication, concurrent file mutation, broad OS/Skills integration, live policy
freshness/revocation, full application validation, and human admission remain open.
All output states preserve candidate-only authority and disabled effects.

The next useful move is one real review use: run the inspector on a relevant packet,
record the operator's next-step choice and time, and compare with receipt-only
review. Continue if it helps the operator reach the correct decision; revise
confusing guidance; drop the wrapper if it adds maintenance without benefit.
