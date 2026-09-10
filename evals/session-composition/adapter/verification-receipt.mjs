/** Compare a committed candidate receipt with replayed proof evidence. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const LOG_NAMES = Object.freeze([
  "verification-tests.tap",
  "history-ablation.tap",
  "verification-receipt-tests.tap",
  "consolidation-first-run.tap",
]);
const DEPENDENCIES = Object.freeze(["node", "typescript", "zod"]);
const VERSION =
  /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function assertObject(value, name) {
  assert(
    value !== null &&
      typeof value === "object" &&
      Object.getPrototypeOf(value) === Object.prototype,
    `${name} must be a plain object`,
  );
}

function assertKeys(value, keys, name) {
  assertObject(value, name);
  assert.deepEqual(
    Object.keys(value).sort(),
    [...keys].sort(),
    `${name} must contain exactly the known keys`,
  );
}

function stableEvidence(receipt, name) {
  assertObject(receipt, name);
  assertObject(receipt.provenance, `${name}.provenance`);
  const versions = receipt.provenance.dependencyVersions;
  assertKeys(versions, DEPENDENCIES, `${name}.provenance.dependencyVersions`);
  for (const dependency of DEPENDENCIES) {
    const version = versions[dependency];
    const match = typeof version === "string" && version.match(VERSION);
    assert(
      match &&
        match[0] === version &&
        !(match[1] ?? "").split(".").some((part) => /^0[0-9]+$/.test(part)),
      `${name}.provenance.dependencyVersions.${dependency} must be a semantic version`,
    );
  }
  assertKeys(receipt.rawLogs, LOG_NAMES, `${name}.rawLogs`);
  for (const log of LOG_NAMES) {
    const hash = receipt.rawLogs[log];
    assert(
      typeof hash === "string" &&
        hash.length === 64 &&
        /^[0-9a-f]{64}$/.test(hash),
      `${name}.rawLogs.${log} must be a lowercase SHA-256 digest`,
    );
  }

  // These validated values describe the recording environment and raw output,
  // which may differ from a replay. Everything else compares without omissions.
  // Runtime strings are shape-validated observations, not authenticated by replay.
  // Build a new value so historical provenance and hashes are never rewritten.
  const stable = structuredClone(receipt);
  delete stable.rawLogs;
  delete stable.provenance.dependencyVersions;
  return stable;
}

export function assertEvidenceMatches(recorded, evidence) {
  assert.deepEqual(
    stableEvidence(recorded, "Recorded evidence"),
    stableEvidence(evidence, "Replayed evidence"),
    "Recorded proof receipt drifted; review and rerun --write",
  );
}

export async function verifyRecordedEvidence(directory, recorded, evidence) {
  assertEvidenceMatches(recorded, evidence);
  // Read the fixed log set only after validating the map: a receipt cannot
  // omit a required log, add a new path, or redirect reads outside this set.
  for (const name of LOG_NAMES) {
    const bytes = await readFile(join(directory, name));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      recorded.rawLogs[name],
      `Recorded raw log drifted: ${name}`,
    );
  }
}
