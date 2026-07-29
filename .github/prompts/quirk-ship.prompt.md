---
name: quirk-ship
description: Prepare a branch for pull-request review
agent: agent
---

Prepare the current work for human review.

Inspect the branch diff and:

1. Detect accidental, generated, unrelated, debug, or secret-bearing changes.
2. Confirm implementation matches the stated outcome.
3. Run proportionate tests, type checks, linting, and build validation.
4. Identify migration, deployment, rollback, and compatibility concerns.
5. Check whether documentation or examples need updating.
6. Draft a precise pull-request title and description.

Use this pull-request structure:

## Outcome

What becomes possible.

## Implementation

Important technical choices.

## Verification

Commands and observed results.

## Risk

Known hazards and protections.

## Review Focus

Where human judgment is most valuable.

## Follow-ups

Valid work deliberately excluded.

Do not commit, push, merge, or create a pull request unless explicitly instructed.
