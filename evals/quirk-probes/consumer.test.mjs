import assert from "node:assert/strict";
import test from "node:test";
import { assessProbe, digest, ProbeValidationError } from "./core.mjs";
import { inspectConsumer, validateConsumerProfile } from "./consumer.mjs";

function definition() {
  return {
    schemaVersion: "0.1.0",
    id: "probe.session-composition.paired-boundary",
    claim:
      "A candidate boundary rejects the challenge and preserves its control.",
    owner: "Quirk-Systems/project-scaffold",
    subject: { ref: "consumer-test-fixture", revision: "fixture-v1" },
    bindings: {
      policy: digest("policy"),
      fixtures: digest("fixtures"),
      implementation: digest("implementation"),
    },
    limitations: ["Synthetic fixture; no production or user-benefit proof."],
    cases: [
      { id: "control", pairId: "pair", role: "CONTROL", expected: "ALLOW" },
      { id: "challenge", pairId: "pair", role: "CHALLENGE", expected: "DENY" },
    ],
  };
}

function profile() {
  return {
    schemaVersion: "0.1.0",
    id: "consumer.fixture",
    owner: "Quirk-Systems/project-scaffold",
    requirements: [
      {
        probeId: "probe.session-composition.paired-boundary",
        // The fixture's source definition supplies the pin, never its receipt.
        definitionDigest: digest(definition()),
        label: "Paired candidate boundary",
        replayId: "session-composition",
      },
    ],
  };
}

function observations() {
  return [
    {
      caseId: "control",
      baseline: "ALLOW",
      target: "ALLOW",
      effectExecutionAllowed: false,
    },
    {
      caseId: "challenge",
      baseline: "ALLOW",
      target: "DENY",
      effectExecutionAllowed: false,
    },
  ];
}

function receipt() {
  return assessProbe(definition(), observations());
}

function invalid(fn) {
  assert.throws(
    fn,
    (error) =>
      error instanceof ProbeValidationError &&
      error.code === "ERR_PROBE_VALIDATION",
  );
}

function assertClosed(report) {
  assert.equal(report.status, "CANDIDATE");
  assert.equal(report.grantsPermissions, false);
  assert.equal(report.effectExecutionAllowed, false);
  assert.equal(report.independentHumanReviewSatisfied, false);
}

test("matching current simulations produce a deterministic candidate-only report", () => {
  const value = profile();
  const report = inspectConsumer(value, [receipt()], [receipt()]);
  assert.deepEqual(report, {
    schemaVersion: "0.1.0",
    consumerId: value.id,
    profileDigest: digest(value),
    status: "CANDIDATE",
    evidenceReady: true,
    grantsPermissions: false,
    effectExecutionAllowed: false,
    independentHumanReviewSatisfied: false,
    rows: [
      {
        probeId: value.requirements[0].probeId,
        label: value.requirements[0].label,
        expectedDefinitionDigest: value.requirements[0].definitionDigest,
        recordedStatus: "CURRENT",
        replayStatus: "CURRENT",
        agreement: "MATCH",
        ready: true,
        reasonCodes: [],
      },
    ],
  });
  assert.deepEqual(inspectConsumer(value, [receipt()], [receipt()]), report);
});

test("independent consumer pins make both old recorded and replayed evidence stale", () => {
  const next = profile();
  next.requirements[0].definitionDigest = digest("reviewed-next-definition");
  const report = inspectConsumer(next, [receipt()], [receipt()]);
  assert.equal(report.rows[0].recordedStatus, "STALE");
  assert.equal(report.rows[0].replayStatus, "STALE");
  assert.equal(report.rows[0].agreement, "NOT_COMPARED");
  assert.deepEqual(report.rows[0].reasonCodes, [
    "RECORDED_STALE",
    "REPLAY_STALE",
  ]);
  assert.equal(report.evidenceReady, false);
  assertClosed(report);
});

test("old recorded evidence cannot set the pin for a fresh current replay", () => {
  const nextDefinition = definition();
  nextDefinition.subject.revision = "fixture-v2";
  const next = profile();
  next.requirements[0].definitionDigest = digest(nextDefinition);
  const report = inspectConsumer(
    next,
    [receipt()],
    [assessProbe(nextDefinition, observations())],
  );
  assert.deepEqual(report.rows[0].reasonCodes, ["RECORDED_STALE"]);
  assert.equal(report.rows[0].replayStatus, "CURRENT");
  assert.equal(report.evidenceReady, false);
});

test("a self-consistent fabricated success cannot overrule a failed trusted replay", () => {
  const fabricated = receipt();
  const actual = observations();
  actual[1].target = "ALLOW";
  const report = inspectConsumer(
    profile(),
    [fabricated],
    [assessProbe(definition(), actual)],
  );
  assert.equal(report.rows[0].recordedStatus, "CURRENT");
  assert.equal(report.rows[0].replayStatus, "NOT_SUPPORTED");
  assert.equal(report.rows[0].agreement, "NOT_COMPARED");
  assert.deepEqual(report.rows[0].reasonCodes, ["REPLAY_NOT_SUPPORTED"]);
  assert.equal(report.evidenceReady, false);
  assertClosed(report);
});

test("unsupported and inconclusive evidence remain distinct on each side", () => {
  for (const expected of ["NOT_SUPPORTED", "INCONCLUSIVE"]) {
    const inputs = observations();
    if (expected === "NOT_SUPPORTED") inputs[0].target = "DENY";
    else inputs[1].baseline = "DENY";
    const result = assessProbe(definition(), inputs);
    for (const side of ["RECORDED", "REPLAY"]) {
      const report = inspectConsumer(
        profile(),
        [side === "RECORDED" ? result : receipt()],
        [side === "REPLAY" ? result : receipt()],
      );
      assert.deepEqual(report.rows[0].reasonCodes, [`${side}_${expected}`]);
      assert.equal(report.rows[0].agreement, "NOT_COMPARED");
      assert.equal(report.evidenceReady, false);
      assertClosed(report);
    }
  }
});

test("missing, duplicate, malformed, and unrelated evidence fail closed independently", () => {
  const unrelatedDefinition = definition();
  unrelatedDefinition.id = "unrequested-probe";
  const cases = [
    { results: [], status: "MISSING" },
    { results: [receipt(), receipt()], status: "INVALID" },
    { results: [null], status: "INVALID" },
    { results: [{ probeId: definition().id }], status: "INVALID" },
    {
      results: [assessProbe(unrelatedDefinition, observations())],
      status: "MISSING",
    },
  ];
  for (const { results, status } of cases) {
    for (const side of ["RECORDED", "REPLAY"]) {
      const report = inspectConsumer(
        profile(),
        side === "RECORDED" ? results : [receipt()],
        side === "REPLAY" ? results : [receipt()],
      );
      assert.deepEqual(report.rows[0].reasonCodes, [`${side}_${status}`]);
      assert.equal(report.evidenceReady, false);
      assertClosed(report);
    }
  }
});

test("promoted evidence stays invalid even when its outer digest is recomputed", () => {
  for (const key of [
    "grantsPermissions",
    "effectExecutionAllowed",
    "independentHumanReviewSatisfied",
    "productionValidation",
  ]) {
    const promoted = receipt();
    promoted[key] = true;
    const { resultDigest: ignored, ...body } = promoted;
    promoted.resultDigest = digest(body);
    for (const side of ["RECORDED", "REPLAY"]) {
      const report = inspectConsumer(
        profile(),
        [side === "RECORDED" ? promoted : receipt()],
        [side === "REPLAY" ? promoted : receipt()],
      );
      assert.deepEqual(report.rows[0].reasonCodes, [`${side}_INVALID`]);
      assert.equal(report.evidenceReady, false);
      assertClosed(report);
    }
  }
});

test("profile and report snapshots are independent of input and output mutations", () => {
  const original = profile();
  const expectedProfile = profile();
  const validated = validateConsumerProfile(original);
  const recorded = [receipt()];
  const replayed = [receipt()];
  const expectedReport = inspectConsumer(profile(), [receipt()], [receipt()]);
  const report = inspectConsumer(original, recorded, replayed);
  original.requirements[0].label = "changed input";
  recorded[0].outcome = "NOT_SUPPORTED";
  replayed[0].observations[0].target = "DENY";
  assert.deepEqual(validated, expectedProfile);
  assert.deepEqual(report, expectedReport);
  validated.requirements[0].label = "changed validation result";
  report.rows[0].reasonCodes.push("caller mutation");
  report.rows[0].label = "changed output";
  assert.deepEqual(validateConsumerProfile(profile()), expectedProfile);
  assert.deepEqual(
    inspectConsumer(profile(), [receipt()], [receipt()]),
    expectedReport,
  );
});

test("profile fields are exact, bounded, and restricted to the reviewed replay association", () => {
  const changes = [
    (value) => {
      value.schemaVersion = "1.0.0";
    },
    (value) => {
      value.id = "";
    },
    (value) => {
      value.id = "x".repeat(129);
    },
    (value) => {
      value.owner = " ";
    },
    (value) => {
      value.owner = "x".repeat(257);
    },
    (value) => {
      delete value.owner;
    },
    (value) => {
      value.approved = true;
    },
    (value) => {
      value.requirements = [];
    },
    (value) => {
      value.requirements = [...value.requirements, ...value.requirements];
    },
    (value) => {
      value.requirements = null;
    },
    (value) => {
      value.requirements[0] = null;
    },
    (value) => {
      value.requirements[0].label = " ";
    },
    (value) => {
      value.requirements[0].label = "x".repeat(257);
    },
    (value) => {
      value.requirements[0].command = "node arbitrary.mjs";
    },
    (value) => {
      value.requirements[0].replayId = "../arbitrary.mjs";
    },
    (value) => {
      value.requirements[0].probeId = "different-probe";
    },
    (value) => {
      value.requirements[0].definitionDigest = "latest";
    },
    (value) => {
      value.requirements[0].definitionDigest = "a".repeat(63);
    },
    (value) => {
      value.requirements[0].definitionDigest = "A".repeat(64);
    },
  ];
  for (const mutate of changes) {
    const value = profile();
    mutate(value);
    invalid(() => validateConsumerProfile(value));
    invalid(() => inspectConsumer(value, [], []));
  }
  for (const value of [null, [], "profile"])
    invalid(() => validateConsumerProfile(value));
});

test("bounded labels and identifiers reject terminal controls and hidden formatting", () => {
  for (const control of [
    "\0",
    "\n",
    "\t",
    "\x1b",
    "\x7f",
    "\u0085",
    "\u202e",
    "\u2066",
    "\u2028",
    "\u2029",
  ]) {
    for (const field of ["id", "owner", "label", "probeId", "replayId"]) {
      const value = profile();
      if (["id", "owner"].includes(field)) value[field] += control;
      else value.requirements[0][field] += control;
      invalid(() => validateConsumerProfile(value));
    }
  }
});

test("profile and result JSON validation never invokes getters, proxies, or toJSON", () => {
  let calls = 0;
  const getter = Object.defineProperty(profile(), "id", {
    enumerable: true,
    get() {
      calls++;
      return "consumer";
    },
  });
  const proxy = new Proxy(profile(), {
    ownKeys() {
      calls++;
      return [];
    },
  });
  const toJSON = {
    ...profile(),
    toJSON() {
      calls++;
      return profile();
    },
  };
  for (const value of [getter, proxy, toJSON])
    invalid(() => validateConsumerProfile(value));
  for (const value of [
    undefined,
    null,
    {},
    new Array(1),
    [undefined],
    [proxy],
  ]) {
    invalid(() => inspectConsumer(profile(), value, [receipt()]));
    invalid(() => inspectConsumer(profile(), [receipt()], value));
  }
  assert.equal(calls, 0);
});
