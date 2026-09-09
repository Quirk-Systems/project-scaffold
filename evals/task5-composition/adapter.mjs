import { createHash } from "node:crypto";

const DIGEST_DOMAIN = "quirk.test-only.task5-composition";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Deterministic test-fixture change detector. It authenticates nothing. */
function testOnlyDigest(label, value) {
  const payload = `${DIGEST_DOMAIN}.${label}\0${canonical(value)}`;
  return `sha256:${createHash("sha256").update(payload).digest("hex")}`;
}

function historyBindings(items) {
  const historyDigest = testOnlyDigest("history.v1", items);
  return {
    historyDigest,
    historyHead: testOnlyDigest("history-head.v1", {
      count: items.length,
      historyDigest,
      lastEventId: items.at(-1)?.eventId ?? null,
    }),
  };
}

function equal(left, right) {
  return canonical(left) === canonical(right);
}

function succeeded(result) {
  return result?.ok === true && result.value !== null &&
    Array.isArray(result.issues) && result.issues.length === 0;
}

function mappedDecision(authorityResult) {
  if (authorityResult === "PERMITTED_CANDIDATE_ONLY") return "ALLOW_CANDIDATE_ONLY";
  if (authorityResult === "HUMAN_REVIEW") return "REQUIRE_HUMAN_REVIEW";
  if (authorityResult === "PROHIBITED" || authorityResult === "UNRESOLVED") return "DENY";
  return null;
}

function sameMembers(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const sortedRight = [...right].sort();
  return [...left].sort().every((value, index) => value === sortedRight[index]);
}

function strictKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function simulationOnly(items) {
  if (!Array.isArray(items) || items.length === 0) return false;
  const eventKeys = [
    "kind", "eventKind", "eventId", "sessionId", "tenantId", "environment",
    "caseId", "candidateId", "operation", "fixtureObligation", "resourceDigest", "assertions",
  ];
  const operationKeys = ["operationId", "classification", "toolId", "containsSecretMaterial"];
  return items.every((item) => {
    if (!strictKeys(item, eventKeys) ||
        item.kind !== "Task5CompositionHistoryEvent" ||
        item.eventKind !== "SIMULATED") return false;
    if (!Array.isArray(item.assertions) || item.assertions.length !== 0) return false;
    const operation = item.operation;
    return strictKeys(operation, operationKeys) &&
      typeof operation.operationId === "string" && operation.operationId.length > 0 &&
      typeof operation.toolId === "string" && operation.toolId.length > 0 &&
      (operation.classification === "PURE" || operation.classification === "CANDIDATE_STATE") &&
      operation.containsSecretMaterial === false &&
      typeof item.eventId === "string" && item.eventId.length > 0 &&
      typeof item.fixtureObligation === "string" && item.fixtureObligation.length > 0 &&
      typeof item.resourceDigest === "string" && item.resourceDigest.length > 0;
  });
}

function eventBoundToContext(item, context) {
  return item?.sessionId === context.scope?.sessionId &&
    item?.tenantId === context.scope?.tenantId &&
    item?.environment === context.scope?.environment &&
    item?.caseId === context.target?.caseId &&
    item?.candidateId === context.target?.candidateId;
}

function blindReferenceContaminated(items) {
  const obligations = new Set(items.map((item) => item?.fixtureObligation));
  return obligations.has("READ_REFERENCE_ANSWER_KEY") &&
    obligations.has("BUILD_BLIND_CANDIDATE_RATIONALE");
}

const arrayOrEmpty = (value) => Array.isArray(value) ? [...value] : [];
const snapshot = (value) => value === undefined ? null : structuredClone(value);

/**
 * Test-only adapter around the planned Task 4 and Task 5 GovernedRunResult shapes.
 * The local harness supplies expectedContext as the trust root; evidence remains a
 * separate input. This function issues no policy decision, grant, or EffectReceipt.
 */
export function evaluateTask5Composition(input) {
  const authorityResult = input?.authorityResult;
  const policyResult = input?.policyResult;
  const expected = input?.expectedContext;
  const evidence = input?.evidence;
  const authority = succeeded(authorityResult) ? authorityResult.value : null;
  const policy = succeeded(policyResult) ? policyResult.value : null;
  const items = Array.isArray(evidence?.history) ? evidence.history : null;
  const computedHistory = items === null ? null : historyBindings(items);

  const boundContext = {
    proposalDigest: {
      expected: expected?.proposalDigest ?? null,
      supplied: evidence?.proposalDigest ?? null,
      policy: policy?.proposalDigest ?? null,
    },
    authorityResolutionDigest: {
      authority: authority?.contentDigest ?? null,
      policy: policy?.authorityResolutionDigest ?? null,
    },
    policy: {
      revision: {
        expected: expected?.policyRevision ?? null,
        supplied: evidence?.policyRevision ?? null,
      },
      stateDigest: {
        expected: expected?.policyStateDigest ?? null,
        supplied: evidence?.policyStateDigest ?? null,
        authority: authority?.policyStateDigest ?? null,
        policy: policy?.policyStateDigest ?? null,
      },
    },
    scope: {
      expected: snapshot(expected?.scope),
      supplied: snapshot(evidence?.scope),
    },
    target: {
      expected: snapshot(expected?.target),
      supplied: snapshot(evidence?.target),
    },
    history: {
      head: {
        expected: expected?.historyHead ?? null,
        supplied: evidence?.historyHead ?? null,
        computed: computedHistory?.historyHead ?? null,
      },
      contentDigest: {
        expected: expected?.historyDigest ?? null,
        supplied: evidence?.historyDigest ?? null,
        computed: computedHistory?.historyDigest ?? null,
      },
    },
    taxonomy: {
      version: {
        expected: expected?.taxonomyVersion ?? null,
        supplied: evidence?.taxonomyVersion ?? null,
      },
      contentDigest: {
        expected: expected?.taxonomyDigest ?? null,
        supplied: evidence?.taxonomyDigest ?? null,
      },
    },
  };

  const binding = {
    proposal: Boolean(policy && expected && evidence &&
      policy.proposalDigest === expected.proposalDigest &&
      evidence.proposalDigest === expected.proposalDigest),
    authorityResolution: Boolean(authority && policy &&
      policy.authorityResolutionDigest === authority.contentDigest),
    policyRevision: Boolean(expected && evidence &&
      evidence.policyRevision === expected.policyRevision),
    policyState: Boolean(authority && policy && expected && evidence &&
      authority.policyStateDigest === expected.policyStateDigest &&
      policy.policyStateDigest === expected.policyStateDigest &&
      evidence.policyStateDigest === expected.policyStateDigest),
    scope: Boolean(expected && evidence && equal(evidence.scope, expected.scope)),
    target: Boolean(expected && evidence && equal(evidence.target, expected.target)),
    historyHead: Boolean(expected && evidence && computedHistory &&
      evidence.historyHead === expected.historyHead &&
      computedHistory.historyHead === expected.historyHead),
    historyContent: Boolean(expected && evidence && computedHistory &&
      evidence.historyDigest === expected.historyDigest &&
      computedHistory.historyDigest === expected.historyDigest),
    taxonomyVersion: Boolean(expected && evidence &&
      evidence.taxonomyVersion === expected.taxonomyVersion),
    taxonomyContent: Boolean(expected && evidence &&
      evidence.taxonomyDigest === expected.taxonomyDigest),
    historyEventScope: Boolean(items && expected &&
      items.every((item) => eventBoundToContext(item, expected))),
  };
  const allBindingsMatched = Object.values(binding).every(Boolean);
  const reasons = [];
  for (const [name, matched] of Object.entries(binding)) {
    const reasonName = name.replaceAll(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
    if (!matched) reasons.push(`BINDING_${reasonName}_MISMATCH`);
  }

  const historyIsSimulationOnly = simulationOnly(items);
  if (!historyIsSimulationOnly) reasons.push("HISTORY_NOT_SIMULATION_ONLY");

  const isBlindReferenceContaminated = items !== null && blindReferenceContaminated(items);
  if (isBlindReferenceContaminated) reasons.push("BLIND_REFERENCE_CONTAMINATION");
  if (!authority) reasons.push("AUTHORITY_RESULT_UNAVAILABLE");
  if (!policy) reasons.push("POLICY_RESULT_UNAVAILABLE");

  const expectedPolicyDecision = mappedDecision(authority?.result);
  const resultsConsistent = Boolean(authority && policy &&
    expectedPolicyDecision !== null &&
    authority.kind === "ManyTierAuthorityResolution" &&
    authority.protocolVersion === "0.1.0" &&
    policy.kind === "ExecutionPolicyDecision" &&
    policy.protocolVersion === "0.1.0" &&
    policy.decision === expectedPolicyDecision &&
    policy.effectExecutionAllowed === false &&
    policy.mode === "STATE_ONLY" &&
    sameMembers(policy.grantIds, authority.activeAuthorityGrantIds));
  if (!resultsConsistent) reasons.push("TASK4_TASK5_INCONSISTENT");

  const hasHumanReviewObligation = authority?.requiredHumanReview?.length > 0 ||
    authority?.result === "HUMAN_REVIEW";
  const hasUnresolvedConflict = authority?.unresolvedConflictIds?.length > 0 ||
    authority?.result === "UNRESOLVED";
  if (hasHumanReviewObligation) {
    reasons.push("HUMAN_REVIEW_REQUIRED");
  }
  if (hasUnresolvedConflict) {
    reasons.push("UNRESOLVED_CONFLICT_RETAINED");
  }
  if (authority?.result === "PROHIBITED") reasons.push("AUTHORITY_PROHIBITED");
  if (policy?.decision === "DENY") reasons.push("BASE_POLICY_DENIED");

  let effectiveDecision = "DENY";
  if (authority?.result === "HUMAN_REVIEW") {
    effectiveDecision = "REQUIRE_HUMAN_REVIEW";
  } else if (authority?.result === "PROHIBITED" || authority?.result === "UNRESOLVED") {
    effectiveDecision = "DENY";
  } else if (authority?.result === "PERMITTED_CANDIDATE_ONLY" &&
      policy?.decision === "REQUIRE_HUMAN_REVIEW") {
    effectiveDecision = "REQUIRE_HUMAN_REVIEW";
  } else if (allBindingsMatched && historyIsSimulationOnly &&
      !isBlindReferenceContaminated && !hasHumanReviewObligation &&
      !hasUnresolvedConflict && resultsConsistent &&
      expectedPolicyDecision === "ALLOW_CANDIDATE_ONLY") {
    effectiveDecision = "ALLOW_CANDIDATE_ONLY";
  }

  const preservedObligations = {
    requiredHumanReview: arrayOrEmpty(authority?.requiredHumanReview),
    unresolvedConflictIds: arrayOrEmpty(authority?.unresolvedConflictIds),
    authorityGrantIds: arrayOrEmpty(authority?.activeAuthorityGrantIds),
    policyGrantIds: arrayOrEmpty(policy?.grantIds),
    permittedEffects: arrayOrEmpty(authority?.permittedEffects),
    prohibitedEffects: arrayOrEmpty(authority?.prohibitedEffects),
  };
  const candidateEligible = effectiveDecision === "ALLOW_CANDIDATE_ONLY";
  const blockReasons = [...new Set(reasons)];
  const testOnlyEvaluationDigest = testOnlyDigest("evaluation.v1", {
    kind: "Task5CompositionEvaluation",
    authorityResultIdentity: {
      ok: authorityResult?.ok ?? null,
      kind: authority?.kind ?? null,
      resolutionId: authority?.resolutionId ?? null,
      contentDigest: authority?.contentDigest ?? null,
    },
    policyResultIdentity: {
      ok: policyResult?.ok ?? null,
      kind: policy?.kind ?? null,
      policyDecisionId: policy?.policyDecisionId ?? null,
      contentDigest: policy?.contentDigest ?? null,
    },
    boundContext,
    effectiveDecision,
    candidateEligible,
    blockReasons,
    preservedObligations,
    effectExecutionAllowed: false,
  });

  return {
    kind: "Task5CompositionEvaluation",
    testOnly: true,
    authorityResult,
    policyResult,
    authorityResolutionDigest: authority?.contentDigest ?? null,
    policyDecisionDigest: policy?.contentDigest ?? null,
    effectiveDecision,
    candidateEligible,
    blockReasons,
    preservedObligations,
    boundContext,
    testOnlyEvaluationDigest,
    binding: { ...binding, allMatched: allBindingsMatched },
    history: {
      trustedExpectedHead: expected?.historyHead ?? null,
      suppliedHead: evidence?.historyHead ?? null,
      computedHead: computedHistory?.historyHead ?? null,
      simulationOnly: historyIsSimulationOnly,
    },
    effectExecutionAllowed: false,
  };
}
