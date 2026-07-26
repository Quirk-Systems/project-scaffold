import { createHash } from "node:crypto";
import type {
  CanonicalEntity,
  OntologyFinding,
  OntologyRegistry,
} from "./types";
import { CANONICAL_ENTITY_IDS } from "./types";
import { lintRegistry } from "./lint";

const REQUIRED_STRING_FIELDS = [
  "id",
  "namespace",
  "canonical_name",
  "primary_type",
  "definition",
  "purpose",
  "owner",
  "lifecycle_status",
  "truth_status",
  "authority_level",
  "content_hash",
] as const;

const REQUIRED_ARRAY_FIELDS = [
  "secondary_facets",
  "governed_by",
  "inputs",
  "outputs",
  "relations",
  "capabilities_used",
  "evidence_required",
  "permissions",
  "conflicts",
  "aliases",
  "prohibited_meanings",
] as const;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export function hashCanonicalEntity(entity: CanonicalEntity): string {
  const payload = { ...entity, content_hash: "" };
  const digest = createHash("sha256")
    .update(JSON.stringify(stableValue(payload)))
    .digest("hex");
  return `sha256:${digest}`;
}

export function validateEntityShape(
  value: unknown,
  path?: string,
): OntologyFinding[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [
      { code: "invalid_entity", message: "Entity must be an object.", path },
    ];
  }

  const entity = value as Record<string, unknown>;
  const findings: OntologyFinding[] = [];
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof entity[field] !== "string" || !entity[field]) {
      findings.push({
        code: "required_string",
        message: `${field} must be a non-empty string.`,
        path,
      });
    }
  }
  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(entity[field])) {
      findings.push({
        code: "required_array",
        message: `${field} must be an array.`,
        path,
      });
    }
  }
  if (!entity.lineage || typeof entity.lineage !== "object") {
    findings.push({
      code: "required_object",
      message: "lineage must be an object.",
      path,
    });
  }
  if (
    !Number.isInteger(entity.schema_version) ||
    Number(entity.schema_version) < 1
  ) {
    findings.push({
      code: "invalid_schema_version",
      message: "schema_version must be a positive integer.",
      path,
    });
  }
  for (const field of ["contained_by", "supersedes", "superseded_by"]) {
    if (entity[field] !== null && typeof entity[field] !== "string") {
      findings.push({
        code: "invalid_nullable_reference",
        message: `${field} must be a string or null.`,
        path,
      });
    }
  }
  return findings;
}

function cycleFinding(
  entities: CanonicalEntity[],
  field: "contained_by" | "supersedes",
): OntologyFinding[] {
  const relationshipMap = new Map(
    entities.map((entity) => [entity.id, entity[field]]),
  );
  const findings: OntologyFinding[] = [];

  for (const entity of entities) {
    const path = new Set<string>();
    let current: string | null | undefined = entity.id;
    while (current) {
      if (path.has(current)) {
        findings.push({
          code: `${field}_cycle`,
          entityId: entity.id,
          message: `${field} relationships must be acyclic.`,
        });
        break;
      }
      path.add(current);
      current = relationshipMap.get(current);
    }
  }
  return findings;
}

export function validateRegistry(
  registry: OntologyRegistry,
): OntologyFinding[] {
  const shapeResults = registry.entities.map((entry) => ({
    entry,
    findings: validateEntityShape(entry.entity, entry.canonicalPath),
  }));
  const validEntries = shapeResults
    .filter(({ findings }) => findings.length === 0)
    .map(({ entry }) => entry);
  const findings = [
    ...shapeResults.flatMap((result) => result.findings),
    ...lintRegistry({ ...registry, entities: validEntries }),
  ];
  if (
    !Number.isInteger(registry.schema_version) ||
    registry.schema_version < 1
  ) {
    findings.push({
      code: "invalid_registry_version",
      message: "Registry schema_version must be a positive integer.",
    });
  }
  const entities = validEntries.map(({ entity }) => entity);
  const byId = new Map<string, CanonicalEntity>();

  for (const entity of entities) {
    if (byId.has(entity.id)) {
      findings.push({
        code: "duplicate_id",
        entityId: entity.id,
        message: "Canonical IDs must be unique.",
      });
    }
    byId.set(entity.id, entity);
    if (entity.content_hash !== hashCanonicalEntity(entity)) {
      findings.push({
        code: "content_hash_mismatch",
        entityId: entity.id,
        message: "content_hash does not match the canonical payload.",
      });
    }
  }

  for (const entity of entities) {
    const references = [
      entity.contained_by,
      entity.supersedes,
      entity.superseded_by,
      ...entity.relations
        .filter((relation) => !relation.external)
        .map((relation) => relation.target),
    ].filter((reference): reference is string => Boolean(reference));
    for (const reference of references) {
      if (!byId.has(reference)) {
        findings.push({
          code: "missing_reference",
          entityId: entity.id,
          message: `Referenced entity "${reference}" does not exist.`,
        });
      }
    }
  }

  findings.push(
    ...cycleFinding(entities, "contained_by"),
    ...cycleFinding(entities, "supersedes"),
  );

  const transform = byId.get(CANONICAL_ENTITY_IDS.transform);
  const mutate = byId.get(CANONICAL_ENTITY_IDS.mutate);
  if (
    !transform ||
    transform.primary_type !== "move_family" ||
    !mutate ||
    mutate.primary_type !== "move" ||
    mutate.contained_by !== transform.id ||
    !mutate.relations.some(
      (relation) =>
        relation.type === "member_of" && relation.target === transform.id,
    )
  ) {
    findings.push({
      code: "mutate_transform_invariant",
      entityId: mutate?.id,
      message: "Mutate must be a Move contained by and a member of Transform.",
    });
  }

  const aliases = new Map<string, CanonicalEntity>();
  for (const entity of entities) {
    for (const alias of entity.aliases) {
      const key = `${entity.namespace}:${alias.toLowerCase()}`;
      const existing = aliases.get(key);
      if (
        existing &&
        !entity.conflicts.some(
          (conflict) =>
            conflict.type === "alias_ambiguity" &&
            conflict.with === existing.id,
        )
      ) {
        findings.push({
          code: "alias_collision",
          entityId: entity.id,
          message: `Alias "${alias}" collides with ${existing.id}.`,
        });
      }
      aliases.set(key, entity);
    }
  }

  return findings;
}

export function assertValidRegistry(registry: OntologyRegistry): void {
  const findings = validateRegistry(registry);
  if (findings.length) {
    throw new Error(
      `Ontology validation failed:\n${findings
        .map((finding) => `- [${finding.code}] ${finding.message}`)
        .join("\n")}`,
    );
  }
}
