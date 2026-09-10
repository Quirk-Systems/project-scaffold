/** Receipt-integrity regressions; these tests never invoke the proof runner. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertEvidenceMatches,
  verifyRecordedEvidence,
} from "./verification-receipt.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const logs = {
  "verification-tests.tap": "TAP version 13\nok 1 - candidate only\n",
  "history-ablation.tap": "TAP version 13\nnot ok 1 - erased history\n",
  "verification-receipt-tests.tap":
    "TAP version 13\nok 1 - receipt integrity\n",
  "consolidation-first-run.tap":
    "TAP version 13\nnot ok 1 - historical invalid fixture\n",
};

// A self-contained receipt fixture: never use the committed receipt as its own
// expected truth, and never derive the allowed metadata from the comparator.
function fixture() {
  return {
    kind: "CompositionAdapterVerification",
    version: 1,
    status: "CANDIDATE",
    disposition: "Constrain",
    scope: "PLAN_CONTRACT_ADAPTER_ONLY",
    authorityEffect: "NONE",
    effectExecutionAllowed: false,
    provenance: {
      status: "CANDIDATE_TEST_ONLY",
      planPath: "docs/plan.md",
      planHead: "1".repeat(40),
      probeHead: "2".repeat(40),
      protectedPlanCodeBlocks: 60,
      protectedPlanCodeSha256: digest("plan blocks"),
      sources: [
        {
          path: "source.ts",
          origin: "plan-code-block",
          sha256: digest("source"),
        },
      ],
      generatedModules: [{ source: "source.ts", module: "source.mjs" }],
      dependencyVersions: {
        node: "24.19.0",
        typescript: "6.0.3",
        zod: "3.25.76",
      },
      plannedTask5Loaded: true,
      productionTask4Executed: false,
      productionIntegrationProved: false,
      semanticTypecheckPerformed: false,
      runtimeSafetyProved: false,
      independentHumanReviewSatisfied: false,
      executedPlannedTask5: true,
    },
    expectationLineage: {
      sourcePr: 105,
      adoption: "EXPECTATIONS_ONLY",
      sourceAdapterExecuted: false,
    },
    checks: { adapter: { exitCode: 0, tests: 1, passed: 1, failed: 0 } },
    matrix: [
      {
        authority: "PERMITTED_CANDIDATE_ONLY",
        history: "clean",
        candidateEligible: true,
      },
    ],
    examples: [{ name: "conflict", candidateEligible: false }],
    blindReviewExamples: [{ name: "contamination", candidateEligible: false }],
    files: { "source.mjs": digest("source") },
    rawLogs: Object.fromEntries(
      Object.entries(logs).map(([name, bytes]) => [name, digest(bytes)]),
    ),
    unproved: [
      "production Task 4/5 module integration",
      "independent human review",
    ],
    testOrder:
      "Original suite first ran green; later ablation is mutation evidence.",
  };
}

async function withLogs(t) {
  const directory = await mkdtemp(join(tmpdir(), "composition-receipt-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const [name, bytes] of Object.entries(logs))
    await writeFile(join(directory, name), bytes);
  return directory;
}

test("receipt integrity: unchanged receipt and committed logs pass", async (t) => {
  const evidence = fixture();
  const recorded = structuredClone(evidence);
  await verifyRecordedEvidence(await withLogs(t), recorded, evidence);
  assert.deepEqual(recorded, evidence);
});

test("receipt integrity: historical dependency versions remain distinct from replay", async (t) => {
  const evidence = fixture();
  const recorded = structuredClone(evidence);
  recorded.provenance.dependencyVersions = {
    node: "22.12.0",
    typescript: "5.8.3",
    zod: "3.25.75",
  };
  const before = structuredClone(recorded);
  await verifyRecordedEvidence(await withLogs(t), recorded, evidence);
  assert.deepEqual(
    recorded,
    before,
    "Validation must not rewrite historical provenance",
  );
  assert.equal(evidence.provenance.dependencyVersions.node, "24.19.0");
});

test("receipt integrity: well-shaped prerelease/build versions remain observations", () => {
  const evidence = fixture();
  const recorded = structuredClone(evidence);
  recorded.provenance.dependencyVersions.typescript =
    "6.0.0-dev.20260910+build.1";
  assertEvidenceMatches(recorded, evidence);
});

for (const [key, value] of [
  ["kind", "RuntimeSafetyVerification"],
  ["version", 2],
  ["status", "APPROVED"],
  ["disposition", "Ship"],
  ["scope", "PRODUCTION"],
  ["authorityEffect", "GRANT"],
  ["effectExecutionAllowed", true],
  ["unproved", []],
  ["testOrder", "Preimplementation TDD proved"],
]) {
  test(`receipt integrity: rejects changed ${key}`, () => {
    const evidence = fixture();
    const recorded = structuredClone(evidence);
    recorded[key] = value;
    assert.throws(() => assertEvidenceMatches(recorded, evidence));
  });
}

for (const key of Object.keys(fixture())) {
  test(`receipt integrity: rejects omitted ${key}`, () => {
    const evidence = fixture();
    const recorded = structuredClone(evidence);
    delete recorded[key];
    assert.throws(() => assertEvidenceMatches(recorded, evidence));
  });
}

for (const [key, value] of Object.entries(fixture().provenance)) {
  if (key === "dependencyVersions") continue;
  test(`receipt integrity: rejects changed or omitted provenance.${key}`, () => {
    const evidence = fixture();
    const changed = structuredClone(evidence);
    changed.provenance[key] =
      typeof value === "boolean" ? !value : "unreviewed replacement";
    assert.throws(
      () => assertEvidenceMatches(changed, evidence),
      "Changed provenance accepted",
    );
    const omitted = structuredClone(evidence);
    delete omitted.provenance[key];
    assert.throws(
      () => assertEvidenceMatches(omitted, evidence),
      "Omitted provenance accepted",
    );
  });
}

for (const [name, change] of [
  [
    "top-level claim",
    (r) => {
      r.runtimeSafetyProved = true;
    },
  ],
  [
    "provenance claim",
    (r) => {
      r.provenance.reviewApproved = true;
    },
  ],
  [
    "source metadata",
    (r) => {
      r.provenance.sources[0].reviewApproved = true;
    },
  ],
  [
    "generated module metadata",
    (r) => {
      r.provenance.generatedModules[0].productionExecuted = true;
    },
  ],
  [
    "expectation lineage",
    (r) => {
      r.expectationLineage.sourceAdapterExecuted = true;
    },
  ],
  [
    "check count",
    (r) => {
      r.checks.adapter.passed += 1;
    },
  ],
  [
    "matrix outcome",
    (r) => {
      r.matrix[0].candidateEligible = false;
    },
  ],
  [
    "example outcome",
    (r) => {
      r.examples[0].candidateEligible = true;
    },
  ],
  [
    "blind-review outcome",
    (r) => {
      r.blindReviewExamples[0].candidateEligible = true;
    },
  ],
  [
    "source file hash",
    (r) => {
      r.files["source.mjs"] = digest("replacement");
    },
  ],
  [
    "source file omission",
    (r) => {
      delete r.files["source.mjs"];
    },
  ],
  [
    "source file addition",
    (r) => {
      r.files["unapproved.mjs"] = digest("new");
    },
  ],
]) {
  test(`receipt integrity: rejects unapproved ${name}`, () => {
    const evidence = fixture();
    const recorded = structuredClone(evidence);
    change(recorded);
    assert.throws(() => assertEvidenceMatches(recorded, evidence));
  });
}

for (const [name, versions] of [
  ["null map", null],
  ["array map", []],
  ["missing map keys", {}],
  ["omitted node", { typescript: "6.0.3", zod: "3.25.76" }],
  [
    "extra claim",
    { ...fixture().provenance.dependencyVersions, reviewApproved: true },
  ],
  ...[
    null,
    24,
    {},
    "",
    "24",
    "v24.19.0",
    "01.2.3",
    "1.2.3-01",
    "1.2.3-x..y",
    "24.19.0\n",
  ].map((value) => [
    `invalid node ${JSON.stringify(value)}`,
    { ...fixture().provenance.dependencyVersions, node: value },
  ]),
]) {
  test(`receipt integrity: rejects ${name}`, () => {
    const evidence = fixture();
    const recorded = structuredClone(evidence);
    recorded.provenance.dependencyVersions = versions;
    assert.throws(() => assertEvidenceMatches(recorded, evidence));
  });
}

test("receipt integrity: rejects malformed versions for every dependency and missing observation", () => {
  const evidence = fixture();
  for (const key of ["node", "typescript", "zod"]) {
    const recorded = structuredClone(evidence);
    recorded.provenance.dependencyVersions[key] = "unknown";
    assert.throws(() => assertEvidenceMatches(recorded, evidence));
    delete recorded.provenance.dependencyVersions[key];
    assert.throws(() => assertEvidenceMatches(recorded, evidence));
  }
  const recorded = structuredClone(evidence);
  delete recorded.provenance.dependencyVersions;
  assert.throws(() => assertEvidenceMatches(recorded, evidence));
});

for (const [name, rawLogs] of [
  ["null log map", null],
  ["array log map", []],
  ["empty log map", {}],
  [
    "omitted ablation log",
    { "verification-tests.tap": fixture().rawLogs["verification-tests.tap"] },
  ],
  [
    "omitted receipt-integrity log",
    Object.fromEntries(
      Object.entries(fixture().rawLogs).filter(
        ([name]) => name !== "verification-receipt-tests.tap",
      ),
    ),
  ],
  ["extra log", { ...fixture().rawLogs, "extra.tap": digest("extra") }],
  [
    "traversal log",
    { ...fixture().rawLogs, "../outside.tap": digest("outside") },
  ],
  [
    "malformed digest",
    { ...fixture().rawLogs, "verification-tests.tap": "not-a-digest" },
  ],
  [
    "uppercase digest",
    { ...fixture().rawLogs, "verification-tests.tap": "A".repeat(64) },
  ],
  [
    "digest with trailing newline",
    { ...fixture().rawLogs, "verification-tests.tap": "a".repeat(63) + "\n" },
  ],
  ["nonstring digest", { ...fixture().rawLogs, "verification-tests.tap": 0 }],
]) {
  test(`receipt integrity: rejects ${name}`, () => {
    const evidence = fixture();
    const recorded = structuredClone(evidence);
    recorded.rawLogs = rawLogs;
    assert.throws(() => assertEvidenceMatches(recorded, evidence));
  });
}

test("receipt integrity: omitting the log map cannot skip committed log checks", async (t) => {
  const evidence = fixture();
  const recorded = structuredClone(evidence);
  recorded.rawLogs = {};
  await assert.rejects(
    verifyRecordedEvidence(await withLogs(t), recorded, evidence),
  );
});

test("receipt integrity: historical log bytes may differ from replay if committed digests match", async (t) => {
  const evidence = fixture();
  const recorded = structuredClone(evidence);
  evidence.rawLogs = {
    "verification-tests.tap": digest("replay timing differs"),
    "history-ablation.tap": digest("replay temporary path differs"),
    "verification-receipt-tests.tap": digest(
      "replay receipt-test timing differs",
    ),
    "consolidation-first-run.tap": digest(logs["consolidation-first-run.tap"]),
  };
  const before = structuredClone(recorded);
  await verifyRecordedEvidence(await withLogs(t), recorded, evidence);
  assert.deepEqual(
    recorded,
    before,
    "Validation must preserve recorded log hashes",
  );
});

for (const name of Object.keys(logs)) {
  test(`receipt integrity: rejects missing committed ${name}`, async (t) => {
    const evidence = fixture();
    const directory = await withLogs(t);
    await rm(join(directory, name));
    await assert.rejects(
      verifyRecordedEvidence(directory, structuredClone(evidence), evidence),
    );
  });
  test(`receipt integrity: rejects changed committed ${name}`, async (t) => {
    const evidence = fixture();
    const directory = await withLogs(t);
    await writeFile(join(directory, name), "changed raw bytes");
    await assert.rejects(
      verifyRecordedEvidence(directory, structuredClone(evidence), evidence),
      /Recorded raw log drifted/,
    );
  });
}
