# Claude Design Improvement Contract

Claude Design is the exploration and visual-production surface. It does not own Quirk canon, production code, or the final quality verdict.

## Input pack

Every substantial Claude Design request should include:

1. outcome and audience
2. artifact kind and target surface
3. current baseline or explicit absence
4. versioned Quirk design-system snapshot
5. content source and provenance
6. required states and breakpoints
7. accessibility and interaction constraints
8. anti-reference list: patterns the result must not collapse into
9. quality bar with evidence requirements
10. export format and destination
11. approval owner

## Design-system snapshot

A snapshot is executable context, not a mood board. It contains:

- semantic tokens and aliases
- type scale, measure, and density modes
- spacing and layout grammar
- component anatomy and allowed composition
- interaction-state matrix
- motion grammar and reduced-motion rules
- responsive behaviors
- icon and media rules
- voice/register examples
- prohibited patterns
- version, provenance, and migration notes

## Required export manifest

Claude Design output is incomplete without:

- artifact files or links
- baseline reference
- tokens introduced, reused, changed, or bypassed
- components introduced, reused, changed, or bypassed
- state inventory
- responsive behavior notes
- accessibility intent and unresolved tests
- motion behavior
- content dependencies
- implementation notes for Claude Code
- provenance and source references

## Eleven system improvements

1. **Token lineage:** every visible value traces to a semantic purpose or is explicitly experimental.
2. **Axis separation:** identity, purpose, state, and authority never hide inside one token or variant.
3. **State completeness:** default, hover, focus, active, disabled, loading, empty, error, success, and destructive states are considered where applicable.
4. **Responsive grammar:** components adapt by content and task pressure, not desktop shrinkage.
5. **Density modes:** calm, working, and forensic information densities have explicit rules.
6. **Motion evidence:** motion names the transition, duration intent, interruption behavior, and reduced-motion fallback.
7. **Content fit:** real copy and edge-case lengths are tested before approval.
8. **Reference mutation:** inspiration is cited, decomposed, and transformed; resemblance alone is not design reasoning.
9. **Anti-slop discriminators:** generic gradients, ornamental glass, dashboard-card wallpaper, fake metrics, and decorative complexity require purpose or removal.
10. **Export fidelity:** files, tokens, and component mappings survive transfer into implementation.
11. **Tribunal readiness:** every important decision has an evidence handle a fresh critic can inspect.

## Prompt template

```text
Create [artifact] for [audience/outcome] using Design System Snapshot [version].

Preserve:
- [source truths]
- [required states]
- [responsive and accessibility constraints]

Do not:
- invent metrics, people, approvals, or source facts
- hide implementation decisions in decorative output
- use generic AI-product aesthetics unless functionally justified

Return:
1. the artifact
2. a design rationale tied to the locked quality bar
3. the export manifest
4. unresolved evidence gaps

This is a candidate. Do not claim canon, production readiness, or measured improvement.
```
