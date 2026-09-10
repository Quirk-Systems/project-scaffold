/**
 * Pure, candidate-only consumer inspection. Profiles supply independent pins;
 * receipts never choose their own expected definition digest.
 *
 * The caller must obtain replayedResults from the trusted fixed local adapter.
 * This function compares evidence; it cannot authenticate replay provenance.
 */
import {
  digest,
  inspectLinkedEvidence,
  ProbeValidationError,
} from "./core.mjs";

const VERSION = "0.1.0";
const PROBE_ID = "probe.session-composition.paired-boundary";
const REPLAY_ID = "session-composition";
const HEX = /^[a-f\d]{64}$/;
const CONTROL_CHARACTERS = /[\p{Cc}\p{Cf}\u2028\u2029]/u;

function fail(message, path) {
  throw new ProbeValidationError(message, path);
}

function snapshot(value) {
  // Reuse core's bounded JSON validation before cloning. It refuses getters,
  // proxies, custom prototypes, hidden fields, and user-defined toJSON.
  digest(value);
  return JSON.parse(JSON.stringify(value));
}

function object(value, keys, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("expected object", path);
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    fail(`expected exactly these fields: ${keys.join(", ")}`, path);
  }
}

function text(value, path, max) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > max ||
    CONTROL_CHARACTERS.test(value)
  ) {
    fail(
      `expected nonempty string of at most ${max} characters without control or format characters`,
      path,
    );
  }
}

/** Return a detached, validated profile for the one reviewed local adapter. */
export function validateConsumerProfile(profile) {
  const copy = snapshot(profile);
  object(copy, ["schemaVersion", "id", "owner", "requirements"], "$.profile");
  if (copy.schemaVersion !== VERSION)
    fail(`expected schema version ${VERSION}`, "$.profile.schemaVersion");
  text(copy.id, "$.profile.id", 128);
  text(copy.owner, "$.profile.owner", 256);
  // Expanding the registry is a code-review decision, never a data instruction.
  if (!Array.isArray(copy.requirements) || copy.requirements.length !== 1)
    fail(
      "expected exactly one supported probe requirement",
      "$.profile.requirements",
    );
  const requirement = copy.requirements[0];
  const path = "$.profile.requirements[0]";
  object(
    requirement,
    ["probeId", "definitionDigest", "label", "replayId"],
    path,
  );
  text(requirement.probeId, `${path}.probeId`, 128);
  text(requirement.label, `${path}.label`, 256);
  text(requirement.replayId, `${path}.replayId`, 128);
  if (requirement.probeId !== PROBE_ID || requirement.replayId !== REPLAY_ID)
    fail("unsupported probe and replay association", path);
  if (
    typeof requirement.definitionDigest !== "string" ||
    !HEX.test(requirement.definitionDigest)
  ) {
    fail(
      "expected 64 lowercase hexadecimal characters",
      `${path}.definitionDigest`,
    );
  }
  return copy;
}

/**
 * Compare both inputs independently with the profile's literal requirement.
 * Ready means matching current simulation evidence, never authority to act.
 */
export function inspectConsumer(profile, recordedResults, replayedResults) {
  const profileCopy = validateConsumerProfile(profile);
  const recordedCopy = snapshot(recordedResults);
  const replayedCopy = snapshot(replayedResults);
  const requirements = profileCopy.requirements.map(
    ({ probeId, definitionDigest }) => ({ probeId, definitionDigest }),
  );
  const recorded = inspectLinkedEvidence(requirements, recordedCopy);
  const replayed = inspectLinkedEvidence(requirements, replayedCopy);
  const rows = profileCopy.requirements.map((requirement, index) => {
    const recordedStatus = recorded.rows[index].status;
    const replayStatus = replayed.rows[index].status;
    const reasonCodes = [];
    if (recordedStatus !== "CURRENT")
      reasonCodes.push(`RECORDED_${recordedStatus}`);
    if (replayStatus !== "CURRENT") reasonCodes.push(`REPLAY_${replayStatus}`);
    let agreement = "NOT_COMPARED";
    if (recordedStatus === "CURRENT" && replayStatus === "CURRENT") {
      // CURRENT establishes exactly one matching, integrity-checked receipt.
      const saved = recordedCopy.find(
        (item) => item.probeId === requirement.probeId,
      );
      const fresh = replayedCopy.find(
        (item) => item.probeId === requirement.probeId,
      );
      agreement =
        saved.resultDigest === fresh.resultDigest ? "MATCH" : "DIFFERENT";
      if (agreement === "DIFFERENT") reasonCodes.push("OBSERVATION_MISMATCH");
    }
    return {
      probeId: requirement.probeId,
      label: requirement.label,
      expectedDefinitionDigest: requirement.definitionDigest,
      recordedStatus,
      replayStatus,
      agreement,
      ready: agreement === "MATCH",
      reasonCodes,
    };
  });
  return {
    schemaVersion: VERSION,
    consumerId: profileCopy.id,
    profileDigest: digest(profileCopy),
    status: "CANDIDATE",
    evidenceReady: rows.every((row) => row.ready),
    grantsPermissions: false,
    effectExecutionAllowed: false,
    independentHumanReviewSatisfied: false,
    rows,
  };
}
