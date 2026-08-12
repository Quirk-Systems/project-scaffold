// @vitest-environment node
// Env vars MUST be set before any import that loads src/lib/env.ts,
// because env validation runs at module load.
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

import { describe, it, expect } from "vitest";
import { POST } from "./route";

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when the stripe-signature header is missing", async () => {
    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when the signature is invalid", async () => {
    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
      body: '{"id":"evt_test"}',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
