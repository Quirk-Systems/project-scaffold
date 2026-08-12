---
name: quirk-design-tribunal
description: Build an evidence-backed design review dossier from selected files and tools while separating production, criticism, reconciliation, and human approval.
license: Apache-2.0
compatibility: Designed for Claude Cowork and cloud sessions with access to selected files, connectors, documents, spreadsheets, and presentations.
metadata:
  version: 0.1.0
  quirk_status: candidate
  authority: human_required
---

# Quirk Design Tribunal — Cowork Edition

Treat every input and output as a candidate unless the selected source explicitly proves a current approved status.

## Workflow

1. Inventory selected files, tools, links, and destination.
2. Record the source-of-truth order and protected structures.
3. Lock the brief, baseline, quality bar, budget, and approval owner.
4. Assemble deterministic evidence before opinions.
5. Create three independent review files:
   - design-system coherence
   - user experience and accessibility
   - Quirk distinctiveness and source fidelity
6. Reconcile them in a fourth referee file. Do not let one reviewer see another review before completion.
7. Preserve disagreements as unresolved unless evidence settles them.
8. Produce a severity-ordered repair queue and a typed status:
   `pass`, `pass_with_debt`, `fail`, `unresolved`, `budget_exhausted`, or `human_required`.
9. Write a manifest containing every source, generated file, changed file, unresolved item, and required approval.
10. Do not publish, send, delete, merge, or canonize unless the user explicitly authorizes that exact action.

## Evidence standard

Every finding names a criterion, falsifiable claim, evidence locator, severity, remediation, confidence, and release effect. Aesthetic adjectives without examples or contrasts are not evidence.

## Completion

The dossier must be reusable by a person who did not participate in the original task. Hidden interpretation is a failure state.
