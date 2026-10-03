/** Test-only candidate eligibility. This module has no effect executor or I/O. */
const decision = (candidateAllowed, reason) => ({
  candidateAllowed,
  effectExecutionAllowed: false,
  reason,
});

function strictKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function denseArray(value, limit) {
  return Array.isArray(value) && value.length <= limit &&
    Object.keys(value).length === value.length &&
    Array.from({ length: value.length }, (_, i) => Object.hasOwn(value, i)).every(Boolean);
}

function wellFormed(input, policy) {
  try {
    if (!strictKeys(policy, ["kind", "version", "authorityEffect", "scope", "knownActions", "forbiddenPairs", "forbiddenOrderedTriples", "maxHistory"]) ||
        policy.kind !== "SyntheticCompositionPolicy" || policy.authorityEffect !== "NONE" ||
        policy.maxHistory !== 32 || typeof policy.version !== "string" || policy.version.length > 80 ||
        !strictKeys(policy.scope, ["sessionId", "tenantId", "environment"]) ||
        !Object.values(policy.scope).every((value) => typeof value === "string" && value.length > 0 && value.length <= 80) ||
        policy.scope.environment !== "simulation" ||
        !denseArray(policy.knownActions, 64) || policy.knownActions.length === 0 ||
        !policy.knownActions.every((action) => /^probe\.[a-z_]{1,64}$/.test(action)) ||
        new Set(policy.knownActions).size !== policy.knownActions.length) return false;
    for (const [patterns, size] of [[policy.forbiddenPairs, 2], [policy.forbiddenOrderedTriples, 3]]) {
      if (!denseArray(patterns, 64) || !patterns.every((pattern) =>
        denseArray(pattern, size) && pattern.length === size && new Set(pattern).size === size &&
        pattern.every((action) => policy.knownActions.includes(action)))) return false;
    }
    return strictKeys(input, ["mode", "scope", "policyVersion", "historyComplete", "priorActions", "action", "baseAllowed"]) &&
      input.mode === "STATE_ONLY" && typeof input.baseAllowed === "boolean" &&
      input.historyComplete === true && input.policyVersion === policy.version &&
      strictKeys(input.scope, ["sessionId", "tenantId", "environment"]) &&
      Object.keys(policy.scope).every((key) => input.scope[key] === policy.scope[key]) &&
      denseArray(input.priorActions, policy.maxHistory) &&
      input.priorActions.every((action) => policy.knownActions.includes(action)) &&
      policy.knownActions.includes(input.action);
  } catch {
    return false;
  }
}

export function perActionCandidate(input, policy) {
  if (!wellFormed(input, policy)) return decision(false, "INVALID_FIXTURE_INPUT");
  return input.baseAllowed === true && policy.knownActions.includes(input.action)
    ? decision(true, "CANDIDATE_ONLY")
    : decision(false, "BASE_DENIED");
}

export function checkCompositionCandidate(input, policy) {
  const base = perActionCandidate(input, policy);
  if (!base.candidateAllowed) return base;
  const sequence = [...input.priorActions, input.action];
  for (const pair of policy.forbiddenPairs) {
    if (pair.every((action) => sequence.includes(action))) {
      return decision(false, "FORBIDDEN_PAIR");
    }
  }
  for (const pattern of policy.forbiddenOrderedTriples) {
    let position = 0;
    for (const action of sequence) {
      if (action === pattern[position]) position += 1;
      if (position === pattern.length) return decision(false, "FORBIDDEN_ORDERED_TRIPLE");
    }
  }
  return base;
}
