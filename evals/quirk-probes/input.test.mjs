import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseStrictJson,
  readJsonFile,
  ProbeInputError,
  MAX_INPUT_BYTES,
} from "./input.mjs";

const rejects = (source, code) =>
  assert.throws(
    () => parseStrictJson(source),
    (error) =>
      error instanceof ProbeInputError && (!code || error.code === code),
  );

test("strict JSON preserves valid escaped keys, nested values, and numeric forms", () => {
  const source =
    ' {"quote\\\"": [null,true,false,-2.3e+2,{"λ":"\\u2603"}], "empty":{}} \n';
  assert.deepEqual(parseStrictJson(source), JSON.parse(source));
});

test("literal and escape-equivalent duplicate keys cannot erase earlier claims", () => {
  for (const source of [
    '{"effectExecutionAllowed":true,"effectExecutionAllowed":false}',
    '{"result":{"status":"ACTIVE","st\\u0061tus":"CANDIDATE"}}',
    '{"a":1,"\\u0061":2}',
  ])
    rejects(source, "DUPLICATE_KEY");
});

test("keys may repeat across distinct objects without becoming duplicates", () => {
  assert.deepEqual(parseStrictJson('[{"a":1},{"a":2}]'), [{ a: 1 }, { a: 2 }]);
});

test("malformed syntax and trailing content are refused", () => {
  for (const source of [
    "",
    "{",
    "[1,]",
    '{"a":1,}',
    '{"a" 1}',
    "true false",
    "01",
    "+2",
    "1.",
    "1e",
    "[,]",
    "undefined",
    '"bad\nline"',
    '"\\q"',
    '"\\uXY00"',
  ]) {
    rejects(source, "INVALID_JSON");
  }
});

test("nonfinite numbers are rejected before canonical hashing", () => {
  rejects('{"n":1e9999}', "INVALID_NUMBER");
});

test("byte, depth, and node budgets bound parsing", () => {
  rejects('"' + "x".repeat(MAX_INPUT_BYTES) + '"', "INPUT_LIMIT");
  rejects("[".repeat(34) + "0" + "]".repeat(34), "INPUT_LIMIT");
  rejects("[" + Array(20001).fill("0").join(",") + "]", "INPUT_LIMIT");
});

test("prototype-looking keys stay inert JSON data", () => {
  const value = parseStrictJson('{"__proto__":{"polluted":true}}');
  assert.equal(Object.hasOwn(value, "__proto__"), true);
  assert.equal({}.polluted, undefined);
});

test("file ingress checks UTF-8, size, and regular files", () => {
  const directory = mkdtempSync(join(tmpdir(), "probe-json-"));
  try {
    const path = join(directory, "input.json");
    writeFileSync(path, '{"ok":true}');
    assert.deepEqual(readJsonFile(path), { ok: true });
    writeFileSync(path, Buffer.from([0x22, 0xff, 0x22]));
    assert.throws(() => readJsonFile(path), { code: "INVALID_UTF8" });
    writeFileSync(path, " ".repeat(MAX_INPUT_BYTES + 1));
    assert.throws(() => readJsonFile(path), { code: "INPUT_LIMIT" });
    assert.throws(() => readJsonFile(directory), { code: "NOT_A_FILE" });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
