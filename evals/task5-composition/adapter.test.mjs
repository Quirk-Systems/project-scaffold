import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { evaluateTask5Composition } from "./adapter.mjs";

const DOMAIN = "quirk.test-only.task5-composition";
const clone = (value) => structuredClone(value);
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const digest = (label, value) => `sha256:${createHash("sha256").update(`${DOMAIN}.${label}\0${canonical(value)}`).digest("hex")}`;
const historyBindings = (items) => {
  const historyDigest = digest("history.v1", items);
  return {
    historyDigest,
    historyHead: digest("history-head.v1", {
      count: items.length,
      historyDigest,
      lastEventId: items.at(-1)?.eventId ?? null,
    }),
  };
};

const D = Object.freeze({
  proposal: digest("fixture", "proposal"),
  authority: digest("fixture", "authority"),
  agency: digest("fixture", "agency"),
  policy: digest("fixture", "policy-state"),
  taxonomy: digest("fixture", "taxonomy"),
  source: digest("fixture", "instruction-source"),
  answer: digest("fixture", "synthetic-answer-key"),
  rubric: digest("fixture", "public-rubric"),
  rationale: digest("fixture", "candidate-rationale"),
});

function authorityValue(result = "PERMITTED_CANDIDATE_ONLY") {
  const effect = {
    effectId: "effect.answer-case-7",
    tribunalEffect: "recommend",
    operationId: "operation.build-rationale",
    targetClass: "blind-review-candidate",
    targetLocator: "synthetic://case-7/candidate-3",
  };
  return {
    kind: "ManyTierAuthorityResolution",
    protocolVersion: "0.1.0",
    resolutionId: "resolution.case-7",
    proposalId: "proposal.case-7",
    instructionNodes: [{
      instructionId: "instruction.fixture",
      issuerPrincipalId: "principal.harness",
      sourceKind: "POLICY",
      tier: 1,
      directive: result === "HUMAN_REVIEW" ? "REQUIRE_HUMAN_REVIEW" : result === "PERMITTED_CANDIDATE_ONLY" ? "ALLOW" : "DENY",
      effectId: effect.effectId,
      issuedAt: "2026-09-09T00:00:00.000Z",
      expiresAt: null,
      sourceDigest: D.source,
    }],
    instructionEdges: [],
    canonicalPrincipalIds: ["principal.harness"],
    activeAuthorityGrantIds: ["grant.candidate-only"],
    applicablePolicyIds: ["policy.blind-review"],
    winningInstructionIds: ["instruction.fixture"],
    suppressedInstructionIds: [],
    unresolvedConflictIds: result === "UNRESOLVED" ? ["conflict.fixture"] : [],
    permittedEffects: result === "PERMITTED_CANDIDATE_ONLY" ? [effect] : [],
    prohibitedEffects: result === "PROHIBITED" ? [effect] : [],
    requiredHumanReview: result === "HUMAN_REVIEW" ? [effect.effectId] : [],
    result,
    policyStateDigest: D.policy,
    evaluatedAt: "2026-09-09T00:01:00.000Z",
    contentDigest: D.authority,
  };
}

const mappedDecision = (result) => result === "PERMITTED_CANDIDATE_ONLY"
  ? "ALLOW_CANDIDATE_ONLY"
  : result === "HUMAN_REVIEW" ? "REQUIRE_HUMAN_REVIEW" : "DENY";

function policyValue(authority, decision = mappedDecision(authority.result)) {
  return {
    kind: "ExecutionPolicyDecision",
    protocolVersion: "0.1.0",
    policyDecisionId: "policy-decision.case-7",
    runId: "run.case-7",
    proposalDigest: D.proposal,
    authorityResolutionDigest: authority.contentDigest,
    agencyLocusDigest: D.agency,
    mode: "STATE_ONLY",
    decision,
    effectExecutionAllowed: false,
    permittedPreparatoryOperationIds: decision === "ALLOW_CANDIDATE_ONLY"
      ? ["operation.read-resource", "operation.build-rationale"] : [],
    deniedOperationIds: [],
    grantIds: [...authority.activeAuthorityGrantIds],
    policyReasonCodes: [`policy.state_only.${decision.toLowerCase()}`],
    policyStateDigest: D.policy,
    evaluatedAt: "2026-09-09T00:02:00.000Z",
    expiresAt: "2026-09-09T01:02:00.000Z",
    contentDigest: digest("fixture", `policy-decision:${decision}`),
  };
}

function event(eventId, fixtureObligation, classification, resourceDigest) {
  return {
    kind: "Task5CompositionHistoryEvent",
    eventKind: "SIMULATED",
    eventId,
    sessionId: "session-7",
    tenantId: "tenant-1",
    environment: "test",
    caseId: "case-7",
    candidateId: "candidate-3",
    operation: {
      operationId: eventId.replace("event", "operation"),
      classification,
      toolId: `tool.${fixtureObligation.toLowerCase().replaceAll("_", "-")}`,
      containsSecretMaterial: false,
    },
    fixtureObligation,
    resourceDigest,
    assertions: [],
  };
}

const readAnswer = () => event("event.read-answer", "READ_REFERENCE_ANSWER_KEY", "PURE", D.answer);
const readRubric = () => event("event.read-rubric", "READ_PUBLIC_RUBRIC", "PURE", D.rubric);
const buildRationale = () => event("event.build-rationale", "BUILD_BLIND_CANDIDATE_RATIONALE", "CANDIDATE_STATE", D.rationale);

function harnessContext(items) {
  return {
    proposalDigest: D.proposal,
    policyRevision: "blind-review-policy.r7",
    policyStateDigest: D.policy,
    scope: { sessionId: "session-7", tenantId: "tenant-1", environment: "test" },
    target: { caseId: "case-7", candidateId: "candidate-3" },
    ...historyBindings(items),
    taxonomyVersion: "action-taxonomy.v3",
    taxonomyDigest: D.taxonomy,
  };
}

function evidence(items) {
  return {
    ...harnessContext(items),
    history: items,
  };
}

function input({ authorityResult = "PERMITTED_CANDIDATE_ONLY", items = [readRubric(), buildRationale()], policyDecision } = {}) {
  const authority = authorityValue(authorityResult);
  return {
    authorityResult: { ok: true, value: authority, issues: [] },
    policyResult: { ok: true, value: policyValue(authority, policyDecision), issues: [] },
    expectedContext: harnessContext(items),
    evidence: evidence(items),
  };
}

const expectNoEffect = (result) => {
  assert.equal(result.effectExecutionAllowed, false);
  assert.equal(result.candidateEligible, result.effectiveDecision === "ALLOW_CANDIDATE_ONLY");
};

test("matrix has literal expectations for all authority outcomes and history states", () => {
  const clean = [readRubric(), buildRationale()];
  const prohibited = [readAnswer(), buildRationale()];
  const cases = [
    ["PERMITTED_CANDIDATE_ONLY", clean, false, "ALLOW_CANDIDATE_ONLY"],
    ["PERMITTED_CANDIDATE_ONLY", prohibited, false, "DENY"],
    ["PERMITTED_CANDIDATE_ONLY", clean, true, "DENY"],
    ["HUMAN_REVIEW", clean, false, "REQUIRE_HUMAN_REVIEW"],
    ["HUMAN_REVIEW", prohibited, false, "REQUIRE_HUMAN_REVIEW"],
    ["HUMAN_REVIEW", clean, true, "REQUIRE_HUMAN_REVIEW"],
    ["PROHIBITED", clean, false, "DENY"],
    ["PROHIBITED", prohibited, false, "DENY"],
    ["PROHIBITED", clean, true, "DENY"],
    ["UNRESOLVED", clean, false, "DENY"],
    ["UNRESOLVED", prohibited, false, "DENY"],
    ["UNRESOLVED", clean, true, "DENY"],
  ];
  for (const [authorityResult, items, untrusted, expected] of cases) {
    const candidate = input({ authorityResult, items });
    if (untrusted) candidate.evidence.historyHead = digest("attack", authorityResult);
    const result = evaluateTask5Composition(candidate);
    assert.equal(result.effectiveDecision, expected, `${authorityResult}/${items[0].fixtureObligation}/${untrusted}`);
    expectNoEffect(result);
  }
});

test("the one Mode A restriction applies to the same-candidate combination", () => {
  const cases = [
    [[readAnswer()], "ALLOW_CANDIDATE_ONLY"],
    [[buildRationale()], "ALLOW_CANDIDATE_ONLY"],
    [[readRubric(), buildRationale()], "ALLOW_CANDIDATE_ONLY"],
    [[readAnswer(), buildRationale()], "DENY"],
  ];
  for (const [items, expected] of cases) {
    const result = evaluateTask5Composition(input({ items }));
    assert.equal(result.effectiveDecision, expected);
    expectNoEffect(result);
  }
});

test("retains canonical results, digests, grants, review and conflict obligations", () => {
  for (const authorityResult of ["HUMAN_REVIEW", "UNRESOLVED"]) {
    const candidate = input({ authorityResult, items: [readAnswer(), buildRationale()] });
    const result = evaluateTask5Composition(candidate);
    assert.strictEqual(result.authorityResult, candidate.authorityResult);
    assert.strictEqual(result.policyResult, candidate.policyResult);
    assert.equal(result.authorityResolutionDigest, candidate.authorityResult.value.contentDigest);
    assert.equal(result.policyDecisionDigest, candidate.policyResult.value.contentDigest);
    assert.equal(Object.hasOwn(result, "contentDigest"), false, "wrapper must not mint a canonical policy digest");
    assert.deepEqual(result.preservedObligations.requiredHumanReview, candidate.authorityResult.value.requiredHumanReview);
    assert.deepEqual(result.preservedObligations.unresolvedConflictIds, candidate.authorityResult.value.unresolvedConflictIds);
    assert.deepEqual(result.preservedObligations.authorityGrantIds, candidate.authorityResult.value.activeAuthorityGrantIds);
    assert.deepEqual(result.preservedObligations.policyGrantIds, candidate.policyResult.value.grantIds);
    assert.ok(result.blockReasons.includes("BLIND_REFERENCE_CONTAMINATION"));
    expectNoEffect(result);
  }
});

test("authority outcome and nonempty obligations prevent inconsistent permission", () => {
  for (const obligation of ["requiredHumanReview", "unresolvedConflictIds"]) {
    const candidate = input();
    candidate.authorityResult.value[obligation] = [`${obligation}.unexpected`];
    const result = evaluateTask5Composition(candidate);
    assert.equal(result.effectiveDecision, "DENY", obligation);
    assert.equal(result.candidateEligible, false, obligation);
    assert.deepEqual(result.preservedObligations[obligation], candidate.authorityResult.value[obligation]);
  }
  for (const authorityResult of ["PROHIBITED", "UNRESOLVED"]) {
    const candidate = input({ authorityResult, policyDecision: "REQUIRE_HUMAN_REVIEW" });
    const result = evaluateTask5Composition(candidate);
    assert.equal(result.effectiveDecision, "DENY", authorityResult);
    assert.equal(result.candidateEligible, false, authorityResult);
  }
});

test("fixtures carry every planned canonical top-level result field", () => {
  const candidate = input();
  assert.deepEqual(Object.keys(candidate.authorityResult).sort(), ["issues", "ok", "value"]);
  assert.deepEqual(Object.keys(candidate.authorityResult.value).sort(), [
    "activeAuthorityGrantIds", "applicablePolicyIds", "canonicalPrincipalIds", "contentDigest",
    "evaluatedAt", "instructionEdges", "instructionNodes", "kind", "permittedEffects",
    "policyStateDigest", "prohibitedEffects", "proposalId", "protocolVersion",
    "requiredHumanReview", "resolutionId", "result", "suppressedInstructionIds",
    "unresolvedConflictIds", "winningInstructionIds",
  ]);
  assert.deepEqual(Object.keys(candidate.policyResult).sort(), ["issues", "ok", "value"]);
  assert.deepEqual(Object.keys(candidate.policyResult.value).sort(), [
    "agencyLocusDigest", "authorityResolutionDigest", "contentDigest", "decision",
    "deniedOperationIds", "effectExecutionAllowed", "evaluatedAt", "expiresAt", "grantIds",
    "kind", "mode", "permittedPreparatoryOperationIds", "policyDecisionId", "policyReasonCodes",
    "policyStateDigest", "proposalDigest", "protocolVersion", "runId",
  ]);
});

test("attacks on every required binding fail closed", () => {
  const attacks = [
    ["proposal", (x) => { x.evidence.proposalDigest = digest("attack", "proposal"); }],
    ["policy revision", (x) => { x.evidence.policyRevision = "blind-review-policy.r8"; }],
    ["same-revision policy content", (x) => { x.evidence.policyStateDigest = digest("attack", "policy-content"); }],
    ["session", (x) => { x.evidence.scope.sessionId = "session-other"; }],
    ["tenant", (x) => { x.evidence.scope.tenantId = "tenant-other"; }],
    ["environment", (x) => { x.evidence.scope.environment = "production"; }],
    ["history head", (x) => { x.evidence.historyHead = digest("attack", "head"); }],
    ["history content", (x) => { x.evidence.history[0].resourceDigest = digest("attack", "content"); }],
    ["taxonomy version", (x) => { x.evidence.taxonomyVersion = "action-taxonomy.v4"; }],
    ["same-version taxonomy content", (x) => { x.evidence.taxonomyDigest = digest("attack", "taxonomy-content"); }],
    ["target case", (x) => { x.evidence.target.caseId = "case-other"; }],
    ["target candidate", (x) => { x.evidence.target.candidateId = "candidate-other"; }],
  ];
  for (const [name, attack] of attacks) {
    const candidate = input();
    attack(candidate);
    const result = evaluateTask5Composition(candidate);
    assert.equal(result.effectiveDecision, "DENY", name);
    assert.ok(result.blockReasons.some((reason) => reason.startsWith("BINDING_")), name);
    expectNoEffect(result);
  }
});

test("missing or reset-looking history is not authorization", () => {
  for (const alter of [
    (x) => { delete x.evidence.history; },
    (x) => { x.evidence.history = []; },
    (x) => { delete x.evidence.historyHead; },
  ]) {
    const candidate = input({ items: [readRubric(), buildRationale()] });
    alter(candidate);
    const result = evaluateTask5Composition(candidate);
    assert.equal(result.effectiveDecision, "DENY");
    expectNoEffect(result);
  }
});

test("simulation history cannot assert execution, commitment, or an EffectReceipt", () => {
  const corruptions = [
    (item) => { item.eventKind = "EXECUTED"; },
    (item) => { item.kind = "EffectReceipt"; },
    (item) => { item.committed = true; },
    (item) => { item.effectExecuted = true; },
    (item) => { item.assertions.push({ kind: "EffectReceipt", receiptId: "receipt.fake" }); },
    (item) => { item.assertions.push({ kind: "UnknownExecutionAssertion", value: true }); },
    (item) => { item.executedAt = "2026-09-09T00:00:03.000Z"; },
    (item) => { item.unknownEventField = true; },
    (item) => { item.operation.unknownOperationField = true; },
  ];
  for (const corrupt of corruptions) {
    const candidate = input();
    corrupt(candidate.evidence.history[0]);
    Object.assign(candidate.evidence, historyBindings(candidate.evidence.history));
    Object.assign(candidate.expectedContext, historyBindings(candidate.evidence.history));
    const result = evaluateTask5Composition(candidate);
    assert.equal(result.effectiveDecision, "DENY");
    assert.ok(result.blockReasons.includes("HISTORY_NOT_SIMULATION_ONLY"));
    expectNoEffect(result);
  }
});

test("evaluation snapshots its bound context and test-only decision provenance", () => {
  const candidate = input();
  const result = evaluateTask5Composition(candidate);
  assert.deepEqual(result.boundContext, {
    proposalDigest: { expected: D.proposal, supplied: D.proposal, policy: D.proposal },
    authorityResolutionDigest: { authority: D.authority, policy: D.authority },
    policy: {
      revision: { expected: "blind-review-policy.r7", supplied: "blind-review-policy.r7" },
      stateDigest: { expected: D.policy, supplied: D.policy, authority: D.policy, policy: D.policy },
    },
    scope: { expected: { sessionId: "session-7", tenantId: "tenant-1", environment: "test" }, supplied: { sessionId: "session-7", tenantId: "tenant-1", environment: "test" } },
    target: { expected: { caseId: "case-7", candidateId: "candidate-3" }, supplied: { caseId: "case-7", candidateId: "candidate-3" } },
    history: {
      head: { expected: candidate.expectedContext.historyHead, supplied: candidate.evidence.historyHead, computed: candidate.evidence.historyHead },
      contentDigest: { expected: candidate.expectedContext.historyDigest, supplied: candidate.evidence.historyDigest, computed: candidate.evidence.historyDigest },
    },
    taxonomy: {
      version: { expected: "action-taxonomy.v3", supplied: "action-taxonomy.v3" },
      contentDigest: { expected: D.taxonomy, supplied: D.taxonomy },
    },
  });
  assert.match(result.testOnlyEvaluationDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(result, "contentDigest"), false);

  const snapshot = canonical(result.boundContext);
  candidate.expectedContext.scope.sessionId = "mutated-after-evaluation";
  candidate.evidence.taxonomyVersion = "mutated-after-evaluation";
  assert.equal(canonical(result.boundContext), snapshot);

  const changedContext = input();
  changedContext.expectedContext.policyRevision = "blind-review-policy.r8";
  changedContext.evidence.policyRevision = "blind-review-policy.r8";
  changedContext.expectedContext.taxonomyVersion = "action-taxonomy.v4";
  changedContext.evidence.taxonomyVersion = "action-taxonomy.v4";
  changedContext.expectedContext.taxonomyDigest = digest("fixture", "taxonomy-v4");
  changedContext.evidence.taxonomyDigest = changedContext.expectedContext.taxonomyDigest;
  const changed = evaluateTask5Composition(changedContext);
  assert.equal(changed.binding.allMatched, true);
  assert.notDeepEqual(changed.boundContext, result.boundContext);
  assert.notEqual(changed.testOnlyEvaluationDigest, result.testOnlyEvaluationDigest);

  const changedCanonicalIdentity = input();
  changedCanonicalIdentity.authorityResult.value.contentDigest = digest("fixture", "authority-v2");
  changedCanonicalIdentity.policyResult.value.authorityResolutionDigest = changedCanonicalIdentity.authorityResult.value.contentDigest;
  const changedIdentityResult = evaluateTask5Composition(changedCanonicalIdentity);
  assert.notEqual(changedIdentityResult.testOnlyEvaluationDigest, result.testOnlyEvaluationDigest);
});

test("Task 4/5 inconsistencies, failed results, and forbidden operation baselines never create permission", () => {
  const inconsistent = [
    input({ authorityResult: "PROHIBITED", policyDecision: "ALLOW_CANDIDATE_ONLY" }),
    input({ authorityResult: "PERMITTED_CANDIDATE_ONLY", policyDecision: "DENY" }),
  ];
  const externalEvent = event("event.external", "ATTEMPT_EXTERNAL_EFFECT", "EXTERNAL_EFFECT", digest("fixture", "external"));
  assert.deepEqual(Object.keys(externalEvent.operation).sort(), ["classification", "containsSecretMaterial", "operationId", "toolId"]);
  const externalPolicies = [readRubric(), readAnswer()].map((prefix) => {
    const failedPolicy = input({ items: [prefix, externalEvent] });
    failedPolicy.policyResult = { ok: false, value: null, issues: [{ code: "PREPARATION_SIDE_EFFECT_FORBIDDEN", path: "operations.external", refs: [externalEvent.operation.toolId] }] };
    return failedPolicy;
  });
  const unknownPolicy = input();
  const unknownEvent = event("event.unknown", "ATTEMPT_UNKNOWN_OPERATION", "UNKNOWN", digest("fixture", "unknown"));
  unknownPolicy.evidence.history = [unknownEvent];
  Object.assign(unknownPolicy.evidence, historyBindings(unknownPolicy.evidence.history));
  Object.assign(unknownPolicy.expectedContext, historyBindings(unknownPolicy.evidence.history));
  unknownPolicy.policyResult = { ok: false, value: null, issues: [{ code: "EFFECT_OPERATION_FORBIDDEN", path: "operations.unknown", refs: [unknownEvent.operation.toolId] }] };
  const secretPolicy = input();
  const secretEvent = event("event.secret", "ATTEMPT_SECRET_OPERATION", "PURE", digest("fixture", "secret"));
  secretPolicy.evidence.history = [secretEvent];
  secretPolicy.evidence.history[0].operation.containsSecretMaterial = true;
  Object.assign(secretPolicy.evidence, historyBindings(secretPolicy.evidence.history));
  Object.assign(secretPolicy.expectedContext, historyBindings(secretPolicy.evidence.history));
  secretPolicy.policyResult = { ok: false, value: null, issues: [{ code: "SECRET_MATERIAL_FORBIDDEN", path: "operations.secret", refs: [secretEvent.operation.toolId] }] };
  for (const candidate of [...inconsistent, ...externalPolicies, unknownPolicy, secretPolicy]) {
    const result = evaluateTask5Composition(candidate);
    assert.equal(result.effectiveDecision, "DENY");
    expectNoEffect(result);
  }
});

test("the adapter does not mutate trusted context, evidence, or either canonical result", () => {
  const candidate = input({ items: [readAnswer(), buildRationale()] });
  const before = canonical(candidate);
  evaluateTask5Composition(candidate);
  assert.equal(canonical(candidate), before);
});
