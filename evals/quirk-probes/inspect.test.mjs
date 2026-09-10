import assert from "node:assert/strict";
import test from "node:test";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { assessProbe } from "./core.mjs";

function withCopy(fn) {
  const directory = mkdtempSync(join(tmpdir(), "probe-consumer-"));
  try {
    const source = fileURLToPath(new URL("../", import.meta.url));
    for (const name of ["quirk-probes", "session-composition"]) {
      cpSync(join(source, name), join(directory, "evals", name), {
        recursive: true,
      });
    }
    const path = (name) => join(directory, "evals/quirk-probes", name);
    const read = (name) => JSON.parse(readFileSync(path(name), "utf8"));
    const write = (name, value) =>
      writeFileSync(path(name), JSON.stringify(value));
    const invoke = (args = [], cwd = directory) =>
      spawnSync(process.execPath, [path("inspect.mjs"), ...args], {
        cwd,
        encoding: "utf8",
        timeout: 10000,
        maxBuffer: 2 * 1024 * 1024,
      });
    fn({ directory, path, read, write, invoke });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("one default command uses the separate frozen profile and works outside the repository cwd", () => {
  withCopy(({ invoke }) => {
    const result = invoke(["--json"], tmpdir());
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.consumerId, "consumer.scaffold.proof-review");
    assert.equal(report.rows[0].recordedStatus, "CURRENT");
    assert.equal(report.rows[0].replayStatus, "CURRENT");
    assert.equal(report.rows[0].agreement, "MATCH");
    assert.equal(report.envelopeStatus, "MATCH");
    assert.equal(report.evidenceReady, true);
    assert.equal(report.independentHumanReviewSatisfied, false);
    const human = invoke();
    assert.match(human.stdout, /Ready for candidate evidence review/);
    assert.match(human.stdout, /Human review remains open/);
  });
});

test("an independently changed consumer pin makes old evidence and replay stale without auto-refresh", () => {
  withCopy(({ read, write, invoke, path }) => {
    const profile = read("consumers/scaffold-review.json");
    profile.requirements[0].definitionDigest = "0".repeat(64);
    write("consumers/scaffold-review.json", profile);
    const before = readFileSync(path("consumers/scaffold-review.json"), "utf8");
    const result = invoke(["--json"]);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.rows[0].recordedStatus, "STALE");
    assert.equal(report.rows[0].replayStatus, "STALE");
    assert.equal(report.evidenceReady, false);
    assert.equal(
      readFileSync(path("consumers/scaffold-review.json"), "utf8"),
      before,
    );
    assert.match(invoke().stdout, /Keep the consumer pin unchanged/);
  });
});

test("unchanged consumer pin cannot hide source drift in the fresh local check", () => {
  withCopy(({ directory, invoke }) => {
    const source = join(directory, "evals/session-composition/run.mjs");
    writeFileSync(
      source,
      'throw new Error("DO_NOT_IMPORT");\n' + readFileSync(source, "utf8"),
    );
    const result = invoke(["--json"]);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.rows[0].recordedStatus, "CURRENT");
    assert.equal(report.localReplay.code, "SOURCE_DRIFT");
    assert.equal(report.evidenceReady, false);
    assert.doesNotMatch(result.stdout + result.stderr, /DO_NOT_IMPORT/);
    assert.match(invoke().stdout, /Local replay: BLOCKED/);
  });
});

test("missing evidence is a visible MISSING result with a bounded next step", () => {
  withCopy(({ path, invoke }) => {
    const result = invoke(["--evidence", path("absent.json"), "--json"]);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).rows[0].recordedStatus, "MISSING");
    assert.match(
      invoke(["--evidence", path("absent.json")]).stdout,
      /Supply the required evidence/,
    );
  });
});

test("duplicate JSON authority keys are an input error, never a passing receipt", () => {
  withCopy(({ path, invoke }) => {
    const evidence = path("evidence.json");
    const source = readFileSync(evidence, "utf8").replace(
      '"grantsPermissions": false',
      '"grantsPermissions": true, "grantsPermissions": false',
    );
    writeFileSync(evidence, source);
    const result = invoke(["--json"]);
    assert.equal(result.status, 2);
    const report = JSON.parse(result.stdout);
    assert.equal(report.error.code, "DUPLICATE_KEY");
    assert.equal(report.evidenceReady, false);
    assert.equal(readFileSync(evidence, "utf8"), source);
  });
});

test("a duplicate receipt list stays INVALID and is never cherry-picked", () => {
  withCopy(({ read, write, invoke }) => {
    const { result } = read("evidence.json");
    write("evidence.json", [result, result]);
    const checked = invoke(["--json"]);
    assert.equal(checked.status, 1);
    assert.equal(JSON.parse(checked.stdout).rows[0].recordedStatus, "INVALID");
  });
});

test("altered replay metadata cannot hide behind an intact nested result", () => {
  withCopy(({ read, write, invoke }) => {
    const report = read("evidence.json");
    report.originalMetrics.externalEffectsExecuted = 1;
    write("evidence.json", report);
    const result = invoke(["--json"]);
    assert.equal(result.status, 1);
    const inspected = JSON.parse(result.stdout);
    assert.equal(inspected.rows[0].recordedStatus, "CURRENT");
    assert.equal(inspected.envelopeStatus, "MISMATCH");
    assert.equal(inspected.evidenceReady, false);
    assert.match(invoke().stdout, /complete supplied report differs/);
  });
});

test("self-consistent inconclusive evidence stays inconclusive despite a passing local replay", () => {
  withCopy(({ read, write, invoke }) => {
    const { result } = read("evidence.json");
    const observations = structuredClone(result.observations);
    observations[0].baseline = "DENY";
    write("evidence.json", [assessProbe(result.definition, observations)]);
    const checked = invoke(["--json"]);
    assert.equal(checked.status, 1);
    assert.equal(
      JSON.parse(checked.stdout).rows[0].recordedStatus,
      "INCONCLUSIVE",
    );
  });
});

test("an unknown adapter cannot turn profile data into command execution", () => {
  withCopy(({ read, write, invoke }) => {
    const profile = read("consumers/scaffold-review.json");
    profile.requirements[0].replayId = "node -e process.exit(0)";
    write("consumers/scaffold-review.json", profile);
    const result = invoke(["--json"]);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).evidenceReady, false);
  });
});

test("successful inspection preserves profile, source pins, evidence, and original source bytes", () => {
  withCopy(({ path, directory, invoke }) => {
    const files = [
      path("consumers/scaffold-review.json"),
      path("source-pins.json"),
      path("evidence.json"),
      join(directory, "evals/session-composition/gate.mjs"),
    ];
    const before = files.map((file) => readFileSync(file));
    assert.equal(invoke().status, 0);
    files.forEach((file, index) =>
      assert.deepEqual(readFileSync(file), before[index]),
    );
  });
});

test("usage and malformed input fail explicitly while --help avoids evaluation", () => {
  withCopy(({ path, invoke }) => {
    assert.equal(invoke(["--help"]).status, 0);
    for (const args of [["--approve"], ["--json", "--json"], ["--evidence"]]) {
      assert.equal(invoke(args).status, 2);
    }
    writeFileSync(path("evidence.json"), "{bad");
    const result = invoke(["--json"]);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).error.code, "INVALID_JSON");
  });
});
