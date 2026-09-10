/** Bounded JSON ingress. Duplicate keys are refused before JSON.parse loses them. */
import { openSync, closeSync, fstatSync, readSync, constants } from "node:fs";

export const MAX_INPUT_BYTES = 1024 * 1024;

export class ProbeInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProbeInputError";
    this.code = code;
  }
}

const refuse = (code, message) => {
  throw new ProbeInputError(code, message);
};

export function parseStrictJson(source) {
  if (
    typeof source !== "string" ||
    Buffer.byteLength(source) > MAX_INPUT_BYTES
  ) {
    refuse("INPUT_LIMIT", "Input must be UTF-8 JSON within 1 MiB.");
  }
  let index = 0;
  let nodes = 0;
  const number = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  const space = () => {
    while (" \t\r\n".includes(source[index]) && index < source.length) index++;
  };
  const invalid = () => refuse("INVALID_JSON", "Input is not strict JSON.");
  const string = () => {
    const start = index++;
    while (index < source.length) {
      const character = source[index++];
      if (character === "\\") index++;
      else if (character === '"') {
        try {
          return JSON.parse(source.slice(start, index));
        } catch {
          invalid();
        }
      }
    }
    invalid();
  };
  function value(depth) {
    if (depth > 32 || ++nodes > 20000)
      refuse("INPUT_LIMIT", "Input exceeds the JSON structure budget.");
    space();
    const character = source[index];
    if (character === '"') {
      string();
      return;
    }
    if (character === "{") {
      index++;
      space();
      const keys = new Set();
      if (source[index] === "}") {
        index++;
        return;
      }
      while (true) {
        if (source[index] !== '"') invalid();
        const key = string();
        if (keys.has(key))
          refuse("DUPLICATE_KEY", "Input contains a duplicate JSON key.");
        keys.add(key);
        space();
        if (source[index++] !== ":") invalid();
        value(depth + 1);
        space();
        const next = source[index++];
        if (next === "}") return;
        if (next !== ",") invalid();
        space();
      }
    }
    if (character === "[") {
      index++;
      space();
      if (source[index] === "]") {
        index++;
        return;
      }
      while (true) {
        value(depth + 1);
        space();
        const next = source[index++];
        if (next === "]") return;
        if (next !== ",") invalid();
      }
    }
    for (const literal of ["true", "false", "null"]) {
      if (source.startsWith(literal, index)) {
        index += literal.length;
        return;
      }
    }
    number.lastIndex = index;
    const match = number.exec(source);
    if (!match) invalid();
    if (!Number.isFinite(Number(match[0])))
      refuse("INVALID_NUMBER", "JSON numbers must be finite.");
    index = number.lastIndex;
  }
  value(0);
  space();
  if (index !== source.length) invalid();
  return JSON.parse(source);
}

export function readJsonFile(path) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) refuse("NOT_A_FILE", "Input must be a regular file.");
    if (stat.size > MAX_INPUT_BYTES)
      refuse("INPUT_LIMIT", "Input exceeds 1 MiB.");
    const buffer = Buffer.alloc(MAX_INPUT_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(fd, buffer, length, buffer.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length > MAX_INPUT_BYTES) refuse("INPUT_LIMIT", "Input exceeds 1 MiB.");
    let source;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(
        buffer.subarray(0, length),
      );
    } catch {
      refuse("INVALID_UTF8", "Input must use valid UTF-8.");
    }
    return parseStrictJson(source);
  } finally {
    closeSync(fd);
  }
}
