import { describe, expect, it } from "vitest";

import {
  FIXED_PREFERENCE_SCOPE,
  PREFERENCE_EDGE_CONFIRM_SCOPE,
  PREFERENCE_PROJECT_DECISION_SCOPE,
  PreferenceWedgeDeniedError,
  addressObject,
  canonicalSha256,
  confirmLearnedPreference,
  decidePreferenceMove,
  evaluatePreferenceEvidence,
  executePreferenceMove,
  issueAuthorityGrant,
  proposePreferenceMove,
  type PreferenceEvidenceInput,
  type PreferenceScope,
} from "@/lib/quirk/preference-evidence";

const secret = "test-only-preference-authority-secret";
const actor = {
  actor_type: "human" as const,
  actor_id: "user:example",
  subject_relation: "self" as const,
  authentication: {
    status: "authenticated" as const,
    session_ref: "authn:example-session",
  },
};

function evidenceInput(
  overrides: Partial<PreferenceEvidenceInput> = {},
): PreferenceEvidenceInput {
  return {
    predicate: "presentation.response_density",
    value: "balanced",
    subject: { kind: "authenticated_self", subject_id: "user:example" },
    scope: { ...FIXED_PREFERENCE_SCOPE },
    evidence: {
      type: "explicit_user_statement",
      sensitivity: "non_sensitive",
      statement:
        "For repository audit reports in this project, use balanced response density.",
      captured_at: "2026-08-21T10:00:00Z",
      actor,
    },
    validity: {
      not_before: "2026-08-21T10:00:00Z",
      expires_at: "2027-01-01T00:00:00Z",
    },
    system_default: false,
    ...overrides,
  };
}

function token(input: {
  scope: string;
  kind: "preference_proposal" | "preference_receipt";
  id: string;
  digest: string;
  subject: string;
  issuer?: string;
  scopes?: string[];
  expiresAt?: string;
  issuedAt?: string;
}) {
  return issueAuthorityGrant(
    {
      grantId: `grant-${input.kind}`,
      issuer: input.issuer ?? actor.actor_id,
      subject: input.subject,
      scopes: input.scopes ?? [input.scope],
      issuedAt: input.issuedAt ?? "2026-08-21T10:00:00.000Z",
      expiresAt: input.expiresAt ?? "2026-08-21T11:00:00.000Z",
      nonce: `nonce-${input.kind}`,
      binding: {
        kind: input.kind,
        id: input.id,
        contentSha256: input.digest,
      },
    },
    secret,
  );
}

function proposed(overrides: Partial<PreferenceEvidenceInput> = {}) {
  const evaluation = evaluatePreferenceEvidence(evidenceInput(overrides));
  expect(evaluation.eligible).toBe(true);
  return proposePreferenceMove({
    evaluation,
    requestedEffect: "project_only",
    scope: { ...FIXED_PREFERENCE_SCOPE },
    proposedAt: "2026-08-21T10:01:00Z",
  });
}

function decided(
  input: {
    outcome?: "approved" | "rejected";
    move?: ReturnType<typeof proposed>;
    authorityToken?: string;
    approvedEffects?: string[];
    decisionActor?: typeof actor;
    decisionScope?: PreferenceScope;
    decidedAt?: string;
    expiresAt?: string;
    simulatedAt?: string;
    recordedAt?: string;
  } = {},
) {
  const move = input.move ?? proposed();
  const authorityToken =
    input.authorityToken ??
    token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: move.proposal.id,
      digest: move.proposal.content_sha256,
      subject: `preference-proposal:${move.proposal.id}`,
    });
  const outcome = input.outcome ?? "approved";
  return decidePreferenceMove(move, {
    outcome,
    actor: input.decisionActor ?? actor,
    explicit: true,
    scope: input.decisionScope ?? { ...FIXED_PREFERENCE_SCOPE },
    approvedEffects:
      input.approvedEffects ?? (outcome === "approved" ? ["project_only"] : []),
    decidedAt: input.decidedAt ?? "2026-08-21T10:02:00Z",
    expiresAt: input.expiresAt ?? "2026-12-31T00:00:00Z",
    simulatedAt: input.simulatedAt ?? "2026-08-21T10:03:00Z",
    recordedAt: input.recordedAt ?? "2026-08-21T10:04:00Z",
    authorityToken,
    verifierSecret: secret,
  });
}

function executed() {
  const decision = decided();
  expect(decision.authorized).toBe(true);
  if (!decision.authorized) throw new Error("expected approval");
  return executePreferenceMove(decision);
}

describe("preference evidence reference wedge", () => {
  it("builds the full deterministic project-only candidate contract", () => {
    const first = executed();
    const second = executed();

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schema_version: "preference-evidence-wedge.v1",
      contract_status: "candidate",
      admission_effect: "none",
      runtime_authority: "none",
      projection: {
        mode: "deterministic_simulation",
        effect: "project_only",
        applied: false,
        consumer_authority: "none",
        runtime_authority: "none",
      },
      receipt: { applied: false, authority_effect: "none" },
      edge_confirmation: null,
      learned_edge: null,
    });
    expect(first.candidate.id).toBe(
      `candidate:${first.candidate.content_sha256}`,
    );
    expect(first.candidate.evidence.statement_sha256).toBe(
      "sha256:29e8b45823c60fc1e058af8008e0a00962a6bbe630a091b133c0541ed978a4d1",
    );
    expect(first.projection?.result_sha256).toBe(
      canonicalSha256(first.projection?.result),
    );
  });

  it("creates an unapplied learned edge only after separate exact confirmation", () => {
    const receipt = executed();
    if (!receipt.receipt) throw new Error("expected receipt");
    const authorityToken = token({
      scope: PREFERENCE_EDGE_CONFIRM_SCOPE,
      kind: "preference_receipt",
      id: receipt.receipt.id,
      digest: receipt.receipt.content_sha256,
      subject: `preference-receipt:${receipt.receipt.id}`,
    });

    const result = confirmLearnedPreference(receipt, {
      actor,
      explicit: true,
      scope: { ...FIXED_PREFERENCE_SCOPE },
      predicate: "presentation.response_density",
      value: "balanced",
      confirmedAt: "2026-08-21T10:05:00Z",
      expiresAt: "2026-12-30T00:00:00Z",
      authorityToken,
      verifierSecret: secret,
    });

    expect(result.edge_confirmation?.effect).toBe("create_edge");
    expect(result.learned_edge).toMatchObject({
      state: "recorded",
      applied: false,
      consumer_authority: "none",
      runtime_authority: "none",
      system_default: false,
    });
  });

  it("records an explicit rejection with no projection or learning", () => {
    const result = decided({ outcome: "rejected" });
    expect(result).toMatchObject({
      authorized: false,
      document: {
        decision: { outcome: "rejected", approved_effects: [] },
        projection: null,
        receipt: null,
        edge_confirmation: null,
        learned_edge: null,
      },
    });
  });

  it.each([
    [
      "silence",
      { evidence: { ...evidenceInput().evidence, statement: "" } },
      "missing_statement",
    ],
    [
      "inference",
      { evidence: { ...evidenceInput().evidence, type: "inferred" } },
      "inferred_evidence",
    ],
    [
      "sensitive evidence",
      { evidence: { ...evidenceInput().evidence, sensitivity: "sensitive" } },
      "sensitive_evidence",
    ],
    [
      "non-self actor",
      {
        evidence: {
          ...evidenceInput().evidence,
          actor: { ...actor, subject_relation: "other" },
        },
      },
      "non_self_actor",
    ],
    [
      "anonymous subject",
      { subject: { kind: "anonymous", subject_id: "user:example" } },
      "anonymous_subject",
    ],
    [
      "bad predicate",
      { predicate: "presentation.tone" },
      "unsupported_predicate",
    ],
    ["bad value", { value: "verbose" }, "unsupported_value"],
    [
      "expired validity",
      {
        validity: {
          not_before: "2026-08-21T10:00:00Z",
          expires_at: "2026-08-21T10:00:00Z",
        },
      },
      "invalid_validity",
    ],
  ])("fails closed for %s", (_name, overrides, reason) => {
    const evaluation = evaluatePreferenceEvidence(
      evidenceInput(overrides as Partial<PreferenceEvidenceInput>),
    );
    expect(evaluation).toMatchObject({ eligible: false });
    expect(evaluation.reasons).toContain(reason);
  });

  it.each(Object.keys(FIXED_PREFERENCE_SCOPE) as Array<keyof PreferenceScope>)(
    "rejects a mismatch in scope field %s",
    (field) => {
      const scope = { ...FIXED_PREFERENCE_SCOPE, [field]: "*" };
      const evaluation = evaluatePreferenceEvidence(evidenceInput({ scope }));
      expect(evaluation.reasons).toContain(`scope_mismatch:${field}`);
    },
  );

  it.each([
    "user:Uppercase",
    "user:slash/name",
    "user: space",
    `user:${"a".repeat(65)}`,
  ])("rejects malformed principal %s", (principal) => {
    const evaluation = evaluatePreferenceEvidence(
      evidenceInput({
        subject: { kind: "authenticated_self", subject_id: principal },
        evidence: {
          ...evidenceInput().evidence,
          actor: { ...actor, actor_id: principal },
        },
      }),
    );
    expect(evaluation).toMatchObject({ eligible: false });
    expect(evaluation.reasons).toContain("invalid_principal");
  });

  it("rejects extra scope keys", () => {
    const scope = {
      ...FIXED_PREFERENCE_SCOPE,
      wildcard: "*",
    } as PreferenceScope;
    const evaluation = evaluatePreferenceEvidence(evidenceInput({ scope }));
    expect(evaluation).toMatchObject({ eligible: false });
    expect(evaluation.reasons).toContain("scope_mismatch:keys");
  });

  it("returns a stable ineligible result for a non-object scope", () => {
    const evaluation = evaluatePreferenceEvidence(
      evidenceInput({ scope: null as unknown as PreferenceScope }),
    );
    expect(evaluation).toEqual({
      eligible: false,
      reasons: ["malformed_input"],
    });
  });

  it("rejects year zero to match the pinned source validator", () => {
    const input = evidenceInput();
    input.evidence.captured_at = "0000-08-21T10:00:00Z";
    input.validity.not_before = "0000-08-21T10:00:00Z";
    const evaluation = evaluatePreferenceEvidence(input);
    expect(evaluation).toMatchObject({ eligible: false });
    expect(evaluation.reasons).toContain("invalid_timestamp");
  });

  it("snapshots evaluation proxy descriptors without invoking varying getters", () => {
    const target = evidenceInput();
    let valueReads = 0;
    const input = new Proxy(target, {
      get(object, property, receiver) {
        if (property === "value") {
          valueReads += 1;
          return valueReads === 1 ? "balanced" : "concise";
        }
        return Reflect.get(object, property, receiver);
      },
    });

    const evaluation = evaluatePreferenceEvidence(input);
    expect(evaluation.eligible).toBe(true);
    if (!evaluation.eligible) throw new Error("expected eligible evidence");
    expect(evaluation.candidate.value).toBe("balanced");
    expect(valueReads).toBe(0);
  });

  it.each([
    [
      "symbol keys",
      (input: PreferenceEvidenceInput) => {
        Object.defineProperty(input, Symbol("hidden"), {
          enumerable: true,
          value: "not-json",
        });
      },
    ],
    [
      "undefined values",
      (input: PreferenceEvidenceInput) => {
        input.value = undefined as unknown as string;
      },
    ],
    [
      "numeric values",
      (input: PreferenceEvidenceInput) => {
        input.value = 1 as unknown as string;
      },
    ],
    [
      "cycles",
      (input: PreferenceEvidenceInput) => {
        (input as unknown as { scope: unknown }).scope = input;
      },
    ],
  ])(
    "returns stable malformed evidence for closed snapshot %s",
    (_name, mutate) => {
      const input = evidenceInput();
      mutate(input);
      expect(evaluatePreferenceEvidence(input)).toEqual({
        eligible: false,
        reasons: ["malformed_input"],
      });
    },
  );

  it("snapshots proposal fields once instead of repeatedly reading a proxy", () => {
    const evaluation = evaluatePreferenceEvidence(evidenceInput());
    expect(evaluation.eligible).toBe(true);
    let proposedAtReads = 0;
    const input = new Proxy(
      {
        evaluation,
        requestedEffect: "project_only",
        scope: { ...FIXED_PREFERENCE_SCOPE },
        proposedAt: "2026-08-21T10:01:00Z",
      },
      {
        get(object, property, receiver) {
          if (property === "proposedAt") {
            proposedAtReads += 1;
            return proposedAtReads === 1
              ? "2026-08-21T10:01:00Z"
              : "2026-08-21T10:01:30Z";
          }
          return Reflect.get(object, property, receiver);
        },
      },
    );

    const move = proposePreferenceMove(input);
    expect(move.proposal.proposed_at).toBe("2026-08-21T10:01:00Z");
    expect(proposedAtReads).toBe(0);
  });

  it("fails closed when proposal snapshot fields are undefined", () => {
    const evaluation = evaluatePreferenceEvidence(evidenceInput());
    expect(() =>
      proposePreferenceMove({
        evaluation,
        requestedEffect: "project_only",
        scope: { ...FIXED_PREFERENCE_SCOPE },
        proposedAt: undefined as unknown as string,
      }),
    ).toThrowError(expect.objectContaining({ reason: "state_integrity" }));
  });

  it("rejects stale timing, actor mismatch, and self-expanded effects", () => {
    expect(() => decided({ simulatedAt: "2026-12-31T00:00:00Z" })).toThrowError(
      expect.objectContaining({ reason: "stale_decision" }),
    );
    expect(() =>
      decided({ decisionActor: { ...actor, actor_id: "user:other" } }),
    ).toThrowError(expect.objectContaining({ reason: "actor_mismatch" }));
    expect(() =>
      decided({ approvedEffects: ["project_only", "create_edge"] }),
    ).toThrowError(expect.objectContaining({ reason: "effect_expansion" }));
  });

  it("rejects grant reuse, changed digests, and extra authority scope", () => {
    const first = proposed();
    const second = proposed({
      value: "concise",
      evidence: {
        ...evidenceInput().evidence,
        statement:
          "For repository audit reports in this project, use concise response density.",
      },
    });
    const reused = token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: first.proposal.id,
      digest: first.proposal.content_sha256,
      subject: `preference-proposal:${first.proposal.id}`,
    });
    expect(() =>
      decided({ move: second, authorityToken: reused }),
    ).toThrowError(PreferenceWedgeDeniedError);

    const wrongDigest = token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: first.proposal.id,
      digest: `sha256:${"0".repeat(64)}`,
      subject: `preference-proposal:${first.proposal.id}`,
    });
    expect(() =>
      decided({ move: first, authorityToken: wrongDigest }),
    ).toThrowError(expect.objectContaining({ reason: "binding_mismatch" }));

    const extraScope = token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: first.proposal.id,
      digest: first.proposal.content_sha256,
      subject: `preference-proposal:${first.proposal.id}`,
      scopes: [
        PREFERENCE_PROJECT_DECISION_SCOPE,
        PREFERENCE_EDGE_CONFIRM_SCOPE,
      ],
    });
    expect(() =>
      decided({ move: first, authorityToken: extraScope }),
    ).toThrowError(expect.objectContaining({ reason: "non_singleton_scope" }));
  });

  it("does not infer learning from project-only execution", () => {
    const receipt = executed();
    expect(receipt.edge_confirmation).toBeNull();
    expect(receipt.learned_edge).toBeNull();
  });

  it("rejects tampered candidate and proposal state before decision", () => {
    const tamperedCandidate = structuredClone(proposed());
    tamperedCandidate.candidate.value = "concise";
    expect(() => decided({ move: tamperedCandidate })).toThrowError(
      expect.objectContaining({ reason: "state_integrity" }),
    );

    const tamperedProposal = structuredClone(proposed());
    tamperedProposal.proposal.proposed_at = "2026-08-21T10:01:30Z";
    expect(() => decided({ move: tamperedProposal })).toThrowError(
      expect.objectContaining({ reason: "state_integrity" }),
    );
  });

  it("rejects forged or tampered authorized state before execution", () => {
    const authorized = decided();
    if (!authorized.authorized) throw new Error("expected approval");
    const stale = structuredClone(authorized);
    stale.decision.expires_at = "2026-12-30T00:00:00Z";
    expect(() => executePreferenceMove(stale)).toThrowError(
      expect.objectContaining({ reason: "state_integrity" }),
    );

    const forged = structuredClone(authorized);
    const body = { ...forged.decision };
    delete (body as Partial<typeof body>).id;
    delete (body as Partial<typeof body>).content_sha256;
    Object.assign(body, { approved_effects: ["project_only", "create_edge"] });
    forged.decision = addressObject("decision", body) as typeof forged.decision;
    expect(() => executePreferenceMove(forged)).toThrowError(
      expect.objectContaining({ reason: "state_integrity" }),
    );
  });

  it("rejects reflected, reconstructed, and prototype-fabricated authorization", () => {
    const authorized = decided();
    if (!authorized.authorized) throw new Error("expected approval");

    const reflected = { ...authorized };
    for (const symbol of Object.getOwnPropertySymbols(authorized)) {
      const descriptor = Object.getOwnPropertyDescriptor(authorized, symbol);
      if (descriptor) Object.defineProperty(reflected, symbol, descriptor);
    }
    expect(() =>
      executePreferenceMove(reflected as typeof authorized),
    ).toThrowError(expect.objectContaining({ reason: "state_integrity" }));

    const fromJson = JSON.parse(
      JSON.stringify(authorized),
    ) as typeof authorized;
    expect(() => executePreferenceMove(fromJson)).toThrowError(
      expect.objectContaining({ reason: "state_integrity" }),
    );

    const fabricated = Object.assign(
      Object.create(Object.getPrototypeOf(authorized)) as object,
      authorized,
    ) as typeof authorized;
    expect(() => executePreferenceMove(fabricated)).toThrowError(
      expect.objectContaining({ reason: "state_integrity" }),
    );

    const ExposedConstructor = authorized.constructor as new (
      token: unknown,
      stage: string,
      value: object,
    ) => object;
    expect(
      () => new ExposedConstructor(undefined, "authorized", authorized),
    ).toThrow();

    expect(() => {
      authorized.candidate.value = "concise";
    }).toThrow(TypeError);
    expect(executePreferenceMove(authorized).projection?.result.value).toBe(
      "balanced",
    );
  });

  it("prevents stateful accessors from switching authorized state after validation", () => {
    const authorized = decided();
    if (!authorized.authorized) throw new Error("expected approval");

    let redefineError: unknown;
    let switchedValue: string | undefined;
    try {
      Object.defineProperty(authorized.candidate, "value", {
        configurable: true,
        enumerable: true,
        get() {
          const stack = new Error().stack ?? "";
          return stack.includes("canonicalize") ||
            stack.includes("validAddress") ||
            stack.includes("assertCandidate")
            ? "balanced"
            : "concise";
        },
      });
      switchedValue =
        executePreferenceMove(authorized).projection?.result.value;
    } catch (error) {
      redefineError = error;
    }

    expect(
      redefineError instanceof TypeError || switchedValue !== "concise",
    ).toBe(true);
  });

  it("freezes only copied stage state, not caller-owned evidence input", () => {
    const input = evidenceInput();
    const evaluation = evaluatePreferenceEvidence(input);
    expect(evaluation.eligible).toBe(true);
    expect(Object.isFrozen(evaluation)).toBe(true);
    if (!evaluation.eligible) throw new Error("expected eligible evidence");
    expect(Object.isFrozen(evaluation.candidate)).toBe(true);
    expect(Object.isFrozen(evaluation.candidate.scope)).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input.scope)).toBe(false);
    (input.scope as { project: string }).project = "caller-remains-mutable";
    expect(input.scope.project).toBe("caller-remains-mutable");
  });

  it.each([
    {
      name: "candidate",
      mutate: (document: ReturnType<typeof executed>) => {
        document.candidate.value = "concise";
      },
    },
    {
      name: "proposal",
      mutate: (document: ReturnType<typeof executed>) => {
        document.proposal.proposed_at = "2026-08-21T10:01:30Z";
      },
    },
    {
      name: "decision",
      mutate: (document: ReturnType<typeof executed>) => {
        document.decision.expires_at = "2026-12-30T00:00:00Z";
      },
    },
    {
      name: "projection",
      mutate: (document: ReturnType<typeof executed>) => {
        if (!document.projection) throw new Error("expected projection");
        document.projection.result.value = "concise";
      },
    },
    {
      name: "receipt",
      mutate: (document: ReturnType<typeof executed>) => {
        if (!document.receipt) throw new Error("expected receipt");
        document.receipt.projection_result_sha256 = `sha256:${"0".repeat(64)}`;
      },
    },
    {
      name: "reference chain",
      mutate: (document: ReturnType<typeof executed>) => {
        if (!document.receipt) throw new Error("expected receipt");
        document.receipt.decision_ref.id = `decision:sha256:${"0".repeat(64)}`;
      },
    },
  ])("rejects tampered $name state before confirmation", ({ mutate }) => {
    const document = structuredClone(executed());
    mutate(document);
    if (!document.receipt) throw new Error("expected receipt");
    const authorityToken = token({
      scope: PREFERENCE_EDGE_CONFIRM_SCOPE,
      kind: "preference_receipt",
      id: document.receipt.id,
      digest: document.receipt.content_sha256,
      subject: `preference-receipt:${document.receipt.id}`,
    });
    expect(() =>
      confirmLearnedPreference(document, {
        actor,
        explicit: true,
        scope: { ...FIXED_PREFERENCE_SCOPE },
        predicate: "presentation.response_density",
        value: "balanced",
        confirmedAt: "2026-08-21T10:05:00Z",
        expiresAt: "2026-12-30T00:00:00Z",
        authorityToken,
        verifierSecret: secret,
      }),
    ).toThrowError(expect.objectContaining({ reason: "state_integrity" }));
  });

  it("rejects a stale receipt grant after a valid receipt mutation", () => {
    const original = executed();
    if (!original.receipt) throw new Error("expected receipt");
    const authorityToken = token({
      scope: PREFERENCE_EDGE_CONFIRM_SCOPE,
      kind: "preference_receipt",
      id: original.receipt.id,
      digest: original.receipt.content_sha256,
      subject: `preference-receipt:${original.receipt.id}`,
    });
    const changedDecision = decided({ recordedAt: "2026-08-21T10:04:30Z" });
    if (!changedDecision.authorized) throw new Error("expected approval");
    const document = executePreferenceMove(changedDecision);
    expect(() =>
      confirmLearnedPreference(document, {
        actor,
        explicit: true,
        scope: { ...FIXED_PREFERENCE_SCOPE },
        predicate: "presentation.response_density",
        value: "balanced",
        confirmedAt: "2026-08-21T10:05:00Z",
        expiresAt: "2026-12-30T00:00:00Z",
        authorityToken,
        verifierSecret: secret,
      }),
    ).toThrowError(
      expect.objectContaining({
        reason: expect.stringMatching(/subject_mismatch|binding_mismatch/),
      }),
    );
  });

  it("verifies decision grants at decidedAt rather than a caller-selected time", () => {
    const move = proposed();
    const expired = token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: move.proposal.id,
      digest: move.proposal.content_sha256,
      subject: `preference-proposal:${move.proposal.id}`,
      expiresAt: "2026-08-21T10:01:30.000Z",
    });
    expect(() => decided({ move, authorityToken: expired })).toThrowError(
      expect.objectContaining({ reason: "expired_grant" }),
    );
    const future = token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: move.proposal.id,
      digest: move.proposal.content_sha256,
      subject: `preference-proposal:${move.proposal.id}`,
      issuedAt: "2026-08-21T10:02:30.000Z",
    });
    expect(() => decided({ move, authorityToken: future })).toThrowError(
      expect.objectContaining({ reason: "not_yet_valid" }),
    );
  });

  it("does not record a decision timestamp different from the checked timestamp", () => {
    const move = proposed();
    const authorityToken = token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: move.proposal.id,
      digest: move.proposal.content_sha256,
      subject: `preference-proposal:${move.proposal.id}`,
    });
    const input = {
      outcome: "approved" as const,
      actor,
      explicit: true,
      scope: { ...FIXED_PREFERENCE_SCOPE },
      approvedEffects: ["project_only"],
      decidedAt: "2026-08-21T10:02:00Z",
      expiresAt: "2026-12-31T00:00:00Z",
      simulatedAt: "2026-08-21T10:03:00Z",
      recordedAt: "2026-08-21T10:04:00Z",
      authorityToken,
      verifierSecret: secret,
    };
    let reads = 0;
    Object.defineProperty(input, "decidedAt", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return reads <= 2 ? "2026-08-21T10:02:00Z" : "2026-08-21T10:02:30Z";
      },
    });

    expect(() => decidePreferenceMove(move, input)).toThrowError(
      expect.objectContaining({ reason: "state_integrity" }),
    );
    expect(reads).toBe(0);
  });

  it("uses one decision proxy snapshot for grant time and recorded time", () => {
    const move = proposed();
    const authorityToken = token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: move.proposal.id,
      digest: move.proposal.content_sha256,
      subject: `preference-proposal:${move.proposal.id}`,
    });
    let reads = 0;
    const input = new Proxy(
      {
        outcome: "approved" as const,
        actor,
        explicit: true,
        scope: { ...FIXED_PREFERENCE_SCOPE },
        approvedEffects: ["project_only"],
        decidedAt: "2026-08-21T10:02:00Z",
        expiresAt: "2026-12-31T00:00:00Z",
        simulatedAt: "2026-08-21T10:03:00Z",
        recordedAt: "2026-08-21T10:04:00Z",
        authorityToken,
        verifierSecret: secret,
      },
      {
        get(object, property, receiver) {
          if (property === "decidedAt") {
            reads += 1;
            return reads <= 2 ? "2026-08-21T10:02:00Z" : "2026-08-21T10:02:30Z";
          }
          return Reflect.get(object, property, receiver);
        },
      },
    );

    const result = decidePreferenceMove(move, input);
    expect(result.authorized).toBe(true);
    expect(result.authorized && result.decision.decided_at).toBe(
      "2026-08-21T10:02:00Z",
    );
    expect(reads).toBe(0);
  });

  it("cannot switch the actor used for equality and issuer verification", () => {
    const move = proposed();
    let actorIdReads = 0;
    const actorProxy = new Proxy(actor, {
      get(object, property, receiver) {
        if (property === "actor_id") {
          actorIdReads += 1;
          return actorIdReads <= 2 ? "user:example" : "user:other";
        }
        return Reflect.get(object, property, receiver);
      },
    });
    const authorityToken = token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: move.proposal.id,
      digest: move.proposal.content_sha256,
      subject: `preference-proposal:${move.proposal.id}`,
      issuer: "user:other",
    });

    expect(() =>
      decidePreferenceMove(move, {
        outcome: "approved",
        actor: actorProxy,
        explicit: true,
        scope: { ...FIXED_PREFERENCE_SCOPE },
        approvedEffects: ["project_only"],
        decidedAt: "2026-08-21T10:02:00Z",
        expiresAt: "2026-12-31T00:00:00Z",
        simulatedAt: "2026-08-21T10:03:00Z",
        recordedAt: "2026-08-21T10:04:00Z",
        authorityToken,
        verifierSecret: secret,
      }),
    ).toThrowError(expect.objectContaining({ reason: "issuer_mismatch" }));
    expect(actorIdReads).toBe(0);
  });

  it("fails closed on symbolic decision input state", () => {
    const move = proposed();
    const authorityToken = token({
      scope: PREFERENCE_PROJECT_DECISION_SCOPE,
      kind: "preference_proposal",
      id: move.proposal.id,
      digest: move.proposal.content_sha256,
      subject: `preference-proposal:${move.proposal.id}`,
    });
    const input = {
      outcome: "approved" as const,
      actor,
      explicit: true,
      scope: { ...FIXED_PREFERENCE_SCOPE },
      approvedEffects: ["project_only"],
      decidedAt: "2026-08-21T10:02:00Z",
      expiresAt: "2026-12-31T00:00:00Z",
      simulatedAt: "2026-08-21T10:03:00Z",
      recordedAt: "2026-08-21T10:04:00Z",
      authorityToken,
      verifierSecret: secret,
    };
    Object.defineProperty(input, Symbol("hidden"), {
      enumerable: true,
      value: "not-json",
    });
    expect(() => decidePreferenceMove(move, input)).toThrowError(
      expect.objectContaining({ reason: "state_integrity" }),
    );
  });

  it("verifies edge grants at confirmedAt", () => {
    const document = executed();
    if (!document.receipt) throw new Error("expected receipt");
    for (const grant of [
      token({
        scope: PREFERENCE_EDGE_CONFIRM_SCOPE,
        kind: "preference_receipt",
        id: document.receipt.id,
        digest: document.receipt.content_sha256,
        subject: `preference-receipt:${document.receipt.id}`,
        expiresAt: "2026-08-21T10:04:30.000Z",
      }),
      token({
        scope: PREFERENCE_EDGE_CONFIRM_SCOPE,
        kind: "preference_receipt",
        id: document.receipt.id,
        digest: document.receipt.content_sha256,
        subject: `preference-receipt:${document.receipt.id}`,
        issuedAt: "2026-08-21T10:05:30.000Z",
      }),
    ]) {
      expect(() =>
        confirmLearnedPreference(document, {
          actor,
          explicit: true,
          scope: { ...FIXED_PREFERENCE_SCOPE },
          predicate: "presentation.response_density",
          value: "balanced",
          confirmedAt: "2026-08-21T10:05:00Z",
          expiresAt: "2026-12-30T00:00:00Z",
          authorityToken: grant,
          verifierSecret: secret,
        }),
      ).toThrowError(PreferenceWedgeDeniedError);
    }
  });

  it("does not record a confirmation timestamp different from the checked timestamp", () => {
    const document = executed();
    if (!document.receipt) throw new Error("expected receipt");
    const authorityToken = token({
      scope: PREFERENCE_EDGE_CONFIRM_SCOPE,
      kind: "preference_receipt",
      id: document.receipt.id,
      digest: document.receipt.content_sha256,
      subject: `preference-receipt:${document.receipt.id}`,
    });
    const input = {
      actor,
      explicit: true,
      scope: { ...FIXED_PREFERENCE_SCOPE },
      predicate: "presentation.response_density",
      value: "balanced",
      confirmedAt: "2026-08-21T10:05:00Z",
      expiresAt: "2026-12-30T00:00:00Z",
      authorityToken,
      verifierSecret: secret,
    };
    let reads = 0;
    Object.defineProperty(input, "confirmedAt", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return reads <= 2 ? "2026-08-21T10:05:00Z" : "2026-08-21T10:05:30Z";
      },
    });

    expect(() => confirmLearnedPreference(document, input)).toThrowError(
      expect.objectContaining({ reason: "state_integrity" }),
    );
    expect(reads).toBe(0);
  });

  it("uses one confirmation proxy snapshot for grant time and recorded time", () => {
    const document = executed();
    if (!document.receipt) throw new Error("expected receipt");
    const authorityToken = token({
      scope: PREFERENCE_EDGE_CONFIRM_SCOPE,
      kind: "preference_receipt",
      id: document.receipt.id,
      digest: document.receipt.content_sha256,
      subject: `preference-receipt:${document.receipt.id}`,
    });
    let reads = 0;
    const input = new Proxy(
      {
        actor,
        explicit: true,
        scope: { ...FIXED_PREFERENCE_SCOPE },
        predicate: "presentation.response_density",
        value: "balanced",
        confirmedAt: "2026-08-21T10:05:00Z",
        expiresAt: "2026-12-30T00:00:00Z",
        authorityToken,
        verifierSecret: secret,
      },
      {
        get(object, property, receiver) {
          if (property === "confirmedAt") {
            reads += 1;
            return reads <= 2 ? "2026-08-21T10:05:00Z" : "2026-08-21T10:05:30Z";
          }
          return Reflect.get(object, property, receiver);
        },
      },
    );

    const result = confirmLearnedPreference(document, input);
    expect(result.edge_confirmation.confirmed_at).toBe("2026-08-21T10:05:00Z");
    expect(reads).toBe(0);
  });

  it("fails closed on numeric confirmation input state", () => {
    const document = executed();
    if (!document.receipt) throw new Error("expected receipt");
    const authorityToken = token({
      scope: PREFERENCE_EDGE_CONFIRM_SCOPE,
      kind: "preference_receipt",
      id: document.receipt.id,
      digest: document.receipt.content_sha256,
      subject: `preference-receipt:${document.receipt.id}`,
    });
    expect(() =>
      confirmLearnedPreference(document, {
        actor,
        explicit: true,
        scope: { ...FIXED_PREFERENCE_SCOPE },
        predicate: "presentation.response_density",
        value: "balanced",
        confirmedAt: 1 as unknown as string,
        expiresAt: "2026-12-30T00:00:00Z",
        authorityToken,
        verifierSecret: secret,
      }),
    ).toThrowError(expect.objectContaining({ reason: "state_integrity" }));
  });
});
