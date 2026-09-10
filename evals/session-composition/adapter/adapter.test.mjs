// Candidate adapter tests exercise planned contracts, not a deployed enforcement path.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createCompositionAdapter } from "./adapter.mjs";
import { loadPlanContracts } from "./plan-contracts.mjs";
import { makeFixture, makeBlindFixture, rehash } from "./fixtures.mjs";

const contracts = await loadPlanContracts();
after(() => contracts.cleanup());
const evaluate = (fixture) =>
  createCompositionAdapter({
    contracts,
    policy: fixture.policy,
    resolveHistory: fixture.resolveHistory,
  })(fixture.request);
const authorities = [
  "PERMITTED_CANDIDATE_ONLY",
  "HUMAN_REVIEW",
  "PROHIBITED",
  "UNRESOLVED",
];

function assertBounded(result) {
  assert.equal(result.kind, "CompositionConstraintCandidate");
  assert.equal(result.status, "CANDIDATE");
  assert.equal(result.effectExecutionAllowed, false);
  assert.equal(result.productionValidation, false);
  assert.match(result.contentDigest, /^sha256:[a-f0-9]{64}$/);
  if (result.effectivePolicyResult?.ok) {
    contracts.ExecutionPolicyDecisionSchema.parse(
      result.effectivePolicyResult.value,
    );
    assert.equal(
      result.effectivePolicyResult.value.effectExecutionAllowed,
      false,
    );
    const { contentDigest, ...basis } = result.effectivePolicyResult.value;
    assert.equal(
      contentDigest,
      contracts.digestCanonical(
        basis,
        "quirk.governed-run.execution-policy.v1",
      ),
    );
  }
}

function assertBlocked(result) {
  assertBounded(result);
  assert.equal(result.candidateEligible, false);
  assert.ok(result.reasonCodes.length > 0);
  assert.notEqual(
    result.effectivePolicyResult?.value?.decision,
    "ALLOW_CANDIDATE_ONLY",
  );
}

for (const authority of authorities) {
  for (const history of ["clean", "prohibited", "untrusted"]) {
    test(`actual Task 4/5 shapes: ${authority} with ${history} history`, () => {
      const fixture = makeFixture(contracts, { authority, history });
      const beforeAuthority = structuredClone(fixture.request.authorityResult);
      const beforePolicy = structuredClone(fixture.request.policyResult);
      const result = evaluate(fixture);
      assertBounded(result);
      assert.equal(
        result.candidateEligible,
        authority === "PERMITTED_CANDIDATE_ONLY" && history === "clean",
      );
      assert.deepEqual(result.authorityResult, beforeAuthority);
      assert.deepEqual(result.basePolicyResult, beforePolicy);
      assert.deepEqual(fixture.request.authorityResult, beforeAuthority);
      assert.deepEqual(fixture.request.policyResult, beforePolicy);
      if (history === "clean") {
        assert.equal(
          result.effectivePolicyResult.value.decision,
          authority === "PERMITTED_CANDIDATE_ONLY"
            ? "ALLOW_CANDIDATE_ONLY"
            : authority === "HUMAN_REVIEW"
              ? "REQUIRE_HUMAN_REVIEW"
              : "DENY",
        );
      } else assertBlocked(result);
      assert.deepEqual(
        result.authorityResult.value.requiredHumanReview,
        beforeAuthority.value.requiredHumanReview,
      );
      assert.deepEqual(
        result.authorityResult.value.unresolvedConflictIds,
        beforeAuthority.value.unresolvedConflictIds,
      );
      assert.deepEqual(
        result.authorityResult.value.activeAuthorityGrantIds,
        beforeAuthority.value.activeAuthorityGrantIds,
      );
      if (result.effectivePolicyResult?.ok)
        assert.deepEqual(
          result.effectivePolicyResult.value.grantIds,
          beforePolicy.value.grantIds,
        );
    });
  }
}

test("Mode A incremental value: history rejects second selection and preserves rationale control", () => {
  const prohibited = makeFixture(contracts, { history: "prohibited" });
  const control = makeFixture(contracts, {
    history: "prohibited",
    action: "probe.revise_rationale",
  });
  assert.equal(
    prohibited.request.policyResult.value.decision,
    "ALLOW_CANDIDATE_ONLY",
  );
  assert.equal(
    control.request.policyResult.value.decision,
    "ALLOW_CANDIDATE_ONLY",
  );
  assertBlocked(evaluate(prohibited));
  assert.equal(evaluate(control).candidateEligible, true);
});

test("cheapest disproof: ablating declared composition restriction loses the added denial", () => {
  const fixture = makeFixture(contracts, { history: "prohibited" });
  assertBlocked(evaluate(fixture));
  fixture.policy.forbiddenPairs = [];
  fixture.refreshBindings();
  assert.equal(evaluate(fixture).candidateEligible, true);
});

// Port #105's useful expectations, not its synthetic-digest adapter or whole-trace API.
for (const [name, options, eligible] of [
  [
    "answer key alone",
    { history: "empty", action: "probe.read_answer_key" },
    true,
  ],
  ["blind rationale alone", { history: "empty" }, true],
  ["public rubric control", { history: "rubric" }, true],
  ["answer key contamination", { history: "answer-key" }, false],
  [
    "reverse-order contamination",
    { history: "rationale", action: "probe.read_answer_key" },
    false,
  ],
]) {
  test(`blind-review inherited expectation: ${name}`, () => {
    const fixture = makeBlindFixture(contracts, options);
    assert.equal(
      fixture.request.policyResult.value.decision,
      "ALLOW_CANDIDATE_ONLY",
    );
    assert.equal(
      fixture.request.proposal.requestedEffect.targetLocator,
      "fixture://blind/case-7/candidate-3",
    );
    const result = evaluate(fixture);
    assertBounded(result);
    assert.equal(result.candidateEligible, eligible);
    if (!eligible) {
      assertBlocked(result);
      assert.ok(result.reasonCodes.includes("COMPOSITION_PROHIBITED"));
    }
  });
}

test("blind-review history from another candidate cannot replace the scoped ledger", () => {
  const fixture = makeBlindFixture(contracts);
  fixture.snapshot.scope.decisionSlotId = "blind.case_7.candidate_other";
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

for (const authority of authorities) {
  test(`validated context rejects coherent same-run clean other-candidate substitution for ${authority}`, () => {
    const contaminated = makeBlindFixture(contracts, {
      authority,
      history: "answer-key",
    });
    const cleanOther = makeBlindFixture(contracts, {
      history: "empty",
      candidateId: "candidate-other",
    });
    const resolveHistory = (handle) =>
      contaminated.resolveHistory(handle) ?? cleanOther.resolveHistory(handle);
    const check = createCompositionAdapter({
      contracts,
      policy: contaminated.policy,
      resolveHistory,
    });
    assertBlocked(check(contaminated.request));
    assert.equal(cleanOther.snapshot.events.length, 0);
    assert.equal(check(cleanOther.request).candidateEligible, true);
    assert.equal(
      contaminated.request.proposal.runId,
      cleanOther.request.proposal.runId,
    );
    assert.notEqual(
      contaminated.request.proposal.requestedEffect.targetLocator,
      cleanOther.request.proposal.requestedEffect.targetLocator,
    );
    const before = {
      proposal: structuredClone(contaminated.request.proposal),
      authority: structuredClone(contaminated.request.authorityResult),
      policy: structuredClone(contaminated.request.policyResult),
      history: structuredClone(contaminated.snapshot),
    };
    // Both handles resolve to legitimate histories. Substitute a coherently
    // rebound scope and clean history while keeping all source decisions exact.
    contaminated.request.scope = structuredClone(cleanOther.request.scope);
    contaminated.request.historyHandle = cleanOther.request.historyHandle;
    contaminated.request.bindings.scopeDigest =
      cleanOther.request.bindings.scopeDigest;
    contaminated.request.bindings.historyHeadDigest =
      cleanOther.request.bindings.historyHeadDigest;
    const result = check(contaminated.request);
    assertBlocked(result);
    assert.ok(result.reasonCodes.includes("VALIDATED_CONTEXT_BINDING_MISMATCH"));
    assert.deepEqual(result.authorityResult, before.authority);
    assert.deepEqual(result.basePolicyResult, before.policy);
    assert.deepEqual(contaminated.request.proposal, before.proposal);
    assert.deepEqual(contaminated.request.authorityResult, before.authority);
    assert.deepEqual(contaminated.request.policyResult, before.policy);
    assert.deepEqual(contaminated.snapshot, before.history);
    assert.deepEqual(
      result.effectivePolicyResult.value.grantIds,
      before.policy.value.grantIds,
    );
  });
}

for (const field of ["proposalDigest", "scopeDigest"]) {
  for (const change of ["missing", "changed"]) {
    test(`${change} resolver-attested ${field} blocks clean candidate eligibility`, () => {
      const fixture = makeBlindFixture(contracts, { history: "empty" });
      assert.equal(evaluate(fixture).candidateEligible, true);
      const result = createCompositionAdapter({
        contracts,
        policy: fixture.policy,
        resolveHistory(handle) {
          const resolved = fixture.resolveHistory(handle);
          if (change === "missing") delete resolved[field];
          else resolved[field] = `sha256:${"f".repeat(64)}`;
          return resolved;
        },
      })(fixture.request);
      assertBlocked(result);
      assert.deepEqual(result.authorityResult, fixture.request.authorityResult);
      assert.deepEqual(result.basePolicyResult, fixture.request.policyResult);
    });
  }
}

for (const change of ["proposal", "scope"]) {
  test(`caller hash refresh cannot retarget the resolver-attested ${change}`, () => {
    const fixture = makeBlindFixture(contracts, { history: "empty" });
    const initialContext = fixture.resolveHistory(fixture.request.historyHandle);
    if (change === "proposal") {
      fixture.request.proposal.requestedEffect.targetLocator =
        "fixture://blind/case-7/candidate-other";
      fixture.request.authorityResult.value.permittedEffects = [
        structuredClone(fixture.request.proposal.requestedEffect),
      ];
    } else {
      fixture.request.scope.decisionSlotId = "blind.case_7.candidate_other";
      fixture.snapshot.scope = structuredClone(fixture.request.scope);
    }
    fixture.refreshBindings();
    const refreshedContext = fixture.resolveHistory(fixture.request.historyHandle);
    assert.equal(refreshedContext.proposalDigest, initialContext.proposalDigest);
    assert.equal(refreshedContext.scopeDigest, initialContext.scopeDigest);
    const result = evaluate(fixture);
    assertBlocked(result);
    assert.ok(result.reasonCodes.includes("VALIDATED_CONTEXT_BINDING_MISMATCH"));
    assert.deepEqual(result.authorityResult, fixture.request.authorityResult);
    assert.deepEqual(result.basePolicyResult, fixture.request.policyResult);
  });
}

for (const authority of authorities) {
  test(`blind-review contamination preserves ${authority} source obligations`, () => {
    const fixture = makeBlindFixture(contracts, {
      authority,
      history: "answer-key",
    });
    const result = evaluate(fixture);
    assertBlocked(result);
    assert.deepEqual(result.authorityResult, fixture.request.authorityResult);
    assert.deepEqual(result.basePolicyResult, fixture.request.policyResult);
  });
}

for (const [name, injected] of [
  ["commitment", { committed: true }],
  ["executed effect", { effectExecuted: true }],
  ["effect receipt", { kind: "EffectReceipt" }],
  [
    "receipt assertion",
    { assertions: [{ kind: "EffectReceipt", receiptId: "receipt.fake" }] },
  ],
  [
    "unknown execution assertion",
    { assertions: [{ kind: "UnknownExecutionAssertion", value: true }] },
  ],
  ["execution time", { executedAt: "2026-09-09T12:01:00.000Z" }],
  ["unknown event field", { unknownEventField: true }],
]) {
  test(`simulation-smuggling inherited expectation rejects ${name} with valid bindings`, () => {
    const fixture = makeBlindFixture(contracts); // legitimate public-rubric control
    assert.equal(evaluate(fixture).candidateEligible, true);
    Object.assign(fixture.snapshot.events[0], injected);
    fixture.refreshBindings(); // hash the corruption: rejection must come from the strict schema
    assertBlocked(evaluate(fixture));
  });
}

test("simulation-smuggling inherited expectation rejects an unknown operation field", () => {
  const fixture = makeBlindFixture(contracts);
  fixture.request.operations[0].unknownOperationField = true;
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

for (const status of ["PROPOSED", "DENIED"]) {
  test(`${status} history does not count as simulated acceptance`, () => {
    const fixture = makeFixture(contracts, { history: "prohibited" });
    fixture.snapshot.events[0].status = status;
    fixture.refreshBindings();
    assert.equal(evaluate(fixture).candidateEligible, true);
  });
}

for (const status of ["RESERVED", "COMMITTED", "FAILED", "UNKNOWN_OUTCOME"]) {
  test(`unsupported ${status} event fails closed`, () => {
    const fixture = makeFixture(contracts, { history: "prohibited" });
    fixture.snapshot.events[0].status = status;
    fixture.refreshBindings();
    assertBlocked(evaluate(fixture));
  });
}

test("a simulated accepted event and output never become executed-effect evidence", () => {
  const fixture = makeFixture(contracts, {
    history: "prohibited",
    action: "probe.revise_rationale",
  });
  const before = structuredClone(fixture.snapshot);
  const result = evaluate(fixture);
  assert.equal(result.candidateEligible, true);
  assertBounded(result);
  assert.deepEqual(fixture.snapshot, before);
  assert.equal(fixture.snapshot.events[0].provenance, "SIMULATION");
  assert.equal(fixture.snapshot.events[0].status, "SIMULATED_ACCEPTED");
  assert.equal(Object.hasOwn(result, "executedEffects"), false);
  assert.equal(Object.hasOwn(result, "effectReceipt"), false);
});

for (const provenance of ["EXECUTION", "UNVERIFIED", undefined]) {
  test(`accepted event with ${String(provenance)} provenance fails closed`, () => {
    const fixture = makeFixture(contracts, {
      history: "prohibited",
      action: "probe.revise_rationale",
    });
    if (provenance === undefined) delete fixture.snapshot.events[0].provenance;
    else fixture.snapshot.events[0].provenance = provenance;
    fixture.refreshBindings();
    assertBlocked(evaluate(fixture));
  });
}

for (const history of ["missing", "incomplete"]) {
  test(`${history} required history blocks otherwise valid eligibility`, () => {
    assertBlocked(evaluate(makeFixture(contracts, { history })));
  });
}

test("caller-supplied completeness and events cannot replace the opaque resolver handle", () => {
  const fixture = makeFixture(contracts);
  fixture.request.historyHandle = {
    historyComplete: true,
    complete: true,
    events: [],
  };
  const result = createCompositionAdapter({
    contracts,
    policy: fixture.policy,
    resolveHistory: () => null,
  })(fixture.request);
  assertBlocked(result);
});

test("replacing the request handle cannot change which history handle the fixture resolver trusts", () => {
  const fixture = makeFixture(contracts);
  fixture.request.historyHandle = {};
  assert.equal(fixture.resolveHistory(fixture.request.historyHandle), null);
  assertBlocked(evaluate(fixture));
});

test("history resolver failure becomes blocked eligibility", () => {
  const fixture = makeFixture(contracts);
  const result = createCompositionAdapter({
    contracts,
    policy: fixture.policy,
    resolveHistory: () => {
      throw new Error("fixture resolver unavailable");
    },
  })(fixture.request);
  assertBlocked(result);
});

for (const key of [
  "proposalDigest",
  "authorityResolutionDigest",
  "policyStateDigest",
  "scopeDigest",
  "historyHeadDigest",
  "actionTaxonomyVersion",
  "compositionPolicyDigest",
  "operationsDigest",
]) {
  test(`tampered ${key} binding blocks eligibility`, () => {
    const fixture = makeFixture(contracts);
    fixture.request.bindings[key] =
      key === "actionTaxonomyVersion"
        ? "mode-a-test.stale"
        : `sha256:${"f".repeat(64)}`;
    assertBlocked(evaluate(fixture));
  });
  test(`missing ${key} binding blocks eligibility`, () => {
    const fixture = makeFixture(contracts);
    delete fixture.request.bindings[key];
    assertBlocked(evaluate(fixture));
  });
}

test("snapshot event change without a new head is rejected", () => {
  const fixture = makeFixture(contracts);
  fixture.snapshot.events.push({
    eventId: "event.new",
    actionId: "probe.revise_rationale",
    status: "SIMULATED_ACCEPTED",
    provenance: "SIMULATION",
  });
  assertBlocked(evaluate(fixture));
});

test("valid new history head cannot reuse an old request binding", () => {
  const fixture = makeFixture(contracts);
  const originalBinding = fixture.request.bindings.historyHeadDigest;
  fixture.snapshot.events.push({
    eventId: "event.new",
    actionId: "probe.revise_rationale",
    status: "SIMULATED_ACCEPTED",
    provenance: "SIMULATION",
  });
  fixture.refreshBindings();
  fixture.request.bindings.historyHeadDigest = originalBinding;
  assertBlocked(evaluate(fixture));
});

for (const key of [
  "runId",
  "sessionId",
  "tenantId",
  "environment",
  "decisionSlotId",
]) {
  test(`history from another ${key} is blocked even when its digest is valid`, () => {
    const fixture = makeFixture(contracts);
    fixture.snapshot.scope[key] = `different.${key.toLowerCase()}`;
    fixture.refreshBindings();
    assertBlocked(evaluate(fixture));
  });
}

test("history from another policy revision is blocked", () => {
  const fixture = makeFixture(contracts);
  fixture.snapshot.policyRevision = `sha256:${"d".repeat(64)}`;
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

test("history from another taxonomy revision is blocked", () => {
  const fixture = makeFixture(contracts);
  fixture.snapshot.actionTaxonomyVersion = "mode-a-test.old";
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

test("history beyond the declared bound fails closed rather than truncating", () => {
  const fixture = makeFixture(contracts);
  fixture.snapshot.events = Array.from(
    { length: fixture.policy.maxHistory + 1 },
    (_, index) => ({
      eventId: `event.${index}`,
      actionId: "probe.revise_rationale",
      status: "SIMULATED_ACCEPTED",
      provenance: "SIMULATION",
    }),
  );
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

test("duplicate history event IDs fail closed", () => {
  const fixture = makeFixture(contracts, {
    history: "prohibited",
    action: "probe.revise_rationale",
  });
  fixture.snapshot.events.push(structuredClone(fixture.snapshot.events[0]));
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

test("unknown history action fails closed", () => {
  const fixture = makeFixture(contracts, {
    history: "prohibited",
    action: "probe.revise_rationale",
  });
  fixture.snapshot.events[0].actionId = "probe.unknown";
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

for (const history of ["clean", "prohibited", "untrusted"]) {
  test(`honestly classified external operation remains denied with ${history} history`, () => {
    const fixture = makeFixture(contracts, {
      action: "probe.publish_external",
      history,
    });
    assert.equal(
      fixture.request.operations[0].classification,
      "EXTERNAL_EFFECT",
    );
    assert.equal(fixture.request.policyResult.ok, false);
    assert.ok(
      fixture.request.policyResult.issues.some(
        ({ code }) => code === "PREPARATION_SIDE_EFFECT_FORBIDDEN",
      ),
    );
    const result = evaluate(fixture);
    assertBlocked(result);
    assert.deepEqual(result.basePolicyResult, fixture.request.policyResult);
  });
}

test("UNKNOWN operation remains denied with clean history", () => {
  const fixture = makeFixture(contracts, { classification: "UNKNOWN" });
  assert.equal(fixture.request.policyResult.ok, false);
  assertBlocked(evaluate(fixture));
});

test("external action relabeled as PURE is rejected by the declared taxonomy", () => {
  const fixture = makeFixture(contracts, {
    action: "probe.publish_external",
    classification: "PURE",
  });
  assert.equal(
    fixture.request.policyResult.value.decision,
    "ALLOW_CANDIDATE_ONLY",
  );
  assertBlocked(evaluate(fixture));
});

test("secret material is denied by the actual base policy and stays denied", () => {
  const fixture = makeFixture(contracts);
  fixture.request.operations[0].containsSecretMaterial = true;
  fixture.refreshBindings();
  assert.equal(fixture.request.policyResult.ok, false);
  assertBlocked(evaluate(fixture));
});

test("unknown operation cannot borrow a known action classification", () => {
  const fixture = makeFixture(contracts);
  fixture.request.operations[0].operationId = "operation.unknown";
  fixture.request.proposal.requestedEffect.operationId = "operation.unknown";
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

test("mismatched tool identity fails closed", () => {
  const fixture = makeFixture(contracts);
  fixture.request.operations[0].toolId = "tool.other";
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

test("a multi-operation request is outside the bounded adapter contract", () => {
  const fixture = makeFixture(contracts);
  fixture.request.operations.push({
    operationId: "operation.revise.rationale",
    toolId: "tool.candidate",
    classification: "PURE",
    containsSecretMaterial: false,
  });
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

test("an empty operation list cannot create eligibility", () => {
  const fixture = makeFixture(contracts);
  fixture.request.operations = [];
  fixture.refreshBindings();
  assertBlocked(evaluate(fixture));
});

for (const malformed of [
  null,
  {},
  { ok: true, value: null, issues: [] },
  { ok: "true", value: {}, issues: [] },
]) {
  test(`malformed base result ${JSON.stringify(malformed)} blocks eligibility`, () => {
    const fixture = makeFixture(contracts);
    fixture.request.policyResult = malformed;
    const result = evaluate(fixture);
    assertBlocked(result);
    assert.equal(result.effectivePolicyResult, null);
  });
}

test("effectExecutionAllowed true cannot enter through a forged base decision", () => {
  const fixture = makeFixture(contracts);
  fixture.request.policyResult.value.effectExecutionAllowed = true;
  rehash(
    contracts,
    fixture.request.policyResult.value,
    "quirk.governed-run.execution-policy.v1",
  );
  assertBlocked(evaluate(fixture));
});

test("ok true with blocking issues never becomes candidate permission", () => {
  const fixture = makeFixture(contracts);
  fixture.request.policyResult.issues = [
    { code: "AUTHORITY_SCOPE_INCOMPLETE", path: "authority", refs: [] },
  ];
  assertBlocked(evaluate(fixture));
});

test("failed authority resolution remains failed rather than trusting a forged allow decision", () => {
  const fixture = makeFixture(contracts);
  fixture.request.authorityResult = {
    ok: false,
    value: null,
    issues: [
      {
        code: "AUTHORITY_SCOPE_UNION_FORBIDDEN",
        path: "verifiedAuthorityGrants",
        refs: ["grant.one", "grant.two"],
      },
    ],
  };
  const result = evaluate(fixture);
  assertBlocked(result);
  assert.deepEqual(result.authorityResult, fixture.request.authorityResult);
});

test("a schema-valid forged allow does not override human review", () => {
  const fixture = makeFixture(contracts, { authority: "HUMAN_REVIEW" });
  fixture.request.policyResult.value.decision = "ALLOW_CANDIDATE_ONLY";
  rehash(
    contracts,
    fixture.request.policyResult.value,
    "quirk.governed-run.execution-policy.v1",
  );
  assertBlocked(evaluate(fixture));
});

test("a schema-valid forged grant expansion does not broaden the base decision", () => {
  const fixture = makeFixture(contracts);
  fixture.request.policyResult.value.grantIds.push("grant.unearned");
  rehash(
    contracts,
    fixture.request.policyResult.value,
    "quirk.governed-run.execution-policy.v1",
  );
  assertBlocked(evaluate(fixture));
});

test("source content tampering without canonical digest refresh is rejected", () => {
  const fixture = makeFixture(contracts);
  fixture.request.proposal.objective = "Changed after binding.";
  assertBlocked(evaluate(fixture));
});

// Remaining #105 integrity expectations, adapted to canonical hashing and the
// separate current-operation/prior-history contract used by this harness.
for (const obligation of ["requiredHumanReview", "unresolvedConflictIds"]) {
  test(`inherited integrity: permitted authority with ${obligation} stays blocked`, () => {
    const fixture = makeFixture(contracts);
    assert.equal(evaluate(fixture).candidateEligible, true);
    fixture.request.authorityResult.value[obligation] = [
      obligation === "requiredHumanReview"
        ? "effect.candidate"
        : "instruction.primary",
    ];
    fixture.refreshBindings();
    contracts.ManyTierAuthorityResolutionSchema.parse(
      fixture.request.authorityResult.value,
    );
    assert.equal(
      fixture.request.policyResult.value.decision,
      "ALLOW_CANDIDATE_ONLY",
    );
    const result = evaluate(fixture);
    assertBlocked(result);
    assert.ok(result.reasonCodes.includes("AUTHORITY_RESULT_INCONSISTENT"));
    assert.deepEqual(result.authorityResult, fixture.request.authorityResult);
    assert.deepEqual(result.basePolicyResult, fixture.request.policyResult);
  });
}

for (const [authority, decision] of [
  ["PROHIBITED", "REQUIRE_HUMAN_REVIEW"],
  ["UNRESOLVED", "REQUIRE_HUMAN_REVIEW"],
  ["PROHIBITED", "ALLOW_CANDIDATE_ONLY"],
]) {
  test(`inherited integrity: forged ${decision} cannot replace ${authority}`, () => {
    const fixture = makeFixture(contracts, { authority });
    fixture.request.policyResult.value.decision = decision;
    rehash(
      contracts,
      fixture.request.policyResult.value,
      "quirk.governed-run.execution-policy.v1",
    );
    const result = evaluate(fixture);
    assertBlocked(result);
    assert.ok(result.reasonCodes.includes("SOURCE_BINDING_MISMATCH"));
    assert.deepEqual(result.authorityResult, fixture.request.authorityResult);
    assert.deepEqual(result.basePolicyResult, fixture.request.policyResult);
  });
}

test("inherited integrity: an existing policy denial survives clean history and permitted authority", () => {
  const fixture = makeFixture(contracts);
  assert.equal(evaluate(fixture).candidateEligible, true);
  fixture.request.policyResult.value.decision = "DENY";
  fixture.request.policyResult.value.permittedPreparatoryOperationIds = [];
  fixture.request.policyResult.value.deniedOperationIds = [
    fixture.request.operations[0].operationId,
  ];
  rehash(
    contracts,
    fixture.request.policyResult.value,
    "quirk.governed-run.execution-policy.v1",
  );
  const result = evaluate(fixture);
  assertBlocked(result);
  assert.deepEqual(result.effectivePolicyResult, fixture.request.policyResult);
});

for (const [name, options] of [
  ["eligible control", {}],
  ["composition denial", { history: "prohibited" }],
  ["human review", { authority: "HUMAN_REVIEW" }],
]) {
  test(`inherited integrity: receipt survives caller mutation after ${name}`, () => {
    const fixture = makeFixture(contracts, options);
    const result = evaluate(fixture);
    assertBounded(result);
    assert.equal(result.candidateEligible, name === "eligible control");
    const before = structuredClone(result);
    fixture.request.authorityResult.value.requiredHumanReview.push(
      "review.after-return",
    );
    fixture.request.authorityResult.value.activeAuthorityGrantIds.push(
      "grant.after-return",
    );
    fixture.request.policyResult.value.policyReasonCodes.push(
      "reason.after-return",
    );
    fixture.request.bindings.actionTaxonomyVersion = "after-return";
    fixture.request.scope.sessionId = "session.after-return";
    fixture.snapshot.events.push({ eventId: "event.after-return" });
    fixture.policy.forbiddenPairs.length = 0;
    assert.deepEqual(result, before);
  });
}

for (const changed of [
  "policy-and-taxonomy-revisions",
  "canonical-authority-identity",
]) {
  test(`inherited integrity: coherent ${changed} changes the receipt digest`, () => {
    const fixture = makeFixture(contracts);
    const before = evaluate(fixture);
    assert.equal(before.candidateEligible, true);
    if (changed === "canonical-authority-identity") {
      fixture.request.authorityResult.value.resolutionId = "resolution.next";
    } else {
      fixture.policy.policyRevision = contracts.digestCanonical(
        { fixture: "next-policy" },
        "quirk.composition.fixture-policy-state.v1",
      );
      fixture.policy.actionTaxonomyVersion = "next-taxonomy.v2";
      fixture.request.authorityResult.value.policyStateDigest =
        fixture.policy.policyRevision;
      for (const node of fixture.request.authorityResult.value.instructionNodes)
        node.sourceDigest = fixture.policy.policyRevision;
      fixture.snapshot.policyRevision = fixture.policy.policyRevision;
      fixture.snapshot.actionTaxonomyVersion =
        fixture.policy.actionTaxonomyVersion;
    }
    fixture.refreshBindings();
    const after = evaluate(fixture);
    assertBounded(after);
    assert.equal(after.candidateEligible, true);
    assert.notDeepEqual(after.bindings, before.bindings);
    assert.notEqual(after.contentDigest, before.contentDigest);
    assert.deepEqual(after.authorityResult, fixture.request.authorityResult);
  });
}

for (const changed of ["policy-body", "taxonomy-body"]) {
  test(`inherited integrity: unchanged-label ${changed} substitution requires a new binding`, () => {
    const fixture = makeFixture(contracts);
    const before = evaluate(fixture);
    assert.equal(before.candidateEligible, true);
    const labels = [
      fixture.policy.policyRevision,
      fixture.policy.actionTaxonomyVersion,
    ];
    if (changed === "policy-body") {
      fixture.policy.forbiddenPairs = [
        ["probe.select_candidate_a", "probe.revise_rationale"],
      ];
    } else {
      // Change an unused action so action mismatch cannot explain the denial.
      fixture.policy.actions.find(
        (action) => action.actionId === "probe.select_candidate_a",
      ).toolId = "tool.changed";
    }
    const stale = evaluate(fixture);
    assertBlocked(stale);
    assert.deepEqual(stale.reasonCodes, ["DECISION_BINDING_MISMATCH"]);
    fixture.refreshBindings();
    const rebound = evaluate(fixture);
    assertBounded(rebound);
    assert.equal(rebound.candidateEligible, true);
    assert.deepEqual(
      [fixture.policy.policyRevision, fixture.policy.actionTaxonomyVersion],
      labels,
    );
    assert.notEqual(rebound.contentDigest, before.contentDigest);
  });
}

for (const contradiction of [
  "empty-permission",
  "prohibited-effect",
  "different-target",
  "empty-grants",
]) {
  test(`incoherent permitted authority ${contradiction} cannot create eligibility`, () => {
    const fixture = makeFixture(contracts);
    const authority = fixture.request.authorityResult.value;
    if (contradiction === "empty-permission") authority.permittedEffects = [];
    if (contradiction === "prohibited-effect")
      authority.prohibitedEffects = [
        structuredClone(fixture.request.proposal.requestedEffect),
      ];
    if (contradiction === "different-target")
      authority.permittedEffects[0].targetLocator =
        "fixture://candidate/different-target";
    if (contradiction === "empty-grants")
      authority.activeAuthorityGrantIds = [];
    fixture.refreshBindings();
    assert.equal(
      fixture.request.policyResult.value.decision,
      "ALLOW_CANDIDATE_ONLY",
    );
    assertBlocked(evaluate(fixture));
  });
}

test("policy expiry before its evaluation time fails closed", () => {
  const fixture = makeFixture(contracts);
  fixture.request.policyResult.value.expiresAt = "2026-09-08T12:00:00.000Z";
  rehash(
    contracts,
    fixture.request.policyResult.value,
    "quirk.governed-run.execution-policy.v1",
  );
  assertBlocked(evaluate(fixture));
});

for (const key of ["policyReasonCodes", "deniedOperationIds"]) {
  test(`schema-valid forged ${key} at its limit remains blocked with review evidence preserved`, () => {
    const fixture = makeFixture(contracts, {
      authority: "HUMAN_REVIEW",
      history: "prohibited",
    });
    fixture.request.policyResult.value[key] = Array.from(
      { length: 64 },
      (_, index) => `fixture.entry.${index}`,
    );
    rehash(
      contracts,
      fixture.request.policyResult.value,
      "quirk.governed-run.execution-policy.v1",
    );
    contracts.ExecutionPolicyDecisionSchema.parse(
      fixture.request.policyResult.value,
    );
    const result = evaluate(fixture);
    assertBlocked(result);
    assert.deepEqual(result.authorityResult, fixture.request.authorityResult);
    assert.deepEqual(result.basePolicyResult, fixture.request.policyResult);
    assert.deepEqual(result.authorityResult.value.requiredHumanReview, [
      "effect.candidate",
    ]);
  });
}

test("evaluation is deterministic and does not mutate frozen inputs or history", () => {
  const fixture = makeFixture(contracts, { history: "prohibited" });
  const freeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(freeze);
    }
    return value;
  };
  freeze(fixture.policy);
  freeze(fixture.request);
  freeze(fixture.snapshot);
  const first = evaluate(fixture);
  const second = evaluate(fixture);
  assertBlocked(first);
  assert.deepEqual(first, second);
});
