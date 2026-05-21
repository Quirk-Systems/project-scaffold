import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type HealthBody = {
  ok: boolean;
  status: "healthy" | "degraded";
  version: string;
  uptimeMs: number;
  timestamp: string;
  checks: { database: { ok: boolean; error?: string } };
};

describe("GET /api/health", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/db");
  });

  it("returns 200 with ok=true when the database responds", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db", () => ({
      db: { execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]) },
    }));

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = (await res.json()) as HealthBody;
    expect(body.ok).toBe(true);
    expect(body.status).toBe("healthy");
    expect(body.checks.database.ok).toBe(true);
    expect(typeof body.uptimeMs).toBe("number");
    expect(body.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(() => new Date(body.timestamp)).not.toThrow();
  });

  describe("when the database is unreachable", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.doMock("@/lib/db", () => ({
        db: {
          execute: vi
            .fn()
            .mockRejectedValue(
              new Error("ECONNREFUSED: cannot reach Postgres"),
            ),
        },
      }));
    });

    it("returns 503 with a degraded status and the underlying error", async () => {
      const { GET } = await import("@/app/api/health/route");
      const res = await GET();
      expect(res.status).toBe(503);

      const body = (await res.json()) as HealthBody;
      expect(body.ok).toBe(false);
      expect(body.status).toBe("degraded");
      expect(body.checks.database.ok).toBe(false);
      expect(typeof body.checks.database.error).toBe("string");
      expect(body.checks.database.error!.length).toBeGreaterThan(0);
    });
  });
});
