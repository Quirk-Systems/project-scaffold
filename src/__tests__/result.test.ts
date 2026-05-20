import { describe, expect, it } from "vitest";
import {
  ok,
  err,
  tryCatch,
  tryCatchAsync,
  unwrap,
  unwrapOr,
  map,
  mapErr,
} from "@/lib/result";

describe("Result", () => {
  it("ok() wraps a success value", () => {
    const r = ok(42);
    expect(r).toEqual({ ok: true, value: 42 });
  });

  it("err() wraps an error", () => {
    const r = err(new Error("boom"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe("boom");
  });

  it("tryCatch returns ok on success", () => {
    const r = tryCatch(() => JSON.parse('{"a":1}'));
    expect(r).toEqual({ ok: true, value: { a: 1 } });
  });

  it("tryCatch returns err on throw", () => {
    const r = tryCatch(() => JSON.parse("{bad}"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(Error);
  });

  it("tryCatchAsync handles resolved promises", async () => {
    const r = await tryCatchAsync(async () => 99);
    expect(r).toEqual({ ok: true, value: 99 });
  });

  it("tryCatchAsync handles rejected promises", async () => {
    const r = await tryCatchAsync(async () => {
      throw new Error("async boom");
    });
    expect(r.ok).toBe(false);
  });

  it("unwrap returns value on ok, throws on err", () => {
    expect(unwrap(ok(1))).toBe(1);
    expect(() => unwrap(err(new Error("fail")))).toThrow("fail");
  });

  it("unwrapOr returns fallback on err", () => {
    expect(unwrapOr(ok(1), 0)).toBe(1);
    expect(unwrapOr(err(new Error("x")), 0)).toBe(0);
  });

  it("map transforms the ok value", () => {
    expect(map(ok(2), (n) => n * 3)).toEqual({ ok: true, value: 6 });
    const e = err(new Error("x"));
    expect(map(e, (n: number) => n * 3)).toBe(e);
  });

  it("mapErr transforms the error", () => {
    expect(mapErr(err("bad"), (s) => s.toUpperCase())).toEqual({
      ok: false,
      error: "BAD",
    });
    const o = ok(1);
    expect(mapErr(o, (s: string) => s.toUpperCase())).toBe(o);
  });
});
