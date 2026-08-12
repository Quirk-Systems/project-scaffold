import type {
  CanonicalEntity,
  OntologyFinding,
  OntologyRegistry,
} from "./types";

const CANONICAL_ID = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;

export function lintEntity(entity: CanonicalEntity): OntologyFinding[] {
  const findings: OntologyFinding[] = [];

  if (!CANONICAL_ID.test(entity.id)) {
    findings.push({
      code: "invalid_id",
      entityId: entity.id,
      message: "Canonical IDs must be lowercase, dot-delimited namespaces.",
    });
  }
  if (
    entity.id !== entity.namespace &&
    !entity.id.startsWith(`${entity.namespace}.`)
  ) {
    findings.push({
      code: "namespace_mismatch",
      entityId: entity.id,
      message: `ID must be contained by namespace "${entity.namespace}".`,
    });
  }
  if (entity.aliases.includes(entity.canonical_name)) {
    findings.push({
      code: "redundant_alias",
      entityId: entity.id,
      message: "The canonical name must not also be an alias.",
    });
  }
  if (entity.prohibited_meanings.some((meaning) => !meaning.trim())) {
    findings.push({
      code: "empty_prohibited_meaning",
      entityId: entity.id,
      message: "Prohibited meanings must be non-empty.",
    });
  }

  return findings;
}

export function lintRegistry(registry: OntologyRegistry): OntologyFinding[] {
  return registry.entities.flatMap(({ entity, canonicalPath }) =>
    lintEntity(entity).map((finding) => ({ ...finding, path: canonicalPath })),
  );
}
