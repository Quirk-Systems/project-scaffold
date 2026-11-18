import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("../../scripts/create-quirk-starter.mjs", import.meta.url),
);

function inTempDir(t) {
  const path = mkdtempSync(join(tmpdir(), "quirk-starter-test-"));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

function generate(name, destination) {
  return spawnSync(
    process.execPath,
    [script, "--name", name, "--output", destination],
    {
      encoding: "utf8",
    },
  );
}

test("generates an independently named starter without the source repository's identity or app", (t) => {
  const destination = join(inTempDir(t), "new-app");
  const result = generate("oddity-lab", destination);
  assert.equal(result.status, 0, result.stderr);

  const pkg = JSON.parse(
    readFileSync(join(destination, "package.json"), "utf8"),
  );
  assert.equal(pkg.name, "oddity-lab");
  assert.ok(pkg.scripts.build);
  assert.ok(existsSync(join(destination, "src/app/page.tsx")));
  assert.equal(existsSync(join(destination, ".quirk/manifest.json")), false);
  assert.equal(existsSync(join(destination, "src/lib/quirk/assets.ts")), false);
  assert.equal(existsSync(join(destination, ".env")), false);
  const receipt = JSON.parse(
    readFileSync(join(destination, "QUIRK-STARTER-RECEIPT.json"), "utf8"),
  );
  const packageRecord = receipt.files.find(
    (entry) => entry.path === "package.json",
  );
  assert.equal(
    packageRecord.sha256,
    createHash("sha256")
      .update(readFileSync(join(destination, "package.json")))
      .digest("hex"),
  );
  assert.equal(receipt.authority, "none");
});

test("refuses an existing destination without modifying its contents", (t) => {
  const destination = inTempDir(t);
  const sentinel = join(destination, "keep.txt");
  writeFileSync(sentinel, "do not replace");
  const result = generate("oddity-lab", destination);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(sentinel, "utf8"), "do not replace");
  assert.equal(existsSync(join(destination, "package.json")), false);
});

test("rejects an invalid package name before creating the destination", (t) => {
  const destination = join(inTempDir(t), "new-app");
  const result = generate("../outside", destination);
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(destination), false);
});

test("rejects a missing option before creating the destination", (t) => {
  const destination = join(inTempDir(t), "new-app");
  const result = spawnSync(
    process.execPath,
    [script, "--output", destination],
    {
      encoding: "utf8",
    },
  );
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(destination), false);
});
