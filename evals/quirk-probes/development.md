# Quirk Probes development evidence

Session date: 2026-09-10. Status: **CANDIDATE / STATE_ONLY / TEST-ONLY**.
Admission decision: **Constrain** to local bounded evaluation and draft review.

## Mission and authority

Implement the atlas's narrow probe concept as a reusable candidate in
`Quirk-Systems/project-scaffold`, using the existing composition evidence. Finish
when paired assessment, linked staleness, complete replay, failure cases, and
documented local use are demonstrated. This is coding and documentation under the
user's current continuation request. It does not authorize runtime admission,
Canon, graph application, training, merge, deployment, or independent human approval.

Protected source: the existing original probe and Task 4/5 proof. This change adds
`evals/quirk-probes/` and one separate read-only candidate workflow. No existing
source, original receipt, plan, package configuration, or workflow is changed.
The existing PR remains the continuing candidate; no second composition matcher
or additional proof PR is created.

## Source census and lineage

| Source | Classification and use |
| --- | --- |
| Candidate atlas v0.1, item 39 | Concept provenance; definition and limits read; repository ownership unverified there |
| Scaffold b892aefa558a736ffb50869e47b547559c627db9 | Candidate baseline, current PR #106 head when selected |
| Four original composition files | Exact fetched Git blob bytes; preserved, hashed, and reused locally |
| Task 4/5 adapter README at the baseline | Read for boundaries; no new execution claim about that adapter |
| Build and Compound Quirk skills | Procedural guidance; implementation/evidence and lineage responsibilities separated |

`source-pins.json` identifies the four selected source files. Their local bytes
were compared to the fetched Git blob identities; no generated reconstruction is
claimed as an upstream source. Clone transport was unavailable, so local work used
a selected-file projection. The candidate publication preserves the rest of the
remote Git tree and adds only the stated paths.

The atlas's source identity and limitations are in [README](README.md). The
existing [Task 4/5 proof](../session-composition/adapter/README.md) keeps its own
receipt and evidence scope. The original behavioral comparator is reused through
`evaluateFixturePack`; it is not reimplemented in this package.

## Observed validation

Runtime: **Node v24.19.0**. Tests use Node builtins; no model, database, or network
calls occur inside the probe. Repository dependency installation was unnecessary
for this slice. Local formatting used the existing workspace's Prettier tool.

```bash
node --test --test-reporter=tap evals/session-composition/probe.test.mjs evals/quirk-probes/core.test.mjs evals/quirk-probes/replay.test.mjs
node evals/quirk-probes/replay.mjs --check
```

| Observation | Result |
| --- | --- |
| Original suite | 48/48 pass, unchanged source |
| Reusable core suite | 22/22 pass |
| Fixed replay/integration suite | 7/7 pass |
| Total final local tests | **77/77 pass** |
| Original paired traces replayed | 12 challenges rejected; 12 controls preserved |
| All-allow and all-deny mutations | Both yield `NOT_SUPPORTED` |
| Policy, fixture, implementation binding changes | Old evidence yields `STALE` |
| Rehashed permission/human-review edits | `INVALID`; no authority granted |
| Fresh local copy | Record/check works; edited evidence is refused and left intact |
| Source drift | Refused before importing the modified source runner |
| Full repository `bun run validate` | Attempted; unavailable, exit 127: Bun not installed |

Counts are deterministic checks, including grouped assertions. They are not
independent attack samples, production outcome observations, or safety estimates.
The 24 reused traces are the same original corpus, not 24 new pieces of evidence.

Raw final output: [validation.tap](validation.tap).
SHA-256: `4d69cccacc72ba8e49c187b8cbb7c92c48b54d96f3e9065506b1da9deda2ce4a`.
Its measured test duration is 643.724138 ms in that run. Replay timing, model cost,
end-to-end delivery cost, and human-review time were not measured. No economic or
user-benefit improvement is claimed.

## Failure and repair chronology

An initial combined command ran before the parallel implementer had materialized
`core.mjs`; it failed with `ERR_MODULE_NOT_FOUND`. This was work ordering, not a
behavioral RED test. The first completed implementation passed 76 checks. The
all-allow/all-deny mutations are postimplementation disproof checks, not claimed
as preimplementation TDD evidence.

A separate review agent reproduced a contract defect: uppercase hexadecimal
digests passed input validation but exact comparison returned `STALE` for the same
SHA-256 value. This was a false staleness result, not an authority bypass. Root
reproduced it and added a focused regression **before** changing the validator.
The regression failed with a missing expected `ProbeValidationError`.

- Before-repair core SHA-256:
  `695bd52703f441a638ec2296dc6d2833a8f211ad67abebcb85085733c979e132`.
- Before-format regression test SHA-256:
  `db6bd67b12a5f24faa45b6eab78e4e37d1bc14e8c16abb6ae83406ccbaeb882e`.
- Retained failure: [lowercase-regression-red.tap](lowercase-regression-red.tap),
  SHA-256 `9cd8e98366e6d804ad0cf8c717f9a19ff0ee34af90d23aafa28678141f9fb759`.
- Repair: require exactly 64 **lowercase** hexadecimal characters for hash inputs;
  invalid casing is a contract error rather than evidence staleness.
- The final 77-check run includes the new regression and its positive control.

The prior core is reproducible from the final core by restoring `/i` to its `HEX`
regex and removing `lowercase ` from the corresponding validation error message;
the pre-repair hash above identifies that source. The red log preserves its
observed failure; the final log preserves the repaired result. Formatting changes
to the test after its red run are not a behavioral repair.

See [agent review](agent-review.md) for reviewer findings and tested identities.
Agent review does not satisfy independent human review. The local-copy exercise
demonstrates scoped operation from the instructions with Node already installed;
it is not a general first-time-user or clean-OS certification.

## Contract layers and dividend

The runtime validator rejects invalid shapes; tests check semantic discrimination;
linked inspection identifies content drift relative to a consumer-owned pin.
No scheduled monitor is installed. The candidate API is deliberately closed,
binary, simulation-only, and dependency-free.

Implemented: paired assessment, canonical content binding, linked applicability,
fixed local replay, and a separate read-only CI definition. Evidenced locally:
the bounded behaviors above. Proposed: adoption by OS, Skills, or Preference
consumers. Open: authenticated evidence, live history/revocation, wall-clock expiry,
real consumers, human review, and observed user benefit.

The reusable capability deposit is `capability.probes.inspect-bound-evidence`.
No Canon or cross-system improvement level is earned. Next move: one real
consumer pins a definition independently, changes one source, and compares the
operator's time and correctness in locating the required rerun against the
existing receipt-only process. Its measured result decides keep/mutate/drop.
