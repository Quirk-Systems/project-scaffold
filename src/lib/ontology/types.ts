export const ONTOLOGY_SCHEMA_VERSION = 1;

export const OPERATIONAL_SEMANTIC_IDS = {
  assetMutated: "asset.status.mutated",
  runMutateAgain: "run.outcome.mutate_again",
  moveMutate: "move.transform.mutate",
} as const;

export type OntologyRelation = {
  type: string;
  target: string;
  external?: boolean;
  qualifiers?: Record<string, unknown>;
};

export type OntologyConflict = {
  type: string;
  with: string;
  resolution?: string;
};

export type OntologyLineage = {
  derived_from?: string[];
  source?: string;
  notes?: string;
};

export type CanonicalEntity = {
  id: string;
  namespace: string;
  canonical_name: string;
  primary_type: string;
  secondary_facets: string[];
  definition: string;
  purpose: string;
  owner: string;
  governed_by: string[];
  contained_by: string | null;
  lifecycle_status: string;
  truth_status: string;
  authority_level: string;
  inputs: string[];
  outputs: string[];
  relations: OntologyRelation[];
  capabilities_used: string[];
  evidence_required: string[];
  permissions: string[];
  lineage: OntologyLineage;
  conflicts: OntologyConflict[];
  aliases: string[];
  prohibited_meanings: string[];
  supersedes: string | null;
  superseded_by: string | null;
  schema_version: number;
  content_hash: string;
};

export type LocatedEntity = {
  entity: CanonicalEntity;
  canonicalPath: string;
};

export type OntologyRegistry = {
  schema_version: number;
  entities: LocatedEntity[];
};

export type OntologyFinding = {
  code: string;
  message: string;
  entityId?: string;
  path?: string;
};
