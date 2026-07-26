# Quirk Ontology Registry

The registry assigns every recognized concept one primary type and records its
authority, lifecycle, lineage, evidence, permissions, and relationships.

## Authority boundary

Files under `ontology/canon/` and `ontology/seeds/` are canonical. The
`ontology` PostgreSQL schema is a disposable, queryable projection. Database
inserts and edits never become canon; durable changes begin as reviewed Git
changes and must pass `loadRegistry()` validation.

`Transform` (`quirk.move.transform`) is the broad Move family. `Mutate`
(`quirk.move.transform.mutate`) is a Move contained by Transform. Capabilities,
skills, scripts, controls, commands, characters, critiques, criticals,
content, conversations, conventions, constructions, conundrums, and cultural
fuckems are expression surfaces, not automatically sibling Moves.

Operational uses of similar words remain separate semantic scopes:

| Scope           | Identifier                 | Meaning                         |
| --------------- | -------------------------- | ------------------------------- |
| Asset lifecycle | `asset.status.mutated`     | An asset has a mutated version  |
| Run outcome     | `run.outcome.mutate_again` | A run requests another mutation |
| Move ontology   | `move.transform.mutate`    | The Mutate Move under Transform |

The existing database enum values remain unchanged; these identifiers make
their domain explicit at ontology boundaries.

## Layout and extraction

The canonical files and `src/lib/ontology/` remain inside Quirk OS. Extract
them to `packages/ontology`, and eventually `Quirk-Systems/quirk-core`, only
after a second independent consumer imports the contracts. Quirk Feed, a CLI
or worker, Evals, and realm repositories are candidate consumers. Do not make
demo repositories or database rows sources of canon.
