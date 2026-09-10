import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { replay } from "./replay.mjs";
import { assessProbe, digest, inspectLinkedEvidence } from "./core.mjs";

test("fixed adapter reuses all 12 original pairs and produces a reproducible result", async () => {
  const first = await replay();
  assert.deepEqual(await replay(), first);
  assert.equal(first.result.outcome, "SUPPORTED");
  assert.equal(first.result.definition.cases.length, 24);
  assert.deepEqual(first.originalMetrics, {
    prohibitedTraces: 12,
    matchedControls: 12,
    referenceProhibitedCandidatesPermitted: 12,
    targetProhibitedCandidatesPermitted: 0,
    referenceControlsDenied: 0,
    targetControlsDenied: 0,
    externalEffectsExecuted: 0,
  });
  assert.equal(first.linkedEvidence.allCurrent, true);
  assert.equal(first.result.independentHumanReviewSatisfied, false);
});

test("memoryless and always-deny mutations both lose support for the real fixture", async () => {
  const { result } = await replay();
  for (const target of ["ALLOW", "DENY"]) {
    const altered = assessProbe(
      result.definition,
      result.observations.map((row) => ({ ...row, target })),
    );
    assert.equal(altered.outcome, "NOT_SUPPORTED");
    assert.equal(altered.effectExecutionAllowed, false);
  }
});

test("linked consumer invalidates each changed binding without rewriting old evidence", async () => {
  const { result } = await replay();
  const before = structuredClone(result);
  for (const key of ["policy", "fixtures", "implementation"]) {
    const next = structuredClone(result.definition);
    next.bindings[key] = "0".repeat(64);
    const linked = inspectLinkedEvidence(
      [{ probeId: result.probeId, definitionDigest: digest(next) }],
      [result],
    );
    assert.equal(linked.rows[0].status, "STALE");
    assert.equal(linked.allCurrent, false);
    assert.equal(linked.grantsPermissions, false);
  }
  assert.deepEqual(result, before);
});

test("a linked passing result cannot self-promote, even with its hash recomputed", async () => {
  const { result } = await replay();
  const promoted = {
    ...result,
    grantsPermissions: true,
    independentHumanReviewSatisfied: true,
  };
  const { resultDigest: ignored, ...body } = promoted;
  promoted.resultDigest = digest(body);
  const linked = inspectLinkedEvidence(
    [{ probeId: result.probeId, definitionDigest: result.definitionDigest }],
    [promoted],
  );
  assert.equal(linked.rows[0].status, "INVALID");
  assert.equal(linked.allCurrent, false);
});

function withCopy(fn) {
  const temp = mkdtempSync(join(tmpdir(), "quirk-probes-"));
  try {
    const source = fileURLToPath(new URL("../", import.meta.url));
    cpSync(join(source, "quirk-probes"), join(temp, "evals/quirk-probes"), {
      recursive: true,
    });
    cpSync(
      join(source, "session-composition"),
      join(temp, "evals/session-composition"),
      { recursive: true },
    );
    const invoke = (flag) =>
      spawnSync(process.execPath, ["evals/quirk-probes/replay.mjs", flag], {
        cwd: temp,
        encoding: "utf8",
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });
    fn(temp, invoke);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

test("fresh isolated checkout can record, check, and reject an edited evidence claim", () => {
  withCopy((temp, invoke) => {
    assert.equal(invoke("--write").status, 0);
    assert.equal(invoke("--check").status, 0);
    const path = join(temp, "evals/quirk-probes/evidence.json");
    const altered = JSON.parse(readFileSync(path));
    altered.result.productionValidation = true;
    writeFileSync(path, JSON.stringify(altered));
    const before = readFileSync(path, "utf8");
    const checked = invoke("--check");
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /differs from fresh replay/);
    assert.equal(
      readFileSync(path, "utf8"),
      before,
      "check must not repair evidence",
    );
  });
});

test("source drift is refused before the fixed probe adapter imports the changed source", () => {
  withCopy((temp, invoke) => {
    const path = join(temp, "evals/session-composition/run.mjs");
    writeFileSync(
      path,
      "throw new Error('SHOULD NOT EXECUTE');\n" + readFileSync(path, "utf8"),
    );
    const checked = invoke("--print");
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /Pinned source drift: run.mjs/);
    assert.doesNotMatch(checked.stderr, /SHOULD NOT EXECUTE/);
  });
});

test("unknown CLI mode fails without replacing the evidence file", () => {
  withCopy((temp, invoke) => {
    const path = join(temp, "evals/quirk-probes/evidence.json");
    writeFileSync(path, "keep this historical evidence");
    assert.equal(invoke("--approve").status, 1);
    assert.equal(readFileSync(path, "utf8"), "keep this historical evidence");
  });
});
