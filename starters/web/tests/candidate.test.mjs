import test from "node:test";
import assert from "node:assert/strict";
import { makeCandidate } from "../src/lib/candidate.mjs";

test("an idea becomes a candidate only after a next move is selected", () => {
  assert.equal(makeCandidate("a new game", ""), null);
  assert.deepEqual(makeCandidate("  a new game  ", "try"), {
    idea: "a new game",
    nextMove: "try",
  });
});

test("empty ideas and unrecognized moves cannot create a candidate", () => {
  assert.equal(makeCandidate("   ", "capture"), null);
  assert.equal(makeCandidate("a new game", "publish"), null);
});
