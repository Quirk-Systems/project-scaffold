---
name: design-tribunal
description: Run an evidence-backed, role-separated design review for a UI, document, template, campaign, app, service, or design-system change. Use when quality, distinctiveness, accessibility, or release confidence matters more than a single self-review.
disable-model-invocation: true
argument-hint: "<artifact-or-task> [--mode lite|standard|one-of-one]"
allowed-tools: Read, Grep, Glob, Bash, Agent
---

# Quirk Design Tribunal

Status: **candidate capability**. Running this skill can recommend release or admission; it cannot canonize, publish, merge, or override human authority.

## Governing split

- Builder builds.
- Deterministic gates measure what code can prove.
- Fresh-context critics inspect the artifact without seeing the builder's reasoning or one another's verdicts.
- Referee reconciles evidence; it does not average opinions into truth.
- Human authority decides canon, release, waiver, or supersession.

Never let the builder grade its own work. Never claim improvement without a baseline or explicit quality bar. Never convert a blocker into a passing average.

## Invocation

Parse `$ARGUMENTS` into:

1. target artifact, task, route, file set, or URL
2. mode: `lite`, `standard`, or `one-of-one`
3. optional baseline
4. optional design-system reference
5. optional output directory

When an input is missing, infer it from the repository and state the assumption in the report. Do not interrupt execution unless the missing value would make the review meaningless or unsafe.

## Modes

| Mode | Use | Builders | Critics | Repair rounds | Comparison |
| --- | --- | ---: | ---: | ---: | --- |
| `lite` | Local component, low-risk document, narrow polish | 1 | 1 rotating critic + referee | 1 | Baseline only |
| `standard` | Product surface, reusable template, release candidate | 1 | 3 isolated critics + referee | 2 max | Baseline required for improvement claims |
| `one-of-one` | Signature launch, core surface, canonical design-system move | 2 independent candidates | 3 isolated critics + referee | 2 max | Blind pairwise decision |

Budgets are hard limits, not aspirations. Record model, turns, tokens when available, wall-clock time, and repair count. Stop with `budget_exhausted` rather than pretending completion.

## Phase 0 — Lock the review contract

Create a review request that validates against `src/lib/quirk/design-tribunal/contracts.ts` and contains:

- artifact kind and locator
- desired outcome and audience
- baseline or explicit `no_baseline` reason
- quality-bar criteria with required evidence
- design-system snapshot or explicit absence
- prohibited changes
- budget
- human approval requirement

Every quality-bar criterion must be testable as `pass`, `fail`, or `unresolved`. Adjectives without observable evidence are not criteria.

## Phase 1 — Capture evidence before opinions

Run the applicable deterministic gates first:

- lint, type-check, unit tests, build
- accessibility tooling or semantic inspection
- responsive state inventory
- design-token and component-variant checks
- screenshot or rendered-output capture
- broken-link and content-integrity checks for documents
- asset/provenance manifest validation

Store commands, output summaries, file references, screenshots, or digests as evidence handles. Do not paste secrets, raw credentials, or unrelated user data into reports.

## Phase 2 — Build or identify contenders

For `standard`, produce or identify one candidate. For `one-of-one`, produce two independently reasoned candidates without sharing implementation rationale between builders.

Builders may receive the same brief, quality bar, design-system snapshot, and source references. They may not receive critic verdicts from a prior contender until blind comparison is complete.

## Phase 3 — Spawn isolated critics

Run these agents in parallel when available:

1. `design-systems-critic`
2. `experience-critic`
3. `quirk-distinctiveness-critic`

Each critic receives only:

- locked brief
- quality bar
- artifact or candidate output
- baseline, when required
- design-system snapshot
- deterministic evidence

Do not include builder reasoning, hidden deliberation, other critic reports, or desired verdict.

Each critic must return structured findings following `references/report-format.md`. Critics are read-only and may not repair the artifact they judge.

## Phase 4 — Referee

Invoke `design-referee` with all critic reports and deterministic evidence.

The referee must:

- deduplicate findings without erasing disagreement
- reject unsupported claims
- mark evidence conflicts `unresolved`
- preserve any blocking failure regardless of majority vote
- produce a severity-ordered repair queue
- derive release status using `deriveReleaseStatus()`
- identify the exact human decision still required

## Phase 5 — Repair without critic contamination

Give the builder only the accepted repair queue and supporting evidence. Do not give it critic identities, vote counts, or chain-of-thought. Re-run deterministic gates after every repair round, then spawn fresh critic contexts for affected criteria.

A fixed finding is not deleted. Add resolution evidence and retain the original finding in the ledger.

## Phase 6 — Stop

Stop when the first condition is met:

1. `pass`: all blocking criteria pass and no human approval is required
2. `pass_with_debt`: no blocking issue remains; named non-blocking debt is accepted for this release
3. `human_required`: technical gates pass but release/canon authority has not approved
4. `fail`: an evidenced blocking failure remains
5. `unresolved`: evidence conflicts or cannot support a decision
6. `budget_exhausted`: hard budget reached before a safe decision

No endless “one more pass.” No silent waiver. No automatic canonization.

## Required output

Write a tribunal report containing:

- review request and assumptions
- artifact and baseline digests
- deterministic gate results
- critic reports
- reconciled findings
- repair history
- final status and rationale
- human decision required
- cost/budget summary
- provenance and source references

Use `references/report-format.md` as the exact interchange shape. Store durable results in the Quirk evidence ledger when that integration exists; until then, write the report beside the artifact under a clearly named review directory.
