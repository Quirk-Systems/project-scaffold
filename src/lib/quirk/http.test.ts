import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseBody } from "./http";

const schema = z.object({
  title: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

describe("Zod 4 request and form compatibility", () => {
  it("rejects oversized constrained arrays before traversing their elements", () => {
    const inspect = vi.fn();
    const bounded = z.array(z.string().superRefine(inspect)).max(2);
    const result = bounded.safeParse(Array(1000).fill("item"));
    expect(result.success).toBe(false);
    expect(inspect).not.toHaveBeenCalled();
    if (!result.success) expect(result.error.issues).toHaveLength(1);
  });

  it("preserves optional metadata and arbitrary JSON values", async () => {
    const input = {
      title: "Asset",
      metadata: { count: 0, nested: { ok: true } },
    };
    const result = await parseBody(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify(input),
      }),
      schema,
    );
    expect(result).toEqual({ ok: true, data: input });
    expect(schema.parse({ title: "Asset" })).toEqual({ title: "Asset" });
  });

  it("returns the existing 400 response shape for invalid input", async () => {
    const result = await parseBody(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ title: "", metadata: [] }),
      }),
      schema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected validation failure");
    expect(result.response.status).toBe(400);
    const body = await result.response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues.fieldErrors.title).toHaveLength(1);
    expect(body.issues.fieldErrors.metadata).toHaveLength(1);
  });

  it("returns form field errors instead of throwing Zod 4 errors", async () => {
    const resolver = zodResolver(schema);
    const result = await resolver({ title: "" }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(result.values).toEqual({});
    expect(result.errors.title?.type).toBe("too_small");
  });
});
