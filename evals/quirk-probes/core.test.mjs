import test from "node:test";
import assert from "node:assert/strict";
import {
  assessProbe,
  digest,
  inspectLinkedEvidence,
  ProbeValidationError,
} from "./core.mjs";

function definition() {
  return {
    schemaVersion: "0.1.0",
    id: "candidate-deny-only",
    claim:
      "A composition restriction denies the challenge and preserves its control.",
    owner: "Quirk-Systems/project-scaffold",
    subject: {
      ref: "evals/session-composition/gate.mjs",
      revision: "fixture-only",
    },
    bindings: {
      policy: digest("policy"),
      fixtures: digest("fixtures"),
      implementation: digest("implementation"),
    },
    limitations: ["Synthetic observations do not prove production behavior."],
    cases: [
      {
        id: "allowed-control",
        pairId: "pair-1",
        role: "CONTROL",
        expected: "ALLOW",
      },
      {
        id: "denied-challenge",
        pairId: "pair-1",
        role: "CHALLENGE",
        expected: "DENY",
      },
    ],
  };
}

function observations() {
  return [
    {
      caseId: "allowed-control",
      baseline: "ALLOW",
      target: "ALLOW",
      effectExecutionAllowed: false,
    },
    {
      caseId: "denied-challenge",
      baseline: "ALLOW",
      target: "DENY",
      effectExecutionAllowed: false,
    },
  ];
}

function requirement(value = definition()) {
  return { probeId: value.id, definitionDigest: digest(value) };
}

test("hashes use canonical lowercase wire form", () => {
  const valid = definition();
  const receipt = assessProbe(valid, observations());
  const current = requirement(valid);
  assert.equal(inspectLinkedEvidence([current], [receipt]).allCurrent, true);
  assert.throws(
    () =>
      inspectLinkedEvidence(
        [
          {
            ...current,
            definitionDigest: current.definitionDigest.toUpperCase(),
          },
        ],
        [receipt],
      ),
    ProbeValidationError,
  );
  for (const field of ["policy", "fixtures", "implementation"]) {
    const noncanonical = structuredClone(valid);
    noncanonical.bindings[field] = noncanonical.bindings[field].toUpperCase();
    assert.throws(
      () => assessProbe(noncanonical, observations()),
      ProbeValidationError,
    );
  }
});

function invalid(fn) {
  assert.throws(
    fn,
    (error) =>
      error instanceof ProbeValidationError &&
      error.code === "ERR_PROBE_VALIDATION",
  );
}

test("canonical digests sort object keys recursively and preserve array order", () => {
  assert.equal(
    digest({ b: { z: 1, a: 2 }, a: [1, 2] }),
    digest({ a: [1, 2], b: { a: 2, z: 1 } }),
  );
  assert.notEqual(digest([1, 2]), digest([2, 1]));
  assert.equal(
    digest(Object.assign(Object.create(null), { a: 1 })),
    digest({ a: 1 }),
  );
  assert.equal(
    digest({ a: 1 }),
    "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862",
  );
});

test("strict JSON rejects non-JSON values, prototypes, sparse arrays, and hidden fields", () => {
  const sparse = new Array(1);
  const extraArrayProperty = Object.assign([1], { extra: 2 });
  const symbolKey = { [Symbol("x")]: 1 };
  const hidden = Object.defineProperty({}, "hidden", { value: 1 });
  const cycle = {};
  cycle.self = cycle;
  for (const value of [
    undefined,
    NaN,
    Infinity,
    -Infinity,
    1n,
    Symbol("x"),
    () => {},
    { missing: undefined },
    [undefined],
    sparse,
    extraArrayProperty,
    symbolKey,
    hidden,
    cycle,
    new Date(),
    new Map(),
    Object.create({ custom: true }),
    new (class Example {})(),
  ])
    invalid(() => digest(value));
});

test("JSON validation does not invoke getters, proxy traps, or toJSON", () => {
  let calls = 0;
  const getter = Object.defineProperty({}, "x", {
    enumerable: true,
    get() {
      calls++;
      return 1;
    },
  });
  const proxy = new Proxy(
    {},
    {
      ownKeys() {
        calls++;
        return [];
      },
    },
  );
  const toJSON = {
    toJSON() {
      calls++;
      return "converted";
    },
  };
  for (const value of [getter, proxy, toJSON]) invalid(() => digest(value));
  assert.equal(calls, 0);
});

test("canonical JSON enforces depth, node, and byte budgets", () => {
  let nested = null;
  for (let i = 0; i < 34; i++) nested = [nested];
  invalid(() => digest(nested));
  invalid(() => digest(new Array(20_001).fill(null)));
  invalid(() => digest("x".repeat(1_048_577)));
});

test("matched challenge/control support produces deterministic unsigned simulation evidence", () => {
  const result = assessProbe(definition(), observations());
  assert.equal(result.outcome, "SUPPORTED");
  assert.equal(result.status, "CANDIDATE");
  assert.equal(result.evidenceKind, "SIMULATION");
  for (const key of [
    "grantsPermissions",
    "effectExecutionAllowed",
    "independentHumanReviewSatisfied",
    "productionValidation",
  ]) {
    assert.equal(result[key], false);
  }
  const { resultDigest, ...body } = result;
  assert.equal(resultDigest, digest(body));
  assert.equal(result.definitionDigest, digest(definition()));
  assert.deepEqual(result, assessProbe(definition(), observations().reverse()));
});

test("all-deny target fails the control and all-allow target fails the challenge", () => {
  for (const target of ["ALLOW", "DENY"]) {
    assert.equal(
      assessProbe(
        definition(),
        observations().map((item) => ({ ...item, target })),
      ).outcome,
      "NOT_SUPPORTED",
    );
  }
});

test("any baseline denial is inconclusive unless a target mismatches", () => {
  for (const index of [0, 1]) {
    const input = observations();
    input[index].baseline = "DENY";
    assert.equal(assessProbe(definition(), input).outcome, "INCONCLUSIVE");
    input[0].target = "DENY";
    assert.equal(assessProbe(definition(), input).outcome, "NOT_SUPPORTED");
  }
});

test("observations must exactly cover unique known cases with effects disabled", () => {
  const originals = observations();
  for (const input of [
    [],
    originals.slice(0, 1),
    [...originals, originals[0]],
    [originals[0], originals[0]],
    [originals[0], { ...originals[1], caseId: "unknown" }],
    [originals[0], { ...originals[1], baseline: "REVIEW" }],
    [originals[0], { ...originals[1], target: "REVIEW" }],
    [originals[0], { ...originals[1], effectExecutionAllowed: true }],
    [originals[0], { ...originals[1], externalApproval: true }],
  ]) {
    invalid(() => assessProbe(definition(), input));
  }
});

test("definition requires complete uniquely identified matched pairs", () => {
  const alterations = [
    (value) => {
      value.cases = [];
    },
    (value) => {
      value.cases.pop();
    },
    (value) => {
      value.cases[1].pairId = "unmatched";
    },
    (value) => {
      value.cases[1].id = value.cases[0].id;
    },
    (value) => {
      value.cases[1].role = "CONTROL";
      value.cases[1].expected = "ALLOW";
    },
    (value) => {
      value.cases[0].expected = "DENY";
    },
    (value) => {
      value.cases[1].role = "EXAMPLE";
    },
    (value) => {
      value.cases[0].arbitrary = true;
    },
  ];
  for (const mutate of alterations) {
    const value = definition();
    mutate(value);
    invalid(() => assessProbe(value, observations()));
  }
});

test("definition binds metadata and refuses missing, blank, promoted, or malformed fields", () => {
  const alterations = [
    (value) => {
      value.schemaVersion = "1.0.0";
    },
    (value) => {
      value.claim = " ";
    },
    (value) => {
      delete value.owner;
    },
    (value) => {
      value.id = "";
    },
    (value) => {
      value.subject.revision = "";
    },
    (value) => {
      value.subject.extra = "unexpected";
    },
    (value) => {
      value.bindings.policy = "unbound";
    },
    (value) => {
      value.bindings.fixtures = null;
    },
    (value) => {
      value.limitations = [];
    },
    (value) => {
      value.limitations = [""];
    },
    (value) => {
      value.status = "APPROVED";
    },
  ];
  for (const mutate of alterations) {
    const value = definition();
    mutate(value);
    invalid(() => assessProbe(value, observations()));
  }
});

test("accepts 64 matched pairs and rejects 65", () => {
  const value = definition();
  value.cases = [];
  const inputs = [];
  for (let i = 0; i < 65; i++) {
    value.cases.push(
      {
        id: `control-${i}`,
        pairId: `pair-${i}`,
        role: "CONTROL",
        expected: "ALLOW",
      },
      {
        id: `challenge-${i}`,
        pairId: `pair-${i}`,
        role: "CHALLENGE",
        expected: "DENY",
      },
    );
    inputs.push(
      {
        caseId: `control-${i}`,
        baseline: "ALLOW",
        target: "ALLOW",
        effectExecutionAllowed: false,
      },
      {
        caseId: `challenge-${i}`,
        baseline: "ALLOW",
        target: "DENY",
        effectExecutionAllowed: false,
      },
    );
  }
  invalid(() => assessProbe(value, inputs));
  value.cases.splice(-2);
  inputs.splice(-2);
  assert.equal(assessProbe(value, inputs).outcome, "SUPPORTED");
});

test("result snapshots remain independent of input and other assessments", () => {
  const value = definition();
  const inputs = observations();
  const result = assessProbe(value, inputs);
  const copy = structuredClone(result);
  value.bindings.policy = digest("changed");
  value.cases[0].id = "changed";
  inputs[0].target = "DENY";
  assert.deepEqual(result, copy);
  result.definition.limitations[0] = "caller mutation";
  result.observations[0].target = "DENY";
  assert.deepEqual(assessProbe(definition(), observations()), copy);
});

test("valid exact current evidence never grants permission or effects", () => {
  const requirementInput = [requirement()];
  const result = inspectLinkedEvidence(requirementInput, [
    assessProbe(definition(), observations()),
  ]);
  assert.deepEqual(result, {
    rows: [{ ...requirement(), status: "CURRENT" }],
    allCurrent: true,
    grantsPermissions: false,
    effectExecutionAllowed: false,
  });
  requirementInput[0].probeId = "changed";
  assert.equal(result.rows[0].probeId, definition().id);
});

test("missing and duplicate receipts cannot satisfy a requirement", () => {
  const result = assessProbe(definition(), observations());
  assert.equal(
    inspectLinkedEvidence([requirement()], []).rows[0].status,
    "MISSING",
  );
  const duplicate = inspectLinkedEvidence(
    [requirement()],
    [result, structuredClone(result)],
  );
  assert.equal(duplicate.rows[0].status, "INVALID");
  assert.equal(duplicate.allCurrent, false);
});

test("each relevant binding and subject revision makes old valid evidence stale", () => {
  const result = assessProbe(definition(), observations());
  const mutations = [
    (value) => {
      value.bindings.policy = digest("new policy");
    },
    (value) => {
      value.bindings.fixtures = digest("new fixtures");
    },
    (value) => {
      value.bindings.implementation = digest("new implementation");
    },
    (value) => {
      value.subject.revision = "new revision";
    },
  ];
  for (const mutate of mutations) {
    const current = definition();
    mutate(current);
    const linked = inspectLinkedEvidence([requirement(current)], [result]);
    assert.equal(linked.rows[0].status, "STALE");
    assert.equal(linked.allCurrent, false);
  }
});

test("linked evidence propagates supported, unsupported, and inconclusive outcomes", () => {
  for (const [change, expected] of [
    [
      (inputs) => {
        inputs[0].target = "DENY";
      },
      "NOT_SUPPORTED",
    ],
    [
      (inputs) => {
        inputs[1].baseline = "DENY";
      },
      "INCONCLUSIVE",
    ],
  ]) {
    const inputs = observations();
    change(inputs);
    const linked = inspectLinkedEvidence(
      [requirement()],
      [assessProbe(definition(), inputs)],
    );
    assert.equal(linked.rows[0].status, expected);
    assert.equal(linked.allCurrent, false);
  }
});

test("tampering and self-promotion are invalid even with a recomputed outer digest", () => {
  const mutations = [
    (result) => {
      result.status = "APPROVED";
    },
    (result) => {
      result.evidenceKind = "EXECUTED";
    },
    (result) => {
      result.grantsPermissions = true;
    },
    (result) => {
      result.effectExecutionAllowed = true;
    },
    (result) => {
      result.independentHumanReviewSatisfied = true;
    },
    (result) => {
      result.productionValidation = true;
    },
    (result) => {
      result.definitionDigest = digest("wrong");
    },
    (result) => {
      result.definition.claim = "different claim";
    },
    (result) => {
      result.observations[0].target = "DENY";
    },
    (result) => {
      result.outcome = "NOT_SUPPORTED";
    },
    (result) => {
      result.unsigned = false;
    },
  ];
  for (const mutate of mutations) {
    for (const rehash of [false, true]) {
      const result = assessProbe(definition(), observations());
      mutate(result);
      if (rehash) {
        const { resultDigest, ...body } = result;
        result.resultDigest = digest(body);
      }
      assert.equal(
        inspectLinkedEvidence([requirement()], [result]).rows[0].status,
        "INVALID",
      );
    }
  }
});

test("digest and malformed receipt failures are INVALID before any stale classification", () => {
  const current = definition();
  current.bindings.policy = digest("new policy");
  const result = assessProbe(definition(), observations());
  result.resultDigest = digest("forged");
  assert.equal(
    inspectLinkedEvidence([requirement(current)], [result]).rows[0].status,
    "INVALID",
  );
  assert.equal(
    inspectLinkedEvidence([requirement()], [{ probeId: definition().id }])
      .rows[0].status,
    "INVALID",
  );
  assert.equal(
    inspectLinkedEvidence([requirement()], [null]).rows[0].status,
    "INVALID",
  );
});

test("requirements must be explicit, nonempty, bound, and unambiguous", () => {
  for (const requirements of [
    [],
    [requirement(), requirement()],
    [{ probeId: definition().id }],
    [{ ...requirement(), definitionDigest: "latest" }],
    [{ ...requirement(), approved: true }],
  ]) {
    invalid(() => inspectLinkedEvidence(requirements, []));
  }
  invalid(() =>
    inspectLinkedEvidence([requirement()], { receipt: "not an array" }),
  );
});

test("distinct requirements resolve independently and unrelated valid results do not substitute", () => {
  const first = definition();
  const second = definition();
  second.id = "other-probe";
  const third = definition();
  third.id = "unrequested-probe";
  const linked = inspectLinkedEvidence(
    [requirement(first), requirement(second)],
    [assessProbe(first, observations()), assessProbe(third, observations())],
  );
  assert.deepEqual(
    linked.rows.map((row) => row.status),
    ["CURRENT", "MISSING"],
  );
  assert.equal(linked.allCurrent, false);
});

test("integrity cannot authenticate a fully fabricated but self-consistent simulation", () => {
  // This limitation is deliberate: the root adapter must replay before relying
  // on observations. Rehashing a consistent story is not proof of execution.
  const fabricated = assessProbe(definition(), observations());
  assert.equal(
    inspectLinkedEvidence([requirement()], [fabricated]).allCurrent,
    true,
  );
  assert.equal(fabricated.evidenceKind, "SIMULATION");
  assert.equal(fabricated.productionValidation, false);
});
