# Halo Taste Collision — binding-constraint specification v0.1

Status: CANDIDATE / NOT ADMITTED. Owner: Quirk Systems. Surface: `/halo/index.html` in `project-scaffold`.

## One binding constraint

**One visitor must be able to compare two curated, materially different calls to action and explicitly approve one direction, or reject both, producing a byte-deterministic, independently verifiable local receipt — without any model call, external write, auto-application, inferred preference, or claimed conversion lift.**

## Why this first

The Quirk Capability Compounder v0.1 SPEC.md (user Library) calls for a task deliverable plus system dividend, a blind pairwise ranking component, source/evidence lineage, and human-gated promotion. This slice is a candidate implementation of that smallest useful experience, not the entire Compounder or a release grant. The `project-scaffold` README explicitly identifies this repository as a runnable reference, not Quirk OS canon. The existing `preference-evidence-wedge` is separate and is not used as production authorization.

## Explicit acceptance

- The visitor sees a concrete prompt, locked original, two curated and labeled-neutral alternatives, and an honest `Neither` option.
- The visitor can choose, revise their choice, tag a Quirk Human Take, and explicitly press **Approve direction**.
- Approving produces a stable receipt bound to the exact fixture, choice, optional feedback, and final candidate through SHA-256. Invalid or tampered receipts must fail closed.
- Source, candidates, no-effect status, and dissent are retained. Nothing is saved remotely; nothing learns or applies itself.
- Accessible keyboard-operated controls, status announcements, small screens, clear consent and limitations.
- `node --test tests/halo/*.test.mjs` runs L1 pure receipt tests and L2 simulated DOM/HTML integration tests. Real-browser smoke is a separate required release gate. CI status must not be inferred from local checks.

## Non-goals / boundaries

No LLM generation, persistent storage, analytics transmission, signing, authentication, real preference learning, live marketing conversion, or repo-wide authority. `approved` is a visitor's unverified click within the local demo; a digest proves integrity against this version of fixture code, not who clicked or whether they meant it. `applied:false` is mandatory. Treat marketing uplift as a hypothesis until measured with permissioned traffic and a baseline.

## 50-point CIQ proposal (not a pre-existing adopted rubric)

| Dimension | Max | Evidence needed |
|---|---:|---|
| Binding constraint and deliverable | 10 | One functioning comparison-to-receipt path; no scope expansion |
| Deterministic correctness | 10 | SHA-256 digest, strict validation, adversarial mutation tests, repeatability |
| Human authority and safety | 10 | Explicit second-stage approval, `Neither`, no effects, no covert telemetry |
| Accessible conversion-oriented experience | 10 | Clear CTA, usable keyboard/mobile flow, observed user trial needed for conversion claim |
| Evidence, reproducibility, rollback | 10 | L1, L2, docs, honest CI status, revertible draft, next cliffhanger |

CIQ <49/50 or any broken hard gate => REJECT **release approval**. A local green test is not a green hosted CI result. A conversion-oriented design is not measured conversion.

## One task due within 24 hours

Prepare and submit this one bounded candidate slice and its deterministic verifier as a **draft PR**, not an automatic merge/deployment. Human must review evidence and authorize any broader application. Maximum three repair attempts before human escalation.
