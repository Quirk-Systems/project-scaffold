/** Reproduce the bounded candidate proof; no application effect adapters. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCompositionAdapter } from "./adapter.mjs";
import { makeFixture, makeBlindFixture } from "./fixtures.mjs";
import { loadPlanContracts } from "./plan-contracts.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../../..");
const relative = "evals/session-composition/adapter";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourcePaths = [
  `${relative}/adapter.mjs`,
  `${relative}/adapter.test.mjs`,
  `${relative}/fixtures.mjs`,
  `${relative}/plan-contracts.mjs`,
  `${relative}/verify.mjs`,
  `${relative}/README.md`,
  `${relative}/agent-review.md`,
  `${relative}/evidence-lineage.md`,
  "evals/session-composition/gate.mjs",
  "evals/session-composition/probe.test.mjs",
  "evals/session-composition/fixtures.json",
  "evals/session-composition/run.mjs",
  "docs/governance/session-composition-candidate.md",
  "docs/superpowers/plans/2026-08-28-governed-agent-run-state-only.md",
  "package.json",
  ".github/workflows/session-composition-candidate.yml",
];

function runTests(paths) {
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-reporter=tap", ...paths],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
    },
  );
  if (result.error) throw result.error;
  const output = result.stdout + result.stderr;
  const count = (name) =>
    Number(output.match(new RegExp(`^# ${name} (\\d+)$`, "m"))?.[1] ?? NaN);
  const summary = {
    exitCode: result.status,
    tests: count("tests"),
    passed: count("pass"),
    failed: count("fail"),
  };
  assert(Number.isInteger(summary.tests), "Missing TAP test summary");
  return { summary, output };
}

async function main() {
  const mode = process.argv[2];
  assert(
    ["--write", "--check"].includes(mode),
    "Use --write to record evidence or --check to replay it",
  );
  const contracts = await loadPlanContracts();
  try {
    const original = runTests(["evals/session-composition/probe.test.mjs"]);
    const adapter = runTests([`${relative}/adapter.test.mjs`]);
    assert.equal(original.summary.exitCode, 0, original.output);
    assert.equal(adapter.summary.exitCode, 0, adapter.output);
    const matrix = [];
    for (const authority of [
      "PERMITTED_CANDIDATE_ONLY",
      "HUMAN_REVIEW",
      "PROHIBITED",
      "UNRESOLVED",
    ]) {
      for (const history of ["clean", "prohibited", "untrusted"]) {
        const fixture = makeFixture(contracts, { authority, history });
        const result = createCompositionAdapter({
          contracts,
          policy: fixture.policy,
          resolveHistory: fixture.resolveHistory,
        })(fixture.request);
        assert.equal(
          result.candidateEligible,
          authority === "PERMITTED_CANDIDATE_ONLY" && history === "clean",
        );
        assert.equal(result.effectExecutionAllowed, false);
        assert.deepEqual(
          result.authorityResult,
          fixture.request.authorityResult,
        );
        assert.deepEqual(result.basePolicyResult, fixture.request.policyResult);
        matrix.push({
          authority,
          history,
          candidateEligible: result.candidateEligible,
          effectiveDecision: result.effectivePolicyResult?.ok
            ? result.effectivePolicyResult.value.decision
            : "BLOCKED",
          reasonCodes: result.reasonCodes,
          receiptDigest: result.contentDigest,
        });
      }
    }
    const examples = [];
    for (const [name, options] of [
      ["conflicting-simulated-candidate", { history: "prohibited" }],
      [
        "rationale-update-control",
        { history: "prohibited", action: "probe.revise_rationale" },
      ],
      [
        "honestly-classified-external-operation",
        { action: "probe.publish_external" },
      ],
    ]) {
      const fixture = makeFixture(contracts, options);
      const result = createCompositionAdapter({
        contracts,
        policy: fixture.policy,
        resolveHistory: fixture.resolveHistory,
      })(fixture.request);
      const repeated = createCompositionAdapter({
        contracts,
        policy: fixture.policy,
        resolveHistory: fixture.resolveHistory,
      })(fixture.request);
      assert.deepEqual(
        result,
        repeated,
        "Receipt must be deterministic for identical inputs",
      );
      examples.push({
        name,
        baseDecision: fixture.request.policyResult.ok
          ? fixture.request.policyResult.value.decision
          : "BLOCKED",
        candidateEligible: result.candidateEligible,
        receiptDigest: result.contentDigest,
      });
    }
    assert.deepEqual(
      examples.map((entry) => entry.candidateEligible),
      [false, true, false],
    );

    const blindReviewExamples = [];
    for (const [name, options, eligible] of [
      [
        "answer-key-alone",
        { history: "empty", action: "probe.read_answer_key" },
        true,
      ],
      ["blind-rationale-alone", { history: "empty" }, true],
      ["public-rubric-control", { history: "rubric" }, true],
      ["answer-key-contamination", { history: "answer-key" }, false],
      [
        "reverse-order-contamination",
        { history: "rationale", action: "probe.read_answer_key" },
        false,
      ],
    ]) {
      const fixture = makeBlindFixture(contracts, options);
      const evaluate = createCompositionAdapter({
        contracts,
        policy: fixture.policy,
        resolveHistory: fixture.resolveHistory,
      });
      const result = evaluate(fixture.request);
      assert.equal(
        fixture.request.policyResult.value.decision,
        "ALLOW_CANDIDATE_ONLY",
      );
      assert.equal(result.candidateEligible, eligible);
      assert.equal(result.effectExecutionAllowed, false);
      assert.deepEqual(result.authorityResult, fixture.request.authorityResult);
      assert.deepEqual(result.basePolicyResult, fixture.request.policyResult);
      assert.deepEqual(result, evaluate(fixture.request));
      if (!eligible)
        assert(result.reasonCodes.includes("COMPOSITION_PROHIBITED"));
      blindReviewExamples.push({
        name,
        baseDecision: fixture.request.policyResult.value.decision,
        candidateEligible: result.candidateEligible,
        receiptDigest: result.contentDigest,
      });
    }

    // Isolated mutation: preserve source files and frozen expectations, erase
    // only the history passed into the original #104 matcher, then run tests.
    const temporary = await mkdtemp(
      join(dirname(directory), ".adapter-ablation-"),
    );
    let ablation;
    try {
      for (const name of [
        "adapter.mjs",
        "adapter.test.mjs",
        "fixtures.mjs",
        "plan-contracts.mjs",
      ])
        await copyFile(join(directory, name), join(temporary, name));
      const target = join(temporary, "adapter.mjs");
      const before = await readFile(target, "utf8");
      const pattern =
        /priorActions:\s*history\.events[\s\S]*?\.map\(\(event\)\s*=>\s*event\.actionId\),/g;
      assert.equal(
        [...before.matchAll(pattern)].length,
        1,
        "Ablation target must be unique",
      );
      await writeFile(target, before.replace(pattern, "priorActions: [],"));
      ablation = runTests([join(temporary, "adapter.test.mjs")]);
      assert.notEqual(
        ablation.summary.exitCode,
        0,
        "Erasing history must break the frozen tests",
      );
      assert(ablation.summary.failed > 0);
      assert.match(
        ablation.output,
        /not ok \d+ - actual Task 4\/5 shapes: PERMITTED_CANDIDATE_ONLY with prohibited history|not ok \d+ - Mode A incremental value/i,
        "History ablation must break the meaningful Mode A case",
      );
      assert.match(
        ablation.output,
        /not ok \d+ - blind-review inherited expectation: answer key contamination/,
        "History ablation must also break the inherited blind-review case",
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }

    const files = {};
    for (const path of sourcePaths)
      files[path] = sha256(await readFile(join(root, path)));
    const evidence = {
      kind: "CompositionAdapterVerification",
      version: 1,
      status: "CANDIDATE",
      disposition: "Constrain",
      scope: "PLAN_CONTRACT_ADAPTER_ONLY",
      authorityEffect: "NONE",
      effectExecutionAllowed: false,
      provenance: { ...contracts.provenance, executedPlannedTask5: true },
      expectationLineage: {
        sourcePr: 105,
        sourceHead: "a723d5dbe53c17315ad5013ddb1ac17df39dde60",
        sourceTestPath: "evals/task5-composition/adapter.test.mjs",
        sourceTestGitBlob: "24335471057c2a18cab34d67c61c466dac49a69d",
        adoption: "EXPECTATIONS_ONLY",
        sourceAdapterExecuted: false,
        originalRecipientHead: "050a2f7a5e5c2d9206205fe22b8a8af3dcafb99c",
      },
      checks: {
        originalProbe: original.summary,
        adapter: adapter.summary,
        historyErasureAblation: { ...ablation.summary, detected: true },
        matrixCells: matrix.length,
        blindReviewExamples: blindReviewExamples.length,
        inheritedExpectationTests: [
          ...adapter.output.matchAll(
            /^# Subtest: (?:blind-review|simulation-smuggling)/gm,
          ),
        ].length,
        deterministicExampleReceipts: true,
      },
      matrix,
      examples,
      blindReviewExamples,
      files,
      rawLogs: {
        "verification-tests.tap": sha256(adapter.output),
        "history-ablation.tap": sha256(ablation.output),
      },
      unproved: [
        "production Task 4/5 module integration",
        "Task 4 resolver execution with verified grants",
        "durable history and principal authentication",
        "live-clock freshness and revocation",
        "Task 6 consumer enforcement",
        "full repository Bun/Vitest/typecheck/lint/build",
        "concurrency and delegated session inheritance",
        "Mode B/C behavior",
        "independent human review",
      ],
      testOrder:
        "First complete adapter-suite run was green; history erasure is subsequent mutation evidence, not preimplementation TDD evidence.",
    };
    const file = join(directory, "verification.json");
    if (mode === "--write") {
      await writeFile(file, JSON.stringify(evidence, null, 2) + "\n");
      await writeFile(
        join(directory, "verification-tests.tap"),
        adapter.output,
      );
      // Paths and timings in this raw log are observations, not stable fixture IDs.
      await writeFile(join(directory, "history-ablation.tap"), ablation.output);
    } else {
      const recorded = JSON.parse(await readFile(file, "utf8"));
      for (const [name, hash] of Object.entries(recorded.rawLogs)) {
        assert.equal(
          sha256(await readFile(join(directory, name))),
          hash,
          "Recorded raw log drifted",
        );
      }
      assert.deepEqual(
        evidence.files,
        recorded.files,
        "Recorded proof source drifted; review and rerun --write",
      );
      assert.deepEqual(
        evidence.checks,
        recorded.checks,
        "Recorded proof checks drifted",
      );
      assert.deepEqual(
        evidence.matrix,
        recorded.matrix,
        "Recorded authority/history outcomes drifted",
      );
      assert.deepEqual(
        evidence.examples,
        recorded.examples,
        "Recorded example outcomes drifted",
      );
      assert.deepEqual(
        evidence.blindReviewExamples,
        recorded.blindReviewExamples,
        "Recorded blind-review outcomes drifted",
      );
      assert.deepEqual(
        evidence.expectationLineage,
        recorded.expectationLineage,
        "Recorded expectation lineage drifted",
      );
    }
    process.stdout.write(
      JSON.stringify(
        {
          mode,
          checks: evidence.checks,
          sourceFiles: sourcePaths.length,
          replayRuntime: contracts.provenance.dependencyVersions,
          scope: evidence.scope,
          independentHumanReview: "OPEN",
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await contracts.cleanup();
  }
}

await main();
