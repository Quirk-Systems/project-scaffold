import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fixture = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
const module = await import("./gate.mjs").catch(() => null);
const policy = fixture.policy;
const request = (action, extra = {}) => ({
  mode: "STATE_ONLY", scope: { ...policy.scope }, policyVersion: policy.version,
  historyComplete: true, priorActions: [], action, baseAllowed: true, ...extra,
});

test("action-local reference admits each stipulated permitted action without executing", () => {
  assert.equal(typeof module?.perActionCandidate, "function", "perActionCandidate not implemented");
  for (const action of policy.knownActions) {
    const result = module.perActionCandidate(request(action), policy);
    assert.equal(result.candidateAllowed, true);
    assert.equal(result.effectExecutionAllowed, false);
  }
});

test("action-local reference does not turn a denied base decision into permission", () => {
  assert.equal(typeof module?.perActionCandidate, "function", "perActionCandidate not implemented");
  assert.equal(module.perActionCandidate(request(policy.knownActions[0], { baseAllowed: false }), policy).candidateAllowed, false);
});

test("action-local reference exposes the selected composition blind spot, not a production vulnerability", () => {
  assert.equal(typeof module?.perActionCandidate, "function", "perActionCandidate not implemented");
  for (const item of fixture.cases) {
    const history = [];
    for (const action of item.actions) {
      const result = module.perActionCandidate(request(action, { priorActions: [...history] }), policy);
      assert.equal(result.candidateAllowed, true);
      assert.equal(result.effectExecutionAllowed, false);
      history.push(action);
    }
  }
});

for (const item of fixture.cases) {
  test(`composition fixture ${item.id}`, () => {
    assert.equal(typeof module?.checkCompositionCandidate, "function", "composition filter not implemented");
    const history = [];
    let allowed = true;
    for (const [index, action] of item.actions.entries()) {
      const result = module.checkCompositionCandidate(request(action, {
        priorActions: [...history], baseAllowed: item.baseDecisions[index],
      }), policy);
      assert.equal(result.effectExecutionAllowed, false);
      if (!result.candidateAllowed) { allowed = false; break; }
      history.push(action); // Simulated acceptance only: no real action occurred.
    }
    assert.equal(allowed, item.expected === "ALLOW_CANDIDATE_ONLY", item.id);
  });
}

test("composition guard cannot elevate a denied action even with a permissive history", () => {
  assert.equal(typeof module?.checkCompositionCandidate, "function");
  const result = module.checkCompositionCandidate(request("probe.inspect_metadata", { baseAllowed: false }), policy);
  assert.equal(result.candidateAllowed, false);
  assert.equal(result.effectExecutionAllowed, false);
});

const invalidInputs = [
  ["incomplete-history", { historyComplete: false }],
  ["missing-history", { priorActions: null }],
  ["unknown-history-action", { priorActions: ["probe.unknown"] }],
  ["unknown-current-action", { action: "probe.unknown" }],
  ["sandbox-mode", { mode: "REVERSIBLE_SANDBOX" }],
  ["production-mode", { mode: "PRODUCTION_GATED" }],
  ["session-mismatch", { scope: { ...policy.scope, sessionId: "other" } }],
  ["tenant-mismatch", { scope: { ...policy.scope, tenantId: "other" } }],
  ["environment-mismatch", { scope: { ...policy.scope, environment: "production" } }],
  ["policy-version-mismatch", { policyVersion: "other" }],
  ["history-overflow", { priorActions: Array(33).fill("probe.inspect_metadata") }],
  ["sparse-history", { priorActions: Array(2) }],
  ["truthy-not-true-base", { baseAllowed: "true" }],
  ["self-asserted-authority-field", { authorized: true }],
];
for (const [name, extra] of invalidInputs) {
  test(`fails closed: ${name}`, () => {
    assert.doesNotThrow(() => {
      const result = module.checkCompositionCandidate(request("probe.inspect_metadata", extra), policy);
      assert.equal(result.candidateAllowed, false);
      assert.equal(result.effectExecutionAllowed, false);
    });
  });
}

test("malformed policy fails closed rather than creating a new permission vocabulary", () => {
  for (const bad of [null, { ...policy, forbiddenOrderedTriples: [["probe.unknown"]] }, { ...policy, maxHistory: 1000000 }]) {
    assert.doesNotThrow(() => {
      assert.equal(module.checkCompositionCandidate(request("probe.inspect_metadata"), bad).candidateAllowed, false);
    });
  }
});

test("null candidate and malformed scope fail closed", () => {
  for (const bad of [null, {}, request("probe.inspect_metadata", { scope: null })]) {
    assert.doesNotThrow(() => assert.equal(module.checkCompositionCandidate(bad, policy).candidateAllowed, false));
  }
});

test("ordered triple catches non-adjacent members, but reversed order is not an ordered match", () => {
  const [a, b, c] = policy.forbiddenOrderedTriples[0];
  const deny = module.checkCompositionCandidate(request(c, { priorActions: [a, "probe.inspect_metadata", b] }), policy);
  assert.equal(deny.candidateAllowed, false);
  const allow = module.checkCompositionCandidate(request(a, { priorActions: [c, b] }), policy);
  assert.equal(allow.candidateAllowed, true);
});

test("the filter does not mutate policy, base decision, or history", () => {
  const input = request("probe.inspect_metadata", { priorActions: ["probe.read_public"] });
  const before = JSON.stringify({ input, policy });
  module.checkCompositionCandidate(input, policy);
  assert.equal(JSON.stringify({ input, policy }), before);
});

// Independent enumerative oracle: index combinations, not the target's greedy matcher.
function oraclePermits(sequence) {
  for (const pair of policy.forbiddenPairs) {
    for (let i = 0; i < sequence.length; i += 1) {
      for (let j = i + 1; j < sequence.length; j += 1) {
        if ((sequence[i] === pair[0] && sequence[j] === pair[1]) ||
            (sequence[i] === pair[1] && sequence[j] === pair[0])) return false;
      }
    }
  }
  for (const triple of policy.forbiddenOrderedTriples) {
    for (let i = 0; i < sequence.length; i += 1) {
      for (let j = i + 1; j < sequence.length; j += 1) {
        for (let k = j + 1; k < sequence.length; k += 1) {
          if (sequence[i] === triple[0] && sequence[j] === triple[1] && sequence[k] === triple[2]) return false;
        }
      }
    }
  }
  return true;
}

test("matches an enumerative oracle on 1554 nonempty sequences in a declared six-symbol domain", () => {
  const alphabet = [...policy.forbiddenPairs[0], ...policy.forbiddenOrderedTriples[0], "probe.inspect_metadata"];
  let level = [[]];
  let checked = 0;
  for (let length = 1; length <= 4; length += 1) {
    level = level.flatMap((prefix) => alphabet.map((action) => [...prefix, action]));
    for (const sequence of level) {
      const candidate = request(sequence.at(-1), { priorActions: sequence.slice(0, -1) });
      const result = module.checkCompositionCandidate(candidate, policy);
      assert.equal(result.candidateAllowed, oraclePermits(sequence), sequence.join(" -> "));
      assert.equal(result.effectExecutionAllowed, false);
      if (!oraclePermits(sequence)) {
        assert.equal(module.checkCompositionCandidate({ ...candidate, baseAllowed: false }, policy).candidateAllowed, false);
      }
      checked += 1;
    }
  }
  assert.equal(checked, 1554);
});

const runner = await import("./run.mjs").catch(() => null);
test("report keeps candidate decisions separate from actual effects and fixes denominators", () => {
  assert.equal(typeof runner?.evaluateFixturePack, "function", "report runner not implemented");
  const report = runner.evaluateFixturePack(fixture);
  assert.deepEqual(report.metrics, {
    prohibitedTraces: 12, matchedControls: 12,
    referenceProhibitedCandidatesPermitted: 12,
    targetProhibitedCandidatesPermitted: 0,
    referenceControlsDenied: 0, targetControlsDenied: 0,
    externalEffectsExecuted: 0,
  });
  assert.equal(report.perCase.length, 24);
  assert.equal(report.kind, "SyntheticCompositionProbeResult");
  assert.equal(report.productionValidation, false);
});
