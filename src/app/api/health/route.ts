import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

const startedAt = Date.now();

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; error?: string }> = {};

  try {
    // Lazy-import so a failure to open the DB connection (e.g. bad
    // DATABASE_URL pointing at a missing or unwritable path) surfaces
    // here as a failed check rather than crashing the route module
    // at import time.
    const { db } = await import("@/lib/db");
    db.run(sql`SELECT 1`);
    checks.database = { ok: true };
  } catch (err) {
    checks.database = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const ok = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok,
      status: ok ? "healthy" : "degraded",
      version: process.env.npm_package_version ?? "unknown",
      uptimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
