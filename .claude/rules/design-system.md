---
paths:
  - "src/app/**"
  - "src/components/**"
  - "src/emails/**"
  - "src/styles/**"
  - "docs/quirk/design-tribunal/**"
  - ".claude/skills/design-tribunal/**"
  - ".claude/agents/*design*.md"
  - ".claude/agents/experience-critic.md"
  - ".claude/agents/quirk-distinctiveness-critic.md"
---

# Quirk Design-System Rules

- Separate semantic purpose from visual expression. A color or component name must not silently carry identity, state, permissions, and release authority at once.
- Prefer semantic tokens and explicit component variants over copied utility clusters.
- Every reusable component defines default, hover, focus, active, disabled, loading, empty, error, success, and destructive behavior when applicable.
- Treat 320px, 768px, and 1440px as evidence checkpoints, not the full responsive strategy.
- Preserve keyboard order, visible focus, semantic HTML, zoom, reduced motion, contrast, and readable measure.
- Generated designs must include an export manifest: tokens touched, components added or changed, variants, dependencies, responsive behavior, and unresolved states.
- Improvement claims require a baseline or an explicit `no_baseline` limitation.
- High-impact surfaces, reusable templates, and design-system changes run `/design-tribunal` before release.
- Critics do not edit the work they judge. Builders do not issue the final verdict.
- No automated review may canonize, publish, merge, or waive a blocker.
- “Quirk” is proven through specific purpose, references, and reusable decisions—not decorative randomness or generic AI aesthetics with louder nouns.
