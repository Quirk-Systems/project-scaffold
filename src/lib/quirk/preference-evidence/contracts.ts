import { createHash } from "node:crypto";

export const PREFERENCE_PREDICATE = "presentation.response_density" as const;
export const PREFERENCE_VALUES = ["concise", "balanced", "detailed"] as const;
export type PreferenceValue = (typeof PREFERENCE_VALUES)[number];

export const FIXED_PREFERENCE_SCOPE = {
  project: "Quirk-Systems/project-scaffold",
  purpose: "repository-audit-reporting",
  context: "project-scaffold-reference",
  surface: "repository-audit-report",
  task: "render-repository-audit-report",
} as const;

export type PreferenceScope = {
  [K in keyof typeof FIXED_PREFERENCE_SCOPE]: string;
};

export type PreferenceActor = {
  actor_type: string;
  actor_id: string;
  subject_relation: string;
  authentication: { status: string; session_ref: string };
};

export type PreferenceEvidenceInput = {
  predicate: string;
  value: string;
  subject: { kind: string; subject_id: string };
  scope: PreferenceScope;
  evidence: {
    type: string;
    sensitivity: string;
    statement: string;
    captured_at: string;
    actor: PreferenceActor;
  };
  validity: { not_before: string; expires_at: string };
  system_default: boolean;
};

export type Addressed = {
  id: string;
  content_sha256: string;
};

export type Candidate = Addressed & {
  object_version: "preference-candidate.v1";
  predicate: typeof PREFERENCE_PREDICATE;
  value: PreferenceValue;
  subject: { kind: "authenticated_self"; subject_id: string };
  scope: typeof FIXED_PREFERENCE_SCOPE;
  evidence: {
    type: "explicit_user_statement";
    sensitivity: "non_sensitive";
    statement: string;
    statement_sha256: string;
    captured_at: string;
    actor: {
      actor_type: "human";
      actor_id: string;
      subject_relation: "self";
      authentication: { status: "authenticated"; session_ref: string };
    };
  };
  authority: {
    kind: "human_self_statement";
    effect: "evidence_only";
    runtime_authority: "none";
  };
  validity: { not_before: string; expires_at: string };
  system_default: false;
};

export type Proposal = Addressed & {
  object_version: "preference-proposal.v1";
  candidate_ref: Addressed;
  requested_effect: "project_only";
  scope: typeof FIXED_PREFERENCE_SCOPE;
  proposed_at: string;
  runtime_authority: "none";
};

export type Decision = Addressed & {
  object_version: "preference-decision.v1";
  proposal_ref: Addressed;
  outcome: "approved" | "rejected";
  actor: Candidate["evidence"]["actor"];
  explicit: true;
  scope: typeof FIXED_PREFERENCE_SCOPE;
  decided_at: string;
  expires_at: string;
  approved_effects: [] | ["project_only"];
  runtime_authority: "none";
};

export type Projection = Addressed & {
  object_version: "preference-projection.v1";
  decision_ref: Addressed;
  mode: "deterministic_simulation";
  effect: "project_only";
  scope: typeof FIXED_PREFERENCE_SCOPE;
  result: { predicate: typeof PREFERENCE_PREDICATE; value: PreferenceValue };
  result_sha256: string;
  simulated_at: string;
  applied: false;
  consumer_authority: "none";
  runtime_authority: "none";
};

export type RecordedReceipt = Addressed & {
  object_version: "preference-projection-receipt.v1";
  candidate_ref: Addressed;
  proposal_ref: Addressed;
  decision_ref: Addressed;
  projection_ref: Addressed;
  candidate_statement_sha256: string;
  projection_result_sha256: string;
  effect: "project_only";
  recorded_at: string;
  applied: false;
  authority_effect: "none";
};

export type EdgeConfirmation = Addressed & {
  object_version: "preference-edge-confirmation.v1";
  receipt_ref: Addressed;
  effect: "create_edge";
  actor: Candidate["evidence"]["actor"];
  explicit: true;
  predicate: typeof PREFERENCE_PREDICATE;
  value: PreferenceValue;
  scope: typeof FIXED_PREFERENCE_SCOPE;
  confirmed_at: string;
  expires_at: string;
  runtime_authority: "none";
};

export type LearnedEdge = Addressed & {
  object_version: "preference-edge.v1";
  subject: Candidate["subject"];
  predicate: typeof PREFERENCE_PREDICATE;
  value: PreferenceValue;
  scope: typeof FIXED_PREFERENCE_SCOPE;
  validity: { not_before: string; expires_at: string };
  reference: { type: "explicit_user_statement"; candidate_ref: Addressed };
  receipt_ref: Addressed;
  confirmation_ref: Addressed;
  authority: { kind: "explicit_human_confirmation"; runtime_authority: "none" };
  system_default: false;
  state: "recorded";
  applied: false;
  consumer_authority: "none";
  runtime_authority: "none";
};

export type PreferenceEvidenceReceipt = {
  schema_version: "preference-evidence-wedge.v1";
  contract_status: "candidate";
  admission_effect: "none";
  runtime_authority: "none";
  candidate: Candidate;
  proposal: Proposal;
  decision: Decision;
  projection: Projection | null;
  receipt: RecordedReceipt | null;
  edge_confirmation: EdgeConfirmation | null;
  learned_edge: LearnedEdge | null;
};

export type LearnedPreferenceEdge = PreferenceEvidenceReceipt & {
  projection: Projection;
  receipt: RecordedReceipt;
  edge_confirmation: EdgeConfirmation;
  learned_edge: LearnedEdge;
};

function canonicalize(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, canonicalize(object[key])]),
    );
  }
  throw new TypeError(
    "Preference contract values must contain only JSON strings, booleans, arrays, objects, and null.",
  );
}

export function canonicalSha256(value: unknown): string {
  const encoded = JSON.stringify(canonicalize(value));
  return `sha256:${createHash("sha256").update(encoded, "utf8").digest("hex")}`;
}

export function utf8Sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

export function addressObject<T extends object>(
  kind: string,
  body: T,
): T & Addressed {
  const content_sha256 = canonicalSha256(body);
  return { ...body, id: `${kind}:${content_sha256}`, content_sha256 };
}

export function ref(value: Addressed): Addressed {
  return { id: value.id, content_sha256: value.content_sha256 };
}
