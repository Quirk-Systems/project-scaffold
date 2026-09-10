/**
 * Candidate simulation evidence only. No network, shell, callbacks, or effects.
 * Digests bind bytes; they do not authenticate provenance or prove execution.
 * inspectLinkedEvidence checks receipt integrity. Only replay through a trusted
 * adapter can establish that observations came from the claimed implementation.
 */
import { createHash } from "node:crypto";
import { types } from "node:util";

const VERSION = "0.1.0";
const MAX_DEPTH = 32;
const MAX_NODES = 20_000;
const MAX_BYTES = 1_048_576;
const HEX = /^[a-f\d]{64}$/;
const DECISIONS = new Set(["ALLOW", "DENY"]);
const RECEIPT_KEYS = [
  "schemaVersion",
  "probeId",
  "definitionDigest",
  "definition",
  "observations",
  "status",
  "evidenceKind",
  "grantsPermissions",
  "effectExecutionAllowed",
  "independentHumanReviewSatisfied",
  "productionValidation",
  "outcome",
  "resultDigest",
];

export class ProbeValidationError extends TypeError {
  constructor(message, path = "$") {
    super(`${path}: ${message}`);
    this.name = "ProbeValidationError";
    this.code = "ERR_PROBE_VALIDATION";
    this.path = path;
  }
}

function fail(message, path) {
  throw new ProbeValidationError(message, path);
}

/** Canonical, bounded JSON. Never invokes getters or user-defined toJSON. */
function canonical(value) {
  let nodes = 0;
  let textBytes = 0;
  const ancestors = new Set();
  function string(value, path) {
    if (value.length > MAX_BYTES) fail("JSON exceeds byte budget", path);
    const encoded = JSON.stringify(value);
    textBytes += Buffer.byteLength(encoded);
    if (textBytes > MAX_BYTES) fail("JSON exceeds byte budget", path);
    return encoded;
  }
  function visit(value, path, depth) {
    if (++nodes > MAX_NODES) fail("JSON exceeds node budget", path);
    if (depth > MAX_DEPTH) fail("JSON exceeds depth budget", path);
    if (value === null) return "null";
    if (typeof value === "string") return string(value, path);
    if (typeof value === "boolean") return String(value);
    if (typeof value === "number") {
      if (!Number.isFinite(value)) fail("number must be finite", path);
      return JSON.stringify(value);
    }
    if (typeof value !== "object")
      fail("value is outside the JSON domain", path);
    if (types.isProxy(value)) fail("proxies are outside the JSON domain", path);
    const isArray = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (
      isArray
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    ) {
      fail("custom prototypes are outside the JSON domain", path);
    }
    if (ancestors.has(value)) fail("cyclic JSON is not supported", path);
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string"))
      fail("symbol keys are outside the JSON domain", path);
    if (keys.length > MAX_NODES) fail("object exceeds key budget", path);
    ancestors.add(value);
    let encoded;
    if (isArray) {
      if (value.length > MAX_NODES) fail("array exceeds node budget", path);
      if (keys.length !== value.length + 1)
        fail("arrays must be dense and have no extra properties", path);
      const entries = [];
      for (let index = 0; index < value.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );
        if (
          !descriptor ||
          !Object.hasOwn(descriptor, "value") ||
          !descriptor.enumerable
        ) {
          fail(
            "arrays require enumerable data entries at every index",
            `${path}[${index}]`,
          );
        }
        entries.push(visit(descriptor.value, `${path}[${index}]`, depth + 1));
      }
      encoded = `[${entries.join(",")}]`;
    } else {
      const entries = [];
      for (const key of keys.sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
          fail("objects require enumerable data properties", `${path}.${key}`);
        }
        entries.push(
          `${string(key, path)}:${visit(descriptor.value, `${path}.${key}`, depth + 1)}`,
        );
      }
      encoded = `{${entries.join(",")}}`;
    }
    ancestors.delete(value);
    return encoded;
  }
  const encoded = visit(value, "$", 0);
  if (Buffer.byteLength(encoded) > MAX_BYTES)
    fail("JSON exceeds byte budget", "$");
  return encoded;
}

export function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function snapshot(value) {
  return JSON.parse(canonical(value));
}

function object(value, keys, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("expected object", path);
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    fail(`expected exactly these fields: ${keys.join(", ")}`, path);
  }
}

function text(value, path, max = 4096) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > max
  ) {
    fail(`expected nonempty string of at most ${max} characters`, path);
  }
}

function hash(value, path) {
  if (typeof value !== "string" || !HEX.test(value))
    fail("expected 64 lowercase hexadecimal characters", path);
}

function array(value, path, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    fail(`expected array with ${min}..${max} entries`, path);
  }
}

function validateDefinition(definition) {
  object(
    definition,
    [
      "schemaVersion",
      "id",
      "claim",
      "owner",
      "subject",
      "bindings",
      "limitations",
      "cases",
    ],
    "$.definition",
  );
  if (definition.schemaVersion !== VERSION)
    fail(`expected schema version ${VERSION}`, "$.definition.schemaVersion");
  text(definition.id, "$.definition.id", 128);
  text(definition.claim, "$.definition.claim");
  text(definition.owner, "$.definition.owner", 256);
  object(definition.subject, ["ref", "revision"], "$.definition.subject");
  text(definition.subject.ref, "$.definition.subject.ref", 2048);
  text(definition.subject.revision, "$.definition.subject.revision", 2048);
  object(
    definition.bindings,
    ["policy", "fixtures", "implementation"],
    "$.definition.bindings",
  );
  for (const key of ["policy", "fixtures", "implementation"])
    hash(definition.bindings[key], `$.definition.bindings.${key}`);
  array(definition.limitations, "$.definition.limitations", 1, 32);
  definition.limitations.forEach((item, index) =>
    text(item, `$.definition.limitations[${index}]`, 2048),
  );
  array(definition.cases, "$.definition.cases", 2, 128);
  const ids = new Set();
  const pairs = new Map();
  for (const [index, item] of definition.cases.entries()) {
    const path = `$.definition.cases[${index}]`;
    object(item, ["id", "pairId", "role", "expected"], path);
    text(item.id, `${path}.id`, 128);
    text(item.pairId, `${path}.pairId`, 128);
    if (ids.has(item.id)) fail("duplicate case id", `${path}.id`);
    ids.add(item.id);
    if (!["CONTROL", "CHALLENGE"].includes(item.role))
      fail("expected CONTROL or CHALLENGE", `${path}.role`);
    if (item.expected !== (item.role === "CONTROL" ? "ALLOW" : "DENY")) {
      fail(
        "CONTROL must expect ALLOW and CHALLENGE must expect DENY",
        `${path}.expected`,
      );
    }
    const roles = pairs.get(item.pairId) ?? new Set();
    if (roles.has(item.role)) fail("duplicate role within pair", path);
    roles.add(item.role);
    pairs.set(item.pairId, roles);
  }
  if (
    pairs.size > 64 ||
    [...pairs.values()].some((roles) => roles.size !== 2)
  ) {
    fail(
      "each of 1..64 pairs requires exactly one CONTROL and one CHALLENGE",
      "$.definition.cases",
    );
  }
}

/**
 * Pure assessment of supplied observations, not an execution receipt.
 * A failing target wins over an inconclusive baseline. A baseline must allow
 * every case so that an already-denied challenge cannot claim new protection.
 */
export function assessProbe(definition, observations) {
  const definitionCopy = snapshot(definition);
  const observationCopy = snapshot(observations);
  validateDefinition(definitionCopy);
  array(
    observationCopy,
    "$.observations",
    definitionCopy.cases.length,
    definitionCopy.cases.length,
  );
  const expected = new Map(
    definitionCopy.cases.map((item) => [item.id, item.expected]),
  );
  const byId = new Map();
  for (const [index, item] of observationCopy.entries()) {
    const path = `$.observations[${index}]`;
    object(
      item,
      ["caseId", "baseline", "target", "effectExecutionAllowed"],
      path,
    );
    if (typeof item.caseId !== "string" || !expected.has(item.caseId))
      fail("unknown case id", `${path}.caseId`);
    if (byId.has(item.caseId)) fail("duplicate observation", `${path}.caseId`);
    if (!DECISIONS.has(item.baseline) || !DECISIONS.has(item.target))
      fail("baseline and target must be ALLOW or DENY", path);
    if (item.effectExecutionAllowed !== false)
      fail("effects must remain disabled", `${path}.effectExecutionAllowed`);
    byId.set(item.caseId, item);
  }
  const ordered = definitionCopy.cases.map((item) => byId.get(item.id));
  const targetMismatch = ordered.some(
    (item) => item.target !== expected.get(item.caseId),
  );
  const nondiscriminating = ordered.some((item) => item.baseline !== "ALLOW");
  const body = {
    schemaVersion: VERSION,
    probeId: definitionCopy.id,
    definitionDigest: digest(definitionCopy),
    definition: definitionCopy,
    observations: ordered,
    status: "CANDIDATE",
    evidenceKind: "SIMULATION",
    grantsPermissions: false,
    effectExecutionAllowed: false,
    independentHumanReviewSatisfied: false,
    productionValidation: false,
    outcome: targetMismatch
      ? "NOT_SUPPORTED"
      : nondiscriminating
        ? "INCONCLUSIVE"
        : "SUPPORTED",
  };
  return { ...body, resultDigest: digest(body) };
}

/**
 * The consumer supplies trusted current definition digests. Never infer current
 * requirements from a receipt. CURRENT means internally consistent simulation
 * evidence for that exact definition; it grants no authority or provenance.
 */
export function inspectLinkedEvidence(requirements, results) {
  const requirementCopy = snapshot(requirements);
  const resultCopy = snapshot(results);
  array(requirementCopy, "$.requirements", 1, 128);
  array(resultCopy, "$.results", 0, 256);
  const requiredIds = new Set();
  for (const [index, item] of requirementCopy.entries()) {
    const path = `$.requirements[${index}]`;
    object(item, ["probeId", "definitionDigest"], path);
    text(item.probeId, `${path}.probeId`, 128);
    hash(item.definitionDigest, `${path}.definitionDigest`);
    if (requiredIds.has(item.probeId))
      fail("duplicate probe requirement", `${path}.probeId`);
    requiredIds.add(item.probeId);
  }
  // An unidentifiable entry cannot safely be assigned to any requirement.
  const unidentifiable = resultCopy.some(
    (item) =>
      item === null ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof item.probeId !== "string" ||
      item.probeId.trim() === "",
  );
  const rows = requirementCopy.map((requirement) => {
    const matches = resultCopy.filter(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        item.probeId === requirement.probeId,
    );
    let status;
    if (unidentifiable || matches.length > 1) status = "INVALID";
    else if (matches.length === 0) status = "MISSING";
    else {
      const result = matches[0];
      try {
        object(result, RECEIPT_KEYS, "$.result");
        const recomputed = assessProbe(result.definition, result.observations);
        if (digest(result) !== digest(recomputed)) status = "INVALID";
        else if (result.definitionDigest !== requirement.definitionDigest)
          status = "STALE";
        else
          status = result.outcome === "SUPPORTED" ? "CURRENT" : result.outcome;
      } catch (error) {
        if (!(error instanceof ProbeValidationError)) throw error;
        status = "INVALID";
      }
    }
    return { ...requirement, status };
  });
  return {
    rows,
    allCurrent: rows.every((row) => row.status === "CURRENT"),
    grantsPermissions: false,
    effectExecutionAllowed: false,
  };
}
