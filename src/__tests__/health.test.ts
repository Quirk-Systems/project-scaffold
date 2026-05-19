import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 with ok=true when the database responds", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      ok: boolean;
      status: string;
      version: string;
      uptimeMs: number;
      timestamp: string;
      checks: { database: { ok: boolean } };
    };

    expect(body.ok).toBe(true);
    expect(body.status).toBe("healthy");
    expect(body.checks.database.ok).toBe(true);
    expect(typeof body.uptimeMs).toBe("number");
    expect(body.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(() => new Date(body.timestamp)).not.toThrow();
  });
});
