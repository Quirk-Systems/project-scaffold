import { test, expect } from "@playwright/test";

test("GET /api/health returns 200 with healthy status", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.status).toBe("healthy");
  expect(body.checks.database.ok).toBe(true);
});
