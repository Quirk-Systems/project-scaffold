# Quirk Probes — bounded evidence that knows when to expire

**0.1.0 · CANDIDATE / STATE_ONLY / TEST-ONLY · Disposition: Constrain.**
Implementation owner: `Quirk-Systems/project-scaffold`. Human admission remains open.

A Quirk Probe exercises one narrow behavioral boundary and records what the
observation establishes. This package makes that definition executable: describe
a claim, pair a legitimate control with a prohibited challenge, bind every input,
and inspect whether a linked result still applies. It is a reusable evaluation
capability inside the existing scaffold candidate, not a new primary system.

The practical question is **“Does this result still speak for this exact thing?”**
Changing the policy, fixtures, implementation, subject revision, claim, limitations,
or expected cases changes the definition digest. A consumer with the new digest
sees the old result as `STALE`, even when the old result passed.

## Run it

Use Node 20+ from the repository root. The package adds no dependencies.

Start with the read-only consumer check:

```bash
node evals/quirk-probes/inspect.mjs
```

It reads the checked-in Scaffold review requirement, inspects the recorded result,
and runs the fixed local replay. It explains what needs attention and leaves every
input unchanged. `--json` provides the same diagnosis for an agent or CI consumer.
See [consumer usage and contract](consumer.md) for file inputs, exit codes, and recovery.

To reproduce all bounded tests and the original evidence check:

```bash
node --test evals/session-composition/probe.test.mjs evals/quirk-probes/*.test.mjs
node evals/quirk-probes/replay.mjs --check
```

`--check` replays the fixed local composition example and compares the complete
stored evidence object with the fresh result. A difference fails without modifying
the evidence. `--print` produces the current report without saving it.

After an intentional, reviewed change to this candidate, explicitly record:

```bash
node evals/quirk-probes/replay.mjs --write
node evals/quirk-probes/replay.mjs --check
```

Review the diff before retaining new evidence. Do not refresh source pins or
expectations merely to silence a failing test. Git retains historical records;
the CLI's explicit `--write` replaces only this package's local `evidence.json`.

The first adapter reuses the original composition fixture and comparator unchanged:
12 prohibited traces and 12 matched controls. It does **not** replay or supersede
the separate [Task 4/5 adapter](../session-composition/adapter/README.md). Its
independent review obligations and existing verification receipt stay intact.

## Small API, explicit trust boundary

```js
import { inspectFiles } from './evals/quirk-probes/inspect.mjs';

// Reads literal consumer requirements separately from incoming evidence.
const inspection = await inspectFiles();
console.log(inspection.rows, inspection.evidenceReady);
```

`allCurrent` means every required result is structurally intact, matches the
consumer's exact expected definition, and supports its bounded claim. It is an
evidence applicability result. It is never permission, eligibility to execute,
human approval, authenticated history, or runtime safety proof.

The consumer's `evidenceReady` additionally requires matching fresh local replay
and, when supplied, an intact complete replay report. A static expected digest
alone does not detect source drift; the separate local replay check supplies that
bounded observation. Neither field establishes current production policy.

| Export | Input → output |
| --- | --- |
| `digest(value)` | Strict bounded JSON → sorted-key SHA-256 digest |
| `assessProbe(definition, observations)` | Paired specification and observations → unsigned candidate result |
| `inspectLinkedEvidence(requirements, results)` | Independently pinned requirements and supplied results → per-probe applicability |
| `replay()` | Fixed trusted local source files → freshly reproduced example evidence |
| `inspectConsumer(profile, recorded, replayed)` | Separately pinned consumer profile and two evidence sets → candidate review diagnosis |
| `inspectFiles(options)` | Bounded file inputs and fixed local replay → read-only operator/agent report |

The generic assessor accepts supplied observations. **It does not authenticate
them or execute their claimed source.** A caller could fabricate internally
consistent observations and recompute hashes. Only the included fixed replay
establishes that this local adapter produced these observations in the current
run. It still cannot authenticate a historical machine or an external producer.

Hashing is content binding, not a signature. Use an authenticated producer and a
reviewed consumer adapter before trusting remote evidence. Do not derive the
consumer's expected digest from whichever receipt arrives.

## Contract

All objects use closed keys. The executable validator in `core.mjs` owns this
candidate contract; no database projection or parallel schema claims authority.

`definition` contains:

- `schemaVersion: "0.1.0"`, stable `id`, `owner`, and one bounded `claim`.
- `subject: {ref, revision}` identifying the exact subject version.
- `bindings: {policy, fixtures, implementation}` with lowercase SHA-256 fingerprints.
- Nonempty `limitations` that travel with every result.
- `cases: [{id, pairId, role, expected}]`: one `CONTROL / ALLOW` and one
  `CHALLENGE / DENY` per pair; unique case IDs and 1–64 pairs.

`observations` contains exactly one row per case:
`{caseId, baseline: "ALLOW" | "DENY", target: "ALLOW" | "DENY",
effectExecutionAllowed: false}`. Missing, extra, duplicate, malformed, or
effect-claiming rows are rejected. Cases are reported in definition order.

This first contract intentionally supports paired binary boundary probes only.
It does not describe latency benchmarks, subjective taste, real effects, or every
possible evaluation. Add another versioned probe family only when a real consumer
needs different semantics; do not coerce those observations into ALLOW/DENY.

| Result | Meaning |
| --- | --- |
| `SUPPORTED` | Every target matches its expectation; the baseline permits all controls and challenges |
| `NOT_SUPPORTED` | At least one target violates its expectation; this takes precedence over baseline weakness |
| `INCONCLUSIVE` | Targets match, but the baseline does not establish the intended discriminating comparison |

Every result includes the definition and observations, their bound digest,
`status: CANDIDATE`, `evidenceKind: SIMULATION`, and false values for
`grantsPermissions`, `effectExecutionAllowed`, `independentHumanReviewSatisfied`,
and `productionValidation`. Recomputed hashes cannot legitimize changed constants.

Linked requirements are a nonempty list of unique `{probeId, definitionDigest}`
objects. Digests use exactly 64 lowercase hexadecimal characters; uppercase input
is a contract error, not evidence of staleness. Each required probe has one row:

| Row | Consequence |
| --- | --- |
| `CURRENT` | Intact, supported result for this exact required definition |
| `STALE` | Intact result belongs to another definition; run the required probe again |
| `MISSING` | No matching probe result; supply or run it |
| `INVALID` | Result is malformed, modified inconsistently, self-promoted, or ambiguous through duplicates |
| `NOT_SUPPORTED` | Current result contradicts the claim; repair the subject or revise the claim explicitly |
| `INCONCLUSIVE` | Current comparison lacks a discriminating baseline |

The checker recomputes each relevant receipt rather than trusting a stored outcome
or digest. It preserves each row instead of averaging failures into one green score.
Duplicate required results remain ambiguous; the checker does not cherry-pick a pass.

## Compounding design

| Layer | Responsibility |
| --- | --- |
| Candidate definition | Own the claim, inputs, pairs, limitations, and version |
| Local replay | Execute the fixed trusted synthetic example; bind source bytes |
| Evidence | Preserve the unsigned observation and its bounded interpretation |
| Linked inspection | Determine which required results still apply |
| Future OS / Skills / Preference adapter | Consume a reviewed evidence contract without converting it into authority |

The reusable deposit is `capability.probes.inspect-bound-evidence`: deterministic
paired assessment plus linked applicability. The existing composition evaluator
remains the behavioral source. This package does not implement a second matcher.

No model call is needed. No new controller, scheduler, broker, database, graph
write, network client, subprocess adapter, or arbitrary command dispatcher is
added. The tests use local child processes to exercise the CLI in disposable
directories. Supplied definitions are data, never executable recipes.

The reference implementation cannot sandbox arbitrary imported JavaScript. Extend
the fixed adapter only through reviewed code. The implementation hash includes
the core, replay adapter, source pins, and reused source hashes; the definition
digest covers claim semantics and expected cases as well as those bindings.

## Recovery, lifecycle, and limits

- Invalid JSON-domain values or contracts throw `ProbeValidationError`; fix the
  input while preserving the rejected material outside an admitted record.
- A source-byte mismatch stops replay before importing the changed source runner.
  Inspect the source change and update a candidate deliberately.
- A failed `--check` leaves evidence intact. Compare the freshly printed report
  with the record; do not silently rewrite either side.
- Retire or remove this directory to roll back the capability. It has no runtime
  imports, migrations, live records, background jobs, or effect executor.
- Content drift supplies freshness here. Wall-clock expiry, revocation, and
  current live policy resolution are **OPEN**; `CURRENT` is relative to the
  consumer's supplied definition, not a claim about current production state.
- Cross-process execution limits, authenticated receipts, concurrent admission,
  Task 6 consumer enforcement, and cross-system deployments remain **OPEN**.
- Actual task-time reduction and human usefulness are **UNMEASURED**. Passing
  deterministic tests does not pay for those claims.

## Decision and source record

Decision: add a small evaluation module to the existing scaffold candidate. A
separate primary Probes service would introduce a new owner, persistence layer,
and authority ambiguity without a demonstrated consumer need. Merely adding
more prose would leave stale-result reuse unchecked. This module is reversible
and uses the original behavioral evaluator unchanged.

Sources inspected on 2026-09-10:

1. `111-Quirk-Systems-Candidate-Atlas.md`, candidate atlas v0.1, Library identity
   `libfile_803b922d26d8819180dd9c8568d8bf1e`, version not recorded. Item 39 defines
   Quirk Probes as a narrow boundary exercise. The atlas did not verify repository
   ownership or implementation; this implementation ownership is a candidate
   decision, not an atlas fact.
2. [PR #106 at b892aef](https://github.com/Quirk-Systems/project-scaffold/tree/b892aefa558a736ffb50869e47b547559c627db9),
   continuing candidate composition work. `source-pins.json` records exact selected
   source blobs and SHA-256 values, verified against fetched GitHub bytes.
3. `build-quirk-systems` and `compound-quirk-systems` procedural contracts, read in
   this session; versions not recorded. Build owns implementation and evidence;
   Compound owns reuse and lineage. Their overlapping receipt requirements are
   satisfied by one replay evidence object and one development record.

The atlas is concept provenance, not executable input. Only the four pinned source
files are imported/replayed or regression-tested. Searches were bounded and do not
establish that no other probe implementation exists elsewhere.

## Acceptance and next move

The bounded acceptance condition is: the original fixture still discriminates;
all-allow and all-deny mutations fail; changed bindings become stale; missing,
duplicate, corrupted and self-promoted results cannot produce `allCurrent`; an
isolated local copy can record/check evidence and diagnose drift without private
context. See [development evidence](development.md) and [replay evidence](evidence.json).

The [Scaffold review consumer](consumer.md) now demonstrates a separate frozen pin,
fresh local replay, and recovery guidance. Changing its independently required
definition makes old evidence `STALE`; changing a pinned local source blocks replay
even while recorded evidence still matches the old definition. These are different
failure modes and remain visible separately.

Next proof: use the inspector to finish one real review decision and measure whether
the operator identifies the required next step more quickly and correctly than
from the existing receipt alone. OS/Skills adoption remains proposed. Preserve human
review and effect boundaries. Keep if the diagnosis helps; mutate unclear guidance;
drop the wrapper if it adds maintenance without useful discrimination.

Admission remains **Constrain**: local candidate evaluation and development use.
Independent human review, broad runtime admission, and measured cross-system
benefit have not been established.
