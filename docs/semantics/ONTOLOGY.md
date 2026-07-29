# Quirk Semantics Drive

Quirk Semantics Drive is the ontology and semantic-governance layer connecting names, definitions, entities, relations, provenance, rules, and projections.

## Technical foundation

- JSON-LD 1.1 supplies an interoperable linked-data representation.
- W3C PROV concepts inform entity, activity, agent, derivation, and attribution semantics.
- OpenTelemetry semantic-convention thinking informs stable names for observable runtime attributes.
- Quirk terms remain human-readable and operationally constrained rather than becoming ornamental taxonomy.

## Semantic process

`Capture → Normalize → Resolve → Relate → Challenge → Validate → Project → Observe → Revise`

## Rules

- Canonical terms have one active definition per scope and version.
- Aliases resolve to canonical terms.
- Deprecated terms name a replacement and migration path.
- Relations have explicit direction and meaning.
- Contradictions remain visible until resolved.
- Runtime attributes do not silently redefine canonical concepts.
- Every projection retains the canonical identifier and version.

## Identifier pattern

`quirk://<domain>/<type-or-collection>/<slug>`

## Current protected decisions

- `Asset` replaces the deprecated Quirk use of `Artifact`.
- `Override` means a hard human-authorized rule.
- `Overswerve` means a useful reroute.
- Organizational words describe behavior; “team” is not a universal flattening category.
