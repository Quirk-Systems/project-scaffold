# Ontology relationships

Relations contain a governed `type`, a canonical `target`, optional
`qualifiers`, and an `external` marker. A target must resolve in the registry
unless it is explicitly external.

Containment and supersession are directed and acyclic. The seed invariant is:

```text
quirk.move.transform.mutate
  contained_by → quirk.move.transform
  member_of    → quirk.move.transform
```

Transform uses `can_be_expressed_through` for its expression surfaces. This
relation does not imply containment or classify those surfaces as Moves.
External targets remain visible in the projection through
`object_canonical_id` while `object_entity_id` is null.
