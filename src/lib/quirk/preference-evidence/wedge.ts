import {
  verifyPreferenceDecisionAuthority,
  verifyPreferenceEdgeAuthority,
  type AuthorityDenialReason,
} from "@/lib/quirk/governance/authority";
import {
  FIXED_PREFERENCE_SCOPE,
  PREFERENCE_PREDICATE,
  PREFERENCE_VALUES,
  addressObject,
  canonicalSha256,
  ref,
  utf8Sha256,
  type Candidate,
  type Decision,
  type LearnedPreferenceEdge,
  type PreferenceActor,
  type PreferenceEvidenceInput,
  type PreferenceEvidenceReceipt,
  type PreferenceScope,
  type Proposal,
} from "./contracts";

export type PreferenceEvaluationReason =
  | "missing_statement"
  | "statement_mismatch"
  | "inferred_evidence"
  | "sensitive_evidence"
  | "non_self_actor"
  | "anonymous_subject"
  | "actor_mismatch"
  | "authentication_required"
  | "unsupported_predicate"
  | "unsupported_value"
  | "invalid_timestamp"
  | "invalid_validity"
  | "invalid_principal"
  | "malformed_input"
  | "system_default_forbidden"
  | `scope_mismatch:${keyof PreferenceScope | "keys"}`;

export type PreferenceEvaluation =
  | { eligible: false; reasons: PreferenceEvaluationReason[] }
  | { eligible: true; reasons: []; candidate: Candidate };

export type ProposedPreferenceMove = {
  candidate: Candidate;
  proposal: Proposal;
};

export type AuthorizedPreferenceMove = ProposedPreferenceMove & {
  authorized: true;
  decision: Decision & {
    outcome: "approved";
    approved_effects: ["project_only"];
  };
  simulatedAt: string;
  recordedAt: string;
};

export type RejectedPreferenceMove = {
  authorized: false;
  document: PreferenceEvidenceReceipt & {
    projection: null;
    receipt: null;
    edge_confirmation: null;
    learned_edge: null;
  };
};

export type PreferenceWedgeDenialReason =
  | AuthorityDenialReason
  | "ineligible_evidence"
  | "scope_mismatch"
  | "time_order_invalid"
  | "stale_candidate"
  | "stale_decision"
  | "decision_not_explicit"
  | "actor_mismatch"
  | "effect_expansion"
  | "rejected_move"
  | "confirmation_not_explicit"
  | "reference_mismatch"
  | "state_integrity";

export class PreferenceWedgeDeniedError extends Error {
  constructor(readonly reason: PreferenceWedgeDenialReason) {
    super(`Preference evidence wedge denied: ${reason}`);
    this.name = "PreferenceWedgeDeniedError";
  }
}

const TIME_RE =
  /^(?!0000)\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;
const PRINCIPAL_RE = /^user:[a-z0-9][a-z0-9._-]{0,63}$/;
const SESSION_RE = /^authn:[A-Za-z0-9._:-]{1,128}$/;
const STAGE_CONSTRUCTOR_TOKEN = Object.freeze({});
type IntegrityStage = "evaluated" | "proposed" | "authorized" | "document";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: unknown, keys: readonly string[]): boolean {
  if (!isObject(value)) return false;
  if (
    JSON.stringify(Object.keys(value).sort()) !==
    JSON.stringify([...keys].sort())
  ) {
    return false;
  }
  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable === true && "value" in descriptor;
  });
}

function integrity(condition: boolean): asserts condition {
  if (!condition) throw new PreferenceWedgeDeniedError("state_integrity");
}

const MAX_SNAPSHOT_OBJECT_KEYS = 256;
const MAX_SNAPSHOT_ARRAY_LENGTH = 1024;

class ClosedSnapshotError extends Error {}

type SnapshotContext = {
  active: Set<object>;
  seen: Map<object, unknown>;
};

type SnapshotResult<T> = { ok: true; value: T } | { ok: false; value?: never };

function snapshotArray(
  value: unknown[],
  context: SnapshotContext,
): readonly unknown[] {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key === "symbol")) {
    throw new ClosedSnapshotError();
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    lengthDescriptor.enumerable !== false ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > MAX_SNAPSHOT_ARRAY_LENGTH
  ) {
    throw new ClosedSnapshotError();
  }
  const length = lengthDescriptor.value as number;
  const expectedKeys = new Set([
    ...Array.from({ length }, (_, index) => String(index)),
    "length",
  ]);
  if (
    keys.length !== expectedKeys.size ||
    keys.some((key) => !expectedKeys.has(key as string))
  ) {
    throw new ClosedSnapshotError();
  }
  const snapshot: unknown[] = [];
  context.seen.set(value, snapshot);
  context.active.add(value);
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !("value" in descriptor)
    ) {
      throw new ClosedSnapshotError();
    }
    snapshot.push(snapshotJsonValue(descriptor.value, context));
  }
  context.active.delete(value);
  return Object.freeze(snapshot);
}

function snapshotJsonValue(
  value: unknown,
  context: SnapshotContext,
  preservedRootKeys?: ReadonlySet<string>,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value !== "object") throw new ClosedSnapshotError();
  if (context.active.has(value)) throw new ClosedSnapshotError();
  if (context.seen.has(value)) return context.seen.get(value);
  if (Array.isArray(value)) return snapshotArray(value, context);

  const keys = Reflect.ownKeys(value);
  if (
    keys.length > MAX_SNAPSHOT_OBJECT_KEYS ||
    keys.some((key) => typeof key === "symbol")
  ) {
    throw new ClosedSnapshotError();
  }
  const snapshot: Record<string, unknown> = {};
  context.seen.set(value, snapshot);
  context.active.add(value);
  for (const key of keys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !("value" in descriptor)
    ) {
      throw new ClosedSnapshotError();
    }
    const captured = descriptor.value;
    const snapshotValue = preservedRootKeys?.has(key)
      ? captured
      : snapshotJsonValue(captured, context);
    if (preservedRootKeys?.has(key) && !isObject(snapshotValue)) {
      throw new ClosedSnapshotError();
    }
    Object.defineProperty(snapshot, key, {
      configurable: false,
      enumerable: true,
      value: snapshotValue,
      writable: false,
    });
  }
  context.active.delete(value);
  return Object.freeze(snapshot);
}

function closedJsonSnapshot<T>(
  value: unknown,
  preservedRootKeys?: ReadonlySet<string>,
): SnapshotResult<T> {
  try {
    return {
      ok: true,
      value: snapshotJsonValue(
        value,
        { active: new Set(), seen: new Map() },
        preservedRootKeys,
      ) as T,
    };
  } catch {
    return { ok: false };
  }
}

function deepFreezeJsonGraph(
  value: unknown,
  seen = new Set<object>(),
  active = new Set<object>(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  integrity(typeof value === "object");
  if (active.has(value)) {
    throw new PreferenceWedgeDeniedError("state_integrity");
  }
  if (seen.has(value)) return;
  active.add(value);
  const keys = Reflect.ownKeys(value);
  integrity(!keys.some((key) => typeof key === "symbol"));
  if (Array.isArray(value)) {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    integrity(
      lengthDescriptor !== undefined &&
        "value" in lengthDescriptor &&
        lengthDescriptor.enumerable === false &&
        Number.isSafeInteger(lengthDescriptor.value) &&
        lengthDescriptor.value >= 0 &&
        lengthDescriptor.value <= MAX_SNAPSHOT_ARRAY_LENGTH,
    );
    const length = lengthDescriptor.value as number;
    integrity(
      keys.length === length + 1 &&
        keys.every((key) => key === "length" || /^\d+$/.test(key as string)),
    );
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      integrity(
        descriptor !== undefined &&
          descriptor.enumerable === true &&
          "value" in descriptor,
      );
      deepFreezeJsonGraph(descriptor.value, seen, active);
    }
  } else {
    integrity(keys.length <= MAX_SNAPSHOT_OBJECT_KEYS);
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      integrity(
        descriptor !== undefined &&
          descriptor.enumerable === true &&
          "value" in descriptor,
      );
      deepFreezeJsonGraph(descriptor.value, seen, active);
    }
  }
  active.delete(value);
  seen.add(value);
  Object.freeze(value);
}

class MarkedStageState {
  #stage: IntegrityStage;
  #digest: string;

  constructor(token: object, stage: IntegrityStage, value: object) {
    if (token !== STAGE_CONSTRUCTOR_TOKEN) {
      throw new TypeError("Preference stage state construction is private.");
    }
    Object.assign(this, value);
    this.#stage = stage;
    deepFreezeJsonGraph(this);
    this.#digest = canonicalSha256(this);
  }

  static matches(
    token: object,
    value: MarkedStageState,
    stage: IntegrityStage,
  ): boolean {
    return (
      token === STAGE_CONSTRUCTOR_TOKEN &&
      value.#stage === stage &&
      value.#digest === canonicalSha256(value)
    );
  }
}
Object.freeze(MarkedStageState);
Object.freeze(MarkedStageState.prototype);

function mark<T extends object>(value: T, stage: IntegrityStage): T {
  return new MarkedStageState(STAGE_CONSTRUCTOR_TOKEN, stage, value) as T;
}

function hasMark(value: object, stage: IntegrityStage): boolean {
  try {
    return (
      value instanceof MarkedStageState &&
      MarkedStageState.matches(STAGE_CONSTRUCTOR_TOKEN, value, stage)
    );
  } catch {
    return false;
  }
}

function hasFrozenJsonGraph(
  value: unknown,
  seen = new Set<object>(),
  active = new Set<object>(),
): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value !== "object") return false;
  if (active.has(value)) return false;
  if (seen.has(value)) return true;
  try {
    if (!Object.isFrozen(value)) return false;
    active.add(value);
    seen.add(value);
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key === "symbol")) return false;
    if (Array.isArray(value)) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        lengthDescriptor === undefined ||
        !("value" in lengthDescriptor) ||
        lengthDescriptor.enumerable !== false ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        lengthDescriptor.value > MAX_SNAPSHOT_ARRAY_LENGTH ||
        keys.length !== lengthDescriptor.value + 1
      ) {
        return false;
      }
      for (let index = 0; index < lengthDescriptor.value; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );
        if (
          descriptor === undefined ||
          descriptor.enumerable !== true ||
          !("value" in descriptor) ||
          !hasFrozenJsonGraph(descriptor.value, seen, active)
        ) {
          return false;
        }
      }
      active.delete(value);
      return true;
    }
    if (keys.length > MAX_SNAPSHOT_OBJECT_KEYS) return false;
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !("value" in descriptor) ||
        !hasFrozenJsonGraph(descriptor.value, seen, active)
      ) {
        return false;
      }
    }
    active.delete(value);
    return true;
  } catch {
    return false;
  }
}

function hasGovernedStage(value: unknown, stage: IntegrityStage): boolean {
  try {
    return (
      isObject(value) && hasMark(value, stage) && hasFrozenJsonGraph(value)
    );
  } catch {
    return false;
  }
}

function timestamp(value: string): number | null {
  if (!TIME_RE.test(value)) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().replace(".000Z", "Z") === value
    ? parsed
    : null;
}

function exactScope(scope: PreferenceScope): boolean {
  if (!exactKeys(scope, Object.keys(FIXED_PREFERENCE_SCOPE))) return false;
  return (
    Object.keys(FIXED_PREFERENCE_SCOPE) as Array<keyof PreferenceScope>
  ).every((key) => scope[key] === FIXED_PREFERENCE_SCOPE[key]);
}

function exactActor(left: PreferenceActor, right: PreferenceActor): boolean {
  return (
    exactKeys(left, [
      "actor_type",
      "actor_id",
      "subject_relation",
      "authentication",
    ]) &&
    exactKeys(left.authentication, ["status", "session_ref"]) &&
    PRINCIPAL_RE.test(left.actor_id) &&
    left.actor_type === right.actor_type &&
    left.actor_id === right.actor_id &&
    left.subject_relation === right.subject_relation &&
    left.authentication.status === right.authentication.status &&
    left.authentication.session_ref === right.authentication.session_ref
  );
}

function sameRef(
  value: unknown,
  target: { id: string; content_sha256: string },
): boolean {
  const record = value as Record<string, unknown>;
  return (
    exactKeys(value, ["id", "content_sha256"]) &&
    record.id === target.id &&
    record.content_sha256 === target.content_sha256
  );
}

function validAddress(value: Record<string, unknown>, kind: string): boolean {
  const id = value.id;
  const digest = value.content_sha256;
  if (typeof id !== "string" || typeof digest !== "string") return false;
  const body = Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => key !== "id" && key !== "content_sha256",
    ),
  );
  try {
    const expected = canonicalSha256(body);
    return digest === expected && id === `${kind}:${expected}`;
  } catch {
    return false;
  }
}

function assertActor(
  value: Candidate["evidence"]["actor"],
  subjectId: string,
): void {
  integrity(
    exactKeys(value, [
      "actor_type",
      "actor_id",
      "subject_relation",
      "authentication",
    ]),
  );
  integrity(exactKeys(value.authentication, ["status", "session_ref"]));
  integrity(
    value.actor_type === "human" &&
      value.actor_id === subjectId &&
      PRINCIPAL_RE.test(value.actor_id) &&
      value.subject_relation === "self" &&
      value.authentication.status === "authenticated" &&
      SESSION_RE.test(value.authentication.session_ref),
  );
}

function assertCandidate(value: Candidate): void {
  integrity(
    exactKeys(value, [
      "object_version",
      "id",
      "content_sha256",
      "predicate",
      "value",
      "subject",
      "scope",
      "evidence",
      "authority",
      "validity",
      "system_default",
    ]),
  );
  integrity(validAddress(value, "candidate"));
  integrity(
    value.object_version === "preference-candidate.v1" &&
      value.predicate === PREFERENCE_PREDICATE &&
      PREFERENCE_VALUES.includes(value.value),
  );
  integrity(exactKeys(value.subject, ["kind", "subject_id"]));
  integrity(
    value.subject.kind === "authenticated_self" &&
      PRINCIPAL_RE.test(value.subject.subject_id),
  );
  integrity(exactScope(value.scope));
  integrity(
    exactKeys(value.evidence, [
      "type",
      "sensitivity",
      "statement",
      "statement_sha256",
      "captured_at",
      "actor",
    ]),
  );
  const expectedStatement = `For repository audit reports in this project, use ${value.value} response density.`;
  integrity(
    value.evidence.type === "explicit_user_statement" &&
      value.evidence.sensitivity === "non_sensitive" &&
      value.evidence.statement === expectedStatement &&
      value.evidence.statement_sha256 === utf8Sha256(expectedStatement),
  );
  assertActor(value.evidence.actor, value.subject.subject_id);
  integrity(
    exactKeys(value.authority, ["kind", "effect", "runtime_authority"]),
  );
  integrity(
    value.authority.kind === "human_self_statement" &&
      value.authority.effect === "evidence_only" &&
      value.authority.runtime_authority === "none",
  );
  integrity(exactKeys(value.validity, ["not_before", "expires_at"]));
  const captured = timestamp(value.evidence.captured_at);
  const notBefore = timestamp(value.validity.not_before);
  const expires = timestamp(value.validity.expires_at);
  integrity(
    captured !== null &&
      notBefore !== null &&
      expires !== null &&
      notBefore <= captured &&
      captured < expires,
  );
  integrity(value.system_default === false);
}

function assertProposal(value: Proposal, candidate: Candidate): void {
  integrity(
    exactKeys(value, [
      "object_version",
      "id",
      "content_sha256",
      "candidate_ref",
      "requested_effect",
      "scope",
      "proposed_at",
      "runtime_authority",
    ]),
  );
  integrity(validAddress(value, "proposal"));
  integrity(
    value.object_version === "preference-proposal.v1" &&
      sameRef(value.candidate_ref, candidate) &&
      value.requested_effect === "project_only" &&
      exactScope(value.scope) &&
      value.runtime_authority === "none",
  );
  const proposed = timestamp(value.proposed_at);
  const captured = timestamp(candidate.evidence.captured_at);
  const expires = timestamp(candidate.validity.expires_at);
  integrity(
    proposed !== null &&
      captured !== null &&
      expires !== null &&
      captured <= proposed &&
      proposed < expires,
  );
}

function assertDecision(
  value: Decision,
  proposal: Proposal,
  candidate: Candidate,
): void {
  integrity(
    exactKeys(value, [
      "object_version",
      "id",
      "content_sha256",
      "proposal_ref",
      "outcome",
      "actor",
      "explicit",
      "scope",
      "decided_at",
      "expires_at",
      "approved_effects",
      "runtime_authority",
    ]),
  );
  integrity(validAddress(value, "decision"));
  integrity(
    value.object_version === "preference-decision.v1" &&
      sameRef(value.proposal_ref, proposal) &&
      (value.outcome === "approved" || value.outcome === "rejected") &&
      exactActor(value.actor, candidate.evidence.actor) &&
      value.explicit === true &&
      exactScope(value.scope) &&
      value.runtime_authority === "none",
  );
  const effects = value.outcome === "approved" ? ["project_only"] : [];
  integrity(JSON.stringify(value.approved_effects) === JSON.stringify(effects));
  const proposed = timestamp(proposal.proposed_at);
  const decided = timestamp(value.decided_at);
  const expires = timestamp(value.expires_at);
  const candidateExpires = timestamp(candidate.validity.expires_at);
  integrity(
    proposed !== null &&
      decided !== null &&
      expires !== null &&
      candidateExpires !== null &&
      proposed <= decided &&
      decided < expires &&
      expires <= candidateExpires,
  );
}

function assertProjection(
  value: NonNullable<PreferenceEvidenceReceipt["projection"]>,
  decision: Decision,
  candidate: Candidate,
): void {
  integrity(
    exactKeys(value, [
      "object_version",
      "id",
      "content_sha256",
      "decision_ref",
      "mode",
      "effect",
      "scope",
      "result",
      "result_sha256",
      "simulated_at",
      "applied",
      "consumer_authority",
      "runtime_authority",
    ]),
  );
  integrity(validAddress(value, "projection"));
  integrity(exactKeys(value.result, ["predicate", "value"]));
  integrity(
    value.object_version === "preference-projection.v1" &&
      sameRef(value.decision_ref, decision) &&
      value.mode === "deterministic_simulation" &&
      value.effect === "project_only" &&
      exactScope(value.scope) &&
      value.result.predicate === candidate.predicate &&
      value.result.value === candidate.value &&
      value.result_sha256 === canonicalSha256(value.result) &&
      value.applied === false &&
      value.consumer_authority === "none" &&
      value.runtime_authority === "none",
  );
  const simulated = timestamp(value.simulated_at);
  const decided = timestamp(decision.decided_at);
  const decisionExpires = timestamp(decision.expires_at);
  const candidateExpires = timestamp(candidate.validity.expires_at);
  integrity(
    simulated !== null &&
      decided !== null &&
      decisionExpires !== null &&
      candidateExpires !== null &&
      decided <= simulated &&
      simulated < decisionExpires &&
      simulated < candidateExpires,
  );
}

function assertReceipt(
  value: NonNullable<PreferenceEvidenceReceipt["receipt"]>,
  candidate: Candidate,
  proposal: Proposal,
  decision: Decision,
  projection: NonNullable<PreferenceEvidenceReceipt["projection"]>,
): void {
  integrity(
    exactKeys(value, [
      "object_version",
      "id",
      "content_sha256",
      "candidate_ref",
      "proposal_ref",
      "decision_ref",
      "projection_ref",
      "candidate_statement_sha256",
      "projection_result_sha256",
      "effect",
      "recorded_at",
      "applied",
      "authority_effect",
    ]),
  );
  integrity(validAddress(value, "receipt"));
  integrity(
    value.object_version === "preference-projection-receipt.v1" &&
      sameRef(value.candidate_ref, candidate) &&
      sameRef(value.proposal_ref, proposal) &&
      sameRef(value.decision_ref, decision) &&
      sameRef(value.projection_ref, projection) &&
      value.candidate_statement_sha256 ===
        candidate.evidence.statement_sha256 &&
      value.projection_result_sha256 === projection.result_sha256 &&
      value.effect === "project_only" &&
      value.applied === false &&
      value.authority_effect === "none",
  );
  const recorded = timestamp(value.recorded_at);
  const simulated = timestamp(projection.simulated_at);
  integrity(recorded !== null && simulated !== null && recorded >= simulated);
}

function assertConfirmationAndEdge(document: LearnedPreferenceEdge): void {
  const confirmation = document.edge_confirmation;
  const edge = document.learned_edge;
  integrity(
    exactKeys(confirmation, [
      "object_version",
      "id",
      "content_sha256",
      "receipt_ref",
      "effect",
      "actor",
      "explicit",
      "predicate",
      "value",
      "scope",
      "confirmed_at",
      "expires_at",
      "runtime_authority",
    ]),
  );
  integrity(validAddress(confirmation, "edge-confirmation"));
  integrity(
    sameRef(confirmation.receipt_ref, document.receipt) &&
      confirmation.object_version === "preference-edge-confirmation.v1" &&
      confirmation.effect === "create_edge" &&
      exactActor(confirmation.actor, document.candidate.evidence.actor) &&
      confirmation.explicit === true &&
      confirmation.predicate === document.candidate.predicate &&
      confirmation.value === document.candidate.value &&
      exactScope(confirmation.scope) &&
      confirmation.runtime_authority === "none",
  );
  integrity(
    exactKeys(edge, [
      "object_version",
      "id",
      "content_sha256",
      "subject",
      "predicate",
      "value",
      "scope",
      "validity",
      "reference",
      "receipt_ref",
      "confirmation_ref",
      "authority",
      "system_default",
      "state",
      "applied",
      "consumer_authority",
      "runtime_authority",
    ]),
  );
  integrity(validAddress(edge, "edge"));
  integrity(exactKeys(edge.validity, ["not_before", "expires_at"]));
  integrity(exactKeys(edge.reference, ["type", "candidate_ref"]));
  integrity(exactKeys(edge.authority, ["kind", "runtime_authority"]));
  integrity(
    edge.object_version === "preference-edge.v1" &&
      JSON.stringify(edge.subject) ===
        JSON.stringify(document.candidate.subject) &&
      edge.predicate === document.candidate.predicate &&
      edge.value === document.candidate.value &&
      exactScope(edge.scope) &&
      edge.validity.not_before === confirmation.confirmed_at &&
      edge.validity.expires_at === confirmation.expires_at &&
      edge.reference.type === "explicit_user_statement" &&
      sameRef(edge.reference.candidate_ref, document.candidate) &&
      sameRef(edge.receipt_ref, document.receipt) &&
      sameRef(edge.confirmation_ref, confirmation) &&
      edge.authority.kind === "explicit_human_confirmation" &&
      edge.authority.runtime_authority === "none" &&
      edge.system_default === false &&
      edge.state === "recorded" &&
      edge.applied === false &&
      edge.consumer_authority === "none" &&
      edge.runtime_authority === "none",
  );
  const recorded = timestamp(document.receipt.recorded_at);
  const confirmed = timestamp(confirmation.confirmed_at);
  const expires = timestamp(confirmation.expires_at);
  const candidateExpires = timestamp(document.candidate.validity.expires_at);
  integrity(
    recorded !== null &&
      confirmed !== null &&
      expires !== null &&
      candidateExpires !== null &&
      recorded <= confirmed &&
      confirmed < expires &&
      expires <= candidateExpires,
  );
}

function assertDocument(document: PreferenceEvidenceReceipt): void {
  integrity(
    exactKeys(document, [
      "schema_version",
      "contract_status",
      "admission_effect",
      "runtime_authority",
      "candidate",
      "proposal",
      "decision",
      "projection",
      "receipt",
      "edge_confirmation",
      "learned_edge",
    ]),
  );
  integrity(
    document.schema_version === "preference-evidence-wedge.v1" &&
      document.contract_status === "candidate" &&
      document.admission_effect === "none" &&
      document.runtime_authority === "none",
  );
  assertCandidate(document.candidate);
  assertProposal(document.proposal, document.candidate);
  assertDecision(document.decision, document.proposal, document.candidate);
  if (document.decision.outcome === "rejected") {
    integrity(
      document.projection === null &&
        document.receipt === null &&
        document.edge_confirmation === null &&
        document.learned_edge === null,
    );
    return;
  }
  integrity(document.projection !== null && document.receipt !== null);
  assertProjection(document.projection, document.decision, document.candidate);
  assertReceipt(
    document.receipt,
    document.candidate,
    document.proposal,
    document.decision,
    document.projection,
  );
  integrity(
    (document.edge_confirmation === null) === (document.learned_edge === null),
  );
  if (document.edge_confirmation !== null && document.learned_edge !== null) {
    assertConfirmationAndEdge(document as LearnedPreferenceEdge);
  }
}

function asDate(value: string): Date {
  const parsed = timestamp(value);
  if (parsed === null)
    throw new PreferenceWedgeDeniedError("time_order_invalid");
  return new Date(parsed);
}

export function evaluatePreferenceEvidence(
  inputValue: PreferenceEvidenceInput,
): PreferenceEvaluation {
  const snapshot = closedJsonSnapshot<PreferenceEvidenceInput>(inputValue);
  if (!snapshot.ok) {
    return { eligible: false, reasons: ["malformed_input"] };
  }
  const input = snapshot.value;
  const reasons: PreferenceEvaluationReason[] = [];
  if (
    !exactKeys(input, [
      "predicate",
      "value",
      "subject",
      "scope",
      "evidence",
      "validity",
      "system_default",
    ])
  ) {
    return { eligible: false, reasons: ["malformed_input"] };
  }
  const nestedInputIsClosed =
    isObject(input.scope) &&
    exactKeys(input.subject, ["kind", "subject_id"]) &&
    exactKeys(input.evidence, [
      "type",
      "sensitivity",
      "statement",
      "captured_at",
      "actor",
    ]) &&
    exactKeys(input.evidence?.actor, [
      "actor_type",
      "actor_id",
      "subject_relation",
      "authentication",
    ]) &&
    exactKeys(input.evidence?.actor?.authentication, [
      "status",
      "session_ref",
    ]) &&
    exactKeys(input.validity, ["not_before", "expires_at"]);
  if (!nestedInputIsClosed) {
    return { eligible: false, reasons: ["malformed_input"] };
  }
  if (!exactKeys(input.scope, Object.keys(FIXED_PREFERENCE_SCOPE))) {
    reasons.push("scope_mismatch:keys");
  }
  if (input.predicate !== PREFERENCE_PREDICATE)
    reasons.push("unsupported_predicate");
  if (
    !PREFERENCE_VALUES.includes(
      input.value as (typeof PREFERENCE_VALUES)[number],
    )
  ) {
    reasons.push("unsupported_value");
  }
  for (const key of Object.keys(FIXED_PREFERENCE_SCOPE) as Array<
    keyof PreferenceScope
  >) {
    if (input.scope[key] !== FIXED_PREFERENCE_SCOPE[key])
      reasons.push(`scope_mismatch:${key}`);
  }
  if (!input.evidence.statement) reasons.push("missing_statement");
  if (input.evidence.type !== "explicit_user_statement")
    reasons.push("inferred_evidence");
  if (input.evidence.sensitivity !== "non_sensitive")
    reasons.push("sensitive_evidence");
  const expectedStatement = `For repository audit reports in this project, use ${input.value} response density.`;
  if (
    input.evidence.statement &&
    input.evidence.statement !== expectedStatement
  ) {
    reasons.push("statement_mismatch");
  }
  if (input.subject.kind !== "authenticated_self")
    reasons.push("anonymous_subject");
  if (
    !PRINCIPAL_RE.test(input.subject.subject_id) ||
    !PRINCIPAL_RE.test(input.evidence.actor.actor_id)
  ) {
    reasons.push("invalid_principal");
  }
  if (
    input.evidence.actor.actor_type !== "human" ||
    input.evidence.actor.subject_relation !== "self"
  ) {
    reasons.push("non_self_actor");
  }
  if (input.evidence.actor.actor_id !== input.subject.subject_id)
    reasons.push("actor_mismatch");
  if (
    input.evidence.actor.authentication.status !== "authenticated" ||
    !/^authn:[A-Za-z0-9._:-]{1,128}$/.test(
      input.evidence.actor.authentication.session_ref,
    )
  ) {
    reasons.push("authentication_required");
  }
  if (input.system_default) reasons.push("system_default_forbidden");
  const captured = timestamp(input.evidence.captured_at);
  const notBefore = timestamp(input.validity.not_before);
  const expires = timestamp(input.validity.expires_at);
  if (captured === null || notBefore === null || expires === null) {
    reasons.push("invalid_timestamp");
  } else if (!(notBefore <= captured && captured < expires)) {
    reasons.push("invalid_validity");
  }
  if (reasons.length)
    return { eligible: false, reasons: [...new Set(reasons)] };

  const value = input.value as Candidate["value"];
  const actor = input.evidence.actor as Candidate["evidence"]["actor"];
  const candidate = addressObject("candidate", {
    object_version: "preference-candidate.v1" as const,
    predicate: PREFERENCE_PREDICATE,
    value,
    subject: {
      kind: "authenticated_self" as const,
      subject_id: input.subject.subject_id,
    },
    scope: { ...FIXED_PREFERENCE_SCOPE },
    evidence: {
      type: "explicit_user_statement" as const,
      sensitivity: "non_sensitive" as const,
      statement: input.evidence.statement,
      statement_sha256: utf8Sha256(input.evidence.statement),
      captured_at: input.evidence.captured_at,
      actor: {
        ...actor,
        authentication: { ...actor.authentication },
      },
    },
    authority: {
      kind: "human_self_statement" as const,
      effect: "evidence_only" as const,
      runtime_authority: "none" as const,
    },
    validity: { ...input.validity },
    system_default: false as const,
  });
  return mark({ eligible: true, reasons: [], candidate }, "evaluated");
}

export function proposePreferenceMove(inputValue: {
  evaluation: PreferenceEvaluation;
  requestedEffect: string;
  scope: PreferenceScope;
  proposedAt: string;
}): ProposedPreferenceMove {
  const captured = closedJsonSnapshot<typeof inputValue>(
    inputValue,
    new Set(["evaluation"]),
  );
  integrity(captured.ok);
  const input = captured.value;
  integrity(
    exactKeys(input, ["evaluation", "requestedEffect", "scope", "proposedAt"]),
  );
  const evaluation = input.evaluation;
  if (!hasGovernedStage(evaluation, "evaluated")) {
    const ineligible = closedJsonSnapshot<PreferenceEvaluation>(evaluation);
    if (
      ineligible.ok &&
      exactKeys(ineligible.value, ["eligible", "reasons"]) &&
      ineligible.value.eligible === false
    ) {
      throw new PreferenceWedgeDeniedError("ineligible_evidence");
    }
    throw new PreferenceWedgeDeniedError("state_integrity");
  }
  integrity(
    exactKeys(evaluation, ["eligible", "reasons", "candidate"]) &&
      evaluation.eligible === true &&
      evaluation.reasons.length === 0,
  );
  const eligible = evaluation as Extract<
    PreferenceEvaluation,
    { eligible: true }
  >;
  assertCandidate(eligible.candidate);
  if (input.requestedEffect !== "project_only")
    throw new PreferenceWedgeDeniedError("effect_expansion");
  if (!exactScope(input.scope))
    throw new PreferenceWedgeDeniedError("scope_mismatch");
  const proposed = timestamp(input.proposedAt);
  const capturedAt = timestamp(eligible.candidate.evidence.captured_at);
  const expires = timestamp(eligible.candidate.validity.expires_at);
  if (
    proposed === null ||
    capturedAt === null ||
    expires === null ||
    proposed < capturedAt
  ) {
    throw new PreferenceWedgeDeniedError("time_order_invalid");
  }
  if (proposed >= expires)
    throw new PreferenceWedgeDeniedError("stale_candidate");
  const proposal = addressObject("proposal", {
    object_version: "preference-proposal.v1" as const,
    candidate_ref: ref(eligible.candidate),
    requested_effect: "project_only" as const,
    scope: { ...FIXED_PREFERENCE_SCOPE },
    proposed_at: input.proposedAt,
    runtime_authority: "none" as const,
  });
  return mark({ candidate: eligible.candidate, proposal }, "proposed");
}

type DecisionInput = {
  outcome: "approved" | "rejected";
  actor: PreferenceActor;
  explicit: boolean;
  scope: PreferenceScope;
  approvedEffects: string[];
  decidedAt: string;
  expiresAt: string;
  simulatedAt: string;
  recordedAt: string;
  authorityToken: string | null | undefined;
  verifierSecret: string | null | undefined;
};

function root(
  input: ProposedPreferenceMove,
  decision: Decision,
): PreferenceEvidenceReceipt {
  return {
    schema_version: "preference-evidence-wedge.v1",
    contract_status: "candidate",
    admission_effect: "none",
    runtime_authority: "none",
    candidate: input.candidate,
    proposal: input.proposal,
    decision,
    projection: null,
    receipt: null,
    edge_confirmation: null,
    learned_edge: null,
  };
}

export function decidePreferenceMove(
  move: ProposedPreferenceMove,
  inputValue: DecisionInput,
): AuthorizedPreferenceMove | RejectedPreferenceMove {
  integrity(
    hasGovernedStage(move, "proposed") &&
      exactKeys(move, ["candidate", "proposal"]),
  );
  assertCandidate(move.candidate);
  assertProposal(move.proposal, move.candidate);
  const captured = closedJsonSnapshot<DecisionInput>(inputValue);
  integrity(captured.ok);
  const input = captured.value;
  integrity(
    exactKeys(input, [
      "outcome",
      "actor",
      "explicit",
      "scope",
      "approvedEffects",
      "decidedAt",
      "expiresAt",
      "simulatedAt",
      "recordedAt",
      "authorityToken",
      "verifierSecret",
    ]),
  );
  integrity(
    exactKeys(input.actor, [
      "actor_type",
      "actor_id",
      "subject_relation",
      "authentication",
    ]) && exactKeys(input.actor.authentication, ["status", "session_ref"]),
  );
  integrity(input.outcome === "approved" || input.outcome === "rejected");
  if (!input.explicit)
    throw new PreferenceWedgeDeniedError("decision_not_explicit");
  if (!exactActor(input.actor, move.candidate.evidence.actor)) {
    throw new PreferenceWedgeDeniedError("actor_mismatch");
  }
  if (!exactScope(input.scope))
    throw new PreferenceWedgeDeniedError("scope_mismatch");
  const expectedEffects = input.outcome === "approved" ? ["project_only"] : [];
  if (
    JSON.stringify(input.approvedEffects) !== JSON.stringify(expectedEffects)
  ) {
    throw new PreferenceWedgeDeniedError("effect_expansion");
  }
  const proposedAt = timestamp(move.proposal.proposed_at);
  const decidedAt = timestamp(input.decidedAt);
  const expiresAt = timestamp(input.expiresAt);
  const candidateExpires = timestamp(move.candidate.validity.expires_at);
  if (
    proposedAt === null ||
    decidedAt === null ||
    expiresAt === null ||
    candidateExpires === null ||
    !(
      proposedAt <= decidedAt &&
      decidedAt < expiresAt &&
      expiresAt <= candidateExpires
    )
  ) {
    throw new PreferenceWedgeDeniedError("time_order_invalid");
  }
  const authority = verifyPreferenceDecisionAuthority({
    token: input.authorityToken,
    secret: input.verifierSecret,
    proposal: {
      id: move.proposal.id,
      contentSha256: move.proposal.content_sha256,
    },
    expectedIssuer: input.actor.actor_id,
    now: asDate(input.decidedAt),
  });
  if (!authority.authorized)
    throw new PreferenceWedgeDeniedError(authority.reason);
  const decision = addressObject("decision", {
    object_version: "preference-decision.v1" as const,
    proposal_ref: ref(move.proposal),
    outcome: input.outcome,
    actor: move.candidate.evidence.actor,
    explicit: true as const,
    scope: { ...FIXED_PREFERENCE_SCOPE },
    decided_at: input.decidedAt,
    expires_at: input.expiresAt,
    approved_effects: expectedEffects as [] | ["project_only"],
    runtime_authority: "none" as const,
  });
  if (input.outcome === "rejected") {
    const rejected = {
      authorized: false as const,
      document: root(move, decision) as RejectedPreferenceMove["document"],
    };
    assertDocument(rejected.document);
    return rejected;
  }
  const simulated = timestamp(input.simulatedAt);
  const recorded = timestamp(input.recordedAt);
  if (
    simulated === null ||
    recorded === null ||
    !(decidedAt <= simulated && simulated < expiresAt && recorded >= simulated)
  ) {
    throw new PreferenceWedgeDeniedError("stale_decision");
  }
  const authorized = {
    ...move,
    authorized: true,
    decision: decision as AuthorizedPreferenceMove["decision"],
    simulatedAt: input.simulatedAt,
    recordedAt: input.recordedAt,
  } satisfies AuthorizedPreferenceMove;
  return mark(authorized, "authorized");
}

export function executePreferenceMove(
  authorized: AuthorizedPreferenceMove,
): PreferenceEvidenceReceipt {
  integrity(
    hasGovernedStage(authorized, "authorized") &&
      exactKeys(authorized, [
        "candidate",
        "proposal",
        "authorized",
        "decision",
        "simulatedAt",
        "recordedAt",
      ]) &&
      authorized.authorized === true &&
      authorized.decision.outcome === "approved",
  );
  assertCandidate(authorized.candidate);
  assertProposal(authorized.proposal, authorized.candidate);
  assertDecision(
    authorized.decision,
    authorized.proposal,
    authorized.candidate,
  );
  const simulated = timestamp(authorized.simulatedAt);
  const recorded = timestamp(authorized.recordedAt);
  const decided = timestamp(authorized.decision.decided_at);
  const expires = timestamp(authorized.decision.expires_at);
  integrity(
    simulated !== null &&
      recorded !== null &&
      decided !== null &&
      expires !== null &&
      decided <= simulated &&
      simulated < expires &&
      recorded >= simulated,
  );
  const result = {
    predicate: authorized.candidate.predicate,
    value: authorized.candidate.value,
  };
  const projection = addressObject("projection", {
    object_version: "preference-projection.v1" as const,
    decision_ref: ref(authorized.decision),
    mode: "deterministic_simulation" as const,
    effect: "project_only" as const,
    scope: { ...FIXED_PREFERENCE_SCOPE },
    result,
    result_sha256: canonicalSha256(result),
    simulated_at: authorized.simulatedAt,
    applied: false as const,
    consumer_authority: "none" as const,
    runtime_authority: "none" as const,
  });
  const receipt = addressObject("receipt", {
    object_version: "preference-projection-receipt.v1" as const,
    candidate_ref: ref(authorized.candidate),
    proposal_ref: ref(authorized.proposal),
    decision_ref: ref(authorized.decision),
    projection_ref: ref(projection),
    candidate_statement_sha256: authorized.candidate.evidence.statement_sha256,
    projection_result_sha256: projection.result_sha256,
    effect: "project_only" as const,
    recorded_at: authorized.recordedAt,
    applied: false as const,
    authority_effect: "none" as const,
  });
  const document = {
    ...root(authorized, authorized.decision),
    projection,
    receipt,
  };
  assertDocument(document);
  return mark(document, "document");
}

type ConfirmationInput = {
  actor: PreferenceActor;
  explicit: boolean;
  scope: PreferenceScope;
  predicate: string;
  value: string;
  confirmedAt: string;
  expiresAt: string;
  authorityToken: string | null | undefined;
  verifierSecret: string | null | undefined;
};

export function confirmLearnedPreference(
  document: PreferenceEvidenceReceipt,
  inputValue: ConfirmationInput,
): LearnedPreferenceEdge {
  integrity(
    hasGovernedStage(document, "document") &&
      exactKeys(document, [
        "schema_version",
        "contract_status",
        "admission_effect",
        "runtime_authority",
        "candidate",
        "proposal",
        "decision",
        "projection",
        "receipt",
        "edge_confirmation",
        "learned_edge",
      ]),
  );
  assertDocument(document);
  integrity(
    document.edge_confirmation === null && document.learned_edge === null,
  );
  const captured = closedJsonSnapshot<ConfirmationInput>(inputValue);
  integrity(captured.ok);
  const input = captured.value;
  integrity(
    exactKeys(input, [
      "actor",
      "explicit",
      "scope",
      "predicate",
      "value",
      "confirmedAt",
      "expiresAt",
      "authorityToken",
      "verifierSecret",
    ]),
  );
  integrity(
    exactKeys(input.actor, [
      "actor_type",
      "actor_id",
      "subject_relation",
      "authentication",
    ]) && exactKeys(input.actor.authentication, ["status", "session_ref"]),
  );
  if (
    !document.receipt ||
    !document.projection ||
    document.decision.outcome !== "approved"
  ) {
    throw new PreferenceWedgeDeniedError("rejected_move");
  }
  const recordedReceipt = document.receipt;
  const projection = document.projection;
  if (!input.explicit)
    throw new PreferenceWedgeDeniedError("confirmation_not_explicit");
  if (!exactActor(input.actor, document.candidate.evidence.actor)) {
    throw new PreferenceWedgeDeniedError("actor_mismatch");
  }
  if (!exactScope(input.scope))
    throw new PreferenceWedgeDeniedError("scope_mismatch");
  if (
    input.predicate !== document.candidate.predicate ||
    input.value !== document.candidate.value
  ) {
    throw new PreferenceWedgeDeniedError("reference_mismatch");
  }
  const recorded = timestamp(recordedReceipt.recorded_at);
  const confirmed = timestamp(input.confirmedAt);
  const expires = timestamp(input.expiresAt);
  const candidateExpires = timestamp(document.candidate.validity.expires_at);
  if (
    recorded === null ||
    confirmed === null ||
    expires === null ||
    candidateExpires === null ||
    !(
      recorded <= confirmed &&
      confirmed < expires &&
      expires <= candidateExpires
    )
  ) {
    throw new PreferenceWedgeDeniedError("time_order_invalid");
  }
  const authority = verifyPreferenceEdgeAuthority({
    token: input.authorityToken,
    secret: input.verifierSecret,
    receipt: {
      id: recordedReceipt.id,
      contentSha256: recordedReceipt.content_sha256,
    },
    expectedIssuer: input.actor.actor_id,
    now: asDate(input.confirmedAt),
  });
  if (!authority.authorized)
    throw new PreferenceWedgeDeniedError(authority.reason);
  const confirmation = addressObject("edge-confirmation", {
    object_version: "preference-edge-confirmation.v1" as const,
    receipt_ref: ref(recordedReceipt),
    effect: "create_edge" as const,
    actor: document.candidate.evidence.actor,
    explicit: true as const,
    predicate: document.candidate.predicate,
    value: document.candidate.value,
    scope: { ...FIXED_PREFERENCE_SCOPE },
    confirmed_at: input.confirmedAt,
    expires_at: input.expiresAt,
    runtime_authority: "none" as const,
  });
  const learned_edge = addressObject("edge", {
    object_version: "preference-edge.v1" as const,
    subject: document.candidate.subject,
    predicate: document.candidate.predicate,
    value: document.candidate.value,
    scope: { ...FIXED_PREFERENCE_SCOPE },
    validity: { not_before: input.confirmedAt, expires_at: input.expiresAt },
    reference: {
      type: "explicit_user_statement" as const,
      candidate_ref: ref(document.candidate),
    },
    receipt_ref: ref(recordedReceipt),
    confirmation_ref: ref(confirmation),
    authority: {
      kind: "explicit_human_confirmation" as const,
      runtime_authority: "none" as const,
    },
    system_default: false as const,
    state: "recorded" as const,
    applied: false as const,
    consumer_authority: "none" as const,
    runtime_authority: "none" as const,
  });
  const result = {
    ...document,
    projection,
    receipt: recordedReceipt,
    edge_confirmation: confirmation,
    learned_edge,
  };
  assertDocument(result);
  return result;
}
