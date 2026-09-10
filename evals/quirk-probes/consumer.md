# Inspect the evidence before borrowing its confidence

**Scaffold proof-review consumer · 0.1.0 · CANDIDATE / STATE_ONLY / TEST-ONLY.**
Owner: `Quirk-Systems/project-scaffold`. Independent human review remains open.

This consumer answers a practical review question: does the supplied result match
the definition this reviewer requires, and does the trusted local probe reproduce
it? The inspector provides the status and the next diagnostic without requiring
the operator to construct JavaScript or compare several hashes by hand.

## One command

```bash
node evals/quirk-probes/inspect.mjs
```

Healthy output:

```text
Quirk Probes · Evidence check
Ready for candidate evidence review.

Session composition boundary
  Recorded evidence: CURRENT
  Fresh replay: CURRENT
  Observation agreement: MATCH

Candidate simulation evidence only. Human review remains open. No execution permission is granted.
```

The default files resolve relative to the inspector, so an absolute invocation
also works from another directory. Explicit file paths resolve relative to the
current working directory:

```bash
node evals/quirk-probes/inspect.mjs --profile evals/quirk-probes/consumers/scaffold-review.json --evidence evals/quirk-probes/evidence.json --json
```

Use `--help` for the short command contract. Output is text by default and stable
JSON with `--json`. No inspection option updates a profile, receipt, or source pin.

| Exit | Meaning | Next move |
| --- | --- | --- |
| `0` | Required evidence matches the fixed local replay | Continue candidate review; the human decision is still open |
| `1` | Evidence, source replay, or complete report needs attention | Follow the displayed diagnostic; preserve existing records |
| `2` | Input, file access, or command syntax is invalid | Correct the format/path and retry |

## What the consumer owns

[scaffold-review.json](consumers/scaffold-review.json) contains a **literal**
definition digest selected from the locally replayed and reviewed candidate at
`0c88fced79af56b5e24a0b0934fa95677a98584d`. It is stored independently of the incoming
receipt. Inspection never derives a replacement requirement from supplied evidence.

This is a repository-owned candidate requirement, not a human-signed policy.
Its initial selection reused the known source result deliberately; the important
boundary is that subsequent inspection cannot silently change it. A genuine
requirement change needs an explicit reviewed profile edit and a new candidate
record. Failed checks never justify blindly copying the arriving digest.

The closed profile contains `schemaVersion`, `id`, `owner`, and exactly one
requirement with `probeId`, `definitionDigest`, `label`, and `replayId`. Only the
reviewed `probe.session-composition.paired-boundary` / `session-composition`
association is supported. Unknown adapters, commands, extra fields, noncanonical
hashes, and control characters are rejected. Broader routing needs a separately
reviewed adapter; a profile cannot invent a capability.

## Read the checks separately

1. **Recorded evidence:** the existing core validates and classifies the receipt
   against the consumer's literal definition pin.
2. **Fresh replay:** the fixed local adapter checks source bytes and reruns the
   original synthetic composition probe. Its result is classified against the
   same independent requirement.
3. **Observation agreement:** current receipts must have equal result digests.
4. **Complete report:** if a full replay report was supplied, all envelope fields
   must also match fresh replay. An intact nested result cannot excuse altered
   metrics, source metadata, or linked evidence elsewhere in the report.

The JSON report preserves `recordedStatus`, `replayStatus`, `agreement`,
`localReplay`, and `envelopeStatus` separately. `evidenceReady` requires all relevant
checks. A row's `ready` describes receipt agreement only; the top-level value also
accounts for replay failure and the complete envelope. A missing replay due to a
source failure remains distinguishable through `localReplay.status: BLOCKED`.

Every report retains false values for permission, effect execution, and independent
human approval. Readiness refers to the evidence review, never to runtime action.

| Observation | Interpretation and recovery |
| --- | --- |
| Recorded `CURRENT`, replay `CURRENT`, `MATCH` | The required bounded observation reproduces locally |
| Recorded or replay `STALE` | That result belongs to another definition; restore/review the required version and rerun |
| Recorded `MISSING` | Supply the required evidence or run the fixed probe |
| `INVALID` | Preserve rejected input; repair corruption, duplicate receipts, or inconsistent claims |
| `NOT_SUPPORTED` | Inspect failing cases; repair the subject or explicitly revise the claim |
| `INCONCLUSIVE` | Restore a discriminating baseline before claiming support |
| Local `SOURCE_DRIFT` | Pinned source bytes changed; replay stops before importing the changed source runner |
| Envelope `MISMATCH` | Some complete-report data differs from fresh replay; inspect both records |

**A static digest alone does not detect new source drift.** Changing the consumer's
expected definition makes intact old evidence stale. Changing a pinned local
source blocks the fresh replay, even when old recorded evidence still matches the
old consumer definition. Both cases prevent review readiness.

The only displayed diagnostic command is fixed in reviewed code:

```bash
node evals/quirk-probes/replay.mjs --check
```

It reruns the original check without writing evidence. Inspect its failure, retain
the old record, and make any source, expectation, or evidence revision deliberately.
The inspector never executes shell commands supplied through a profile or receipt.

## File and callable contracts

The evidence file accepts either the complete original replay report or an array
of core probe results. An empty array means missing evidence; repeated results for
the required probe remain invalid. Only the required probe affects the bounded
consumer decision. Well-identified unrelated results are ignored by the existing
linked checker; unknown evidence is not thereby approved. Unidentifiable malformed
entries invalidate the inspection.

File ingress requires regular files, valid UTF-8, at most 1 MiB per input, depth at
most 32, and at most 20,000 value nodes. Duplicate object keys are rejected before
parsing can discard the earlier value, including escape-equivalent keys. Nonfinite
numbers are rejected. Malformed input returns an explicit error rather than being
relabeled as missing evidence. Input limits also apply through the core JSON checks.

```js
import { inspectFiles } from './evals/quirk-probes/inspect.mjs';
const report = await inspectFiles();
// Use report.evidenceReady for this candidate review workflow only.
```

`validateConsumerProfile(profile)` returns a detached validated snapshot.
`inspectConsumer(profile, recordedResults, replayedResults)` is the pure model
used by the file inspector. Callers of that pure model must obtain replayed results
from a trusted adapter. The model cannot authenticate caller-supplied observations.
`inspectFiles()` supplies that adapter here by invoking only the fixed local replay.

With the current binary core, two valid `CURRENT` results for one definition have
fixed observations. `DIFFERENT` is a defensive state, not a demonstrated new class
of present-corpus failures. Failed or inconclusive fresh observations already block
readiness through their own status. No attack-count inflation is claimed.

## Implementation and completion boundary

The core, original replay, original evidence, and source pins remain unchanged.
The consumer adds a separate profile, pure inspection model, bounded file reader,
CLI, focused tests, and CI consumption. `README.md` now starts with this usable path.
Remove the new consumer/input/inspector files, profile, docs, and corresponding CI
steps to roll back; there are no migrations, background jobs, or live effects.

This is a completed **Scaffold review consumer**. OS, Skills, and Preference
adapters remain proposed. Authentication of remote evidence, concurrent local-file
mutation, live history/revocation, current production policy, and independent human
approval remain outside the proved boundary. The CLI is not a sandbox for untrusted
JavaScript or a general-purpose runner.

The intended user benefit is less manual interpretation and a visible next step.
Executed command and failure-case tests establish operation; faster or better
human decisions remain unmeasured. Next use trial: inspect one real review packet,
record the operator's decision and time to identify the right next step, and compare
with receipt-only review. Preserve that decision separately from technical tests.

See [consumer development evidence](consumer-development.md) and
[consumer agent review](consumer-agent-review.md) for scoped verification.
