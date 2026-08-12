import type { CanonicalEntity } from "./types";

export type SemanticChange = {
  field: keyof CanonicalEntity;
  before: unknown;
  after: unknown;
  meaningShift: boolean;
};

const MEANING_FIELDS = new Set<keyof CanonicalEntity>([
  "primary_type",
  "definition",
  "contained_by",
  "relations",
  "prohibited_meanings",
  "supersedes",
  "superseded_by",
]);

export function diffEntity(
  before: CanonicalEntity,
  after: CanonicalEntity,
): SemanticChange[] {
  return (Object.keys(after) as (keyof CanonicalEntity)[])
    .filter((field) => field !== "content_hash")
    .filter(
      (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
    )
    .map((field) => ({
      field,
      before: before[field],
      after: after[field],
      meaningShift: MEANING_FIELDS.has(field),
    }));
}
