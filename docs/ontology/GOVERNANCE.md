# Ontology governance

## Change workflow

1. Change canonical YAML/JSON in Git.
2. Run `bun run ontology:validate` to validate the entity contract and content
   hash.
3. Run semantic lint and graph invariants.
4. Review the semantic diff, including primary type, definition,
   containment, relationships, prohibited meanings, and supersession.
5. Obtain human approval required by `authority_level`.
6. Merge to the protected default branch.
7. Project that commit with `projectRegistry(registry, commitSha)`.
8. Verify entity/version hashes and retain the projection run as evidence.

Aliases must be unique within a namespace. A deliberate collision requires an
`alias_ambiguity` conflict naming the other entity. Canon changes cannot be
approved or authored through Supabase.

`content_hash` covers the complete entity payload except the hash field itself.
After changing a canonical record, regenerate it with `hashCanonicalEntity()`;
`bun run ontology:validate` rejects stale hashes.

The runtime may accept change requests, evidence, and lint findings, but these
remain proposals or history until the corresponding Git change is approved.
