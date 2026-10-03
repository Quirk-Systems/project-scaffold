import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const expected = Object.freeze({
  repository: "Quirk-Systems/quirk-core",
  commit: "0b4fc6debf5c93b94463c9a460d022cfbdf4a37b",
  path: "schemas/preference-evidence-wedge.v1.schema.json",
  blob_sha1: "8b04608ffee9a326f5562e1a496a49d8e1db098c",
  sha256: "db5cf4cd2b2d7131bef945b828b17a35fa02a08f1bfa5b7af5bcb9c6dde87ca7",
  contract_status: "candidate",
  admission_effect: "none",
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.byteLength}\0`, "utf8");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

const root = process.cwd();
const pinPath = resolve(root, "vendor/quirk-core/PIN.json");
const schemaPath = resolve(
  root,
  "vendor/quirk-core/preference-evidence-wedge.v1.schema.json",
);
const pinBytes = await readFile(pinPath);
const expectedPinBytes = Buffer.from(
  `${JSON.stringify(expected, null, 2)}\n`,
  "utf8",
);
if (!pinBytes.equals(expectedPinBytes)) {
  throw new Error("PIN.json must be the exact closed release pin");
}
const pin = JSON.parse(pinBytes.toString("utf8"));
const actualKeys = Object.keys(pin).sort();
const expectedKeys = Object.keys(expected).sort();
if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
  throw new Error(
    `PIN.json must have exact keys; expected ${expectedKeys.join(", ")}, got ${actualKeys.join(", ")}`,
  );
}
if (
  !/^[0-9a-f]{40}$/.test(pin.commit) ||
  !/^[0-9a-f]{40}$/.test(pin.blob_sha1)
) {
  throw new Error(
    "PIN.json commit and blob_sha1 must be full lowercase SHA-1 values",
  );
}
if (!/^[0-9a-f]{64}$/.test(pin.sha256)) {
  throw new Error(
    "PIN.json sha256 must be 64 lowercase hexadecimal characters",
  );
}
for (const [key, value] of Object.entries(expected)) {
  if (pin[key] !== value)
    throw new Error(`PIN.json ${key} does not match the release pin`);
}
const bytes = await readFile(schemaPath);
const actualSha256 = sha256(bytes);
const actualBlobSha1 = gitBlobSha1(bytes);
if (actualSha256 !== pin.sha256) {
  throw new Error(`vendored schema SHA-256 mismatch: ${actualSha256}`);
}
if (actualBlobSha1 !== pin.blob_sha1) {
  throw new Error(`vendored schema Git blob SHA-1 mismatch: ${actualBlobSha1}`);
}
console.log(
  `preference contract pin valid: ${pin.repository}@${pin.commit}:${pin.path} sha256:${actualSha256} blob:${actualBlobSha1}`,
);
