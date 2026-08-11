# Quirk Design Tribunal

**Status:** PROPOSAL — candidate Capability + Workflow Object  
**Owner:** Quirk Control  
**Human authority:** Bryan  
**Source ingest:** 2026-08-11 video and repository study  
**Repository role:** reusable project-scaffold capability pack; not a repo rename and not a new primary system

## Decision

Adopt the useful core of the “gauntlet” technique—fresh-context independent criticism—without adopting its expensive, endless, or self-congratulatory failure modes.

The Quirk mutation is **Design Tribunal**: an evidence-budgeted review and admission capability that separates building, measuring, criticizing, refereeing, repairing, and human authority.

It is designed for:

- apps and product surfaces
- reusable components and design systems
- Claude Design outputs
- Claude Code implementations
- Claude Cowork document and asset packs
- services and client deliverables
- campaigns, emails, decks, docs, templates, and interactive experiences
- Quirk Skills, prompts, and generated interfaces

## Why this earns a candidate object

A single model session that creates an artifact and grades it shares context, assumptions, incentives, and blind spots with itself. Repeated self-critique can improve wording while preserving the same underlying mistake. Fresh contexts reduce that coupling, but multiplying critics without a contract creates cost, consensus theater, and contradictory advice.

Design Tribunal solves both sides:

- independent contexts for epistemic separation
- typed criteria and evidence for operational closure
- deterministic gates before model judgment
- explicit cost and round budgets
- append-only findings and decisions
- human authority over release, waiver, and canon

## Object contract

| Field | Definition |
| --- | --- |
| Type | Candidate `CapabilityObject` implemented by a `WorkflowObject` and reusable Claude Skill |
| Purpose | Convert design intent and taste into evidence-backed release/admission decisions |
| Inputs | Brief, artifact, baseline, quality bar, design-system snapshot, constraints, budget, authority |
| Outputs | Evidence dossier, findings, repair queue, release status, decision request |
| Lifecycle | candidate → trial → evaluated → approved/rejected/superseded; never auto-canon |
| Interfaces | Claude Design, Claude Code, Cowork, GitHub, Supabase, Google Drive, Quirk UI |
| Evidence | deterministic tests, renders, screenshots, accessibility tree, token/component diffs, source references, human decision |
| Permissions | critics read-only; builders edit; referee read-only; only human authority releases/canonizes |
| Failure states | fail, unresolved, budget_exhausted, critic conflict, missing baseline, missing authority, evidence gap |
| Evaluation | 11 fixtures plus live surface trials; compare defects caught, repair cost, latency, token cost, and human acceptance |

## Operating topology

1. Lock brief, baseline, quality bar, budget, and authority.
2. Build one candidate—or two for `one-of-one` mode.
3. Run deterministic gates.
4. Spawn isolated design-systems, experience, and Quirk-distinctiveness critics.
5. Reconcile evidence through a read-only referee.
6. Return the minimum repair queue to the builder.
7. Re-run only affected gates in fresh contexts.
8. Stop at a typed status.
9. Request human approval where required.
10. Persist evidence and decision history.

## Anti-limiting rules

1. Do not let a builder judge its own artifact.
2. Do not let an average erase a blocker.
3. Do not equate a screenshot with accessibility or implementation proof.
4. Do not claim improvement without a baseline.
5. Do not run more rounds because “better” remains imaginable.
6. Do not let critics edit the artifact they judge.
7. Do not expose prior verdicts to fresh critics.
8. Do not resolve value conflicts by majority vote.
9. Do not treat cost as invisible.
10. Do not delete rejected findings or superseded decisions.
11. Do not let capability imply authority.

## Modes

- **Lite:** narrow, low-risk work; one rotating critic and referee.
- **Standard:** three independent critics, one candidate, two repair rounds maximum.
- **One-of-One:** two independently built candidates, blind pairwise comparison, three critics, human admission.

## Release statuses

- `pass`
- `pass_with_debt`
- `fail`
- `unresolved`
- `budget_exhausted`
- `human_required`

## Repository pack

- `.claude/skills/design-tribunal/` — invocable Claude Code workflow and report grammar
- `.claude/agents/` — read-only critics and referee
- `.claude/rules/design-system.md` — path-scoped design-system rules
- `src/lib/quirk/design-tribunal/` — typed contracts and 11 conformance tests
- `docs/quirk/design-tribunal/` — source ingest, Claude surface playbooks, adoption matrix, Supabase projection, examples
- `supabase/migrations/` — private evidence-ledger migration candidate

## Admission requirements

Before promoting this capability from candidate:

1. all 11 contract tests pass
2. one component trial catches at least one seeded defect without false blocker
3. one document trial preserves source provenance and layout integrity
4. one app-surface trial verifies responsive and accessibility evidence
5. one blind A/B trial produces a defensible comparison
6. cost and latency are recorded, not guessed
7. critic disagreement is preserved correctly
8. a budget-exhaustion run stops safely
9. a waived finding remains in history
10. a human-required run cannot self-approve
11. Ship It Without Bryan can execute the pack from repository instructions alone
