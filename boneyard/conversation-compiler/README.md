# Conversation Compiler Boneyard

The boneyard preserves displaced value with a reason, salvageable parts, and a
specific trigger for reconsideration. It is not a transcript attic and not a
place to hide decisions nobody wants to make.

## Admission contract

Retain an entry only when all of these are present:

```yaml
id: bone_example
unitId: unit_example
reason: wrong_boundary
salvageableParts:
  - one reusable routing distinction
reanimationTriggers:
  - the same need appears in three independent conversations
```

The referenced truth unit carries provenance and sensitivity. Omit
`replacementRef` when no replacement exists; never encode absence as `null`.

Allowed reasons:

- `duplicate`
- `superseded`
- `failed_eval`
- `weak_evidence`
- `wrong_boundary`
- `blocked_dependency`
- `not_now`
- `rejected_direction`
- `unsafe`
- `beautiful_but_useless`

Secrets, private transcripts, deletion-requested personal data, and material
that is unsafe to retain are purged. They are never preserved for archaeology.

## Resurrection rules

1. Create a new candidate linked to the buried entry; do not rewrite history.
2. Recheck present canon, repo ownership, permissions, evidence, and collision
   risk.
3. Record what changed enough to justify resurrection.
4. Require the same hard gates as a new object.
5. Treat repeated resurrection as evidence that the system boundary may be
   wrong.

Review by trigger or quarterly when the boneyard has active triggers. Avoid
ceremonial graveyard tourism.

## Design genealogy

These are anticipated failure-shaped ancestors, not claims about prior Quirk
canon.

| Buried pattern                  | Reason                  | Salvageable part              | Reanimation trigger                                               |
| ------------------------------- | ----------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Transcript Summary              | `wrong_boundary`        | concise state handoff         | a task needs temporary context compression, not durable knowledge |
| One Mega Wrap Prompt            | `failed_eval`           | provider-neutral instructions | the prompt remains paired with schemas, fixtures, and validators  |
| Everything Everywhere Repo Dump | `beautiful_but_useless` | broad object census           | independent owners and lifecycles justify each target             |
| Genius Folder                   | `wrong_boundary`        | exceptional-signal marker     | “genius” becomes scored metadata on a typed object                |
| Automatic Canonizer             | `unsafe`                | candidate extraction          | exact host grants remain mandatory                                |
| Self-Authored Execution Receipt | `unsafe`                | executor handoff shape        | a host executor owns receipts and pinned-state checks             |
| README as Knowledge Base        | `duplicate`             | navigational summary          | README only indexes stronger owned artifacts                      |

An entry with no reason, salvageable part, or reanimation trigger should be
deleted. The boneyard earns its keep by making future judgment better, not by
making deletion emotionally impossible.
