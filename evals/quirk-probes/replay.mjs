/** Fixed, trusted, local replay. Definitions never contain executable commands. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { assessProbe, digest, inspectLinkedEvidence } from "./core.mjs";

const bytes = (relative) => {
  const value = readFileSync(new URL(relative, import.meta.url));
  if (value.length > 256 * 1024)
    throw new Error("Replay source exceeds 256 KiB");
  return value;
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export async function replay() {
  const pins = JSON.parse(bytes("./source-pins.json"));
  const sourceNames = [
    "gate.mjs",
    "fixtures.json",
    "run.mjs",
    "probe.test.mjs",
  ];
  if (
    !isDeepStrictEqual(Object.keys(pins.files).sort(), [...sourceNames].sort())
  ) {
    throw new Error("Unexpected source registry");
  }
  const sourceHashes = {};
  for (const name of sourceNames) {
    const content = bytes(`../session-composition/${name}`);
    const gitBlob = createHash("sha1")
      .update(`blob ${content.length}\0`)
      .update(content)
      .digest("hex");
    sourceHashes[name] = sha256(content);
    if (
      gitBlob !== pins.files[name].gitBlob ||
      sourceHashes[name] !== pins.files[name].sha256
    ) {
      throw new Error(
        `Pinned source drift: ${name}. Review the source; do not refresh pins to silence this check.`,
      );
    }
  }
  // Imported only after the selected source files match the recorded byte pins.
  // This is trusted repository code, not a sandbox for arbitrary adapters.
  const { evaluateFixturePack } =
    await import("../session-composition/run.mjs");
  const fixture = JSON.parse(bytes("../session-composition/fixtures.json"));
  const original = evaluateFixturePack(fixture);
  const implementation = {
    core: sha256(bytes("./core.mjs")),
    adapter: sha256(bytes("./replay.mjs")),
    pins: sha256(bytes("./source-pins.json")),
    sourceHashes,
  };
  const definition = {
    schemaVersion: "0.1.0",
    id: "probe.session-composition.paired-boundary",
    owner: "Quirk-Systems/project-scaffold",
    claim:
      "Within the frozen synthetic traces, reject each prohibited composition and preserve its matched control.",
    subject: {
      ref: "Quirk-Systems/project-scaffold/evals/session-composition",
      revision: pins.revision,
    },
    bindings: {
      policy: digest(fixture.policy),
      fixtures: sourceHashes["fixtures.json"],
      implementation: digest(implementation),
    },
    limitations: [
      "24 deterministic synthetic traces; no statistical safety estimate.",
      "The action-local baseline is a synthetic comparator, not the Task 4 resolver.",
      "This replay does not execute the Task 4/5 adapter or prove its integration.",
      "History completeness and action classifications are trusted fixture inputs.",
      "No real grant verification, concurrent admission, revocation, deployment, or user-benefit proof.",
      "Unsigned hashes detect changed content; they do not authenticate evidence origin.",
      "Independent human review remains open; no permission or admission is granted.",
    ],
    cases: fixture.cases.map((item) => ({
      id: item.id,
      pairId: item.pairId,
      role: item.expected === "DENY" ? "CHALLENGE" : "CONTROL",
      expected: item.expected === "DENY" ? "DENY" : "ALLOW",
    })),
  };
  const observations = original.perCase.map((item) => ({
    caseId: item.id,
    baseline: item.reference.candidateAllowed ? "ALLOW" : "DENY",
    target: item.target.candidateAllowed ? "ALLOW" : "DENY",
    effectExecutionAllowed: false,
  }));
  const result = assessProbe(definition, observations);
  return {
    schemaVersion: "0.1.0",
    source: pins,
    implementation,
    originalMetrics: original.metrics,
    result,
    linkedEvidence: inspectLinkedEvidence(
      [{ probeId: result.probeId, definitionDigest: result.definitionDigest }],
      [result],
    ),
  };
}

export async function main(args) {
  if (
    args.length !== 1 ||
    !["--check", "--write", "--print"].includes(args[0])
  ) {
    throw new Error(
      "Usage: node evals/quirk-probes/replay.mjs --check|--write|--print",
    );
  }
  const report = await replay();
  if (
    report.result.outcome !== "SUPPORTED" ||
    !report.linkedEvidence.allCurrent
  ) {
    throw new Error("Probe claim is not supported by the fixed replay");
  }
  if (args[0] === "--check") {
    const recorded = JSON.parse(bytes("./evidence.json"));
    if (!isDeepStrictEqual(recorded, report))
      throw new Error("Recorded evidence differs from fresh replay");
    process.stdout.write(
      "PASS: 12 challenges rejected; 12 controls preserved; full evidence matches fresh replay.\n",
    );
  } else if (args[0] === "--write") {
    writeFileSync(
      new URL("./evidence.json", import.meta.url),
      JSON.stringify(report, null, 2) + "\n",
    );
    process.stdout.write(
      "Recorded unsigned candidate evidence from the fixed local replay.\n",
    );
  } else {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
