import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { diffEntity } from "./diff";
import { loadRegistry } from "./load";
import { buildProjection } from "./project";
import {
  ONTOLOGY_SCHEMA_VERSION,
  OPERATIONAL_SEMANTIC_IDS,
  type CanonicalEntity,
} from "./types";
import { hashCanonicalEntity, validateRegistry } from "./validate";

const ontologyRoot = resolve(process.cwd(), "ontology");

describe("ontology registry", () => {
  it("loads a valid, content-addressed canonical registry", async () => {
    const registry = await loadRegistry(ontologyRoot);

    expect(registry.schema_version).toBe(ONTOLOGY_SCHEMA_VERSION);
    expect(registry.entities).toHaveLength(2);
    for (const { entity } of registry.entities) {
      expect(entity.content_hash).toBe(hashCanonicalEntity(entity));
    }
  });

  it("proves Mutate is nested beneath Transform", async () => {
    const registry = await loadRegistry(ontologyRoot);
    const mutate = registry.entities.find(
      ({ entity }) => entity.id === "quirk.move.transform.mutate",
    )?.entity;

    expect(mutate).toMatchObject({
      primary_type: "move",
      contained_by: "quirk.move.transform",
    });
    expect(mutate?.relations).toContainEqual({
      type: "member_of",
      target: "quirk.move.transform",
    });
  });

  it("models Transform surfaces as expressions rather than child Moves", async () => {
    const registry = await loadRegistry(ontologyRoot);
    const transform = registry.entities.find(
      ({ entity }) => entity.id === "quirk.move.transform",
    )?.entity;
    const expressions = transform?.relations.filter(
      (relation) => relation.type === "can_be_expressed_through",
    );

    expect(expressions).toHaveLength(14);
    expect(expressions?.every((relation) => relation.external)).toBe(true);
  });

  it("rejects a Mutate record detached from Transform", async () => {
    const registry = await loadRegistry(ontologyRoot);
    const located = registry.entities.find(
      ({ entity }) => entity.id === "quirk.move.transform.mutate",
    );
    const detached = {
      ...located!.entity,
      contained_by: null,
    } satisfies CanonicalEntity;
    detached.content_hash = hashCanonicalEntity(detached);
    const invalid = {
      ...registry,
      entities: registry.entities.map((entry) =>
        entry === located ? { ...entry, entity: detached } : entry,
      ),
    };

    expect(validateRegistry(invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "mutate_transform_invariant" }),
      ]),
    );
  });

  it("reports malformed records without throwing", async () => {
    const registry = await loadRegistry(ontologyRoot);
    const malformed = {
      ...registry,
      entities: [
        ...registry.entities,
        {
          entity: { id: "broken" } as CanonicalEntity,
          canonicalPath: "broken.yaml",
        },
      ],
    };

    expect(() => validateRegistry(malformed)).not.toThrow();
    expect(validateRegistry(malformed)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "required_string" }),
      ]),
    );
  });

  it("builds a stable Git-attributed projection", async () => {
    const registry = await loadRegistry(ontologyRoot);
    const projection = buildProjection(registry, "abc1234");

    expect(projection.map((entry) => entry.canonicalId)).toEqual([
      "quirk.move.transform",
      "quirk.move.transform.mutate",
    ]);
    expect(projection[0]).toMatchObject({
      canonicalPath: "seeds/transform.yaml",
      commitSha: "abc1234",
    });
  });

  it("marks ontological meaning shifts in semantic diffs", async () => {
    const registry = await loadRegistry(ontologyRoot);
    const before = registry.entities[0].entity;
    const after = { ...before, definition: `${before.definition} Revised.` };

    expect(diffEntity(before, after)).toEqual([
      expect.objectContaining({ field: "definition", meaningShift: true }),
    ]);
  });

  it("keeps operational mutation meanings distinct", () => {
    expect(new Set(Object.values(OPERATIONAL_SEMANTIC_IDS))).toHaveLength(3);
  });
});
