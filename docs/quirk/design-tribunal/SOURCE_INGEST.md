# Source Ingest — Claude Design “Gauntlet” Technique

## Provenance

- Video supplied by Bryan: [This New Prompting Technique just 10X’d Claude Design](https://youtu.be/jq9LRwE0-GQ)
- Published summary and timestamps: [Dutch Startup TV](https://www.dutchstartup.ai/en/tv/this-new-prompting-technique-just-10x-d-claude-design)
- Reusable implementation and attribution trail: [robonuggets/gauntlet-loop](https://github.com/robonuggets/gauntlet-loop)
- Technique credited by the reusable implementation to Matt Shumer; repository packaging by RoboNuggets under CC BY 4.0.

This ingest is based on the published video description, timestamps, demonstrations, and the linked implementation—not a verbatim transcript. Claims below are separated from Quirk interpretation.

## EVIDENCE — source claims worth retaining

1. A model that builds and judges in the same context can preserve its own assumptions.
2. Fresh-context critics produce meaningfully different scrutiny.
3. A strict quality bar is more useful than “make it better.”
4. Multiple critical lenses can expose different defect classes.
5. Design systems improve repeatability when supplied as working context rather than vague brand prose.
6. The demonstrations span static content, animation, and an interactive page, suggesting the method is artifact-agnostic.
7. The published run cost is extremely high—roughly 2–3 million tokens—making budget architecture part of the method, not an afterthought.

## INFERENCE — why the technique works

Fresh contexts reduce shared-context bias, but independence alone is not enough. The actual leverage comes from four separations:

- production from evaluation
- criteria from taste adjectives
- evidence from verdict
- capability from release authority

## REJECT — what Quirk should not import

- “10X” as an unevidenced product claim
- “AI slop destroyed” as a substitute for acceptance criteria
- an unbounded repeat-until-pass ritual
- fixed critic count regardless of artifact risk
- critics that both judge and repair
- model-only evidence for accessibility, performance, or user outcomes
- a final pass produced by averaging scores
- design-system text treated as canonical without provenance, versions, or runtime validation

## MUTATION — Quirk Design Tribunal

| Source mechanic | Quirk mutation |
| --- | --- |
| Fresh critic sessions | Named read-only subagents with isolated context |
| Three critics | Risk-adjusted critic roster; three only in standard/high-value modes |
| Quality bar | Typed criteria with evidence and release effect |
| Repeat until pass | Bounded repair rounds plus explicit `budget_exhausted` |
| Critic feedback | Append-only findings with status and remediation |
| Final judgment | Evidence referee + human authority |
| Design-system prompt | Versioned snapshot with token/component/export manifest |
| Better-looking result | Baseline comparison and outcome-specific proof |
| Expensive token burn | Deterministic gates first; model escalation only where judgment is required |

## Commercial excavation

Design Tribunal can become a reusable Quirk service pattern without becoming a generic “AI design agency” offer:

- Design-system hardening audit
- Generated-interface anti-slop review
- Cross-surface consistency tribunal
- Launch dossier for product, campaign, and docs
- Blind concept duel for signature work
- White-label quality gate for agent-generated customer assets

Commercialization should follow conformance evidence, cost accounting, and repeatability—not the excitement of the first impressive render.
