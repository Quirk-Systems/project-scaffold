# Spec

Convert a feature description into a full engineering spec.

## Context Needed
- Feature description (what the user asked for, or what's in the ticket)
- Who the users are (if known)
- Any constraints or non-goals

## Process

1. Restate the problem in your own words to confirm understanding
2. Write user stories: "As a [user], I want [thing], so that [value]"
3. Write acceptance criteria in Given/When/Then format
4. List edge cases to test
5. Explicitly state what's out of scope
6. Identify open questions that block implementation

## Output Format

```markdown
## Problem
[One paragraph — what breaks, who hurts, why now]

## User Stories
- As a [role], I want [action], so that [outcome]

## Acceptance Criteria
- [ ] Given [context], when [action], then [result]
- [ ] Given [context], when [edge case], then [safe result]

## Edge Cases
- [Scenario]: [Expected behavior]

## Out of Scope
- [Explicitly excluded thing]

## Open Questions
- [ ] [Question] → @owner
```

## Rules
- Be specific enough that a developer can start without a meeting
- Mark assumptions clearly — don't silently fill in missing info
- If scope is unclear, ask before writing the spec
