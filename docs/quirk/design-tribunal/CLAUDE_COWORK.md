# Claude Cowork Operating Playbook

Cowork is the multi-file operating surface for gathering, reconciling, formatting, and packaging work. It is not the final judge and it cannot promote candidate material into Quirk canon.

## Where Cowork wins

- ingest source files, links, notes, and references into a traceable brief
- reconcile versions across documents, spreadsheets, decks, and exports
- generate review dossiers and decision packets
- propagate an approved design-system change across selected file sets
- audit a folder for stale language, missing provenance, broken references, or inconsistent templates
- prepare release evidence while Claude Code handles repository implementation

## Workspace boundary

At the start of a task, define:

- selected folders and connectors
- read-only versus writable resources
- output destination
- source-of-truth order
- protected files and secrets
- whether the task may create drafts, comments, or final files
- human approval point

Cowork may reorganize a working pack only inside the selected boundary. It must not infer that connector access grants authority to publish, send, merge, delete, or canonize.

## Five Quirk Cowork routines

### 1. Source-to-Brief

Input: video, article, PDFs, notes, screenshots, references.  
Output: source census, claims, evidence, contradictions, reusable mechanics, rejected mechanics, Quirk mutations, open questions.

### 2. Design-System Propagation Audit

Input: approved design-system version plus selected folders.  
Output: affected-file inventory, divergence map, safe replacements, manual-review queue, untouched protected structures.

### 3. Cross-Surface Release Dossier

Input: app build, docs, marketing assets, email, support copy, screenshots.  
Output: release manifest, provenance, state coverage, unresolved divergence, tribunal evidence packet.

### 4. Template Forge

Input: one approved artifact and its object contract.  
Output: reusable template, variables, required evidence, failure states, example, anti-example, migration notes.

### 5. Boneyard Recovery

Input: deprecated or abandoned assets.  
Output: salvageable mechanics, duplicated ideas, reasons for rejection, modern mutation candidates, “do not resurrect” constraints.

## Portable Cowork skill

The upload-safe skill lives at:

`docs/quirk/design-tribunal/cowork-skill/SKILL.md`

It uses only frontmatter accepted by Claude skill uploads. Keep Claude Code-only fields in the repository skill, not the Cowork package.

## Handoff to Claude Code

Cowork hands Code:

- locked brief
- source and asset manifest
- design-system snapshot
- exact file/output requirements
- quality bar
- unresolved questions that affect implementation
- prohibited mutations
- tribunal mode and budget

Claude Code returns:

- implementation diff
- tests and build evidence
- rendered captures
- migration or deployment notes
- tribunal dossier

## Completion rule

Cowork output is complete when another operator can locate every source, reproduce the pack, understand what remains unresolved, and see exactly which human decision is still required.
