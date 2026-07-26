import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { CanonicalEntity, OntologyRegistry } from "./types";
import { assertValidRegistry } from "./validate";

const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,64}$/i;

export type ProjectionEntity = {
  canonicalId: string;
  canonicalPath: string;
  commitSha: string;
  entity: CanonicalEntity;
};

export function buildProjection(
  registry: OntologyRegistry,
  commitSha: string,
): ProjectionEntity[] {
  assertValidRegistry(registry);
  if (!COMMIT_SHA_PATTERN.test(commitSha)) {
    throw new Error("A 7-64 character hexadecimal commit SHA is required.");
  }

  return registry.entities
    .map(({ entity, canonicalPath }) => ({
      canonicalId: entity.id,
      canonicalPath,
      commitSha,
      entity,
    }))
    .sort((left, right) => left.canonicalId.localeCompare(right.canonicalId));
}

export async function projectRegistry(
  registry: OntologyRegistry,
  commitSha: string,
): Promise<string> {
  const projection = buildProjection(registry, commitSha);
  const run = await db.execute<{ id: string }>(sql`
    insert into ontology.projection_runs (commit_sha, status)
    values (${commitSha}, 'running')
    returning id
  `);
  const runId = run[0].id;

  try {
    await db.transaction(async (tx) => {
      for (const item of projection) {
        await tx.execute(sql`
          insert into ontology.entity_types (canonical_name)
          values (${item.entity.primary_type})
          on conflict (canonical_name) do nothing
        `);

        const projected = await tx.execute<{
          id: string;
          current_version: number;
        }>(
          sql`
            insert into ontology.entities (
              canonical_id, namespace, canonical_name, primary_type_id,
              truth_status, lifecycle_status, authority_level, canonical_path,
              content_hash, schema_version, current_version, payload,
              commit_sha, projected_at
            )
            values (
              ${item.canonicalId}, ${item.entity.namespace},
              ${item.entity.canonical_name},
              (select id from ontology.entity_types where canonical_name = ${item.entity.primary_type}),
              ${item.entity.truth_status}, ${item.entity.lifecycle_status},
              ${item.entity.authority_level}, ${item.canonicalPath},
              ${item.entity.content_hash}, ${item.entity.schema_version}, 1,
              ${JSON.stringify(item.entity)}::jsonb, ${item.commitSha}, now()
            )
            on conflict (canonical_id) do update set
              namespace = excluded.namespace,
              canonical_name = excluded.canonical_name,
              primary_type_id = excluded.primary_type_id,
              truth_status = excluded.truth_status,
              lifecycle_status = excluded.lifecycle_status,
              authority_level = excluded.authority_level,
              canonical_path = excluded.canonical_path,
              schema_version = excluded.schema_version,
              payload = excluded.payload,
              commit_sha = excluded.commit_sha,
              projected_at = excluded.projected_at,
              current_version = case
                when ontology.entities.content_hash <> excluded.content_hash
                  then ontology.entities.current_version + 1
                else ontology.entities.current_version
              end,
              content_hash = excluded.content_hash
            returning id, current_version
          `,
        );
        const entityId = projected[0].id;
        const version = projected[0].current_version;

        await tx.execute(sql`
          insert into ontology.entity_versions (
            entity_id, version, content_hash, payload, commit_sha, projected_at
          )
          values (
            ${entityId}, ${version}, ${item.entity.content_hash},
            ${JSON.stringify(item.entity)}::jsonb, ${item.commitSha}, now()
          )
          on conflict (entity_id, version) do nothing
        `);

        await tx.execute(sql`
          update ontology.relations
          set valid_to = now()
          where subject_entity_id = ${entityId}
            and valid_to is null
            and content_hash <> ${item.entity.content_hash}
        `);

        await tx.execute(sql`
          delete from ontology.aliases where entity_id = ${entityId}
        `);
        for (const alias of item.entity.aliases) {
          const ambiguity = item.entity.conflicts.find(
            (conflict) => conflict.type === "alias_ambiguity",
          );
          await tx.execute(sql`
            insert into ontology.aliases (
              entity_id, namespace, alias, ambiguity_record
            )
            values (
              ${entityId}, ${item.entity.namespace}, ${alias},
              ${ambiguity ? JSON.stringify(ambiguity) : null}::jsonb
            )
          `);
        }

        for (const relation of item.entity.relations) {
          await tx.execute(sql`
            insert into ontology.relation_types (canonical_name)
            values (${relation.type})
            on conflict (canonical_name) do nothing
          `);
          await tx.execute(sql`
            insert into ontology.relations (
              subject_entity_id, relation_type_id, object_entity_id,
              object_canonical_id, is_external, qualifiers, source_path,
              content_hash, valid_from
            )
            values (
              ${entityId},
              (select id from ontology.relation_types where canonical_name = ${relation.type}),
              (select id from ontology.entities where canonical_id = ${relation.target}),
              ${relation.target}, ${Boolean(relation.external)},
              ${JSON.stringify(relation.qualifiers ?? {})}::jsonb,
              ${item.canonicalPath}, ${item.entity.content_hash}, now()
            )
            on conflict (
              subject_entity_id, relation_type_id, object_canonical_id, content_hash
            ) do nothing
          `);
        }
      }
    });
    await db.execute(sql`
      update ontology.projection_runs
      set status = 'succeeded', entity_count = ${projection.length},
          completed_at = now()
      where id = ${runId}
    `);
    return runId;
  } catch (error) {
    await db.execute(sql`
      update ontology.projection_runs
      set status = 'failed', completed_at = now()
      where id = ${runId}
    `);
    throw error;
  }
}

export async function listProjectedEntities() {
  return db.execute<{
    canonical_id: string;
    canonical_name: string;
    primary_type: string;
    truth_status: string;
    lifecycle_status: string;
    authority_level: string;
    content_hash: string;
    schema_version: number;
    current_version: number;
    payload: CanonicalEntity;
    projected_at: Date;
  }>(sql`
    select
      entity.canonical_id,
      entity.canonical_name,
      entity_type.canonical_name as primary_type,
      entity.truth_status,
      entity.lifecycle_status,
      entity.authority_level,
      entity.content_hash,
      entity.schema_version,
      entity.current_version,
      entity.payload,
      entity.projected_at
    from ontology.entities entity
    join ontology.entity_types entity_type
      on entity_type.id = entity.primary_type_id
    order by entity.canonical_id
  `);
}
